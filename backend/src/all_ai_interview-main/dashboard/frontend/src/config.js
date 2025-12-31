/**
 * Application Configuration
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const config = {
  apiUrl: API_BASE_URL,
  apiTimeout: 30000, // 30 seconds
};
