export interface Book {
  id: string;
  title: string;
  author?: string;
  isbn?: string;
  confidence_score: number;
  metadata: BookMetadata;
  position_in_image?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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

export interface Recommendation {
  id: string;
  title: string;
  author?: string;
  recommendation_score: number;
  reasoning: string;
  rank: number;
  metadata: BookMetadata;
}

export interface ScanResult {
  sessionId: string;
  status: 'processing' | 'completed' | 'failed';
  detectedBooks?: Book[];
  recommendations?: Recommendation[];
  error?: string;
  message?: string;
}

export interface UserPreferences {
  favoriteGenres?: string[];
  favoriteAuthors?: string[];
  readingGoals?: {
    booksPerYear?: number;
    currentStreak?: number;
  };
}

export interface User {
  id: string;
  email?: string;
  username?: string;
  preferences: UserPreferences;
  created_at: string;
}

export interface ScanHistory {
  id: string;
  created_at: string;
  books_detected: number;
  recommendations_count: number;
  status: string;
}
