import React, { useState } from 'react';
import Scanner from '../components/Scanner';
import Results from '../components/Results';

const Home: React.FC = () => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const handleScanComplete = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleBack = () => {
    setCurrentSessionId(null);
  };

  return (
    <div className="home-page">
      {!currentSessionId ? (
        <Scanner onScanComplete={handleScanComplete} />
      ) : (
        <Results sessionId={currentSessionId} onBack={handleBack} />
      )}
    </div>
  );
};

export default Home;
