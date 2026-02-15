import React, { useState } from 'react';
import Scanner from '../components/Scanner';
import Results from '../components/Results';

const Home: React.FC = () => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const handleScanComplete = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentSessionId(null);
  };

  if (currentSessionId) {
    return (
      <div className="results-page animate-fade-in">
        <Results sessionId={currentSessionId} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <h1 className="hero-title animate-slide-up">
            Smart bookshelf scanning meets <br />intelligent recommendations
          </h1>
          <p className="hero-quote animate-slide-up" style={{ animationDelay: '0.1s' }}>
            "Smart bookshelf scanning meets intelligent book recommendations. <br />
            <strong>Never miss a book you’ll love.</strong>"
          </p>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3>Snap & Scan</h3>
              <p>Take a clear photo of any bookshelf spines you encounter at a library, store, or a friend's house.</p>
            </div>
            <div className="step-card">
              <div className="step-number">02</div>
              <h3>AI Vision</h3>
              <p>Our advanced Gemini AI instantly identifies every title and author from your image with high precision.</p>
            </div>
            <div className="step-card">
              <div className="step-number">03</div>
              <h3>Smart Picks</h3>
              <p>Receive 5 high-accuracy book recommendations tailored specifically to the collection you just scanned.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Scanner Section */}
      <section className="scanner-section">
        <div className="container">
          <Scanner onScanComplete={handleScanComplete} />
        </div>
      </section>

      {/* Closing Section */}
      <section className="closing-section">
        <div className="container text-center">
          <h2 className="closing-title">Ready to Find Your Next Great Read?</h2>
          <p className="closing-text">
            ShelfScanner makes it easy to spot books you'll enjoy even in a sea of unfamiliar titles.
          </p>
          <div className="closing-action">
            <button className="btn btn-white" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Start Scanning Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
