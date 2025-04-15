import { useState } from 'react';
import axios from 'axios';
import { FaSpinner, FaCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function AddPinModal({ isOpen, onClose, onPinAdded }) {
  const [pinId, setPinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [successPin, setSuccessPin] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pinId.trim()) {
      toast.error('Please enter a Pin&Pop ID');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/pins/scrape', { pinId: pinId.trim() });
      // Show success popup with pin thumbnail
      setSuccessPin(response.data);
      // Don't close the modal yet - we'll show the success state
      onPinAdded(response.data);
    } catch (error) {
      console.error('Error adding pin:', error);
      if (error.response?.data?.error === 'Pin already exists in your collection' && error.response?.data?.pin) {
        // Show already exists popup with pin thumbnail
        setSuccessPin(error.response.data.pin);
        toast.error('Pin already exists in your collection');
      } else {
        toast.error(error.response?.data?.error || 'Failed to add pin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessPin(null);
    setPinId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-white">
            {successPin ? 'Pin Added Successfully' : 'Add New Pin'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        {successPin ? (
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
                Pin&Pop ID
              </label>
              <input
                type="text"
                value={pinId}
                onChange={(e) => setPinId(e.target.value)}
                placeholder="Enter Pin&Pop ID (e.g., 74149)"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                disabled={loading}
              >
                {loading && <FaSpinner className="animate-spin" />}
                <span>Add Pin</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
