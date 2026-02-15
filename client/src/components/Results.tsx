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

          if (result.status === 'completed_detection' && (result.recommendations?.length || 0) === 0) {
            fetchRecommendations();
          } else if ((result.recommendations?.length || 0) > 0) {
            setRecStatus('completed');
          }
        } else if (result.status === 'failed') {
          setError(result.error || 'Processing failed');
          setStatus('failed');
        } else {
          setTimeout(poll, 1500);
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
        <div className="loading-state animate-fade-in">
          <div className="spinner"></div>
          <h2 className="section-title">Analyzing Your Shelves</h2>
          <p className="text-secondary">AI is identifying your books. This usually takes around 10 seconds.</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="results-container">
        <div className="error-state animate-slide-up">
          <div className="error-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 className="section-title">Scan Could Not Be Completed</h2>
          <p className="error-message">{error}</p>
          <div style={{ marginTop: '2rem' }}>
            <button className="btn btn-primary" onClick={onBack}>Return to Scanner</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <header className="results-header animate-slide-up">
        <button className="btn-back" onClick={onBack} title="Go Back">
          <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>←</span> Back
        </button>
        <h1>Found {detectedBooks.length} Books</h1>
      </header>

      <div className="tabs animate-slide-up" style={{ animationDelay: '0.1s' }}>
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
          {recStatus === 'loading' ? 'Generating Picks...' : `Recommendations (${recommendations.length})`}
        </button>
      </div>

      <div className="tab-content animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {activeTab === 'detected' ? (
          <div className="books-grid">
            {detectedBooks.length > 0 ? (
              detectedBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))
            ) : (
              <div className="text-center" style={{ gridColumn: '1/-1', padding: '4rem 0' }}>
                <p className="text-secondary">No books were clearly identified. Please try a clearer photo.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="recommendations-list">
            {recStatus === 'loading' && (
              <div className="loading-state" style={{ padding: '2rem 0' }}>
                <div className="spinner-small" style={{ margin: '0 auto 1rem' }}></div>
                <p>Curating your personalized recommendations...</p>
              </div>
            )}

            {recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <RecommendationCard key={idx} recommendation={rec} />
              ))
            ) : recStatus === 'completed' && (
              <div className="text-center" style={{ padding: '4rem 0' }}>
                <p className="text-secondary">AI suggestions are unavailable at the moment.</p>
              </div>
            )}

            {recStatus === 'failed' && (
              <div className="error-message">
                Something went wrong while generating recommendations.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const BookCard: React.FC<{ book: Book }> = ({ book }) => (
  <div className="book-card">
    <div className="book-info">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div className="confidence-badge">
          {Math.round(book.confidence_score * 100)}% Match
        </div>
      </div>
      <h3>{book.title}</h3>
      {book.author && <p className="author">by {book.author}</p>}
    </div>
  </div>
);

const RecommendationCard: React.FC<{ recommendation: Recommendation }> = ({ recommendation }) => (
  <div className="recommendation-card">
    <div className="recommendation-header">
      <div className="rank">#{recommendation.rank}</div>
      <div className="score-badge">
        {Math.round(recommendation.recommendation_score * 100)}% Match
      </div>
    </div>
    <div className="recommendation-info">
      <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.5rem' }}>
        {recommendation.title}
      </h3>
      <p className="author" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>by {recommendation.author}</p>

      <div className="reasoning">
        <strong>Why this matches your taste:</strong>
        <p style={{ color: 'var(--text-primary)', fontSize: '1.05rem', lineHeight: '1.6' }}>
          {recommendation.reasoning}
        </p>
      </div>
    </div>
  </div>
);

export default Results;
