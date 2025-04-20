"use client";

import { useState, useEffect } from 'react';
import { FaPlus, FaTimes, FaArrowLeft, FaTrash, FaCheck, FaEdit } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({ subsets: ['latin'] });

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [updateTagOpen, setUpdateTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Filter tags based on search query
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch all tags
  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/tags');
      setTags(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching tags:', err);
      setError('Failed to load tags');
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  // Create a new tag
  const handleCreateTag = async (e) => {
    e.preventDefault();
    
    if (!newTag.trim()) {
      toast.error('Please enter a tag name');
      return;
    }
    
    try {
      const response = await axios.post('/api/tags', { tag: newTag.trim() });
      // Add the new tag with a count of 0 since it hasn't been used yet
      setTags([...tags, { name: response.data.tag, count: 0 }]);
      setNewTag('');
      toast.success('Tag created successfully');
    } catch (err) {
      console.error('Error creating tag:', err);
      toast.error(err.response?.data?.error || 'Failed to create tag');
    }
  };

  // Toggle tag selection
  const toggleTagSelection = (tagName) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  // Delete selected tags
  const handleDeleteTags = async () => {
    if (selectedTags.length === 0) return;
    
    try {
      setLoading(true);
      await axios.delete('/api/tags', { data: { tags: selectedTags } });
      
      // Remove deleted tags from the list
      setTags(tags.filter(tag => !selectedTags.includes(tag.name)));
      setSelectedTags([]);
      
      toast.success(`Deleted ${selectedTags.length} tags from all pins`);
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error('Error deleting tags:', err);
      toast.error('Failed to delete tags');
    } finally {
      setLoading(false);
    }
  };

  // Load tags on component mount
  useEffect(() => {
    fetchTags();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/" className="text-gray-400 hover:text-white">
          <FaArrowLeft size={20} />
        </Link>
        <h1 className={`text-3xl text-white ${dancingScript.className}`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          Tag Management
        </h1>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Create Tag Form */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Create New Tag</h2>
        <form onSubmit={handleCreateTag} className="flex space-x-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Enter tag name"
            className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <FaPlus className="mr-2" /> Add Tag
          </button>
        </form>
      </div>

      {/* Selected Tags Actions */}
      {selectedTags.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              {selectedTags.length} Tags Selected
            </h2>
            <div className="flex space-x-3">
              {selectedTags.length === 1 && (
                <button
                  onClick={() => {
                    setNewTagName(selectedTags[0]);
                    setUpdateTagOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  disabled={loading}
                >
                  <FaEdit className="mr-2" /> Update Tag Name
                </button>
              )}
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                disabled={loading}
              >
                <FaTrash className="mr-2" /> Delete Selected Tags
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedTags.map((tag, index) => (
              <div key={index} className="px-3 py-1 bg-purple-900 rounded-full text-white flex items-center">
                {tag}
                <button 
                  onClick={() => toggleTagSelection(tag)}
                  className="ml-2 text-white hover:text-red-300"
                >
                  <FaTimes size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tag List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white">All Tags ({filteredTags.length})</h2>
          {selectedTags.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-300">{selectedTags.length} selected</span>
              {selectedTags.length === 1 && (
                <button
                  onClick={() => {
                    setNewTagName(selectedTags[0]);
                    setUpdateTagOpen(true);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <FaEdit className="mr-1" /> Update
                </button>
              )}
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <FaTrash className="mr-1" /> Delete
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-4">{error}</div>
        ) : filteredTags.length === 0 ? (
          <div className="text-gray-400 text-center py-8">No tags available</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredTags.map((tag, index) => (
              <div 
                key={index} 
                className={`rounded-lg p-3 flex justify-between items-center cursor-pointer transition-colors ${
                  selectedTags.includes(tag.name) 
                    ? 'bg-purple-900 text-white' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
                onClick={() => toggleTagSelection(tag.name)}
              >
                <div className="flex flex-col">
                  <span className="truncate font-medium">{tag.name}</span>
                  <span className="text-xs text-gray-400">{tag.count} {tag.count === 1 ? 'pin' : 'pins'}</span>
                </div>
                {selectedTags.includes(tag.name) && (
                  <FaCheck className="text-green-400" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Confirm Deletion</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete {selectedTags.length} tags? This will remove these tags from all pins.
              <br /><br />
              <span className="text-red-400">This action cannot be undone.</span>
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTags}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Tags
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Tag Modal */}
      {updateTagOpen && selectedTags.length === 1 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Update Tag Name</h2>
            <p className="text-gray-300 mb-4">
              Update the name of tag "{selectedTags[0]}" across all pins. This will replace the tag name in all pins that have this tag.
            </p>
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                New Tag Name
              </label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new tag name"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setUpdateTagOpen(false);
                  setNewTagName('');
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newTagName.trim()) {
                    toast.error('Please enter a new tag name');
                    return;
                  }

                  if (newTagName.trim() === selectedTags[0]) {
                    toast.error('New tag name must be different from the current one');
                    return;
                  }

                  try {
                    setLoading(true);
                    const response = await axios.put('/api/tags', {
                      oldTag: selectedTags[0],
                      newTag: newTagName.trim()
                    });
                    
                    // Update the local tags list
                    setTags(prevTags => {
                      // Find the tag to update
                      const tagToUpdate = prevTags.find(t => t.name === selectedTags[0]);
                      
                      if (!tagToUpdate) return prevTags;
                      
                      // Check if new tag already exists
                      const existingNewTag = prevTags.find(t => t.name === newTagName.trim());
                      
                      if (existingNewTag) {
                        // If new tag exists, merge counts and remove old tag
                        const updatedTags = prevTags.filter(t => t.name !== selectedTags[0]);
                        const updatedExistingTag = {
                          ...existingNewTag,
                          count: existingNewTag.count + tagToUpdate.count
                        };
                        
                        return [
                          ...updatedTags.filter(t => t.name !== newTagName.trim()),
                          updatedExistingTag
                        ].sort((a, b) => a.name.localeCompare(b.name));
                      } else {
                        // If new tag doesn't exist, just update the name
                        return prevTags.map(t => 
                          t.name === selectedTags[0] 
                            ? { ...t, name: newTagName.trim() } 
                            : t
                        ).sort((a, b) => a.name.localeCompare(b.name));
                      }
                    });
                    
                    // Update selected tags
                    setSelectedTags([newTagName.trim()]);
                    
                    toast.success(`Updated tag "${selectedTags[0]}" to "${newTagName.trim()}"`);
                    setUpdateTagOpen(false);
                    setNewTagName('');
                  } catch (error) {
                    console.error('Error updating tag:', error);
                    toast.error(error.response?.data?.error || 'Failed to update tag');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading || !newTagName.trim() || newTagName.trim() === selectedTags[0]}
              >
                Update Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
