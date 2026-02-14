import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { GeminiResponse } from '../types';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  private ensureInitialized(): void {
    if (this.genAI && this.model) return;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use flash-8b for maximum speed in serverless environments
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async detectBooksFromImage(imageData: Buffer | string): Promise<GeminiResponse> {
    this.ensureInitialized();
    try {
      const prompt = `Identify all book spines. Return JSON: {"books": [{"title": "...", "author": "...", "confidence": 0.9, "position": {"x": 10, "y": 20}}]}`;

      const imagePart = {
        inlineData: {
          data: Buffer.isBuffer(imageData) ? imageData.toString('base64') : imageData,
          mimeType: 'image/jpeg' as const
        }
      };

      // No retries for detection to save time budget
      const result = await this.model!.generateContent([prompt, imagePart]);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Gemini detection failed', { error });
      throw error;
    }
  }

  async generateRecommendationsBatch(
    books: Array<{ title: string; author?: string }>,
    _userPreferences: unknown,
    _readingHistory: any[]
  ): Promise<Array<{ title: string; author: string; score: number; reasoning: string }>> {
    this.ensureInitialized();
    try {
      const prompt = `Based on these books: ${JSON.stringify(books)}, suggest 5 NEW books as JSON: {"recommendations": [{"title": "...", "author": "...", "score": 0.9, "reasoning": "..."}]}`;
      const result = await this.model!.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]).recommendations;
    } catch (error) {
      return [];
    }
  }
}

export const geminiService = new GeminiService();
