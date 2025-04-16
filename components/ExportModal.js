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
      if (filters.statusFilters) {
        Object.entries(filters.statusFilters).forEach(([key, value]) => {
          if (value) params.append(key, 'true');
        });
      }
      
      // Add search query
      if (filters.searchQuery) {
        params.append('search', filters.searchQuery);
      }
      
      // Add year filters
      if (filters.yearFilters && filters.yearFilters.length > 0) {
        params.append('years', filters.yearFilters.join(','));
      }
      
      // Add category filters
      if (filters.filterCategories && filters.filterCategories.length > 0) {
        params.append('categories', filters.filterCategories.join(','));
      }
      
      // Add origin filters
      if (filters.filterOrigins && filters.filterOrigins.length > 0) {
        params.append('origins', filters.filterOrigins.join(','));
      }
      
      // Add series filters
      if (filters.filterSeries && filters.filterSeries.length > 0) {
        params.append('series', filters.filterSeries.join(','));
      }
      
      // Add special filters
      if (filters.filterIsLimitedEdition) {
        params.append('isLimitedEdition', 'true');
      }
      
      if (filters.filterIsMystery) {
        params.append('isMystery', 'true');
      }
      
      // Add sort option
      if (filters.sortOption) {
        params.append('sort', filters.sortOption);
      }
      
      // Set max pins to 250
      params.append('maxPins', '250');
      
      console.log('Fetching pins with params:', params.toString());
      const response = await axios.get(`/api/pins/export?${params.toString()}`);
      
      if (response.data && response.data.pins) {
        setExportPins(response.data.pins);
        console.log(`Loaded ${response.data.pins.length} pins for export`);
        setLoadingMessage(`Loaded ${response.data.pins.length} pins for export`);
        
        // Auto-generate the image after loading pins
        if (response.data.pins.length > 0) {
          setTimeout(() => {
            generateImage(response.data.pins);
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
      const rows = Math.ceil(Math.min(pinsArray.length, 250) / pinsPerRow);
      
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

      // Preload all images in parallel to improve performance
      setLoadingMessage('Preloading images...');
      
      // Create an array to hold all image loading promises
      const imagePromises = pinsArray.slice(0, 250).map((pin, index) => {
        return new Promise((resolve) => {
          loadImage(pin.imageUrl)
            .then(img => {
              resolve({ img, pin, index });
            })
            .catch(error => {
              console.error(`Error loading image for pin ${pin.pinId}:`, error);
              resolve({ error, pin, index });
            });
        });
      });
      
      // Update loading message with progress
      let loadedCount = 0;
      const totalPins = Math.min(pinsArray.length, 250);
      
      // Create a progress tracker for image loading
      const updateProgress = () => {
        loadedCount++;
        if (loadedCount % 10 === 0 || loadedCount === totalPins) {
          setLoadingMessage(`Preloading images... ${loadedCount}/${totalPins}`);
        }
      };
      
      // Process images in batches for better UI responsiveness
      const batchSize = 10;
      const batches = Math.ceil(imagePromises.length / batchSize);
      
      let loadedImages = [];
      
      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, imagePromises.length);
        const batchPromises = imagePromises.slice(start, end);
        
        const batchResults = await Promise.all(batchPromises);
        loadedImages = [...loadedImages, ...batchResults];
        
        // Update progress after each batch
        loadedCount = loadedImages.length;
        setLoadingMessage(`Preloading images... ${loadedCount}/${totalPins}`);
        
        // Give the UI a chance to update
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // Now draw all images to canvas
      setLoadingMessage('Rendering image...');
      
      // Process in batches to keep UI responsive
      const renderBatchSize = 20;
      const renderBatches = Math.ceil(loadedImages.length / renderBatchSize);
      
      for (let batchIndex = 0; batchIndex < renderBatches; batchIndex++) {
        const start = batchIndex * renderBatchSize;
        const end = Math.min(start + renderBatchSize, loadedImages.length);
        const batch = loadedImages.slice(start, end);
        
        // Update progress message
        setLoadingMessage(`Rendering image... ${Math.min(end, loadedImages.length)}/${totalPins}`);
        
        // Process this batch
        for (const { img, pin, index, error } of batch) {
          const row = Math.floor(index / pinsPerRow);
          const col = index % pinsPerRow;
          const x = col * pinSize;
          const y = row * pinSize;
          
          if (error || !img) {
            // Draw error placeholder
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(x, y, pinSize, pinSize);
            ctx.fillStyle = 'red';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Image Error', x + pinSize/2, y + pinSize/2);
            ctx.fillText(`#${pin.pinId || 'Unknown'}`, x + pinSize/2, y + pinSize/2 + 30);
            continue;
          }
          
          // Calculate dimensions to maintain aspect ratio within square
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
          
          // Draw image centered in its square
          ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
          
          // Draw pin info background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(x, y + pinSize - 60, pinSize, 60);
          
          // Draw pin name
          ctx.fillStyle = 'white';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(truncateText(pin.pinName || 'Unknown', 20), x + pinSize/2, y + pinSize - 35);
          
          // Draw pin ID and status
          ctx.font = '16px Arial';
          
          // Determine status text
          let statusText = '';
          if (pin.isCollected) statusText = 'Collected';
          else if (pin.isWishlist) statusText = 'Wishlist';
          else if (pin.isDeleted) statusText = 'Uncollected';
          else if (pin.isUnderReview) statusText = 'Under Review';
          
          ctx.fillText(`#${pin.pinId} - ${statusText}`, x + pinSize/2, y + pinSize - 10);
        }
        
        // Give the UI a chance to update between batches
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Draw filter information at bottom
      setLoadingMessage('Adding filter information...');
      const filterY = height - 80;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, filterY, width, 80);
      
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'left';
      
      // Create filter text
      let filterTexts = [];
      
      // Add status filters
      if (filters.statusFilters) {
        const activeStatuses = Object.entries(filters.statusFilters)
          .filter(([key, value]) => value && key !== 'all')
          .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));
          
        if (activeStatuses.length > 0) {
          filterTexts.push(`Status: ${activeStatuses.join(', ')}`);
        }
      }
      
      // Add year filters
      if (filters.yearFilters && filters.yearFilters.length > 0) {
        filterTexts.push(`Year: ${filters.yearFilters.join(', ')}`);
      }
      
      // Add category filters
      if (filters.filterCategories && filters.filterCategories.length > 0) {
        filterTexts.push(`Categories: ${filters.filterCategories.join(', ')}`);
      }
      
      // Add origin filters
      if (filters.filterOrigins && filters.filterOrigins.length > 0) {
        filterTexts.push(`Origins: ${filters.filterOrigins.join(', ')}`);
      }
      
      // Add series filters
      if (filters.filterSeries && filters.filterSeries.length > 0) {
        filterTexts.push(`Series: ${filters.filterSeries.join(', ')}`);
      }
      
      // Add special filters
      if (filters.filterIsLimitedEdition) {
        filterTexts.push('Limited Edition');
      }
      
      if (filters.filterIsMystery) {
        filterTexts.push('Mystery');
      }
      
      // Add search query
      if (filters.searchQuery) {
        filterTexts.push(`Search: "${filters.searchQuery}"`);
      }
      
      // Add sort option
      if (filters.sortOption) {
        filterTexts.push(`Sort: ${filters.sortOption}`);
      }
      
      // Add pin count
      filterTexts.push(`Total: ${pinsArray.length} pins`);
      
      // Draw filter text
      const filterText = filterTexts.join(' | ');
      ctx.fillText(truncateText(filterText, 120), 20, filterY + 45);

      // Convert to data URL and set
      setLoadingMessage('Finalizing image...');
      const dataUrl = canvas.toDataURL('image/png');
      setImageUrl(dataUrl);
      setLoadingMessage('');
      
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
      setLoadingMessage('Error generating image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to truncate text
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Helper function to load images with CORS handling and caching
  const loadImage = (() => {
    // Create a cache for loaded images
    const imageCache = new Map();
    
    return (url) => {
      // Check if image is already in cache
      if (imageCache.has(url)) {
        return Promise.resolve(imageCache.get(url));
      }
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          // Store in cache
          imageCache.set(url, img);
          resolve(img);
        };
        
        img.onerror = (e) => {
          console.error('Image load error:', e);
          // Try with proxy if direct load fails
          const proxyImg = new Image();
          proxyImg.crossOrigin = 'anonymous';
          
          proxyImg.onload = () => {
            // Store in cache
            imageCache.set(url, proxyImg);
            resolve(proxyImg);
          };
          
          proxyImg.onerror = () => reject(new Error('Failed to load image even with proxy'));
          
          // Use a proxy to handle CORS issues
          proxyImg.src = `/api/image-proxy?url=${encodeURIComponent(url)}`;
        };
        
        img.src = url;
      });
    };
  })();

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
