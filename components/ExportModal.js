import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function ExportModal({ isOpen, onClose, pins, activeFilters }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setImageUrl('');
      setIsGenerating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const generateImage = async () => {
    setIsGenerating(true);
    try {
      const width = 2500;
      const pinsPerRow = pins.length <= 30 ? 5 : 10;
      const pinWidth = width / pinsPerRow;
      const rows = Math.ceil(pins.length / pinsPerRow);
      const height = (pinWidth * rows) + 100; // Extra 100px for filter info

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);

      // Draw pins
      for (let i = 0; i < pins.length; i++) {
        const pin = pins[i];
        const row = Math.floor(i / pinsPerRow);
        const col = i % pinsPerRow;
        const x = col * pinWidth;
        const y = row * pinWidth;

        try {
          const img = await loadImage(pin.imageUrl);
          const aspectRatio = img.height / img.width;
          const drawHeight = pinWidth * aspectRatio;
          
          // Draw image
          ctx.drawImage(img, x, y, pinWidth, drawHeight);

          // Draw pin info
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(x, y + drawHeight - 60, pinWidth, 60);
          
          ctx.fillStyle = 'white';
          ctx.font = '24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(pin.name, x + pinWidth/2, y + drawHeight - 35);
          ctx.font = '20px Arial';
          ctx.fillText(`#${pin.id} - ${pin.status}`, x + pinWidth/2, y + drawHeight - 10);
        } catch (error) {
          console.error('Error loading image:', error);
          // Draw error placeholder
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(x, y, pinWidth, pinWidth);
          ctx.fillStyle = 'red';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Image Error', x + pinWidth/2, y + pinWidth/2);
        }
      }

      // Draw filter information
      const filterY = height - 80;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, filterY, width, 80);
      
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'left';
      const filterText = Object.entries(activeFilters)
        .filter(([_, value]) => value && value.length > 0)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(' | ');
      ctx.fillText(filterText, 20, filterY + 45);

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

  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
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
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Export Collection</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {!imageUrl && (
            <div className="text-center">
              <p className="mb-4">
                This will generate an image of your pin collection
                ({pins.length} pins) with current filters applied.
              </p>
              <button
                onClick={generateImage}
                disabled={isGenerating}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate Image'}
              </button>
            </div>
          )}

          {imageUrl && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
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
                  onClick={() => setImageUrl('')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Generate New
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
