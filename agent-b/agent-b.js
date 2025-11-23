// agent-b.js - Unsplash-based Image Agent with X402 auto-registration
const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const AGENT_B_PRIVATE_KEY = process.env.AGENT_B_PRIVATE_KEY;
const PORT = process.env.PORT || 3001;

// Service registration details
const AGENT_NAME = "HD Image Generator (Unsplash)";
const AGENT_ENDPOINT = `http://localhost:${PORT}/generate`;
const AGENT_CATEGORY = 0; // 0 = image generation
const AGENT_PRICE = ethers.parseEther("0.01"); // 0.01 ETH

// Fallbacks for Arbitrum Sepolia
const RPC_URLS = [
  RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
  'https://arbitrum-sepolia.blockpi.network/v1/rpc/public',
  'https://arbitrum-sepolia-rpc.publicnode.com'
];

// Unsplash categories for mapping search terms
const UNSPLASH_CATEGORIES = {
  'arbitrum': 'blockchain,technology',
  'stylus': 'abstract,technology',
  'blockchain': 'network,technology',
  'ai': 'artificial-intelligence,technology',
  'agent': 'robot,technology',
  'logo': 'abstract,design',
  'network': 'network,technology',
  'smart contract': 'code,technology',
  'payment': 'finance,business',
  'decentralized': 'network,abstract'
};

console.log("\n🎨 Agent B - Unsplash Image Generator + X402 Protocol");
console.log("═══════════════════════════════════════════");

let provider;
let wallet;
let contract;
let SERVICE_ID;

// ----- PROVIDER CONNECTION -----
async function connectProvider() {
  for (let i = 0; i < RPC_URLS.length; i++) {
    try {
      console.log(`🔄 Trying RPC ${i + 1}/${RPC_URLS.length}...`);
      const testProvider = new ethers.JsonRpcProvider(RPC_URLS[i], undefined, {
        timeout: 10000,
        staticNetwork: ethers.Network.from({
          chainId: 421614,
          name: 'arbitrum-sepolia'
        })
      });
      await testProvider.getBlockNumber();
      console.log('✅ RPC connected!\n');
      return testProvider;
    } catch (error) {
      console.log(`❌ RPC ${i + 1} failed`);
      if (i === RPC_URLS.length - 1) throw new Error('All RPCs failed');
    }
  }
}

const CONTRACT_ABI = [
  "function registerService(string name, string endpoint, uint256 category, uint256 pricePerCall) returns (uint256)",
  "function getService(uint256) view returns (address,string,string,uint256,uint256,uint256,bool)",
  "function getServiceStats(uint256) view returns (uint256,uint256,uint256)",
  "function totalServicesCount() view returns (uint256)",
  "function withdrawRevenue(uint256)",
  "event ServiceCalled(uint256 indexed,address indexed,uint256)",
  "event ServiceRegistered(uint256 indexed service_id,address indexed owner,string name,uint256 price_per_call)"
];;

// ----- SAFE DECODE HELPER -----
function safeDecodeService(data) {
  try {
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ['address', 'string', 'string', 'uint256', 'uint256', 'uint256', 'bool'],
      data
    );
    
    return {
      owner: decoded[0],
      name: decoded[1],
      endpoint: decoded[2],
      price: decoded[3],
      totalCalls: decoded[4],
      reputation: decoded[5],
      isActive: decoded[6]
    };
  } catch (error) {
    console.error("Decode error:", error.message);
    throw error;
  }
}

// ----- AUTO-REGISTER SERVICE ON STARTUP -----
async function ensureServiceRegistered(contract, wallet) {
  try {
    const total = await contract.totalServicesCount();
    console.log(`🔍 Checking ${total} existing services...`);
    
    for (let i = 1; i <= Number(total); i++) {
      try {
        const data = await provider.call({
          to: CONTRACT_ADDRESS,
          data: contract.interface.encodeFunctionData('getService', [i])
        });
        
        const service = safeDecodeService(data);
        
        if (
          service.owner.toLowerCase() === wallet.address.toLowerCase() &&
          service.name === AGENT_NAME
        ) {
          console.log("✅ Service already registered with ID:", i);
          return i;
        }
      } catch (e) {
        console.error(`Error checking service ${i}:`, e.message);
        continue;
      }
    }
    
    // Register if not found
    console.log("\n📝 Registering new service on AgentMarket...");
    const tx = await contract.registerService(
      AGENT_NAME,
      AGENT_ENDPOINT,
      AGENT_CATEGORY,
      AGENT_PRICE,
      { gasLimit: 500000 }
    );
    console.log("⏳ Tx:", tx.hash);
    await tx.wait();
    const newTotal = await contract.totalServicesCount();
    console.log("✅ Registered with Service ID:", newTotal.toString(), "\n");
    return Number(newTotal);
  } catch (error) {
    console.error("❌ Registration error:", error);
    throw error;
  }
}

