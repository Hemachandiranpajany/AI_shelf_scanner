-- Shelf Scanner Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100),
    goodreads_user_id VARCHAR(100) UNIQUE,
    goodreads_access_token TEXT,
    goodreads_access_token_secret TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reading history table
CREATE TABLE IF NOT EXISTS reading_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_title VARCHAR(500) NOT NULL,
    book_author VARCHAR(500),
    book_isbn VARCHAR(20),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    status VARCHAR(50) DEFAULT 'read',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_isbn)
);

-- Scan sessions table
CREATE TABLE IF NOT EXISTS scan_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_token VARCHAR(100) UNIQUE NOT NULL,
    image_url TEXT,
    image_data_encrypted TEXT,
    status VARCHAR(50) DEFAULT 'processing',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

-- Detected books table
CREATE TABLE IF NOT EXISTS detected_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_session_id UUID REFERENCES scan_sessions(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(500),
    isbn VARCHAR(20),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    google_books_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    position_in_image JSONB,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_session_id UUID REFERENCES scan_sessions(id) ON DELETE CASCADE,
    detected_book_id UUID REFERENCES detected_books(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(500),
    author VARCHAR(500),
    recommendation_score DECIMAL(3,2) CHECK (recommendation_score >= 0 AND recommendation_score <= 1),
    reasoning TEXT,
    metadata JSONB DEFAULT '{}',
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_session_id UUID REFERENCES scan_sessions(id) ON DELETE CASCADE,
    detected_book_id UUID REFERENCES detected_books(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feedback_type VARCHAR(50) NOT NULL,
    is_correct BOOLEAN,
    corrected_title VARCHAR(500),
    corrected_author VARCHAR(500),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_goodreads_id ON users(goodreads_user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_user_id ON scan_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_token ON scan_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_expires ON scan_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_detected_books_session ON detected_books(scan_session_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_session ON recommendations(scan_session_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON user_feedback(scan_session_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM scan_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- View for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(DISTINCT ss.id) as total_scans,
    COUNT(DISTINCT db.id) as total_books_detected,
    COUNT(DISTINCT rh.id) as total_books_read,
    AVG(db.confidence_score) as avg_confidence_score
FROM users u
LEFT JOIN scan_sessions ss ON u.id = ss.user_id
LEFT JOIN detected_books db ON ss.id = db.scan_session_id
LEFT JOIN reading_history rh ON u.id = rh.user_id
GROUP BY u.id, u.email;

-- Grant permissions (adjust as needed for your deployment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shelf_scanner_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shelf_scanner_user;
