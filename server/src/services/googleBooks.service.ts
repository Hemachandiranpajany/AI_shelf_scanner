import axios from 'axios';
import { logger } from '../utils/logger';
import { GoogleBooksResponse, BookMetadata } from '../types';
import NodeCache from 'node-cache';

class GoogleBooksService {
  private baseUrl = 'https://www.googleapis.com/books/v1/volumes';
  private apiKey?: string;
  private cache: NodeCache;

  constructor() {
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    this.cache = new NodeCache({ 
      stdTTL: parseInt(process.env.CACHE_TTL_MS || '300000') / 1000,
      checkperiod: 120 
    });
  }

  async searchBook(title: string, author?: string): Promise<BookMetadata | null> {
    try {
      const cacheKey = `book:${title}:${author || 'noauthor'}`;
      const cached = this.cache.get<BookMetadata>(cacheKey);
      
      if (cached) {
        logger.debug('Cache hit for book search', { title, author });
        return cached;
      }

      let query = `intitle:${encodeURIComponent(title)}`;
      if (author) {
        query += `+inauthor:${encodeURIComponent(author)}`;
      }

      const params: any = {
        q: query,
        maxResults: 1,
        printType: 'books',
        langRestrict: 'en'
      };

      if (this.apiKey) {
        params.key = this.apiKey;
      }

      const response = await axios.get<GoogleBooksResponse>(this.baseUrl, {
        params,
        timeout: 10000
      });

      if (!response.data.items || response.data.items.length === 0) {
        logger.debug('No books found', { title, author });
        return null;
      }

      const book = response.data.items[0];
      const volumeInfo = book.volumeInfo;

      const metadata: BookMetadata = {
        thumbnail: volumeInfo.imageLinks?.thumbnail,
        description: volumeInfo.description,
        publishedDate: volumeInfo.publishedDate,
        publisher: volumeInfo.publisher,
        pageCount: volumeInfo.pageCount,
        categories: volumeInfo.categories,
        averageRating: volumeInfo.averageRating,
        ratingsCount: volumeInfo.ratingsCount,
        language: volumeInfo.language,
        previewLink: volumeInfo.previewLink,
        infoLink: volumeInfo.infoLink
      };

      this.cache.set(cacheKey, metadata);
      logger.info('Book metadata retrieved', { title, author });

      return metadata;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Google Books API error', { 
          status: error.response?.status,
          message: error.message 
        });
      } else {
        logger.error('Failed to search book', error);
      }
      return null;
    }
  }

  async getBookByISBN(isbn: string): Promise<BookMetadata | null> {
    try {
      const cacheKey = `isbn:${isbn}`;
      const cached = this.cache.get<BookMetadata>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const params: any = {
        q: `isbn:${isbn}`,
        maxResults: 1
      };

      if (this.apiKey) {
        params.key = this.apiKey;
      }

      const response = await axios.get<GoogleBooksResponse>(this.baseUrl, {
        params,
        timeout: 10000
      });

      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }

      const book = response.data.items[0];
      const volumeInfo = book.volumeInfo;

      const metadata: BookMetadata = {
        thumbnail: volumeInfo.imageLinks?.thumbnail,
        description: volumeInfo.description,
        publishedDate: volumeInfo.publishedDate,
        publisher: volumeInfo.publisher,
        pageCount: volumeInfo.pageCount,
        categories: volumeInfo.categories,
        averageRating: volumeInfo.averageRating,
        ratingsCount: volumeInfo.ratingsCount,
        language: volumeInfo.language,
        previewLink: volumeInfo.previewLink,
        infoLink: volumeInfo.infoLink
      };

      this.cache.set(cacheKey, metadata);
      return metadata;
    } catch (error) {
      logger.error('Failed to get book by ISBN', error);
      return null;
    }
  }

  async enrichBookData(books: Array<{ title: string; author?: string; isbn?: string }>): Promise<Array<BookMetadata | null>> {
    const promises = books.map(book => {
      if (book.isbn) {
        return this.getBookByISBN(book.isbn);
      }
      return this.searchBook(book.title, book.author);
    });

    return Promise.all(promises);
  }
}

export const googleBooksService = new GoogleBooksService();
