import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSpinner, FaCheck, FaTimes, FaExclamationCircle, FaPlus } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function AddPinModal({ isOpen, onClose, onPinAdded }) {
  const [pinId, setPinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [successPin, setSuccessPin] = useState(null);
  const [multipleResults, setMultipleResults] = useState(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [availableOrigins, setAvailableOrigins] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [manualPinData, setManualPinData] = useState({
    pinName: '',
    series: '',
    edition: '',
    year: '',
    origin: '',
    releaseDate: '',
    tags: [],
    isMystery: false,
    isLimitedEdition: false
  });

  // Fetch available tags and origins for dropdowns
  useEffect(() => {
    if (isOpen && isManualMode) {
      fetchAvailableFilters();
    }
  }, [isOpen, isManualMode]);

  const fetchAvailableFilters = async () => {
    try {
      const response = await axios.get('/api/pins?filtersOnly=true');
      setAvailableTags(response.data.tags || []);
      setAvailableOrigins(response.data.origins || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
      toast.error('Failed to load filter options');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pinId.trim()) {
      toast.error('Please enter at least one Pin&Pop ID');
      return;
    }

    setLoading(true);
    try {
      console.log("Submitting pin ID:", pinId.trim());
      const response = await axios.post('/api/pins/import', { pinId: pinId.trim() });
      console.log("API response:", response.data);
      
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

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!manualPinData.pinName.trim()) {
      toast.error('Pin name is required');
      return;
    }

    // Filter out any invalid tags
    const validTags = manualPinData.tags.filter(tag => availableTags.some(t => t.name === tag));
    if (validTags.length !== manualPinData.tags.length) {
      const removedCount = manualPinData.tags.length - validTags.length;
      toast.warn(`Removed ${removedCount} invalid tag${removedCount !== 1 ? 's' : ''}`);
      setManualPinData(prev => ({ ...prev, tags: validTags }));
    }

    setLoading(true);
    try {
      let imageUrl = '';
      
      // Convert image to base64 if selected
      if (selectedFile) {
        // Read file as base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });
        reader.readAsDataURL(selectedFile);
        
        const base64Data = await base64Promise;
        
        // Send base64 data directly in the pin creation request
        imageUrl = base64Data;
      }
      
      // Create pin with image data
      const pinResponse = await axios.post('/api/pins', {
        ...manualPinData,
        imageUrl,
        releaseDate: manualPinData.releaseDate ? new Date(manualPinData.releaseDate).toISOString() : null,
        year: manualPinData.year ? parseInt(manualPinData.year, 10) : null
      });
      
      // Set success state
      setSuccessPin(pinResponse.data);
      onPinAdded(pinResponse.data);
      toast.success('Pin added successfully');
      
      // Reset form
      setManualPinData({
        pinName: '',
        series: '',
        edition: '',
        year: '',
        origin: '',
        releaseDate: '',
        tags: [],
        isMystery: false,
        isLimitedEdition: false
      });
      setSelectedFile(null);
      setPreviewUrl('');
      
    } catch (error) {
      console.error('Error adding pin manually:', error);
      toast.error(error.response?.data?.error || 'Failed to add pin');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTagToggle = (tag) => {
    // Only toggle if it's a valid tag
    if (availableTags.some(t => t.name === tag)) {
      setManualPinData(prev => {
        const currentTags = [...prev.tags];
        
        if (currentTags.includes(tag)) {
          // Remove tag if already selected
          return {
            ...prev,
            tags: currentTags.filter(t => t !== tag)
          };
        } else {
          // Add tag if not selected
          return {
            ...prev,
            tags: [...currentTags, tag]
          };
        }
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setManualPinData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleClose = () => {
    setSuccessPin(null);
    setMultipleResults(null);
    setPinId('');
    setIsManualMode(false);
    setSelectedFile(null);
    setPreviewUrl('');
    setManualPinData({
      pinName: '',
      series: '',
      edition: '',
      year: '',
      origin: '',
      releaseDate: '',
      tags: [],
      isMystery: false,
      isLimitedEdition: false
    });
    onClose();
  };

  // If the modal is not open, don't render anything
  if (!isOpen) return null;

  console.log("Rendering AddPinModal, isOpen:", isOpen);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-white">
            {multipleResults ? 'Pins Processed' : successPin ? 'Pin Added Successfully' : 'Add New Pins'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl"
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
          <div>
            {/* Toggle buttons for Pin&Pop vs Manual entry */}
            <div className="flex mb-4 border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsManualMode(false)}
                className={`flex-1 py-2 text-sm font-medium ${
                  !isManualMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Pin&Pop ID
              </button>
              <button
                onClick={() => setIsManualMode(true)}
                className={`flex-1 py-2 text-sm font-medium ${
                  isManualMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Manual Entry
              </button>
            </div>

            {isManualMode ? (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                {/* Pin Image Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Pin Image
                  </label>
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-24 h-24 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center overflow-hidden"
                    >
                      {previewUrl ? (
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <FaPlus className="text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        id="pin-image"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="pin-image"
                        className="block w-full px-4 py-2 bg-gray-700 text-white text-sm rounded-lg cursor-pointer hover:bg-gray-600 transition-colors text-center"
                      >
                        Upload Image
                      </label>
                      <p className="text-xs text-gray-400 mt-1">
                        JPEG, PNG or WebP, max 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pin Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Pin Name *
                  </label>
                  <input
                    type="text"
                    name="pinName"
                    value={manualPinData.pinName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter pin name"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Series */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Series
                  </label>
                  <input
                    type="text"
                    name="series"
                    value={manualPinData.series}
                    onChange={handleInputChange}
                    placeholder="Enter series"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Edition */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Edition
                  </label>
                  <input
                    type="text"
                    name="edition"
                    value={manualPinData.edition}
                    onChange={handleInputChange}
                    placeholder="Enter edition"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={manualPinData.year}
                    onChange={handleInputChange}
                    placeholder="Enter year"
                    min="1900"
                    max="2100"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Origin Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Origin
                  </label>
                  <select
                    name="origin"
                    value={manualPinData.origin}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Origin</option>
                    {availableOrigins.map(origin => (
                      <option key={origin} value={origin}>{origin}</option>
                    ))}
                  </select>
                </div>

                {/* Release Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Release Date
                  </label>
                  <input
                    type="date"
                    name="releaseDate"
                    value={manualPinData.releaseDate}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Tags
                  </label>
                  <div className="max-h-32 overflow-y-auto p-2 bg-gray-700 border border-gray-600 rounded-lg">
                    {availableTags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                          <button
                            key={tag.name}
                            type="button"
                            onClick={() => handleTagToggle(tag.name)}
                            className={`px-2 py-1 text-xs rounded-full ${
                              manualPinData.tags.includes(tag.name)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-xs">No tags available</p>
                    )}
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isMystery"
                      name="isMystery"
                      checked={manualPinData.isMystery}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isMystery" className="ml-2 block text-sm text-gray-300">
                      Mystery Pin
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isLimitedEdition"
                      name="isLimitedEdition"
                      checked={manualPinData.isLimitedEdition}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isLimitedEdition" className="ml-2 block text-sm text-gray-300">
                      Limited Edition
                    </label>
                  </div>
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
                    'Add Pin'
                  )}
                </button>
              </form>
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
        )}
      </div>
    </div>
  );
}
