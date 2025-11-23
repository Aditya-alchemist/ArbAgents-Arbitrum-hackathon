import React, { useState, useEffect } from 'react';
import { getReviews, addReview, getAverageRating } from '../utils/reviews';
import './ReviewSection.css';

function ReviewSection({ serviceId, serviceName, account }) {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    loadReviews();
  }, [serviceId]);

  const loadReviews = () => {
    const reviewData = getReviews(serviceId);
    setReviews(reviewData);
    setAverageRating(getAverageRating(serviceId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const review = {
      ...newReview,
      reviewer: account,
    };

    addReview(serviceId, review);
    loadReviews();
    setNewReview({ rating: 5, comment: '' });
    setShowForm(false);
  };

  return (
    <div className="review-section card">
      <div className="review-header">
        <h3 className="review-title">
          <span className="title-icon">⭐</span>
          Reviews
        </h3>
        <div className="review-rating">
          <span className="rating-value">{averageRating}</span>
          <span className="rating-stars">{'⭐'.repeat(Math.round(averageRating))}</span>
          <span className="rating-count">({reviews.length})</span>
        </div>
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-secondary btn-full">
          Write a Review
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="review-form">
          <div className="form-group">
            <label className="form-label">Rating</label>
            <div className="rating-selector">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewReview({ ...newReview, rating: star })}
                  className={`star-btn ${star <= newReview.rating ? 'active' : ''}`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Comment</label>
            <textarea
              value={newReview.comment}
              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
              placeholder="Share your experience..."
              className="form-textarea"
              rows="4"
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Submit Review
            </button>
          </div>
        </form>
      )}

      <div className="review-list">
        {reviews.length === 0 ? (
          <div className="no-reviews">
            <p>No reviews yet. Be the first!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="review-item">
              <div className="review-item-header">
                <div className="reviewer-info">
                  <span className="reviewer-address">
                    {review.reviewer.slice(0, 6)}...{review.reviewer.slice(-4)}
                  </span>
                  <span className="review-rating">
                    {'⭐'.repeat(review.rating)}
                  </span>
                </div>
                <span className="review-date">
                  {new Date(review.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="review-comment">{review.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ReviewSection;
