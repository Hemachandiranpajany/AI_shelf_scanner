# Quick Start Guide

Get Shelf Scanner running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed
- Google Gemini API key ([Get it FREE here](https://aistudio.google.com/app/apikey))

## Setup Steps

### 1. Install Dependencies

```bash
cd shelf-scanner
npm run install-all
```

This installs dependencies for both client and server.

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your editor
nano .env
```

**Minimum required variables**:
```env
# Database
DATABASE_URL=postgresql://localhost:5432/shelf_scanner

# Google Gemini (FREE - get at https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_api_key_here

# Security (generate random strings)
JWT_SECRET=any_random_string_min_32_characters_long
ENCRYPTION_KEY=another_random_string_min_32_chars
```

**To generate secure random strings**:
```bash
# On Mac/Linux
openssl rand -hex 32

# Or use online generator
# https://www.random.org/strings/
```

### 3. Setup Database

```bash
# Create database
createdb shelf_scanner

# Run schema
psql shelf_scanner < database/schema.sql
```

If you don't have PostgreSQL installed:
- **Mac**: `brew install postgresql@14`
- **Ubuntu**: `sudo apt install postgresql-14`
- **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/)

### 4. Start Development

```bash
npm run dev
```

This starts:
- ✅ Frontend: http://localhost:3000
- ✅ Backend: http://localhost:5000

### 5. Test It Out!

1. Open http://localhost:3000
2. Click "Take Photo" or "Choose from Gallery"
3. Upload a photo of books
4. Wait for AI processing (~3-5 seconds)
5. See detected books and recommendations!

## Troubleshooting

### "Database connection failed"
```bash
# Check PostgreSQL is running
pg_isready

# Start PostgreSQL if needed
# Mac: brew services start postgresql@14
# Ubuntu: sudo service postgresql start
```

### "GEMINI_API_KEY not set"
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy key to `.env` file

### "Port 3000 already in use"
```bash
# Kill process on port 3000
# Mac/Linux: lsof -ti:3000 | xargs kill
# Windows: netstat -ano | findstr :3000
```

### "Cannot find module"
```bash
# Reinstall dependencies
rm -rf node_modules client/node_modules server/node_modules
npm run install-all
```

## Next Steps

### Optional Enhancements

1. **Google Books API** (for higher rate limits):
   - Get key at [Google Cloud Console](https://console.cloud.google.com)
   - Add to `.env`: `GOOGLE_BOOKS_API_KEY=your_key`

2. **Production Database** (for deployment):
   - Use [Neon](https://neon.tech) (free tier)
   - Or [Vercel Postgres](https://vercel.com/storage/postgres)
   - Update `DATABASE_URL` with connection string

3. **Deploy to Vercel**:
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

## Development Tips

### Run only backend:
```bash
npm run server:dev
```

### Run only frontend:
```bash
npm run client:dev
```

### Build for production:
```bash
npm run build
```

### Run tests:
```bash
npm test
```

## Need Help?

- 📖 [Full README](./README.md)
- 🔑 [Gemini Setup Guide](./GEMINI_SETUP.md)
- 🐛 [Open an Issue](https://github.com/your-repo/issues)

## What's Next?

Try these features:
- 📚 Add books to your reading history
- ⭐ Rate detected books
- 🎯 Set reading preferences
- 📊 View scan history
- 🔍 Get personalized recommendations

Happy scanning! 📖✨
