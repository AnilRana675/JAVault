// src/services/api.ts
// Axios instance and API functions for backend communication
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

export const fetchVideos = async () => {
  const res = await api.get('/videos');
  return res.data;
};

export const scrapeVideo = async (video_code: string) => {
  const res = await api.post('/scrape', { video_code });
  return res.data;
};

export default api;
