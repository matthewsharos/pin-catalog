import axios from 'axios';

// Get the API URL based on the current environment
const getApiUrl = () => {
  // If we're in the browser
  if (typeof window !== 'undefined') {
    // If we're embedded in sharospins.com
    if (window.location.hostname === 'www.sharospins.com') {
      // Use the preview URL for now, update this to the production URL later
      return 'https://pin-catalog-c7glcpkwm-matthewsharos-projects.vercel.app';
    }
    // Otherwise use relative paths
    return '';
  }
  
  // For server-side, use the full URL from env
  return process.env.NEXT_PUBLIC_VERCEL_URL || '';
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

// Get a signed URL for client-side upload
export const getUploadUrl = async (filename) => {
  try {
    const response = await api.get(`/api/upload?filename=${encodeURIComponent(filename)}`);
    return response.data;
  } catch (error) {
    console.error('Error getting upload URL:', error);
    throw error;
  }
};

// Direct client-side upload to Vercel Blob
export const uploadToSignedUrl = async (url, file, token) => {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'x-token': token || '',
      },
      body: file,
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to upload: ${response.status} ${text}`);
    }
    
    // Extract pathname from the URL
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Construct the final URL for the uploaded file
    return {
      data: {
        url: `https://${urlObj.hostname}${pathname}`,
        success: true
      }
    };
  } catch (error) {
    console.error('Error uploading directly:', error);
    throw error;
  }
};

// Combined method for client-side upload with signed URL
export const uploadImage = async (file) => {
  try {
    // Get signed URL
    const { url, clientUploadToken } = await getUploadUrl(file.name);
    
    // Upload directly to Vercel Blob
    return await uploadToSignedUrl(url, file, clientUploadToken);
  } catch (error) {
    console.error('Error in upload process:', error);
    throw error;
  }
};

export default api;
