import axios from 'axios';

// Get the API URL based on the current environment
const getApiUrl = () => {
  // If we're in the browser
  if (typeof window !== 'undefined') {
    // If we're embedded in sharospins.com
    if (window.location.hostname === 'www.sharospins.com') {
      return 'https://pin-catalog-jko0nftmb-matthewsharos-projects.vercel.app';
    }
    // Otherwise use relative paths
    return '';
  }
  
  // For server-side, use the full URL
  return process.env.NEXT_PUBLIC_API_URL || '';
};

// Create base axios instance
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  withCredentials: false // Important for CORS
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      headers: config.headers,
      data: config.data instanceof FormData ? '[FormData]' : config.data,
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers,
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      message: error.message,
      response: error.response,
      config: error.config,
    });
    return Promise.reject(error);
  }
);

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  return api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export default api;