// ----- X402 PAYMENT MIDDLEWARE -----
function x402PaymentMiddleware(req, res, next) {
  const paymentHeader = req.headers['x-payment'];
  
  if (!paymentHeader) {
    return res.status(402).json({
      x402Version: '0.7.3',
      accepts: [
        {
          type: 'ethereum',
          network: 'arbitrum-sepolia',
          chainId: 421614,
          amount: AGENT_PRICE.toString(),
          recipient: wallet.address,
          token: '0x0000000000000000000000000000000000000000',
          contract: CONTRACT_ADDRESS,
          method: 'callService',
          params: [SERVICE_ID]
        }
      ],
      message: `Payment required: ${ethers.formatEther(AGENT_PRICE)} ETH on Arbitrum Sepolia`
    });
  }
  
  verifyPayment(paymentHeader)
    .then(result => {
      if (result.valid) {
        req.paymentVerified = true;
        req.paymentTx = paymentHeader;
        req.paymentDetails = result.details;
        next();
      } else {
        res.status(402).json({
          error: 'Payment verification failed',
          details: result.error
        });
      }
    })
    .catch(error => {
      res.status(402).json({
        error: 'Payment verification error',
        details: error.message
      });
    });
}

async function verifyPayment(txHash) {
  try {
    console.log("\n🔍 Verifying payment:", txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt || !receipt.status) {
      return { valid: false, error: 'Invalid or failed transaction' };
    }
    
    const iface = new ethers.Interface(CONTRACT_ABI);
    
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === 'ServiceCalled') {
          const serviceId = Number(parsed.args.service_id || parsed.args[0]);
          
          if (serviceId === SERVICE_ID) {
            console.log("✅ Payment verified!");
            return { 
              valid: true, 
              details: { serviceId: serviceId.toString() } 
            };
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    return { valid: false, error: 'Payment not found in transaction logs' };
  } catch (error) {
    console.error("❌ Verification error:", error.message);
    return { valid: false, error: error.message };
  }
}

// ----- IMAGE GENERATION ENDPOINT -----
app.post('/generate', x402PaymentMiddleware, async (req, res) => {
  const { prompt, caller } = req.body;
  
  console.log("\n🎨 IMAGE GENERATION (X402 PROTECTED)");
  console.log("📝 Prompt:", prompt);
  console.log("👤 Caller:", caller);
  
  // Choose Unsplash category based on prompt
  let category = 'technology';
  const promptLower = (prompt || '').toLowerCase();
  
  for (const [keyword, cat] of Object.entries(UNSPLASH_CATEGORIES)) {
    if (promptLower.includes(keyword)) {
      category = cat;
      break;
    }
  }
  
  const seed = Date.now() + Math.random();
  const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(seed + prompt)}/1024/1024`;
  
  console.log("✅ Unsplash Image:", imageUrl.substring(0, 70) + "...");
  
  res.setHeader('X-Payment-Response', JSON.stringify({
    status: 'success',
    txHash: req.paymentTx
  }));
  res.setHeader('Access-Control-Expose-Headers', 'X-Payment-Response');
  
  res.json({
    success: true,
    prompt,
    category,
    image_url: imageUrl,
    service_id: SERVICE_ID.toString(),
    model: "Unsplash Photo Service",
    size: "1024x1024",
    quality: "HD",
    payment_protocol: "X402",
    payment_verified: true,
    payment_tx: req.paymentTx,
    message: "HD photo retrieved! Payment verified via X402.",
    timestamp: new Date().toISOString()
  });
});

// ----- TEST ENDPOINT (NO PAYMENT) -----
app.post('/generate-test', async (req, res) => {
  const { prompt } = req.body;
  const seed = Date.now();
  const imageUrl = `https://source.unsplash.com/1024x1024/?technology,ai&sig=${seed}`;
  
  res.json({
    success: true,
    prompt,
    image_url: imageUrl,
    model: "Unsplash (Test)",
    test_mode: true
  });
});

