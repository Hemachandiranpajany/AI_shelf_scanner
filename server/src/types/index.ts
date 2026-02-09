import { Request } from 'express';

export interface User {
  id: string;
  email?: string;
  username?: string;
  goodreads_user_id?: string;
  goodreads_access_token?: string;
  goodreads_access_token_secret?: string;
  preferences: UserPreferences;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  favoriteGenres?: string[];
  favoriteAuthors?: string[];
  readingGoals?: {
    booksPerYear?: number;
    currentStreak?: number;
  };
  notificationSettings?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
  };
}

export interface ScanSession {
  id: string;
  user_id?: string;
  session_token: string;
  image_url?: string;
  image_data_encrypted?: string;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  metadata: Record<string, any>;
  created_at: Date;
  expires_at: Date;
}

export interface DetectedBook {
  id: string;
  scan_session_id: string;
  title: string;
  author?: string;
  isbn?: string;
  confidence_score: number;
  google_books_id?: string;
  metadata: BookMetadata;
  position_in_image?: BoundingBox;
  detected_at: Date;
}

export interface BookMetadata {
  thumbnail?: string;
  description?: string;
  publishedDate?: string;
  publisher?: string;
  pageCount?: number;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  language?: string;
  previewLink?: string;
  infoLink?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Recommendation {
  id: string;
  scan_session_id: string;
  detected_book_id: string;
  user_id?: string;
  recommendation_score: number;
  reasoning: string;
  metadata: Record<string, any>;
  rank: number;
  created_at: Date;
}

export interface ReadingHistoryItem {
  id: string;
  user_id: string;
  book_title: string;
  book_author?: string;
  book_isbn?: string;
  rating?: number;
  status: 'read' | 'reading' | 'want-to-read';
  added_at: Date;
}

export interface UserFeedback {
  id: string;
  scan_session_id: string;
  detected_book_id?: string;
  user_id?: string;
  feedback_type: 'correction' | 'rating' | 'report';
  is_correct?: boolean;
  corrected_title?: string;
  corrected_author?: string;
  comments?: string;
  created_at: Date;
}

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

export interface ScanResult {
  sessionId: string;
  status: string;
  detectedBooks: DetectedBook[];
  recommendations: Recommendation[];
  processingTime?: number;
}

export interface GeminiResponse {
  books: Array<{
    title: string;
    author?: string;
    confidence: number;
    position?: {
      x: number;
      y: number;
    };
  }>;
}

export interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: Array<{
    id: string;
    volumeInfo: {
      title: string;
      authors?: string[];
      publisher?: string;
      publishedDate?: string;
      description?: string;
      industryIdentifiers?: Array<{
        type: string;
        identifier: string;
      }>;
      pageCount?: number;
      categories?: string[];
      averageRating?: number;
      ratingsCount?: number;
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
      };
      language?: string;
      previewLink?: string;
      infoLink?: string;
    };
  }>;
}

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}
