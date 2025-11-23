const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Config from environment
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const AGENT_A_PRIVATE_KEY = process.env.AGENT_A_PRIVATE_KEY;
const PORT = process.env.PORT || 5000;

// Setup ethers
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(AGENT_A_PRIVATE_KEY, provider);

// Contract ABI must include callService:
const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "service_id", "type": "uint256" }
    ],
    "name": "callService",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "payable",
    "type": "function"
  }
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

console.log("\n🤖 Agent A - Hardcoded + X402");
console.log("═══════════════════════════════════════════");
console.log("📍 Wallet:", wallet.address);
console.log("🌐 Network: Arbitrum Sepolia\n");

// Hardcoded services array: set IDs, price (ETH), endpoint
const SERVICES = [
  {
    id: 1,
    name: "HD Image Generator",
    priceEth: "0.01",
    endpoint: "http://localhost:3001/generate"
  },
  {
    id: 2,
    name: "Logo Generator",
    priceEth: "0.015",
    endpoint: "http://localhost:3002/generate"
  },
  {
    id: 3,
    name: "Voice Synthesis",
    priceEth: "0.02",
    endpoint: "http://localhost:3003/generate"
  }
];

let conversationHistory = [];
let lastServiceId = null;

function getServiceById(serviceId) {
  return SERVICES.find(s => s.id === Number(serviceId));
}

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.log("💬 User message:", message);

    // Display services
    let servicesInfo = "\nAvailable services:\n";
    SERVICES.forEach(s => {
      servicesInfo += `- Service ${s.id}: ${s.name} (${s.priceEth} ETH)\n`;
    });

    // Parse ID from message
    let serviceId = null;
    const match = message.match(/\b(?:purchase|buy|service)\s*([0-9]+)\b/i);
    if (match) {
      serviceId = Number(match[1]);
      lastServiceId = serviceId;
    } else if (message.trim().toLowerCase() === "yes" && lastServiceId) {
      serviceId = lastServiceId;
    }

    // Process purchase for valid hardcoded service:
    if (serviceId) {
      const service = getServiceById(serviceId);
      if (!service) {
        return res.json({ success: false, message: `❌ Service ${serviceId} not available.` });
      }
      const price = ethers.parseEther(service.priceEth);
      const endpoint = service.endpoint;

      console.log(`🛒 Contract callService(${service.id}) for ${service.priceEth} ETH`);

      // True on-chain contract call!
      try {
        const tx = await contract.callService(service.id, { value: price, gasLimit: 500000 });
        await tx.wait();
        console.log("✅ Tx confirmed on-chain:", tx.hash);

        // X402 style: HTTP call to Agent B with payment proof
        let result = {};
        try {
          if (endpoint && endpoint.startsWith('http')) {
            console.log(`📡 POST to: ${endpoint}`);
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Payment': tx.hash
              },
              body: JSON.stringify({
                prompt: message,
                caller: wallet.address,
                serviceId: service.id
              })
            });
            result = await response.json();
          } else {
            result = { success: true, message: "Service endpoint not configured", image_url: null };
          }
        } catch (err) {
          console.error("❌ Endpoint call failed:", err);
          result = { success: false, message: err.message };
        }

        conversationHistory.push(
          { role: "user", parts: [{ text: message }] },
          { role: "model", parts: [{ text: `✅ Service delivered! [${service.name}] ${result.image_url ? "Image: " + result.image_url : result.message}` }] }
        );

        return res.json({
          success: true,
          message: `✅ Service delivered! ${result.image_url ? "Image: " + result.image_url : result.message}`,
          tx_hash: tx.hash,
          service_result: result,
          action: 'purchase'
        });

      } catch (txError) {
        console.error("❌ Transaction error:", txError);
        return res.json({ success: false, message: `❌ Transaction reverted: ${(txError.reason || txError.error || txError.message)}` });
      }
    }

    // System prompt fallback
    const systemPrompt = `You are a personal AI agent helping purchase AI services.

Your wallet: ${wallet.address}
${servicesInfo}

Say "purchase N" where N is the service ID. Reply "yes" to confirm the last suggestion.`;

    conversationHistory.push(
      { role: "user", parts: [{ text: message }] },
      { role: "model", parts: [{ text: systemPrompt }] }
    );

    res.json({ success: true, message: systemPrompt, action: 'chat' });

  } catch (error) {
    console.error("❌ Chat error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/balance', async (req, res) => {
  try {
    const balance = await provider.getBalance(wallet.address);
    res.json({ address: wallet.address, balance: ethers.formatEther(balance), balanceWei: balance.toString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function start() {
  try {
    const bal = await provider.getBalance(wallet.address);
    console.log("💰 Balance:", ethers.formatEther(bal), "ETH");
    app.listen(PORT, () => {
      console.log(`✅ Agent A running on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error("❌ Startup error:", e);
    process.exit(1);
  }
}

start().catch(console.error);
