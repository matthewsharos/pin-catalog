import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { FaSpinner } from 'react-icons/fa';

export default function ExportModal({ isOpen, onClose, pins, filters }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exportPins, setExportPins] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState('');

  console.log("ExportModal rendered", { isOpen, pinsCount: pins?.length });

  useEffect(() => {
    if (!isOpen) {
      setImageUrl('');
      setIsGenerating(false);
      setExportPins([]);
    } else {
      console.log("ExportModal opened");
      loadAllPinsForExport();
    }
  }, [isOpen]);

  // Load all pins matching the current filters for export
  const loadAllPinsForExport = async () => {
    if (!isOpen || !filters) return;
    
    setIsLoading(true);
    setLoadingMessage('Loading all pins matching your filters...');
    
    try {
      // Build query parameters from filters
      const params = new URLSearchParams();
      
      // Add status filters
      if (filters?.statusFilters) {
        Object.entries(filters.statusFilters).forEach(([key, value]) => {
          if (value) params.append(key, 'true');
        });
      }
      
      // Add search query
      if (filters?.searchQuery) {
        params.append('search', filters.searchQuery);
      }
      
      // Add year filters
      if (filters?.yearFilters && filters.yearFilters.length > 0) {
        params.append('years', filters.yearFilters.join(','));
      }
      
      // Add category filters
      if (filters?.filterCategories && filters.filterCategories.length > 0) {
        params.append('categories', filters.filterCategories.join(','));
      }
      
      // Add origin filters
      if (filters?.filterOrigins && filters.filterOrigins.length > 0) {
        params.append('origins', filters.filterOrigins.join(','));
      }
      
      // Add series filters
      if (filters?.filterSeries && filters.filterSeries.length > 0) {
        params.append('series', filters.filterSeries.join(','));
      }
      
      // Add special filters
      if (filters?.filterIsLimitedEdition) {
        params.append('isLimitedEdition', 'true');
      }
      
      if (filters?.filterIsMystery) {
        params.append('isMystery', 'true');
      }
      
      // Add sort option
      if (filters?.sortOption) {
        params.append('sort', filters.sortOption);
      }
      
      // Set max pins to 250
      params.append('maxPins', '250');
      
      console.log('Fetching pins with params:', params.toString());
      const response = await axios.get(`/api/pins/export?${params.toString()}`);
      
      if (response.data && response.data.pins) {
        // Limit to 250 pins maximum to prevent browser freezing
        const limitedPins = response.data.pins.slice(0, 250);
        setExportPins(limitedPins);
        console.log(`Loaded ${limitedPins.length} pins for export (from ${response.data.pins.length} total)`);
        setLoadingMessage(`Loaded ${limitedPins.length} pins for export`);
        
        // Auto-generate the image after loading pins
        if (limitedPins.length > 0) {
          setTimeout(() => {
            generateImage(limitedPins);
          }, 500);
        } else {
          toast.error('No pins match your current filters');
        }
      }
    } catch (error) {
      console.error('Error loading pins for export:', error);
      toast.error('Failed to load pins for export');
      setLoadingMessage('Error loading pins. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cache for loaded images
  const imageCache = new Map();

  // Load image with proxy fallback
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      // Check cache first
      if (imageCache.has(url)) {
        resolve(imageCache.get(url));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        imageCache.set(url, img);
        resolve(img);
      };

      img.onerror = () => {
        // Try with proxy if direct load fails
        const proxyImg = new Image();
        proxyImg.crossOrigin = 'anonymous';
        
        proxyImg.onload = () => {
          imageCache.set(url, proxyImg);
          resolve(proxyImg);
        };
        
        proxyImg.onerror = () => reject(new Error('Failed to load image'));
        
        // Use proxy endpoint for CORS issues
        proxyImg.src = `/api/image-proxy?url=${encodeURIComponent(url)}`;
      };

      // Start loading the image
      img.src = url;
    });
  };

  const generateImage = async (pinsToExport) => {
    const pinsArray = pinsToExport || exportPins;
    
    if (pinsArray.length === 0) {
      toast.error('No pins to export');
      return;
    }

    if (pinsArray.length > 250) {
      toast.error('Cannot export more than 250 pins at once');
      return;
    }

    setIsGenerating(true);
    setLoadingMessage('Generating image...');
    
    try {
      // Fixed width of 2500px
      const width = 2500;
      
      // Determine pins per row based on count (5 or 10)
      const pinsPerRow = pinsArray.length <= 30 ? 5 : 10;
      
      // Calculate pin size (square)
      const pinSize = width / pinsPerRow;
      
      // Calculate number of rows needed
      const rows = Math.ceil(pinsArray.length / pinsPerRow);
      
      // Calculate height (pins + 100px for filter info)
      const height = (pinSize * rows) + 100;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);

      // Preload all images in parallel
      setLoadingMessage('Loading images...');
      const imagePromises = pinsArray.map(pin => loadImage(pin.imageUrl));
      const loadedImages = await Promise.allSettled(imagePromises);
      
      // Draw pins
      setLoadingMessage('Drawing pins...');
      loadedImages.forEach((result, index) => {
        if (result.status !== 'fulfilled') {
          console.error(`Failed to load image for pin ${pinsArray[index].id}:`, result.reason);
          return;
        }

        const img = result.value;
        const row = Math.floor(index / pinsPerRow);
        const col = index % pinsPerRow;
        const x = col * pinSize;
        const y = row * pinSize;

        // Center image in its square
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        
        if (img.width > img.height) {
          // Landscape image
          drawWidth = pinSize;
          drawHeight = (img.height / img.width) * pinSize;
          offsetY = (pinSize - drawHeight) / 2;
        } else {
          // Portrait image
          drawHeight = pinSize;
          drawWidth = (img.width / img.height) * pinSize;
          offsetX = (pinSize - drawWidth) / 2;
        }
        
        // Draw image
        ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
        
        // Draw pin info
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y + pinSize - 60, pinSize, 60);
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        
        // Draw pin name and ID
        const pinName = truncateText(pinsArray[index].pinName, 30);
        const pinId = pinsArray[index].pinId || '';
        ctx.fillText(pinName, x + 10, y + pinSize - 35);
        ctx.fillText(pinId, x + 10, y + pinSize - 15);

        // Draw status indicators
        if (pinsArray[index].isCollected) {
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(x + pinSize - 30, y + pinSize - 30, 20, 20);
        }
        if (pinsArray[index].isWishlist) {
          ctx.fillStyle = '#FFC107';
          ctx.fillRect(x + pinSize - 60, y + pinSize - 30, 20, 20);
        }
      });

      // Draw filter info at bottom
      const filterY = height - 90;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, filterY, width, 90);
      
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'left';
      
      // Create filter text
      const filterInfo = [];
      if (filters?.statusFilters) {
        const activeStatuses = Object.entries(filters.statusFilters)
          .filter(([_, value]) => value)
          .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));
        if (activeStatuses.length) {
          filterInfo.push(`Status: ${activeStatuses.join(', ')}`);
        }
      }
      if (filters?.searchQuery) {
        filterInfo.push(`Search: ${filters.searchQuery}`);
      }
      if (filters?.tag) {
        filterInfo.push(`Tag: ${filters.tag}`);
      }
      if (filters?.year) {
        filterInfo.push(`Year: ${filters.year}`);
      }
      
      // Draw filter info
      const filterText = filterInfo.length ? filterInfo.join(' | ') : 'No filters applied';
      ctx.fillText(filterText, 20, filterY + 40);
      
      // Convert to data URL and set
      setLoadingMessage('Finalizing image...');
      const dataUrl = canvas.toDataURL('image/png');
      setImageUrl(dataUrl);
      
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.download = 'pin-collection.png';
    link.href = imageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded successfully');
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Export Collection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {(isLoading || isGenerating) && (
            <div className="text-center text-white">
              <p className="mb-4">{loadingMessage || 'Processing...'}</p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            </div>
          )}

          {!isLoading && !isGenerating && !imageUrl && exportPins.length > 0 && (
            <div className="text-center text-white">
              <p className="mb-4">
                Ready to generate an image of {exportPins.length} pins with your current filters.
              </p>
              <button
                onClick={() => generateImage()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Generate Image
              </button>
            </div>
          )}

          {!isLoading && !isGenerating && !imageUrl && exportPins.length === 0 && (
            <div className="text-center text-white">
              <p className="mb-4">
                No pins match your current filters.
              </p>
              <button
                onClick={loadAllPinsForExport}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry Loading Pins
              </button>
            </div>
          )}

          {imageUrl && (
            <div className="space-y-4">
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Pin Collection Export"
                  className="w-full h-auto"
                />
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Download Image
                </button>
                <button
                  onClick={() => generateImage()}
                  disabled={isGenerating}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
