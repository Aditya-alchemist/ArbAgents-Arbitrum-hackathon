import React, { useState } from 'react';
import { ethers } from 'ethers';
import './Withdraw.css';

// Paste your ABI here or import from /config/constants.js
const CONTRACT_ABI =[
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "totalServicesCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "service_id",
        "type": "uint256"
      }
    ],
    "name": "getService",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "name",
            "type": "bytes"
          },
          {
            "internalType": "bytes",
            "name": "endpoint",
            "type": "bytes"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalCalls",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "reputation",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          }
        ],
        "internalType": "struct Service",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]
;

// Paste your contract address here, or import from constants.js or .env
const CONTRACT_ADDRESS = "0x7848bb13500b2854001287a7699825eb9d6f55e1";

function Withdraw({ services }) {
  const [selectedServiceId, setSelectedServiceId] = useState(
    services && services.length ? services[0].id : ''
  );
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [message, setMessage] = useState('');

  // Main button handler: withdraw on-chain
  const handleWithdraw = async () => {
    if (!selectedServiceId) return;

    setIsWithdrawing(true);
    setMessage('');

    if (typeof window.ethereum === "undefined") {
      setMessage("❌ Please install MetaMask");
      setIsWithdrawing(false);
      return;
    }

    try {
      // Request wallet connection if needed
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.withdrawRevenue(selectedServiceId, { gasLimit: 200000 });
      setMessage(`⏳ Transaction sent: ${tx.hash}`);

      await tx.wait();
      setMessage(`✅ Withdraw successful! Tx: ${tx.hash}`);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    }
    setIsWithdrawing(false);
  };

  return (
    <div className="withdraw-top-bar">
      <div style={{ fontWeight: 700, fontSize: 17, color: "#fff" }}>Withdraw Earnings</div>
      <select
        className="withdraw-select"
        value={selectedServiceId}
        onChange={e => setSelectedServiceId(e.target.value)}
        disabled={isWithdrawing || !services || !services.length}
      >
        {(services || []).map(s => (
          <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
        ))}
      </select>
      <button
        className="withdraw-btn"
        onClick={handleWithdraw}
        disabled={isWithdrawing || !selectedServiceId}
      >
        {isWithdrawing ? "Withdrawing..." : "Withdraw"}
      </button>
      {message && (<div className="withdraw-message">{message}</div>)}
    </div>
  );
}

export default Withdraw;
