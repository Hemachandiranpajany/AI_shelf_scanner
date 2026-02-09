# Deployment Guide

Complete guide for deploying Shelf Scanner to production.

## Pre-Deployment Checklist

- [ ] Google Gemini API key obtained
- [ ] PostgreSQL database ready (with SSL)
- [ ] Environment variables prepared
- [ ] Code tested locally
- [ ] Database schema applied

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides:
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Serverless functions
- ✅ Easy rollbacks
- ✅ Free tier available

#### Step-by-Step Vercel Deployment

**1. Install Vercel CLI**
```bash
npm install -g vercel
```

**2. Login to Vercel**
```bash
vercel login
```

**3. Link Project**
```bash
cd shelf-scanner
vercel link
```

**4. Set Environment Variables**

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:

**Required**:
```
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=secure_random_string_min_32_chars
ENCRYPTION_KEY=secure_random_string_min_32_chars
CLIENT_URL=https://your-domain.vercel.app
NODE_ENV=production
```

**Optional**:
```
GOOGLE_BOOKS_API_KEY=your_google_books_key
GOODREADS_API_KEY=your_goodreads_key
GOODREADS_API_SECRET=your_goodreads_secret
```

**5. Deploy**
```bash
vercel --prod
```

Your app will be live at: `https://your-app.vercel.app`

#### Database Setup for Vercel

**Option A: Vercel Postgres**

1. Go to Vercel Dashboard → Storage → Create Database
2. Select "Postgres"
3. Vercel automatically sets `DATABASE_URL`
4. Connect and run schema:
```bash
# Get connection string from Vercel dashboard
export DATABASE_URL="postgresql://..."

# Run schema
psql $DATABASE_URL -f database/schema.sql
```

**Option B: Neon (Recommended for Free Tier)**

1. Go to [neon.tech](https://neon.tech)
2. Create free account
3. Create new project
4. Copy connection string
5. Add to Vercel environment variables:
```
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require
```
6. Run schema:
```bash
psql "postgresql://..." -f database/schema.sql
```

**Option C: Supabase**

1. Go to [supabase.com](https://supabase.com)
2. Create project
3. Get connection string from Settings → Database
4. Add to Vercel with `?sslmode=require`
5. Run schema in Supabase SQL Editor or via psql

### Option 2: Railway

Railway provides:
- ✅ Integrated PostgreSQL
- ✅ Automatic deployments
- ✅ Free tier with $5 credit

#### Railway Deployment

**1. Install Railway CLI**
```bash
npm install -g @railway/cli
```

**2. Login and Initialize**
```bash
railway login
cd shelf-scanner
railway init
```

**3. Add PostgreSQL**
```bash
railway add postgres
```

**4. Set Environment Variables**
```bash
railway variables set GEMINI_API_KEY=your_key
railway variables set JWT_SECRET=your_secret
railway variables set ENCRYPTION_KEY=your_encryption_key
```

**5. Deploy**
```bash
railway up
```

### Option 3: Docker + Any VPS

#### Dockerfile (Backend)

Create `server/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

#### Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: shelf_scanner
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"

  backend:
    build: ./server
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/shelf_scanner
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    ports:
      - "5000:5000"
    depends_on:
      - postgres

  frontend:
    build: ./client
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

Deploy:
```bash
docker-compose up -d
```

## Post-Deployment

### 1. Health Check

Test your deployment:
```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "database": "connected"
}
```

### 2. Test Image Upload

1. Visit your deployed URL
2. Upload a test image
3. Verify books are detected
4. Check recommendations appear

### 3. Monitor Logs

**Vercel**:
```bash
vercel logs --follow
```

**Railway**:
```bash
railway logs
```

**Docker**:
```bash
docker-compose logs -f
```

### 4. Set Up Monitoring

#### Option A: Vercel Analytics

1. Go to Vercel Dashboard → Analytics
2. Enable analytics for your project
3. Monitor traffic, performance, errors

#### Option B: Custom Logging

Add application monitoring:
- [Sentry](https://sentry.io) - Error tracking
- [LogRocket](https://logrocket.com) - Session replay
- [Datadog](https://datadoghq.com) - APM

## Security Checklist

### Production Security

- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Environment variables secured (never in code)
- [ ] Rate limiting active (100 req/15min)
- [ ] CORS configured correctly
- [ ] Security headers enabled (Helmet)
- [ ] Database SSL enabled
- [ ] JWT secrets are strong (32+ chars)
- [ ] Encryption keys are random
- [ ] File upload limits enforced (10MB)
- [ ] SQL injection protected (parameterized queries)

### Database Security

```sql
-- Create read-only user for monitoring
CREATE USER shelf_scanner_readonly WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE shelf_scanner TO shelf_scanner_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO shelf_scanner_readonly;

-- Create app user with limited permissions
CREATE USER shelf_scanner_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE shelf_scanner TO shelf_scanner_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO shelf_scanner_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO shelf_scanner_app;
```

## Performance Optimization

### 1. Enable Caching

In production, responses are automatically cached:
- Book metadata: 5 minutes
- Search results: 2 minutes

### 2. Database Optimization

```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_sessions_created_at 
ON scan_sessions(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detected_books_title 
ON detected_books(title);

-- Vacuum and analyze
VACUUM ANALYZE;
```

### 3. Image Optimization

Images are automatically compressed before processing. Adjust in code if needed:
```typescript
// server/src/routes/scan.routes.ts
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
```

## Backup and Recovery

### Database Backups

**Automated (Vercel/Neon)**:
- Automatic daily backups included
- Point-in-time recovery available

**Manual Backup**:
```bash
# Backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20240101.sql
```

### Disaster Recovery

1. Keep backups in multiple locations
2. Test restore procedure monthly
3. Document recovery steps
4. Keep environment variables backed up securely

## Scaling Considerations

### Horizontal Scaling

Vercel automatically scales serverless functions. For high traffic:

1. **Database Connection Pooling**:
```typescript
const pool = new Pool({
  max: 20, // Increase for more traffic
  connectionTimeoutMillis: 10000
});
```

2. **Redis Caching** (optional):
```bash
# Add Redis for session storage
npm install ioredis
```

3. **CDN for Images**:
- Store images in S3/R2
- Serve via CloudFront/Cloudflare

### Monitoring Thresholds

Set up alerts for:
- API response time > 5s
- Error rate > 1%
- Database connections > 80%
- Gemini API rate limits

## Rollback Procedure

If deployment fails:

**Vercel**:
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

**Docker**:
```bash
# Revert to previous image
docker-compose down
docker-compose up -d --force-recreate
```

## Common Issues

### Issue: "Database connection failed"

**Solution**:
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Ensure SSL is enabled
# Add ?sslmode=require to URL
```

### Issue: "Gemini API rate limit"

**Solution**:
- Free tier: 15 requests/minute
- Implement queue for burst traffic
- Upgrade to paid tier if needed

### Issue: "Timeout on large images"

**Solution**:
```typescript
// Increase timeout in server
const timeout = 60000; // 60 seconds

// Or reduce max file size
maxFileSize: 5 * 1024 * 1024 // 5MB
```

## Support

For deployment help:
- 📖 [Vercel Docs](https://vercel.com/docs)
- 🗄️ [Neon Docs](https://neon.tech/docs)
- 🐳 [Docker Docs](https://docs.docker.com)

Need more help? Open an issue on GitHub!
