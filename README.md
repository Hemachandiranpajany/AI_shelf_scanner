# Shelf Scanner

AI-powered book discovery app that helps you identify books from bookshelf photos and get personalized recommendations based on your reading preferences.

## Features

- 📷 **AI Book Recognition**: Scan bookshelves using Google Gemini Flash (Highly Accurate!)
- 📚 **Personalized Recommendations**: Get 5 NEW book suggestions based on your shelf
- ⚡ **Batch Optimized**: Smart API batching to work reliably on Gemini's free tier
- 👤 **Guest Friendly**: Recommendations work instantly, even without an account
- 📊 **Scan History**: Track your discoveries and recommendations
- 💰 **Free to Use**: Powered by Google Gemini's generous free tier

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL
- **AI**: Google Gemini Flash (Latest Stable)
- **Book Metadata**: Google Books API
- **Deployment**: Vercel

## Project Structure

```
shelf-scanner/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # API client
│   │   └── types/         # TypeScript types
├── server/                # Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Utilities
├── database/              # Database schema
└── ...
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 18+ (Recommended)
- **Google Gemini API key** (FREE - get it at [Google AI Studio](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd shelf-scanner
```

2. **Install dependencies**:
```bash
npm install
cd client && npm install
cd ../server && npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your API keys
```

Required environment variables:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/shelf_scanner
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_secure_random_jwt_secret
ENCRYPTION_KEY=your_secure_random_encryption_key (min 32 chars)
```

4. **Set up the database**:
```bash
# Create PostgreSQL database
createdb shelf_scanner

# Run schema
psql shelf_scanner < database/schema.sql
```

5. **Start development servers**:
```bash
npm run dev
```

This will automatically start:
- React frontend: http://localhost:3000
- Express backend: http://localhost:5000

## How It Works

1. **Upload Image**: Take a clear photo of your bookshelf spines.
2. **AI Vision**: Google Gemini Flash analyzes the image to extract accurate titles and authors.
3. **Data Enrichment**: Google Books API fetches high-quality covers and ratings.
4. **Smart Batch Recommendations**: The AI analyzes your entire shelf and recommends 5 COMPLETELY NEW books you'll love, optimized for API quota limits.
5. **Instant Feedback**: View detected books and recommendations side-by-side.

## API Endpoints

### Image Processing
- `POST /api/scan` - Upload and process bookshelf image
- `GET /api/scan/:sessionId` - Get scan results (polling endpoint)
- `POST /api/scan/:sessionId/feedback` - Submit user feedback

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `PUT /api/user/preferences` - Update reading preferences
- `POST /api/user/reading-history` - Add book to reading history
- `GET /api/user/reading-history` - Get reading history

### History
- `GET /api/history` - Get user scan history
- `GET /api/history/:sessionId` - Get specific scan details
- `DELETE /api/history/:sessionId` - Delete scan session

## Deployment

### Vercel Deployment

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Login and Deploy**:
```bash
vercel login
vercel --prod
```

3. **Configure Environment Variables** in Vercel Dashboard:
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `JWT_SECRET` - Secure random string
- `ENCRYPTION_KEY` - Secure random string
- `CLIENT_URL` - Your production URL

### Database Setup

**Option 1: Vercel Postgres**
1. Create Vercel Postgres database in dashboard
2. Vercel automatically sets `DATABASE_URL`
3. Run schema: `psql $DATABASE_URL -f database/schema.sql`

**Option 2: External Provider (Neon, Supabase)**
1. Create PostgreSQL database with SSL
2. Add connection string to Vercel
3. Run schema from `database/schema.sql`

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Code Structure

**Backend Services**:
- `gemini.service.ts` - AI book detection and recommendations
- `googleBooks.service.ts` - Book metadata enrichment

**Frontend Components**:
- `Scanner.tsx` - Image upload and camera capture
- `Results.tsx` - Display detected books and recommendations
- `Home.tsx` - Main page component

## Environment Variables

See `.env.example` for all configuration options.

## Tips for Best Results

- **Good Lighting**: Ensure bookshelf is well-lit
- **Parallel Angle**: Keep camera parallel to bookshelf
- **Clear Spines**: Make sure book spines are clearly visible
- **Avoid Glare**: Minimize reflections and shadows

## Security Features

- ✅ AES-256-GCM encryption for sensitive data
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ JWT authentication
- ✅ GDPR compliance (data deletion endpoint)

## Performance

- ⚡ Async image processing
- ⚡ Response caching
- ⚡ Database query optimization
- ⚡ CDN deployment via Vercel

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

- Google Gemini for free AI vision capabilities
- Google Books API for book metadata
- Vercel for hosting platform
