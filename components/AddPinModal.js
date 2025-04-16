import { useState } from 'react';
import axios from 'axios';
import { FaSpinner, FaCheck, FaTimes, FaExclamationCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function AddPinModal({ isOpen, onClose, onPinAdded }) {
  const [pinId, setPinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [successPin, setSuccessPin] = useState(null);
  const [multipleResults, setMultipleResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pinId.trim()) {
      toast.error('Please enter at least one Pin&Pop ID');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/pins/import', { pinId: pinId.trim() });
      
      if (response.data.summary) {
        // Multiple pins were processed
        setMultipleResults(response.data);
        // Notify parent about all added pins
        if (response.data.results.added && response.data.results.added.length > 0) {
          response.data.results.added.forEach(result => {
            if (result.pin) onPinAdded(result.pin);
          });
        }
        
        // Show toast with summary
        const { total, added, existing, failed } = response.data.summary;
        toast.success(
          `Processed ${total} pins:\n` +
          `✅ ${added} added\n` +
          `ℹ️ ${existing} existing\n` +
          `❌ ${failed} failed`
        );
      } else {
        // Single pin was processed
        setSuccessPin(response.data);
        onPinAdded(response.data);
      }
    } catch (error) {
      console.error('Error adding pin:', error);
      
      // Check for specific error messages
      const errorMessage = error.response?.data?.error || 'Failed to add pin';
      
      // If it's a unique constraint error, show a more user-friendly message
      if (errorMessage.includes('Unique constraint failed')) {
        toast.error('This pin already exists in your collection');
      } else if (errorMessage.includes('Pin not found')) {
        toast.error('Pin not found on Pin&Pop. Please check the ID and try again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessPin(null);
    setMultipleResults(null);
    setPinId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-white">
            {multipleResults ? 'Pins Processed' : successPin ? 'Pin Added Successfully' : 'Add New Pins'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        {multipleResults ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-500">{multipleResults.summary.added}</div>
                <div className="text-sm text-gray-300">Added</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-500">{multipleResults.summary.existing}</div>
                <div className="text-sm text-gray-300">Existing</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-500">{multipleResults.summary.failed}</div>
                <div className="text-sm text-gray-300">Failed</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-300">{multipleResults.summary.total}</div>
                <div className="text-sm text-gray-300">Total</div>
              </div>
            </div>

            {multipleResults.results.existing.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">Already in Collection:</h3>
                <div className="bg-gray-700 p-2 rounded text-sm space-y-1 max-h-32 overflow-y-auto">
                  {multipleResults.results.existing.map((item, idx) => (
                    <div key={idx} className="flex items-center text-gray-300">
                      <span className="text-blue-400 mr-2">•</span>
                      <span>ID {item.pinId}: {item.pin.pinName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {multipleResults.results.failed.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-red-400 mb-2">Failed Pins:</h3>
                <div className="bg-gray-700 p-2 rounded text-sm space-y-1 max-h-32 overflow-y-auto">
                  {multipleResults.results.failed.map((fail, idx) => (
                    <div key={idx} className="flex items-center text-gray-300">
                      <FaExclamationCircle className="text-red-500 mr-2" />
                      <span>ID {fail.pinId}: {fail.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : successPin ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <img 
                src={successPin.imageUrl} 
                alt={successPin.pinName} 
                className="w-48 h-48 object-contain bg-gray-900 rounded-lg border border-gray-700"
              />
              <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                <FaCheck className="text-white" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white">{successPin.pinName}</h3>
              <p className="text-gray-400">{successPin.series}</p>
              <p className="text-gray-400">{successPin.origin}</p>
            </div>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Pin&Pop IDs
              </label>
              <textarea
                value={pinId}
                onChange={(e) => setPinId(e.target.value)}
                placeholder="Enter Pin&Pop IDs (e.g., 74149, 12345, 67890)"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter multiple IDs separated by commas or new lines
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <FaSpinner className="animate-spin mr-2" />
                  Processing...
                </span>
              ) : (
                'Add Pins'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
