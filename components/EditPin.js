"use client";

import { useState } from 'react';
import { FaTimes, FaUpload, FaComment, FaCandyCane, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

export default function EditPin({ pin = {}, onClose, onSave, onNext, onPrev }) {
  const [formData, setFormData] = useState({
    pinName: pin?.pinName || '',
    series: pin?.series || '',
    origin: pin?.origin || '',
    edition: pin?.edition || '',
    releaseDate: pin?.releaseDate ? new Date(pin.releaseDate).toISOString().split('T')[0] : '',
    isCollected: pin?.isCollected || false,
    isMystery: pin?.isMystery || false,
    isLimitedEdition: pin?.isLimitedEdition || false,
    comment: '',
    userImage: null
  });

  const [userImages, setUserImages] = useState(pin?.userPhotos || []);
  const [comments, setComments] = useState(pin?.comments || []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle edition as integer
    if (name === 'edition') {
      // Only allow numeric input for edition
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        const response = await axios.post('/api/upload', formData);
        
        // Add the new image to the userImages state
        const newImage = { url: response.data.url };
        setUserImages(prev => [...prev, newImage]);
        
        toast.success('Image uploaded successfully');
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Failed to upload image');
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedPin = {
        ...pin,
        pinName: formData.pinName,
        series: formData.series,
        origin: formData.origin,
        edition: formData.edition,
        releaseDate: formData.releaseDate || null,
        isCollected: formData.isCollected,
        isMystery: formData.isMystery,
        isLimitedEdition: formData.isLimitedEdition,
        userImages: userImages.map(img => img.url),
        comments
      };
      
      console.log('Saving pin with images:', updatedPin.userImages);
      
      await onSave(updatedPin);
      onClose();
    } catch (error) {
      console.error('Error updating pin:', error);
      toast.error('Failed to update pin');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Navigation Buttons */}
        {onPrev && (
          <button
            onClick={onPrev}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            title="Previous Pin"
          >
            <FaChevronLeft size={24} />
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            title="Next Pin"
          >
            <FaChevronRight size={24} />
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
            {/* Pin Image */}
            {pin?.imageUrl && (
              <div className="flex justify-center">
                <img
                  src={pin.imageUrl}
                  alt={pin.pinName}
                  className="max-w-xs rounded-lg border border-gray-700"
                />
              </div>
            )}

            {/* Pin ID and Pin&Pop Link in one row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-gray-300 font-medium">Pin ID:</span>
                <span className="text-white">{pin?.pinId || 'No Pin ID'}</span>
                {pin?.pinpopUrl && (
                  <a
                    href={pin.pinpopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-400 hover:text-pink-300 flex items-center ml-2"
                    title="View on Pin&Pop"
                  >
                    <FaCandyCane size={18} />
                  </a>
                )}
              </div>
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

              <div className="mb-4">
                <label className="block text-white mb-2">Edition</label>
                <input
                  type="number"
                  name="edition"
                  value={formData.edition}
                  onChange={handleChange}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Edition number"
                  min="0"
                />
              </div>
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

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isCollected"
                  checked={formData.isCollected}
                  onChange={handleChange}
                  className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-gray-300">Collected</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isLimitedEdition"
                  checked={formData.isLimitedEdition}
                  onChange={handleChange}
                  className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-gray-300">Limited Edition</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isMystery"
                  checked={formData.isMystery}
                  onChange={handleChange}
                  className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-gray-300">Mystery Pin</span>
              </label>
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

          {/* User Photos Section - Moved to bottom of modal for better visibility */}
          <div className="space-y-4 mt-8 border-t border-gray-700 pt-6">
            <div className="flex justify-between items-center">
              <label className="block text-lg font-medium text-gray-200">Your Photos</label>
              <label className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <FaUpload className="mr-2" />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            {userImages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No photos uploaded yet. Add your own photos of this pin!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                {userImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img.url}
                      alt={`User uploaded ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg border border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => setUserImages(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
    </div>
  );
}
