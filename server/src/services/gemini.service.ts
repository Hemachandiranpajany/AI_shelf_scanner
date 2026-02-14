import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { GeminiResponse } from '../types';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    // Lazy initialization to prevent cold start crashes
  }

  private ensureInitialized(): void {
    if (this.genAI && this.model) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash'
    });

    logger.info('Gemini AI Service initialized');
  }

  private async retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        if (i === retries - 1) throw error;

        // Only retry on 503 or 429
        if (error.status === 503 || error.status === 429 || error.message?.includes('overloaded')) {
          logger.warn(`Gemini API error (attempt ${i + 1}/${retries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }

        throw error;
      }
    }
    throw new Error('Operation failed after retries');
  }

  async detectBooksFromImage(imageData: Buffer | string): Promise<GeminiResponse> {
    this.ensureInitialized();
    try {
      const prompt = `Analyze this image of a bookshelf and identify all visible book spines. 
For each book you can clearly read, extract:
- Title (complete and accurate)
- Author (if visible)
- Confidence score (0-1, how confident you are in the detection)
- Approximate position (x, y coordinates as percentage of image width/height)

Return ONLY a valid JSON object with this structure:
{
  "books": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "confidence": 0.95,
      "position": {"x": 10, "y": 20}
    }
  ]
}

Important guidelines:
- Only include books where you can clearly read the title
- Be conservative with confidence scores
- If author is not visible, omit the author field
- Ignore decorative items, picture frames, or non-book objects
- Handle vertical text on spines correctly
- Return valid JSON only, no additional text`;

      let imagePart;

      if (Buffer.isBuffer(imageData)) {
        imagePart = {
          inlineData: {
            data: imageData.toString('base64'),
            mimeType: 'image/jpeg'
          }
        };
      } else {
        imagePart = {
          inlineData: {
            data: imageData,
            mimeType: 'image/jpeg'
          }
        };
      }

      const result = (await this.retryOperation(() =>
        this.model.generateContent([prompt, imagePart])
      )) as any;
      const response = await result.response;
      const text = response.text();

      logger.debug('Gemini raw response', { text: text.substring(0, 200) });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed: GeminiResponse = JSON.parse(jsonMatch[0]);

      if (!parsed.books || !Array.isArray(parsed.books)) {
        throw new Error('Invalid response structure');
      }

      logger.info('Books detected by Gemini', { count: parsed.books.length });

      return parsed;
    } catch (error: any) {
      logger.error('Gemini API final error', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
      throw new Error('Failed to process image with Gemini after retries');
    }
  }

  async generateRecommendationsBatch(
    books: Array<{ title: string; author?: string }>,
    userPreferences: any,
    readingHistory: any[]
  ): Promise<Array<{ title: string; author: string; score: number; reasoning: string }>> {
    this.ensureInitialized();
    try {
      const booksList = books.map((b, i) => `${i + 1}. "${b.title}"${b.author ? ` by ${b.author}` : ''}`).join('\n');

      const prompt = `You are a book recommendation expert. Based on the books I've found on a user's shelf, suggest 5 COMPLETELY NEW books that they do NOT have but would likely enjoy.

Books currently on their shelf:
${booksList}

User Preferences:
${JSON.stringify(userPreferences, null, 2)}

Reading History (last 10 books):
${readingHistory.slice(0, 10).map(b => `- ${b.book_title} by ${b.book_author || 'Unknown'} (rated ${b.rating || 'N/A'}/5)`).join('\n')}

For EACH recommendation, provide:
1. Title of the suggested book
2. Author of the suggested book
3. A recommendation score from 0-1 (where 1 is highly recommended)
4. Brief reasoning (2-3 sentences) explaining why this specific suggestion relates to the books on their shelf or their interests.

Return ONLY a valid JSON object with this structure:
{
  "recommendations": [
    {
      "title": "Suggested Book Title",
      "author": "Suggested Author",
      "score": 0.85,
      "reasoning": "..."
    }
  ]
}
Provide exactly 5 high-quality recommendations.`;

      const result = (await this.retryOperation(() =>
        this.model.generateContent(prompt)
      )) as any;
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in batch recommendation response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Invalid batch recommendation response structure');
      }

      return parsed.recommendations.map((r: any) => ({
        title: r.title || 'Unknown Title',
        author: r.author || 'Unknown Author',
        score: Math.max(0, Math.min(1, typeof r.score === 'number' ? r.score : 0.5)),
        reasoning: r.reasoning || 'No specific reasoning provided'
      }));
    } catch (error: any) {
      logger.error('Failed to generate batch recommendations', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
      return books.map(() => ({
        title: 'Unknown Title',
        author: 'Unknown Author',
        score: 0.5,
        reasoning: 'Unable to generate recommendation'
      }));
    }
  }

  async generateRecommendation(
    detectedBook: { title: string; author?: string },
    userPreferences: any,
    readingHistory: any[]
  ): Promise<{ title: string; author: string; score: number; reasoning: string }> {
    const results = await this.generateRecommendationsBatch([detectedBook], userPreferences, readingHistory);
    return results[0];
  }
}

export const geminiService = new GeminiService();
