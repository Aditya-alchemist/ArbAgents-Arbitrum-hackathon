import { ethers } from "ethers";
import abi from "./abi.json"; // make sure abi.json is in the same folder

export const CONTRACT_ADDRESS = "0xc53fef3a32771a2b8202c56673a6f87c03cad06c";
export const RPC_URL = "https://sepolia-rollup.arbitrum.io/rpc";

// ---------------------------
// PROVIDERS
// ---------------------------

// Read-only provider
export function getReadProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

// Write provider (Metamask injected)
export function getWriteProvider() {
  if (!window.ethereum) throw new Error("Wallet not detected");
  return new ethers.BrowserProvider(window.ethereum);
}

// ---------------------------
// CONTRACT INSTANCES
// ---------------------------

// Read-only contract (for view calls)
export function getReadContract() {
  const provider = getReadProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
}

// Contract with signer (for transactions)
export async function getWriteContract() {
  const provider = getWriteProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
}

// ---------------------------
// HELPERS
// ---------------------------

// Converts Stylus packed bytes → UTF-8
export function hexToUtf8(hex) {
  try {
    if (!hex || hex === "0x") return "";
    const bytes = ethers.getBytes(hex);
    return new TextDecoder().decode(bytes).replace(/\0/g, "");
  } catch (e) {
    console.log("⚠️ hexToUtf8 decode failed:", e);
    return "";
  }
}

// ---------------------------
// FETCH ALL SERVICES
// ---------------------------

export async function fetchServices() {
  const contract = getReadContract();

  console.log("📊 Fetching total services count...");
  const total = await contract.totalServicesCount();
  console.log("📌 Smart Contract Services Count =", total.toString());

  const services = [];

  for (let id = 1; id <= Number(total); id++) {
    console.log("🔎 Fetching service ID:", id);

    try {
      const service = await contract.getService(id);

      const parsed = {
  id,
  owner: service[0],
  name: hexToUtf8(service[1]),
  endpoint: hexToUtf8(service[2]),
  price: service[3].toString(),
  priceEth: Number(service[3]) / 1e18,     // ✅ FIX HERE
  totalCalls: service[4].toString(),
  reputation: service[5].toString(),
  isActive: service[6],
};

      console.log("✅ Parsed service:", parsed);
      services.push(parsed);
    } catch (err) {
      console.error("❌ Error decoding service", id, err);
    }
  }

  console.log("📦 Final services list:", services);
  return services;
}

// ---------------------------
// REGISTER SERVICE
// ---------------------------

export async function registerService(name, endpoint, category, priceWei) {
  const contract = await getWriteContract();
  return await contract.registerService(name, endpoint, category, priceWei);
}

// ---------------------------
// CALL SERVICE (payable)
// ---------------------------

export async function callService(serviceId, priceWei) {
  const contract = await getWriteContract();
  return await contract.callService(serviceId, { value: priceWei });
}
