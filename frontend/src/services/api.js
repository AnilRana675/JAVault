import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth.token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const videoAPI = {
  // Get all videos
  getVideos: async () => {
    try {
      const response = await api.get('/videos');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch videos: ${error.response?.data?.error || error.message}`);
    }
  },

  // Scrape a new video
  scrapeVideo: async (videoCode) => {
    try {
      const response = await api.post('/scrape', { video_code: videoCode });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to scrape video: ${error.response?.data?.error || error.message}`);
    }
  },

  // Get a specific video by code
  getVideoByCode: async (videoCode) => {
    try {
      const videos = await videoAPI.getVideos();
      return videos.find(video => video.video_code === videoCode);
    } catch (error) {
      throw new Error(`Failed to fetch video: ${error.message}`);
    }
  },

  // Delete a video by code (admin only)
  deleteVideo: async (videoCode) => {
    try {
      const response = await api.delete(`/videos/${encodeURIComponent(videoCode)}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete video: ${error.response?.data?.error || error.message}`);
    }
  },
};

export default api;
