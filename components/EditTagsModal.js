import { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function EditTagsModal({ pin, onClose, onSave }) {
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState(pin?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch all available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await axios.get('/api/tags');
        setAvailableTags(response.data);
      } catch (error) {
        console.error('Error fetching tags:', error);
        toast.error('Failed to load tags');
      }
    };

    fetchTags();
  }, []);

  // Add a tag to the pin
  const handleAddTag = (tag) => {
    // Extract the tag name if it's an object
    const tagName = typeof tag === 'object' ? tag.name : tag;
    
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  // Remove a tag from the pin
  const handleRemoveTag = (tag) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  // Create and add a new tag
  const handleCreateTag = async () => {
    if (!newTag.trim()) return;

    try {
      setLoading(true);
      const response = await axios.post('/api/tags', { tag: newTag.trim() });
      const createdTag = response.data.tag;
      
      // Add to available tags with count 0
      setAvailableTags([...availableTags, { name: createdTag, count: 0 }]);
      
      // Add to selected tags
      handleAddTag(createdTag);
      
      // Clear input
      setNewTag('');
      toast.success('Tag created and added');
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error(error.response?.data?.error || 'Failed to create tag');
    } finally {
      setLoading(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    try {
      setLoading(true);
      await axios.put(`/api/pins/${pin.id}`, {
        ...pin,
        tags: selectedTags
      });
      
      toast.success('Tags updated successfully');
      onSave({ ...pin, tags: selectedTags });
    } catch (error) {
      console.error('Error updating tags:', error);
      toast.error('Failed to update tags');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Edit Tags for {pin.pinName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <FaTimes />
          </button>
        </div>

        {/* Current Tags */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">Current Tags</h3>
          <div className="flex flex-wrap gap-2 min-h-12">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-1 px-3 py-1 bg-purple-900 rounded-full text-white"
                >
                  <span>{tag}</span>
                  <button 
                    onClick={() => handleRemoveTag(tag)}
                    className="text-white hover:text-red-300"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No tags selected</p>
            )}
          </div>
        </div>

        {/* Add Existing Tag */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">Add Existing Tag</h3>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded-lg">
            {availableTags
              .filter(tag => {
                const tagName = typeof tag === 'object' ? tag.name : tag;
                return !selectedTags.includes(tagName);
              })
              .map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleAddTag(tag)}
                  className="px-3 py-1 bg-gray-600 hover:bg-purple-700 rounded-full text-white transition-colors"
                >
                  {typeof tag === 'object' ? tag.name : tag}
                </button>
              ))}
            {availableTags.filter(tag => {
              const tagName = typeof tag === 'object' ? tag.name : tag;
              return !selectedTags.includes(tagName);
            }).length === 0 && (
              <p className="text-gray-400">No more tags available</p>
            )}
          </div>
        </div>

        {/* Create New Tag */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-2">Create New Tag</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Enter new tag name"
              className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleCreateTag}
              disabled={!newTag.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPlus />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
