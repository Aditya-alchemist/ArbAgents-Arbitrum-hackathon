export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0xc53fef3a32771a2b8202c56673a6f87c03cad06c';
export const RPC_URL = process.env.REACT_APP_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';

export const CONTRACT_ABI =[
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
