import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaCheck, FaTimes, FaHeart, FaStar, FaTag, FaCandyCane, FaTrash, FaCalendarAlt } from 'react-icons/fa';
import EditTagsModal from './EditTagsModal';

export default function PinModal({ pin, onClose, onUpdate, onDelete, pins, currentIndex, onNavigate, setSelectedTag }) {
  const [formData, setFormData] = useState(pin || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState(pin?.comments || []);
  const [newComment, setNewComment] = useState('');
  const [showTagModal, setShowTagModal] = useState(false);
  const [currentPinIndex, setCurrentPinIndex] = useState(currentIndex || 0);
  const [flashingButtons, setFlashingButtons] = useState({});
  const [imageAnimating, setImageAnimating] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);

  useEffect(() => {
    // Format the date properly when pin changes
    if (pin) {
      const formattedPin = { ...pin };
      
      // Format releaseDate as YYYY-MM-DD for the date input if it exists
      if (pin.releaseDate) {
        const date = new Date(pin.releaseDate);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          formattedPin.releaseDate = `${year}-${month}-${day}`;
        } else {
          formattedPin.releaseDate = '';
        }
      }
      
      setFormData(formattedPin);
      setComments(pin.comments || []);
    }
  }, [pin]);

  const handleTagsUpdate = (updatedPin) => {
    // Update the local form data with the new pin data
    setFormData(updatedPin);
    // Update the pin in the parent component
    onUpdate(updatedPin);
    // Close the tags modal
    setShowTagModal(false);
  };

  if (!pin) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create a copy of formData without comments
      const { comments: _, ...pinDataWithoutComments } = formData;
      
      const updatedPinData = {
        ...pinDataWithoutComments,
        tags: formData.tags || [] // Preserve existing tags
      };
      
      const response = await fetch(`/api/pins/${pin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPinData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update pin');
      }

      const updatedPin = await response.json();
      // Preserve comments in the updated pin
      updatedPin.comments = comments;
      onUpdate(updatedPin);
      toast.success('Pin updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update pin');
      console.error('Error updating pin:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, releaseDate: value }));
  };

  const handleStatusChange = (status) => {
    // Set flashing state for the button
    setFlashingButtons(prev => ({
      ...prev,
      [status]: true
    }));
    
    // Clear flashing state after animation completes
    setTimeout(() => {
      setFlashingButtons(prev => ({
        ...prev,
        [status]: false
      }));
    }, 500);
    
    // Start image animation
    setImageAnimating(true);
    
    // Create a copy of the current form data
    const updatedPin = { ...formData };
    
    // Check if the clicked status is already active
    const isActive = 
      (status === 'collected' && formData.isCollected) ||
      (status === 'wishlist' && formData.isWishlist) ||
      (status === 'uncollected' && formData.isDeleted) ||
      (status === 'underReview' && formData.isUnderReview);
    
    // Reset all status flags first
    updatedPin.isCollected = false;
    updatedPin.isWishlist = false;
    updatedPin.isDeleted = false;
    updatedPin.isUnderReview = false;
    
    // If the status was not already active and not 'all', set the appropriate flag
    if (!isActive && status !== 'all') {
      if (status === 'collected') {
        updatedPin.isCollected = true;
      } else if (status === 'wishlist') {
        updatedPin.isWishlist = true;
      } else if (status === 'uncollected') {
        updatedPin.isDeleted = true;
      } else if (status === 'underReview') {
        updatedPin.isUnderReview = true;
      }
    }
    
    // Update the local form data immediately
    setFormData(updatedPin);
    
    // Wait for animation to complete before updating
    setTimeout(() => {
      // Store the current index before updating
      const currentIndex = pins ? pins.findIndex(p => p.id === updatedPin.id) : -1;
      
      // Update the pin in the parent component
      if (typeof onUpdate === 'function') {
        onUpdate(updatedPin, currentIndex);
      }
      
      // Reset animation state
      setImageAnimating(false);
    }, 300);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setIsAddingComment(true);
    
    try {
      const response = await fetch(`/api/pins/${pin.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      
      const addedComment = await response.json();
      
      setComments(prev => [...prev, addedComment]);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(`/api/pins/${pin.id}/comments/${commentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const navigatePin = (direction) => {
    if (!pins || pins.length <= 1) return;
    onNavigate(direction, pin);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">Edit Pin</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        <div className="p-4">
          {/* Navigation Buttons */}
          <div className="flex justify-between mb-4">
            <button 
              onClick={() => navigatePin('prev')}
              className="bg-gray-800 text-white p-2 rounded-full hover:bg-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={() => navigatePin('next')}
              className="bg-gray-800 text-white p-2 rounded-full hover:bg-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Pin Image */}
          <div className="flex justify-center mb-4">
            <div className="relative w-full max-w-md">
              <img 
                src={pin.imageUrl ? 
                  (pin.imageRefreshKey ? 
                    `${pin.imageUrl}${pin.imageUrl.includes('?') ? '&' : '?'}v=${pin.imageRefreshKey}` 
                    : pin.imageUrl) 
                  : '/placeholder-pin.png'} 
                alt={pin.pinName} 
                className={`w-full h-auto max-h-[500px] object-contain rounded-lg shadow-lg transition-all duration-300 ${
                  imageAnimating ? 'opacity-0 scale-95' : 'opacity-100'
                }`}
              />
            </div>
          </div>

          {/* Status Action Buttons */}
          <div className="flex mb-4 mx-auto max-w-md border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => handleStatusChange('collected')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                formData.isCollected ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              } ${flashingButtons['collected'] ? 'animate-pulse-green' : ''}`}
              title="Mark as Collected"
            >
              <div className="flex items-center justify-center">
                <FaCheck className="mr-0.5" />
                <span>Owned</span>
              </div>
            </button>
            <button
              onClick={() => handleStatusChange('uncollected')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                formData.isDeleted ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              } ${flashingButtons['uncollected'] ? 'animate-pulse-yellow' : ''}`}
              title="Mark as Uncollected"
            >
              <div className="flex items-center justify-center">
                <FaTimes className="mr-0.5" />
                <span>Uncollected</span>
              </div>
            </button>
            <button
              onClick={() => handleStatusChange('wishlist')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                formData.isWishlist ? 'bg-blue-400 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              } ${flashingButtons['wishlist'] ? 'animate-pulse-blue' : ''}`}
              title="Add to Wishlist"
            >
              <div className="flex items-center justify-center">
                <FaHeart className="mr-0.5" />
                <span>Wishlist</span>
              </div>
            </button>
            <button
              onClick={() => handleStatusChange('underReview')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                formData.isUnderReview ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              } ${flashingButtons['underReview'] ? 'animate-pulse-amber' : ''}`}
              title="Mark for Review"
            >
              <div className="flex items-center justify-center">
                <FaStar className="mr-0.5" />
                <span>Review</span>
              </div>
            </button>
            <button
              onClick={() => handleStatusChange('all')}
              className={`flex-1 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors ${
                flashingButtons['all'] ? 'animate-pulse-blue' : ''
              }`}
              title="Clear Status"
            >
              <div className="flex items-center justify-center">
                <span>All</span>
              </div>
            </button>
          </div>

          {/* Pin ID and Action Icons */}
          <div className="flex items-center mb-6 text-xs">
            <div className="text-white bg-gray-800 px-3 py-2 rounded-lg mr-2">
              <span className="font-medium">Pin ID:</span> {formData.pinId || 'No ID'}
            </div>
            <a 
              href={formData.pinpopUrl || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-800 text-white p-2 rounded-lg hover:bg-gray-700 mr-2"
              title="View on Pin & Pop"
            >
              <FaCandyCane size={18} />
            </a>
            <div className="flex items-center">
              <button 
                onClick={() => setShowTagModal(true)}
                className="bg-gray-800 text-white p-2 rounded-lg hover:bg-gray-700 flex items-center"
                title="Manage Tags"
              >
                <FaTag size={18} />
              </button>
              {formData.tags && formData.tags.length > 0 && (
                <div className="ml-2 flex flex-wrap gap-1">
                  {formData.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="bg-purple-900 text-white text-xs px-2 py-0.5 rounded-full cursor-pointer hover:bg-purple-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Close the modal and filter by this tag
                        onClose();
                        if (typeof setSelectedTag === 'function') {
                          setSelectedTag(tag);
                        }
                      }}
                      title={`Filter by tag: ${tag}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white mb-1">Name</label>
              <input
                type="text"
                name="pinName"
                value={formData.pinName || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Series</label>
              <input
                type="text"
                name="series"
                value={formData.series || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Origin</label>
              <input
                type="text"
                name="origin"
                value={formData.origin || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Release Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FaCalendarAlt className="text-gray-400" />
                </div>
                <input
                  type="date"
                  name="releaseDate"
                  value={formData.releaseDate || ''}
                  onChange={handleDateChange}
                  className="w-full pl-10 px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Pin & Pop URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FaCandyCane className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="pinpopUrl"
                  value={formData.pinpopUrl || ''}
                  onChange={handleChange}
                  placeholder="https://pinandpop.com/pins/..."
                  className="w-full pl-10 px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Comments Section */}
            <div>
              <label className="block text-xs font-medium text-white mb-1">Comments</label>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 mb-2">
                {comments.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto mb-2">
                    {comments.map(comment => (
                      <div key={comment.id} className="flex items-start justify-between bg-gray-700 rounded p-1.5">
                        <div className="flex-1">
                          <p className="text-xs text-white">{comment.content}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-400 hover:text-red-500"
                          title="Delete comment"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs mb-2">No comments yet</p>
                )}
                
                <div className="flex">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-gray-700 text-white text-xs border-0 rounded-l-lg p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={isAddingComment || !newComment.trim()}
                    className={`bg-blue-600 text-white text-xs px-3 py-1.5 rounded-r-lg hover:bg-blue-700 transition-colors ${
                      isAddingComment ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isAddingComment ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-gray-700 text-xs text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-blue-600 text-xs text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Tag Modal */}
      {showTagModal && (
        <EditTagsModal
          pin={formData}
          onClose={() => setShowTagModal(false)}
          onSave={handleTagsUpdate}
        />
      )}
    </div>
  );
}
