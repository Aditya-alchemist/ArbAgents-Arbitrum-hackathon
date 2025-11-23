#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;
//0x16f90430dca8acecae082fdb44aeac0827825d95
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    evm,
    prelude::*,
    storage::{StorageAddress, StorageU256, StorageBool, StorageString},
    stylus_proc::storage,
};
use alloc::{string::String, vec::Vec};

// --- Events (Solidity-compatible) ---
sol! {
    event ServiceRegistered(uint256 indexed service_id, address indexed owner, string name, uint256 price_per_call);
    event ServiceCalled(uint256 indexed service_id, address indexed caller, uint256 price);
    event ServiceRated(uint256 indexed service_id, address indexed rater, uint256 rating);
    event PlatformFeesWithdrawn(address indexed owner, uint256 amount);
}

const CATEGORY_IMAGE_GENERATION: u8 = 0;
const CATEGORY_CODE_GENERATION: u8 = 1;

// --- AgentService: All fields are ABI compatible. ---
#[storage]
pub struct AgentService {
    owner: StorageAddress,
    name: StorageString,
    endpoint: StorageString,
    category: StorageU256,         // ABI: uint256
    price_per_call: StorageU256,   // ABI: uint256
    total_calls: StorageU256,      // ABI: uint256
    total_revenue: StorageU256,    // ABI: uint256
    reputation_score: StorageU256, // ABI: uint256
    is_active: StorageBool,        // ABI: bool
}

// --- Top-level storage struct ---
sol_storage! {
    #[entrypoint]
    pub struct AgentMarket {
        mapping(uint256 => AgentService) services;
        uint256 total_services;
        mapping(uint256 => mapping(address => uint256)) user_ratings;
        mapping(uint256 => uint256) pending_withdrawals;
        address platform_owner;
        uint256 platform_fee_percent; // e.g. 5 for 5%
        uint256 platform_fees_collected;
    }
}

// --- Public Methods Implementation ---
#[public]
impl AgentMarket {
    pub fn initialize(&mut self) {
        if self.platform_owner.get() != Address::ZERO {
            return;
        }
        let sender = self.vm().msg_sender();
        self.platform_owner.set(sender);
        self.platform_fee_percent.set(U256::from(5));
        self.platform_fees_collected.set(U256::ZERO);
    }

    pub fn register_service(
        &mut self,
        name: String,
        endpoint: String,
        category: U256,
        price_per_call: U256,
    ) -> Result<U256, Vec<u8>> {
        let sender = self.vm().msg_sender();

        if name.len() == 0 || endpoint.len() == 0 {
            return Err(b"Invalid inputs".to_vec());
        }
        if price_per_call == U256::ZERO {
            return Err(b"Price must be > 0".to_vec());
        }
        if category.to::<u8>() > CATEGORY_CODE_GENERATION {
            return Err(b"Invalid category".to_vec());
        }
        let service_id = self.total_services.get() + U256::from(1);
        let mut service = self.services.setter(service_id);

        service.owner.set(sender);
        service.name.set_str(&name);
        service.endpoint.set_str(&endpoint);
        service.category.set(category);
        service.price_per_call.set(price_per_call);
        service.total_calls.set(U256::ZERO);
        service.total_revenue.set(U256::ZERO);
        service.reputation_score.set(U256::from(100));
        service.is_active.set(true);

        self.total_services.set(service_id);

        evm::log(ServiceRegistered {
            service_id,
            owner: sender,
            name,
            price_per_call,
        });

        Ok(service_id)
    }

    #[payable]
    pub fn call_service(&mut self, service_id: U256) -> Result<String, Vec<u8>> {
        let sender = self.vm().msg_sender();
        let msg_value = self.vm().msg_value();

        let service_owner = self.services.getter(service_id).owner.get();
        let price = self.services.getter(service_id).price_per_call.get();
        let is_active = self.services.getter(service_id).is_active.get();
        let endpoint = self.services.getter(service_id).endpoint.get_string();

        if service_owner == Address::ZERO {
            return Err(b"Service not found".to_vec());
        }
        if !is_active {
            return Err(b"Service inactive".to_vec());
        }
        if msg_value < price {
            return Err(b"Insufficient payment".to_vec());
        }

        let fee_percent = self.platform_fee_percent.get();
        let platform_fee = (price * fee_percent) / U256::from(100);
        let provider_revenue = price - platform_fee;

        let mut service_mut = self.services.setter(service_id);
        let calls = service_mut.total_calls.get();
        let revenue = service_mut.total_revenue.get();
        service_mut.total_calls.set(calls + U256::from(1));
        service_mut.total_revenue.set(revenue + provider_revenue);

        let current_pending = self.pending_withdrawals.get(service_id);
        self.pending_withdrawals.setter(service_id).set(current_pending + provider_revenue);

        // Track platform fees
        let total_fees = self.platform_fees_collected.get();
        self.platform_fees_collected.set(total_fees + platform_fee);

        evm::log(ServiceCalled {
            service_id,
            caller: sender,
            price,
        });

        Ok(endpoint)
    }

    pub fn rate_service(&mut self, service_id: U256, rating: U256) -> Result<(), Vec<u8>> {
        let sender = self.vm().msg_sender();

        if rating == U256::ZERO || rating > U256::from(5) {
            return Err(b"Rating must be 1-5".to_vec());
        }

        self.user_ratings.setter(service_id).setter(sender).set(rating);

        evm::log(ServiceRated {
            service_id,
            rater: sender,
            rating,
        });

        Ok(())
    }

    pub fn withdraw_revenue(&mut self, service_id: U256) -> Result<(), Vec<u8>> {
        let sender = self.vm().msg_sender();
        let service_owner = self.services.getter(service_id).owner.get();

        if service_owner != sender {
            return Err(b"Not service owner".to_vec());
        }

        let pending = self.pending_withdrawals.get(service_id);

        if pending == U256::ZERO {
            return Err(b"No pending revenue".to_vec());
        }

        self.pending_withdrawals.setter(service_id).set(U256::ZERO);

        Ok(())
    }

    // Platform owner withdrawal
    pub fn withdraw_platform_fees(&mut self) -> Result<U256, Vec<u8>> {
        let sender = self.vm().msg_sender();

        if sender != self.platform_owner.get() {
            return Err(b"Not platform owner".to_vec());
        }

        let amount = self.platform_fees_collected.get();

        if amount == U256::ZERO {
            return Err(b"No fees collected".to_vec());
        }

        self.platform_fees_collected.set(U256::ZERO);

        evm::log(PlatformFeesWithdrawn {
            owner: sender,
            amount,
        });

        Ok(amount)
    }

    /// ================== FIXED: All return types EVM/ABI compatible ======================
    pub fn get_service(&self, service_id: U256) -> (Address, String, String, U256, U256, U256, bool) {
        let service = self.services.getter(service_id);
        (
            service.owner.get(),
            service.name.get_string(),
            service.endpoint.get_string(),
            service.price_per_call.get(),
            service.total_calls.get(),
            service.reputation_score.get(),
            service.is_active.get(),
        )
    }
    pub fn get_service_stats(&self, service_id: U256) -> (U256, U256, U256) {
        let service = self.services.getter(service_id);
        (
            service.total_calls.get(),
            service.total_revenue.get(),
            self.pending_withdrawals.get(service_id),
        )
    }

    pub fn get_platform_fees(&self) -> U256 {
        self.platform_fees_collected.get()
    }

    pub fn total_services_count(&self) -> U256 {
        self.total_services.get()
    }
}
