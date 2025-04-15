import axios from 'axios';

// Create base axios instance
const api = axios.create({
  // Always use relative URLs
  baseURL: '',
  headers: {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  withCredentials: false // Must be false for CORS with different origins
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    // Log the full URL being requested
    const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
    
    console.log('API Request:', {
      method: config.method,
      url: fullUrl,
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
    // Log detailed error information
    const errorInfo = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      }
    };
    
    console.error('API Response Error:', errorInfo);
    return Promise.reject(error);
  }
);

// Upload an image to the database
export const uploadImage = async (file, pinId = null) => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    // Add pinId if provided
    if (pinId) {
      formData.append('pinId', pinId);
    }
    
    // Check if we're embedded in sharospins.com
    const isEmbedded = typeof window !== 'undefined' && window.location.hostname === 'www.sharospins.com';
    
    if (isEmbedded) {
      // Use the proxy endpoint when embedded
      const targetUrl = 'https://pin-catalog-c7glcpkwm-matthewsharos-projects.vercel.app/api/upload';
      const proxyUrl = 'https://pin-catalog-c7glcpkwm-matthewsharos-projects.vercel.app/proxy?target=' + encodeURIComponent(targetUrl);
      
      // Upload the image via proxy
      const response = await api.post(proxyUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response;
    } else {
      // Upload the image directly
      const response = await api.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response;
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export default api;
