import axios from 'axios';
import { ScanResult, User, UserPreferences, ScanHistory } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const scanApi = {
  uploadImage: async (file: File): Promise<ScanResult> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  getScanResult: async (sessionId: string): Promise<ScanResult> => {
    const response = await api.get(`/scan/${sessionId}`);
    return response.data;
  },

  submitFeedback: async (
    sessionId: string,
    feedback: {
      detectedBookId?: string;
      feedbackType: string;
      isCorrect?: boolean;
      correctedTitle?: string;
      correctedAuthor?: string;
      comments?: string;
    }
  ): Promise<void> => {
    await api.post(`/scan/${sessionId}/feedback`, feedback);
  },
};

export const userApi = {
  getProfile: async (): Promise<User> => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  updateProfile: async (data: { username?: string; email?: string }): Promise<User> => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },

  updatePreferences: async (preferences: UserPreferences): Promise<UserPreferences> => {
    const response = await api.put('/user/preferences', preferences);
    return response.data;
  },

  addToReadingHistory: async (book: {
    bookTitle: string;
    bookAuthor?: string;
    bookIsbn?: string;
    rating?: number;
    status: string;
  }): Promise<void> => {
    await api.post('/user/reading-history', book);
  },

  getReadingHistory: async (): Promise<any[]> => {
    const response = await api.get('/user/reading-history');
    return response.data;
  },

  deleteUserData: async (): Promise<void> => {
    await api.delete('/user/data');
  },
};

export const historyApi = {
  getHistory: async (limit = 20, offset = 0): Promise<ScanHistory[]> => {
    const response = await api.get('/history', { params: { limit, offset } });
    return response.data;
  },

  getSessionDetails: async (sessionId: string): Promise<any> => {
    const response = await api.get(`/history/${sessionId}`);
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/history/${sessionId}`);
  },
};

export default api;
