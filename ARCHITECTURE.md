# Shelf Scanner - Architecture & Design

## System Overview

Shelf Scanner is a full-stack web application that uses AI to identify books from photos and provide personalized recommendations.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      Client (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Scanner    │  │   Results    │  │   History    │  │
│  │  Component   │  │  Component   │  │  Component   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                 │                 │          │
│           └─────────────────┴─────────────────┘          │
│                         │                                │
│                    API Client                            │
└────────────────────────┼────────────────────────────────┘
                         │ HTTPS
┌────────────────────────┼────────────────────────────────┐
│                   Server (Express)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Scan Routes  │  │ User Routes  │  │History Routes│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │           │
│  ┌──────┴─────────────────┴──────────────────┘           │
│  │            Middleware Layer                           │
│  │  • Authentication  • Rate Limiting  • Error Handling  │
│  └──────┬─────────────────┬──────────────────┬───────────│
│         │                 │                  │           │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  │
│  │    Gemini    │  │ Google Books │  │   Database   │  │
│  │   Service    │  │   Service    │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────┘
           │                 │                  │
           │                 │                  │
┌──────────┴────┐  ┌─────────┴────┐  ┌─────────┴─────────┐
│  Gemini API   │  │ Google Books │  │   PostgreSQL      │
│ (Book Vision) │  │     API      │  │   Database        │
└───────────────┘  └──────────────┘  └───────────────────┘
```

## Data Flow

### 1. Image Upload Flow

```
User uploads image
    ↓
Frontend validates (size, type)
    ↓
POST /api/scan with FormData
    ↓
Server creates scan session
    ↓
Returns sessionId immediately (202)
    ↓
Async processing begins
    ↓
Frontend polls GET /api/scan/:sessionId
```

### 2. Image Processing Flow

```
Image received by server
    ↓
Image stored temporarily
    ↓
Sent to Gemini 2.0 Flash
    ↓
Gemini extracts book titles/authors
    ↓
For each book:
  ├─ Query Google Books API
  ├─ Get metadata (cover, description, etc.)
  └─ Store in database
    ↓
Generate recommendations (if user logged in)
    ↓
Update session status to 'completed'
    ↓
Client receives results on next poll
```

### 3. Recommendation Flow

```
Detected book + User preferences
    ↓
Reading history retrieved
    ↓
Sent to Gemini for analysis
    ↓
Gemini generates:
  ├─ Recommendation score (0-1)
  └─ Reasoning (2-3 sentences)
    ↓
Stored in database with rank
    ↓
Returned to user sorted by score
```

## Database Schema

### Core Tables

**scan_sessions**
- Tracks each image scan
- Stores session token for anonymous access
- Links to user if authenticated
- Status: processing → completed/failed

**detected_books**
- Books found in each scan
- Confidence score from AI
- Enriched metadata from Google Books
- Position in image (for future features)

**recommendations**
- AI-generated recommendations
- Score and reasoning
- Ranked by relevance

**users**
- User profiles
- Reading preferences (genres, authors)
- OAuth tokens (future)

**reading_history**
- Books user has read/rated
- Used for personalization

**user_feedback**
- Corrections and ratings
- Improves future detections

## Technology Choices

### Why React?
- ✅ Component-based architecture
- ✅ Large ecosystem
- ✅ Mobile-responsive with minimal effort
- ✅ Easy state management for scan results

### Why Express?
- ✅ Minimalist and flexible
- ✅ Excellent middleware ecosystem
- ✅ Easy to deploy serverless (Vercel)
- ✅ TypeScript support

### Why PostgreSQL?
- ✅ JSONB for flexible metadata storage
- ✅ Excellent performance for complex queries
- ✅ ACID compliance
- ✅ Free tier available (Neon, Supabase)

### Why Gemini 2.0 Flash?
- ✅ **FREE** - 1M requests/month
- ✅ Excellent vision capabilities
- ✅ Fast inference (~2-3s)
- ✅ Multimodal (text + image)
- ✅ No credit card required

### Why Google Books API?
- ✅ FREE with generous limits
- ✅ Comprehensive book metadata
- ✅ High-quality cover images
- ✅ No authentication needed (with API key)

## Security Architecture

### Layers of Security

**1. Transport Layer**
- HTTPS enforced (Vercel automatic)
- TLS 1.2+

**2. Application Layer**
- Helmet.js security headers
- CORS configuration
- Rate limiting (100 req/15min)
- Request size limits (10MB)

**3. Data Layer**
- AES-256-GCM encryption for sensitive data
- Parameterized queries (SQL injection prevention)
- JWT for session management
- Bcrypt for password hashing (future)

**4. API Layer**
- API keys in environment variables
- Token rotation support
- Request validation
- Timeout protection (30s)

## Performance Optimizations

### Caching Strategy

**In-Memory Cache (NodeCache)**
- Book metadata: 5 minutes
- API responses: 2 minutes
- Reduces external API calls by ~70%

**Database Query Optimization**
- Indexes on frequently queried columns
- Connection pooling (max 20 connections)
- Prepared statements

**Async Processing**
- Image processing off main thread
- Non-blocking I/O
- Polling pattern for results

### Scalability Considerations

**Current Capacity**
- ~100 concurrent users
- ~1000 scans per day
- Database: 10GB free tier

**Scaling Options**
1. Horizontal scaling (Vercel automatic)
2. Database read replicas
3. Redis for distributed caching
4. S3/R2 for image storage
5. CDN for static assets

## API Design Principles

### RESTful Endpoints

```
POST   /api/scan              # Create scan session
GET    /api/scan/:id          # Poll results
POST   /api/scan/:id/feedback # Submit feedback

GET    /api/user/profile      # Get user data
PUT    /api/user/profile      # Update user
POST   /api/user/reading-history

GET    /api/history           # List scans
GET    /api/history/:id       # Get details
DELETE /api/history/:id       # Delete scan
```

### Response Format

**Success**:
```json
{
  "sessionId": "uuid",
  "status": "completed",
  "detectedBooks": [...],
  "recommendations": [...]
}
```

**Error**:
```json
{
  "error": "Description of error",
  "code": "ERROR_CODE"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `202` - Accepted (processing)
- `400` - Bad request
- `401` - Unauthorized
- `404` - Not found
- `429` - Rate limit exceeded
- `500` - Server error

## Error Handling

### Client-Side

```typescript
try {
  const result = await scanApi.uploadImage(file);
  // Handle success
} catch (error) {
  if (error.response?.status === 429) {
    // Rate limit - show retry message
  } else if (error.response?.status === 413) {
    // File too large
  } else {
    // Generic error
  }
}
```

### Server-Side

```typescript
// Global error handler
app.use((err, req, res, next) => {
  logger.error('Error occurred', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.isOperational 
    ? err.message 
    : 'Internal server error';
  
  res.status(statusCode).json({ error: message });
});
```

## Testing Strategy

### Unit Tests
- Service layer functions
- Utility functions (encryption, validation)
- Database queries

### Integration Tests
- API endpoint responses
- Database operations
- External API mocking

### E2E Tests
- Complete user flows
- Image upload → results
- Authentication flows

## Future Enhancements

### Phase 2 Features

1. **User Authentication**
   - Email/password signup
   - OAuth (Google, Apple)
   - Reading profile persistence

2. **Advanced Recommendations**
   - ML-based collaborative filtering
   - Genre-based clustering
   - Similar readers network

3. **Social Features**
   - Share scans with friends
   - Reading challenges
   - Book clubs

4. **Mobile Apps**
   - React Native for iOS/Android
   - Offline mode
   - Push notifications

5. **Barcode Scanning**
   - ISBN barcode detection
   - Instant book lookup
   - Library integration

### Technical Improvements

1. **Performance**
   - Image compression before upload
   - WebP format support
   - Service worker caching

2. **Accuracy**
   - Fine-tune Gemini prompts
   - Multi-model ensemble
   - User feedback learning

3. **Analytics**
   - User behavior tracking
   - A/B testing framework
   - Performance monitoring

## Cost Estimates

### Current Stack (Free Tier)

- **Gemini API**: FREE (1M requests/month)
- **Google Books API**: FREE
- **Vercel**: FREE (hobby tier)
- **Database**: FREE (Neon/Supabase)
- **Total**: $0/month

### At Scale (1000 users/day)

- **Gemini**: Still FREE (under limits)
- **Google Books**: Still FREE
- **Vercel**: $20/month (Pro tier)
- **Database**: $25/month (Neon Pro)
- **Total**: ~$45/month

## Monitoring & Observability

### Metrics to Track

**Performance**
- API response times
- Image processing duration
- Database query latency

**Usage**
- Scans per day
- Books detected per scan
- Recommendation acceptance rate

**Errors**
- Failed scans
- API errors
- Database connection issues

**Business**
- User retention
- Feature adoption
- Conversion rates

## Development Workflow

```
main (production)
  ↑
develop (staging)
  ↑
feature branches
```

**Process**:
1. Create feature branch
2. Develop locally
3. Submit PR to develop
4. Review + test on staging
5. Merge to main
6. Auto-deploy to production

## Contributing Guidelines

See CONTRIBUTING.md (to be created)

## License

MIT - See LICENSE file
