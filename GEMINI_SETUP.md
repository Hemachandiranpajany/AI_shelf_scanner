# Google Gemini API Setup Guide

## Why Gemini 2.0 Flash?

Gemini 2.0 Flash is **FREE** to use with generous limits:
- ✅ **1,000,000 requests per month** (free tier)
- ✅ Excellent vision capabilities for text extraction
- ✅ Fast response times (~2-3 seconds)
- ✅ No credit card required to get started

This makes it perfect for book spine recognition in Shelf Scanner!

## Getting Your API Key

### Step 1: Get API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Get API Key"**
3. Select **"Create API key in new project"** (or use existing project)
4. Copy your API key

### Step 2: Add to Environment

Add your API key to `.env`:

```env
GEMINI_API_KEY=your_api_key_here
```

That's it! No credit card, no billing setup needed.

## Usage Limits (Free Tier)

- **Requests**: 1M per month
- **Rate Limit**: 15 requests per minute
- **Token Limit**: 1M tokens per minute

For Shelf Scanner, this means:
- ✅ ~33,000 book scans per day
- ✅ Perfect for personal use and small-to-medium apps
- ✅ Rate limits automatically handled by our backend

## How We Use Gemini

### 1. Book Detection
```typescript
const result = await geminiService.detectBooksFromImage(imageBuffer);
// Returns: { books: [{ title, author, confidence }] }
```

### 2. Recommendations
```typescript
const recommendation = await geminiService.generateRecommendation(
  book,
  userPreferences,
  readingHistory
);
// Returns: { score, reasoning }
```

## Fallback Options

If you need higher limits or prefer alternatives:

### Google Cloud Vision API
- More expensive but higher limits
- Add credentials to `.env`:
```env
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

Our app will automatically use Gemini first, falling back to Vision API if needed.

## Best Practices

1. **Monitor Usage**: Check [AI Studio](https://aistudio.google.com) for usage stats
2. **Cache Results**: We cache book metadata to reduce API calls
3. **Error Handling**: Built-in retry logic for rate limits

## Troubleshooting

### "API key not valid"
- Ensure no extra spaces in `.env` file
- Verify key at [AI Studio](https://aistudio.google.com/app/apikey)

### "Rate limit exceeded"
- Free tier: 15 requests/minute
- Wait 1 minute and try again
- Consider upgrading to paid tier

### "Model not found"
- We use `gemini-2.0-flash-exp` (experimental, free)
- If unavailable, update to latest stable model

## Upgrading to Paid Tier

If you need higher limits:

1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Enable billing for your project
3. No code changes needed - same API key works

Paid tier pricing:
- First 1M requests free
- Then $0.35 per 1M requests

## Questions?

- [Gemini API Docs](https://ai.google.dev/docs)
- [Pricing Details](https://ai.google.dev/pricing)
- [Community Forum](https://discuss.ai.google.dev)
