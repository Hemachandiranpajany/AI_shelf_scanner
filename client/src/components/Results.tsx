import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Book, Recommendation } from '../types';

interface ResultsProps {
  sessionId: string;
  onBack: () => void;
}

const Results: React.FC<ResultsProps> = ({ sessionId, onBack }) => {
  const [status, setStatus] = useState<'loading' | 'completed' | 'failed'>('loading');
  const [detectedBooks, setDetectedBooks] = useState<Book[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recStatus, setRecStatus] = useState<'none' | 'loading' | 'completed' | 'failed'>('none');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'detected' | 'recommendations'>('detected');

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const fetchRecommendations = useCallback(async () => {
    if (recStatus !== 'none') return;
    setRecStatus('loading');
    try {
      const response = await axios.get(`${API_URL}/scan/${sessionId}/recommendations`);
      setRecommendations(response.data);
      setRecStatus('completed');
    } catch (err) {
      setRecStatus('failed');
    }
  }, [sessionId, recStatus, API_URL]);

  const pollResults = useCallback(async () => {
    const poll = async () => {
      try {
        const response = await axios.get(`${API_URL}/scan/${sessionId}`);
        const result = response.data;

        if (result.status === 'completed_detection' || result.status === 'completed') {
          setDetectedBooks(result.detectedBooks || []);
          setRecommendations(result.recommendations || []);
          setStatus('completed');

          // Trigger recommendations if they don't exist yet
          if (result.status === 'completed_detection' && result.recommendations.length === 0) {
            fetchRecommendations();
          } else if (result.recommendations.length > 0) {
            setRecStatus('completed');
          }
        } else if (result.status === 'failed') {
          setError(result.error || 'Processing failed');
          setStatus('failed');
        } else {
          setTimeout(poll, 1000);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to get results');
        setStatus('failed');
      }
    };
    poll();
  }, [sessionId, API_URL, fetchRecommendations]);

  useEffect(() => {
    if (sessionId) {
      pollResults();
    }
  }, [sessionId, pollResults]);

  if (status === 'loading') {
    return (
      <div className="results-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <h2>Analysing bookshelf photos...</h2>
          <p>This takes about 5-8 seconds on the free tier</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="results-container">
        <div className="error-state">
          <h2>Oops! Scan failed</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={onBack}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <div className="results-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h1>Found {detectedBooks.length} Books</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'detected' ? 'active' : ''}`}
          onClick={() => setActiveTab('detected')}
        >
          My Shelf ({detectedBooks.length})
        </button>
        <button
          className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          Recommendations {recStatus === 'loading' ? '(...)' : `(${recommendations.length})`}
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
            {recStatus === 'loading' && (
              <div className="loading-substate">
                <div className="spinner-small"></div>
                <p>Generating personalized AI suggestions...</p>
              </div>
            )}
            {recommendations.map((rec, idx) => (
              <RecommendationCard key={idx} recommendation={rec} />
            ))}
            {recStatus === 'failed' && <p>Could not generate recommendations this time.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

const BookCard: React.FC<{ book: Book }> = ({ book }) => (
  <div className="book-card">
    <div className="book-info">
      <h3>{book.title}</h3>
      {book.author && <p className="author">by {book.author}</p>}
      <div className="confidence-badge">{Math.round(book.confidence_score * 100)}% match</div>
    </div>
  </div>
);

const RecommendationCard: React.FC<{ recommendation: Recommendation }> = ({ recommendation }) => (
  <div className="recommendation-card">
    <div className="recommendation-header">
      <div className="rank">#{recommendation.rank}</div>
      <div className="score-badge">{Math.round(recommendation.recommendation_score * 100)}% match</div>
    </div>
    <div className="recommendation-info">
      <h3>{recommendation.title}</h3>
      <p className="author">by {recommendation.author}</p>
      <div className="reasoning">
        <strong>Why you'll like it:</strong>
        <p>{recommendation.reasoning}</p>
      </div>
    </div>
  </div>
);

export default Results;
