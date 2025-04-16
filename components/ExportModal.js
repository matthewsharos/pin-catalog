import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function ExportModal({ isOpen, onClose, pins, filters }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setImageUrl('');
      setIsGenerating(false);
    }
  }, [isOpen]);

  // Auto-generate the image when modal opens
  useEffect(() => {
    if (isOpen && pins.length > 0 && !imageUrl && !isGenerating) {
      generateImage();
    }
  }, [isOpen, pins, imageUrl]);

  if (!isOpen) return null;

  const generateImage = async () => {
    if (pins.length === 0) {
      toast.error('No pins to export');
      return;
    }

    if (pins.length > 250) {
      toast.error('Cannot export more than 250 pins at once');
      return;
    }

    setIsGenerating(true);
    try {
      // Fixed width of 2500px
      const width = 2500;
      
      // Determine pins per row based on count (5 or 10)
      const pinsPerRow = pins.length <= 30 ? 5 : 10;
      
      // Calculate pin size (square)
      const pinSize = width / pinsPerRow;
      
      // Calculate number of rows needed
      const rows = Math.ceil(Math.min(pins.length, 250) / pinsPerRow);
      
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

      // Draw pins
      for (let i = 0; i < Math.min(pins.length, 250); i++) {
        const pin = pins[i];
        const row = Math.floor(i / pinsPerRow);
        const col = i % pinsPerRow;
        const x = col * pinSize;
        const y = row * pinSize;

        try {
          // Load image
          const img = await loadImage(pin.imageUrl);
          
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
        } catch (error) {
          console.error('Error loading image:', error);
          // Draw error placeholder
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(x, y, pinSize, pinSize);
          ctx.fillStyle = 'red';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Image Error', x + pinSize/2, y + pinSize/2);
          ctx.fillText(`#${pin.pinId || 'Unknown'}`, x + pinSize/2, y + pinSize/2 + 30);
        }
      }

      // Draw filter information at bottom
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
      filterTexts.push(`Total: ${pins.length} pins`);
      
      // Draw filter text
      const filterText = filterTexts.join(' | ');
      ctx.fillText(truncateText(filterText, 120), 20, filterY + 45);

      // Convert to data URL and set
      const dataUrl = canvas.toDataURL('image/png');
      setImageUrl(dataUrl);
      
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to truncate text
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Helper function to load images with CORS handling
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        console.error('Image load error:', e);
        // Try with proxy if direct load fails
        const proxyImg = new Image();
        proxyImg.crossOrigin = 'anonymous';
        proxyImg.onload = () => resolve(proxyImg);
        proxyImg.onerror = () => reject(new Error('Failed to load image even with proxy'));
        // Use a proxy to handle CORS issues
        proxyImg.src = `/api/image-proxy?url=${encodeURIComponent(url)}`;
      };
      img.src = url;
    });
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
          {!imageUrl && (
            <div className="text-center text-white">
              <p className="mb-4">
                {isGenerating ? (
                  'Generating image, please wait...'
                ) : (
                  `Generating an image of your pin collection (${pins.length} pins) with current filters applied.`
                )}
              </p>
              <div className="flex justify-center">
                {isGenerating && (
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                )}
              </div>
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
                  onClick={generateImage}
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
