import React, { useState, useEffect } from 'react';
import { scanApi } from '../utils/api';
import { Book, Recommendation } from '../types';

interface ResultsProps {
  sessionId: string;
  onBack: () => void;
}

const Results: React.FC<ResultsProps> = ({ sessionId, onBack }) => {
  const [status, setStatus] = useState<'loading' | 'completed' | 'failed'>('loading');
  const [detectedBooks, setDetectedBooks] = useState<Book[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'detected' | 'recommendations'>('detected');

  useEffect(() => {
    pollResults();
  }, [sessionId]);

  const pollResults = async () => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds with 1 second intervals

    const poll = async () => {
      try {
        const result = await scanApi.getScanResult(sessionId);

        if (result.status === 'completed') {
          setDetectedBooks(result.detectedBooks || []);
          setRecommendations(result.recommendations || []);
          setStatus('completed');
        } else if (result.status === 'failed') {
          setError(result.error || 'Processing failed');
          setStatus('failed');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 1000);
        } else {
          setError('Processing timeout - please try again');
          setStatus('failed');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to get results');
        setStatus('failed');
      }
    };

    poll();
  };

  if (status === 'loading') {
    return (
      <div className="results-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <h2>Analyzing your bookshelf...</h2>
          <p>This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="results-container">
        <div className="error-state">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={onBack}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <div className="results-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h1>Scan Results</h1>
        <p>Found {detectedBooks.length} books</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'detected' ? 'active' : ''}`}
          onClick={() => setActiveTab('detected')}
        >
          Detected Books ({detectedBooks.length})
        </button>
        <button
          className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          Recommendations ({recommendations.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'detected' ? (
          <div className="books-grid">
            {detectedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="recommendations-list">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BookCard: React.FC<{ book: Book }> = ({ book }) => {
  return (
    <div className="book-card">
      {book.metadata.thumbnail && (
        <img 
          src={book.metadata.thumbnail} 
          alt={book.title}
          className="book-thumbnail"
        />
      )}
      <div className="book-info">
        <h3>{book.title}</h3>
        {book.author && <p className="author">by {book.author}</p>}
        <div className="confidence-badge">
          {Math.round(book.confidence_score * 100)}% confident
        </div>
        {book.metadata.categories && (
          <div className="categories">
            {book.metadata.categories.slice(0, 3).map((cat, idx) => (
              <span key={idx} className="category-tag">{cat}</span>
            ))}
          </div>
        )}
        {book.metadata.averageRating && (
          <div className="rating">
            ⭐ {book.metadata.averageRating.toFixed(1)} ({book.metadata.ratingsCount} ratings)
          </div>
        )}
      </div>
    </div>
  );
};

const RecommendationCard: React.FC<{ recommendation: Recommendation }> = ({ recommendation }) => {
  return (
    <div className="recommendation-card">
      <div className="recommendation-header">
        <div className="rank">#{recommendation.rank}</div>
        <div className="score-badge">
          {Math.round(recommendation.recommendation_score * 100)}% match
        </div>
      </div>
      
      {recommendation.metadata.thumbnail && (
        <img 
          src={recommendation.metadata.thumbnail} 
          alt={recommendation.title}
          className="recommendation-thumbnail"
        />
      )}
      
      <div className="recommendation-info">
        <h3>{recommendation.title}</h3>
        {recommendation.author && <p className="author">by {recommendation.author}</p>}
        
        <div className="reasoning">
          <strong>Why we recommend this:</strong>
          <p>{recommendation.reasoning}</p>
        </div>

        {recommendation.metadata.description && (
          <details className="description">
            <summary>Read more</summary>
            <p>{recommendation.metadata.description}</p>
          </details>
        )}
      </div>
    </div>
  );
};

export default Results;
