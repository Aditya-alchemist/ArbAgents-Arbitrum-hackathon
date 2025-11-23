import React from 'react';
import './Header.css';

function Header({ account, onConnect }) {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🤖</span>
            <div className="logo-text">
              <h1>
                <span className="gradient-text">Agent</span>Market
              </h1>
              <p className="tagline">AI Services + X402</p>
            </div>
          </div>
        </div>

        <div className="header-right">
          {account ? (
            <div className="account-info">
              <div className="account-badge">
                <span className="status-dot"></span>
                <span className="account-text">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
            </div>
          ) : (
            <button onClick={onConnect} className="btn-primary">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
