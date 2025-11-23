// Off-chain review storage using localStorage
// In production, you'd use a backend database or IPFS

const STORAGE_KEY_PREFIX = 'agentmarket_reviews_';

// Get all reviews for a service
export function getReviews(serviceId) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${serviceId}`;
    const reviews = localStorage.getItem(key);
    return reviews ? JSON.parse(reviews) : [];
  } catch (error) {
    console.error('Error loading reviews:', error);
    return [];
  }
}

// Add a new review
export function addReview(serviceId, review) {
  try {
    const reviews = getReviews(serviceId);
    
    const newReview = {
      ...review,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };

    reviews.unshift(newReview); // Add to beginning
    
    const key = `${STORAGE_KEY_PREFIX}${serviceId}`;
    localStorage.setItem(key, JSON.stringify(reviews));
    
    console.log(`✅ Review added for service ${serviceId}`);
    return reviews;
  } catch (error) {
    console.error('Error adding review:', error);
    return getReviews(serviceId);
  }
}

// Get average rating for a service
export function getAverageRating(serviceId) {
  const reviews = getReviews(serviceId);
  
  if (reviews.length === 0) {
    return 0;
  }

  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  const average = sum / reviews.length;
  
  return Number(average.toFixed(1));
}

// Get rating distribution (for charts)
export function getRatingDistribution(serviceId) {
  const reviews = getReviews(serviceId);
  
  const distribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  reviews.forEach(review => {
    const rating = Math.round(review.rating);
    if (rating >= 1 && rating <= 5) {
      distribution[rating]++;
    }
  });

  return distribution;
}

// Get review count
export function getReviewCount(serviceId) {
  return getReviews(serviceId).length;
}

// Delete a review (for moderation)
export function deleteReview(serviceId, reviewId) {
  try {
    const reviews = getReviews(serviceId);
    const filtered = reviews.filter(r => r.id !== reviewId);
    
    const key = `${STORAGE_KEY_PREFIX}${serviceId}`;
    localStorage.setItem(key, JSON.stringify(filtered));
    
    console.log(`🗑️ Review ${reviewId} deleted`);
    return filtered;
  } catch (error) {
    console.error('Error deleting review:', error);
    return getReviews(serviceId);
  }
}

// Export all reviews (for backup)
export function exportAllReviews() {
  const allReviews = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      const serviceId = key.replace(STORAGE_KEY_PREFIX, '');
      allReviews[serviceId] = getReviews(serviceId);
    }
  }
  
  return allReviews;
}

// Import reviews (for restore)
export function importReviews(reviewsData) {
  try {
    Object.entries(reviewsData).forEach(([serviceId, reviews]) => {
      const key = `${STORAGE_KEY_PREFIX}${serviceId}`;
      localStorage.setItem(key, JSON.stringify(reviews));
    });
    
    console.log('✅ Reviews imported successfully');
    return true;
  } catch (error) {
    console.error('Error importing reviews:', error);
    return false;
  }
}

// Clear all reviews (for testing)
export function clearAllReviews() {
  const keys = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      keys.push(key);
    }
  }
  
  keys.forEach(key => localStorage.removeItem(key));
  console.log(`🗑️ Cleared ${keys.length} review collections`);
}
