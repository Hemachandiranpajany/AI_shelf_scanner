import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="container">
            <Link to="/" className="logo">
              📚 Shelf Scanner
            </Link>
            <nav>
              <Link to="/">Scan</Link>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <div className="container">
            <p>© 2024 Shelf Scanner - AI-Powered Book Discovery</p>
            <p className="tech-stack">
              Powered by Google Gemini 2.0 Flash & Google Books API
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