// ----- HEALTH AND ADMIN -----
app.get('/health', async (req, res) => {
  let stats = null;
  
  if (contract && SERVICE_ID) {
    try {
      const s = await contract.getServiceStats(SERVICE_ID);
      stats = {
        total_calls: s[0].toString(),
        total_revenue: ethers.formatEther(s[1]) + " ETH",
        pending_withdrawal: ethers.formatEther(s[2]) + " ETH"
      };
    } catch (e) {
      stats = { error: "Could not fetch stats" };
    }
  }
  
  res.json({
    status: "online",
    service: AGENT_NAME,
    service_id: SERVICE_ID?.toString() || "Not registered",
    price: ethers.formatEther(AGENT_PRICE) + " ETH",
    payment_protocol: "X402 v0.7.3",
    ai_model: "Unsplash",
    wallet: wallet?.address,
    contract: CONTRACT_ADDRESS,
    stats: stats,
    timestamp: new Date().toISOString()
  });
});

app.get('/earnings', async (req, res) => {
  if (!contract || !SERVICE_ID) {
    return res.json({ error: "Service not registered" });
  }
  
  try {
    const s = await contract.getServiceStats(SERVICE_ID);
    res.json({
      service_id: SERVICE_ID.toString(),
      service_name: AGENT_NAME,
      owner: wallet.address,
      price: ethers.formatEther(AGENT_PRICE) + " ETH",
      total_calls: s[0].toString(),
      total_revenue: ethers.formatEther(s[1]) + " ETH",
      pending_withdrawal: ethers.formatEther(s[2]) + " ETH"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/withdraw', async (req, res) => {
  if (!contract || !SERVICE_ID) {
    return res.json({ error: "Service not registered" });
  }
  
  try {
    const stats = await contract.getServiceStats(SERVICE_ID);
    const pending = stats[2];
    
    if (pending == 0n) {
      return res.json({ error: "No pending revenue" });
    }
    
    const tx = await contract.withdrawRevenue(SERVICE_ID, { gasLimit: 200000 });
    await tx.wait();
    
    res.json({
      success: true,
      amount: ethers.formatEther(pending) + " ETH",
      tx_hash: tx.hash
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----- STARTUP -----
async function start() {
  console.log("🚀 Starting Agent B...\n");
  
  try {
    provider = await connectProvider();
    wallet = new ethers.Wallet(AGENT_B_PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    
    console.log("📍 Wallet:", wallet.address);
    
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Wallet Balance:", ethers.formatEther(balance), "ETH");
    
    if (balance < ethers.parseEther("0.001")) {
      console.warn("⚠️  Low balance! You may not be able to register service.");
    }
    
    SERVICE_ID = await ensureServiceRegistered(contract, wallet);
    console.log("✅ Using Service ID:", SERVICE_ID, "\n");
  } catch (error) {
    console.error("❌ Startup error:", error.message);
    console.log("⚠️  Starting in limited mode\n");
    wallet = new ethers.Wallet(AGENT_B_PRIVATE_KEY);
    console.log("📍 Wallet:", wallet.address, "\n");
  }
  
  app.listen(PORT, () => {
    console.log("✅ Agent B Service Online!");
    console.log("═══════════════════════════════════════════");
    console.log("📡 POST http://localhost:" + PORT + "/generate (X402 required)");
    console.log("📡 POST http://localhost:" + PORT + "/generate-test (free)");
    console.log("📡 GET  http://localhost:" + PORT + "/health");
    console.log("📡 GET  http://localhost:" + PORT + "/earnings");
    console.log("📡 POST http://localhost:" + PORT + "/withdraw");
    console.log("═══════════════════════════════════════════");
    console.log("\n✨ Ready to serve customers!\n");
  });
}

start().catch(console.error);
