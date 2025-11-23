import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import ServiceList from './components/ServiceList';
import ReviewSection from './components/ReviewSection';
import Withdraw from './components/Withdraw';    // <-- Add this line
import { fetchServices } from './utils/contract';
import './App.css';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask to use this app!');
        return;
      }

      console.log('🔌 Connecting wallet...');

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const provider = new ethers.BrowserProvider(window.ethereum); // ethers v6
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      console.log('✅ Wallet connected:', accounts[0]);
      console.log('🌐 Network:', network.chainId);

      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);

      // Switch to Arbitrum Sepolia if needed
      if (network.chainId !== 421614n) {
        await switchToArbitrumSepolia();
      }
    } catch (error) {
      console.error('❌ Connection error:', error);
      alert('Failed to connect wallet: ' + error.message);
    }
  };

  // Switch to Arbitrum Sepolia
  const switchToArbitrumSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x66eee' }],
      });
      console.log('✅ Switched to Arbitrum Sepolia');
    } catch (error) {
      // Chain not added, add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x66eee',
              chainName: 'Arbitrum Sepolia',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
              blockExplorerUrls: ['https://sepolia.arbiscan.io']
            }],
          });
          console.log('✅ Arbitrum Sepolia added');
        } catch (addError) {
          console.error('❌ Failed to add network:', addError);
        }
      } else {
        console.error('❌ Failed to switch network:', error);
      }
    }
  };

  // Load services
  const loadServices = async () => {
    console.log('📊 Loading services...');
    setLoading(true);
    const data = await fetchServices();
    console.log(`✅ Loaded ${data.length} services`);
    setServices(data);
    setLoading(false);
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          console.log('🔌 Wallet disconnected');
          setAccount(null);
          setProvider(null);
          setSigner(null);
        } else {
          console.log('👤 Account changed:', accounts[0]);
          setAccount(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', () => {
        console.log('🔄 Chain changed, reloading...');
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Load services when connected
  useEffect(() => {
    if (account) {
      loadServices();
    }
  }, [account]);

  return (
    <div className="app">
      <Header 
        account={account} 
        onConnect={connectWallet}
      />

      {!account ? (
        <div className="welcome-screen">
          <div className="welcome-content">
            <div className="welcome-icon">🤖</div>
            <h1 className="welcome-title">
              Welcome to <span className="gradient-text">AgentMarket</span>
            </h1>
            <p className="welcome-subtitle">
              Your AI Assistant for discovering and purchasing decentralized AI services on Arbitrum
            </p>
            <button onClick={connectWallet} className="btn-primary btn-large">
              Connect Wallet to Start
            </button>
            <div className="features">
              <div className="feature">
                <span className="feature-icon">✨</span>
                <div className="feature-text">
                  <h3>AI-Powered Chat</h3>
                  <p>Interact with Google Gemini</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">⚡</span>
                <div className="feature-text">
                  <h3>Instant Payments</h3>
                  <p>X402 Protocol Integration</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">🔒</span>
                <div className="feature-text">
                  <h3>Secure & Decentralized</h3>
                  <p>Built on Arbitrum</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <main className="main-content container">
          <div className="grid">
            {/* Left: Withdraw + Chat Interface */}
            <div className="grid-col-main">
              {/* Withdraw Bar ABOVE chat */}
              <Withdraw
                services={services}
                signer={signer}
                account={account}
              />

              <ChatInterface 
                account={account}
                services={services}
                onSelectService={setSelectedService}
                signer={signer}
              />
            </div>
            {/* Right: Services & Reviews */}
            <div className="grid-col-side">
              <ServiceList 
                services={services}
                loading={loading}
                onRefresh={loadServices}
                onSelectService={setSelectedService}
              />
              
              {selectedService && (
                <ReviewSection 
                  serviceId={selectedService.id}
                  serviceName={selectedService.name}
                  account={account}
                />
              )}
            </div>
          </div>
        </main>
      )}

      <footer className="footer">
        <div className="container footer-content">
          <p>Built with ❤️ on Arbitrum Stylus & X402</p>
          <div className="footer-links">
            <a href="https://sepolia.arbiscan.io" target="_blank" rel="noopener noreferrer">
              Arbiscan ↗
            </a>
            <a href="https://github.com/Aditya-alchemist/ArbAgents-Arbitrum-hackathon" onClick={(e) => e.preventDefault()}>Docs</a>
            <a href="https://github.com/Aditya-alchemist/ArbAgents-Arbitrum-hackathon" onClick={(e) => e.preventDefault()}>GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
