import React from 'react';
import './ServiceList.css';

function ServiceList({ services, loading, onRefresh, onSelectService }) {
  return (
    <div className="service-list-container card">
      <div className="service-list-header">
        <h3 className="service-list-title">
          <span className="title-icon">🛍️</span>
          Marketplace
        </h3>
        <button onClick={onRefresh} className="btn-secondary btn-small">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading services...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <p className="empty-title">No services available</p>
          <p className="empty-subtitle">Be the first to list a service!</p>
        </div>
      ) : (
        <div className="service-list">
          {services.map((service) => (
            <div
              key={service.id}
              className="service-item"
              onClick={() => onSelectService(service)}
            >
              <div className="service-item-header">
                <h4 className="service-name">{service.name}</h4>
                <span className={`service-status ${service.isActive ? 'active' : 'inactive'}`}>
                  {service.isActive ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>

              <div className="service-stats">
                <div className="stat">
                  <span className="stat-label">Price</span>

                  {/* 👇 UPDATED HERE — Using ETH, nicely formatted */}
                  <span className="stat-value">
                    {Number(service.priceEth).toFixed(4)} ETH
                  </span>
                </div>

                <div className="stat">
                  <span className="stat-label">Uses</span>
                  <span className="stat-value">{service.totalCalls}</span>
                </div>

                <div className="stat">
                  <span className="stat-label">Rating</span>
                  <span className="stat-value">⭐ {service.reputation}/100</span>
                </div>
              </div>

              <div className="service-owner">
                <span className="owner-label">Owner:</span>
                <span className="owner-address">
                  {service.owner.slice(0, 6)}...{service.owner.slice(-4)}
                </span>
              </div>

              <button className="btn-primary btn-small service-btn">
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ServiceList;
