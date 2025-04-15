"use client";

import { useState, useEffect } from 'react';
import { FaTimes, FaUpload, FaComment, FaCandyCane, FaChevronRight, FaChevronLeft, FaTags } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import SmokeEffect from './SmokeEffect';
import axios from 'axios';

export default function EditPin({ pin = {}, onClose, onSave, onNext, onPrev, onStatusChange, onEditTags }) {
  const [formData, setFormData] = useState({
    pinName: pin?.pinName || '',
    series: pin?.series || '',
    origin: pin?.origin || '',
    releaseDate: pin?.releaseDate ? new Date(pin.releaseDate).toISOString().split('T')[0] : '',
    status: pin?.status || 'all',
    comment: '',
    userImage: null,
    imageUrl: pin?.imageUrl || '',
    isLimitedEdition: pin?.isLimitedEdition || false
  });

  const [comments, setComments] = useState(pin?.comments || []);
  const [smokeEffects, setSmokeEffects] = useState([]);

  // Update form data when pin changes
  useEffect(() => {
    setFormData({
      pinName: pin?.pinName || '',
      series: pin?.series || '',
      origin: pin?.origin || '',
      releaseDate: pin?.releaseDate ? new Date(pin.releaseDate).toISOString().split('T')[0] : '',
      status: pin?.status || 'all',
      comment: '',
      userImage: null,
      imageUrl: pin?.imageUrl || '',
      isLimitedEdition: pin?.isLimitedEdition || false
    });
    setComments(pin?.comments || []);
  }, [pin]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset file input
    e.target.value = '';

    // Show loading toast
    const loadingToast = toast.loading('Uploading image...');

    try {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 5MB.');
      }

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG and WebP images are allowed.');
      }

      // Create a data URL from the file
      const reader = new FileReader();
      
      // Create a promise to handle the FileReader async operation
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      
      // Set the data URL as the image source
      setFormData(prev => ({ 
        ...prev, 
        userImage: dataUrl,
        imageUrl: dataUrl 
      }));
      toast.success('Image uploaded successfully', { id: loadingToast });
      
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error(error.message || 'Failed to process image', { id: loadingToast });
    }
  };

  const handleAddComment = () => {
    if (formData.comment.trim()) {
      const newComment = {
        id: Date.now().toString(), // Use timestamp as unique ID
        content: formData.comment,
        createdAt: new Date().toISOString()
      };
      setComments(prev => [newComment, ...prev]);
      setFormData(prev => ({ ...prev, comment: '' }));
    }
  };

  const handleCommentKeyDown = (e) => {
    // If Enter is pressed without Shift, add the comment
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent form submission
      handleAddComment();
    }
  };

  const handleDeleteComment = (commentId) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
    toast.success('Comment deleted');
  };

  const handleSave = async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Saving pin...');
      
      // Create a copy of the form data
      const updatedPin = { ...formData };
      
      // Convert release date to ISO string if it exists
      if (updatedPin.releaseDate) {
        updatedPin.releaseDate = new Date(updatedPin.releaseDate).toISOString();
      }
      
      // Add the pin ID
      updatedPin.id = pin.id;
      
      // If we have a data URL for the image, we need to handle it differently
      if (updatedPin.userImage && updatedPin.userImage.startsWith('data:')) {
        // The image is a data URL, so we'll include it directly
        updatedPin.imageDataUrl = updatedPin.userImage;
        delete updatedPin.userImage;
      }
      
      // Call the onSave callback
      await onSave(updatedPin);
      
      // Close the toast
      toast.success('Pin saved successfully', { id: loadingToast });
      
    } catch (error) {
      console.error('Error saving pin:', error);
      toast.error('Failed to save pin');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleSave();
    onClose();
  };

  const handleStatusChange = async (newStatus) => {
    try {
      // Get button position for smoke effect
      const buttonElement = document.querySelector(`[data-status="${newStatus}"]`);
      const rect = buttonElement?.getBoundingClientRect();
      const position = rect ? {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      } : null;

      // Get color based on status
      let smokeColor;
      if (newStatus === 'collected') {
        smokeColor = 'green';
      } else if (newStatus === 'uncollected') {
        smokeColor = 'brown';
      } else if (newStatus === 'wishlist') {
        smokeColor = 'blue';
      }

      // Add smoke effect
      if (position && smokeColor) {
        const effectId = Date.now();
        setSmokeEffects(prev => [...prev, {
          id: effectId,
          color: smokeColor,
          position
        }]);
      }

      let updates = {};
      
      if (newStatus === 'collected') {
        updates = {
          isCollected: true,
          isDeleted: false,
          isWishlist: false
        };
      } else if (newStatus === 'uncollected') {
        updates = {
          isCollected: false,
          isDeleted: true,
          isWishlist: false
        };
      } else if (newStatus === 'wishlist') {
        updates = {
          isCollected: false,
          isDeleted: true,
          isWishlist: true
        };
      } else if (newStatus === 'uncategorize') {
        updates = {
          isCollected: false,
          isDeleted: false,
          isWishlist: false
        };
      }

      // Create axios instance with base URL
      const axiosInstance = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || '',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      
      await axiosInstance.post('/api/pins/bulk-update', {
        pinIds: [pin.id],
        updates: updates
      });

      toast.success('Pin updated');
      onStatusChange?.(); // Call onStatusChange to refresh pins list
      onNext?.(); // Move to next pin
    } catch (error) {
      console.error('Error updating pin status:', error);
      toast.error('Failed to update pin status');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Navigation Buttons */}
        {onPrev && (
          <button
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-colors z-10"
          >
            <FaChevronLeft size={20} />
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-colors z-10"
          >
            <FaChevronRight size={20} />
          </button>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Edit Pin</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Display-only fields */}
          <div className="space-y-4">
            {/* Pin Image with Upload */}
            {formData.imageUrl && (
              <div className="flex flex-col items-center space-y-3">
                <label className="relative cursor-pointer group">
                  <img
                    src={formData.imageUrl}
                    alt={formData.pinName}
                    className="max-w-xs rounded-lg border border-gray-700 group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="bg-black bg-opacity-50 rounded-lg p-2">
                        <FaUpload className="text-white text-xl" />
                      </div>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      id="image-upload"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </label>

                {/* Status Buttons */}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    data-status="collected"
                    onClick={() => handleStatusChange('collected')}
                    className={`h-7 px-2 text-xs rounded-lg transition-colors flex items-center ${
                      formData.status === 'collected' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Collected
                  </button>
                  <button
                    type="button"
                    data-status="uncollected"
                    onClick={() => handleStatusChange('uncollected')}
                    className={`h-7 px-2 text-xs rounded-lg transition-colors flex items-center ${
                      formData.status === 'uncollected' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Uncollected
                  </button>
                  <button
                    type="button"
                    data-status="wishlist"
                    onClick={() => handleStatusChange('wishlist')}
                    className={`h-7 px-2 text-xs rounded-lg transition-colors flex items-center ${
                      formData.status === 'wishlist' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Wishlist
                  </button>
                </div>
              </div>
            )}

            {/* Pin ID and Pin&Pop Link in one row */}
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-sm font-medium text-gray-300">Pin ID:</span>
              <span className="text-white">{pin?.pinId}</span>
              {pin?.pinpopUrl && (
                <a
                  href={pin.pinpopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                  title="View on Pin&Pop"
                >
                  <FaCandyCane className="h-4 w-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => onEditTags?.(pin)}
                className="text-gray-400 hover:text-purple-400 transition-colors"
                title="Edit Tags"
              >
                <FaTags className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Name</label>
              <input
                type="text"
                name="pinName"
                value={formData.pinName}
                onChange={handleChange}
                className="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Series</label>
              <input
                type="text"
                name="series"
                value={formData.series}
                onChange={handleChange}
                className="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Origin</label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleChange}
                  className="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Release Date</label>
                <input
                  type="date"
                  name="releaseDate"
                  value={formData.releaseDate}
                  onChange={handleChange}
                  className="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-4 mt-6 border-t border-gray-700 pt-6">
            <div className="flex justify-between items-center">
              <label className="block text-lg font-medium text-gray-200">Comments</label>
            </div>
            
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                onKeyDown={handleCommentKeyDown}
                placeholder="Add a comment..."
                className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddComment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaComment />
              </button>
            </div>
            
            {comments.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <p>No comments yet. Add your thoughts about this pin!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {comments.map((comment, index) => (
                  <div key={comment.id || index} className="bg-gray-700 p-3 rounded-lg relative group">
                    <p className="text-white pr-6">{comment.content}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FaTimes size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save/Cancel buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Smoke Effects */}
      {smokeEffects.map(effect => (
        <SmokeEffect
          key={effect.id}
          color={effect.color}
          position={effect.position}
          onComplete={() => {
            setSmokeEffects(prev => prev.filter(e => e.id !== effect.id));
          }}
        />
      ))}
    </div>
  );
}
