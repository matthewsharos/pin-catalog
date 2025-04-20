"use client";

import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaTimes, FaArrowLeft, FaTrash, FaCheck, FaEdit, FaTags, FaSearch, FaFilter } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({ subsets: ['latin'] });

export default function TagsPage() {
  // Tags state
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagsToApply, setTagsToApply] = useState([]);

  // Pins state
  const [pins, setPins] = useState([]);
  const [selectedPins, setSelectedPins] = useState({});
  const [pinSearchQuery, setPinSearchQuery] = useState('');
  const [loadingPins, setLoadingPins] = useState(true);

  // UI state
  const [activeView, setActiveView] = useState('pins'); // 'pins', 'tags', 'create'
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [batchSize, setBatchSize] = useState(100);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filter tags based on search query
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter pins based on search query
  const filteredPins = pins.filter(pin => 
    pin.pinName?.toLowerCase().includes(pinSearchQuery.toLowerCase()) ||
    pin.pinId?.toLowerCase().includes(pinSearchQuery.toLowerCase()) ||
    pin.series?.toLowerCase().includes(pinSearchQuery.toLowerCase()) ||
    pin.origin?.toLowerCase().includes(pinSearchQuery.toLowerCase())
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

  // Fetch collected pins with pagination
  const fetchCollectedPins = async (pageNum = 1, append = false) => {
    try {
      setLoadingPins(true);
      
      const params = new URLSearchParams();
      params.set('page', pageNum.toString());
      params.set('pageSize', batchSize.toString());
      params.set('collected', 'true'); 
      params.set('tag', 'No Tags'); 
      
      const response = await axios.get(`/api/pins?${params.toString()}`);
      
      if (append) {
        setPins(prev => [...prev, ...response.data.pins]);
      } else {
        setPins(response.data.pins);
      }
      
      setHasMore(response.data.currentPage < response.data.totalPages);
      setPage(response.data.currentPage);
    } catch (err) {
      console.error('Error fetching pins:', err);
      toast.error('Failed to load pins');
    } finally {
      setLoadingPins(false);
    }
  };

  // Load more pins
  const loadMore = () => {
    if (!loadingPins && hasMore) {
      fetchCollectedPins(page + 1, true);
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
      setTagsToApply([...tagsToApply, response.data.tag]);
      setNewTag('');
      toast.success('Tag created successfully');
      setActiveView('pins');
    } catch (err) {
      console.error('Error creating tag:', err);
      toast.error(err.response?.data?.error || 'Failed to create tag');
    }
  };

  // Toggle pin selection
  const togglePinSelection = (pin) => {
    setSelectedPins(prev => {
      const newSelected = { ...prev };
      if (newSelected[pin.id]) {
        delete newSelected[pin.id];
      } else {
        newSelected[pin.id] = pin;
      }
      return newSelected;
    });
  };

  // Select all visible pins
  const selectAllVisiblePins = () => {
    const newSelected = { ...selectedPins };
    filteredPins.forEach(pin => {
      newSelected[pin.id] = pin;
    });
    setSelectedPins(newSelected);
  };

  // Deselect all pins
  const deselectAllPins = () => {
    setSelectedPins({});
  };

  // Toggle tag to apply
  const toggleTagToApply = (tagName) => {
    setTagsToApply(prev => {
      if (prev.includes(tagName)) {
        return prev.filter(t => t !== tagName);
      } else {
        return [...prev, tagName];
      }
    });
  };

  // Apply tags to selected pins
  const applyTagsToSelectedPins = async () => {
    if (Object.keys(selectedPins).length === 0 || tagsToApply.length === 0) {
      toast.error('Please select pins and tags to apply');
      return;
    }
    
    try {
      setLoading(true);
      let successCount = 0;
      
      // Process pins in batches to avoid overwhelming the server
      const pinIds = Object.keys(selectedPins);
      
      for (const pinId of pinIds) {
        const pin = selectedPins[pinId];
        // Get current tags and add new ones without duplicates
        const currentTags = pin.tags || [];
        const updatedTags = [...new Set([...currentTags, ...tagsToApply])];
        
        try {
          await axios.put('/api/pins', {
            id: pin.id,
            tags: updatedTags
          });
          
          successCount++;
        } catch (error) {
          console.error(`Error updating pin ${pin.id}:`, error);
        }
      }
      
      // Remove tagged pins from the display since they now have tags
      setPins(prevPins => prevPins.filter(pin => !selectedPins[pin.id]));
      
      // Update tag counts
      fetchTags();
      
      // Clear selection and tags to apply
      setSelectedPins({});
      setTagsToApply([]);
      
      toast.success(`Applied tags to ${successCount} pins`);
    } catch (err) {
      console.error('Error applying tags:', err);
      toast.error('Failed to apply tags to some pins');
    } finally {
      setLoading(false);
    }
  };

  // Load tags and pins on component mount
  useEffect(() => {
    fetchTags();
    fetchCollectedPins();
  }, []);

  return (
    <div className="container mx-auto px-2 py-4 min-h-screen">
      {/* Header with Navigation */}
      <div className="flex items-center space-x-4 mb-4">
        <Link href="/" className="text-gray-400 hover:text-white p-2">
          <FaArrowLeft size={20} />
        </Link>
        <h1 className={`text-3xl text-white ${dancingScript.className}`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          Bulk Tag Manager
        </h1>
      </div>

      {/* View Tabs */}
      <div className="flex mb-4 border-b border-gray-700">
        <button 
          className={`py-2 px-4 ${activeView === 'pins' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveView('pins')}
        >
          Pins to Tag
        </button>
        <button 
          className={`py-2 px-4 ${activeView === 'tags' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveView('tags')}
        >
          Manage Tags
        </button>
        <button 
          className={`py-2 px-4 ${activeView === 'create' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveView('create')}
        >
          Create Tag
        </button>
      </div>

      {/* Instructions panel */}
      <div className="bg-gray-800 p-4 rounded-lg mb-4 text-gray-300">
        <h2 className="text-white font-semibold mb-2">Bulk Tagging Instructions</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Select pins from your collection below</li>
          <li>Choose tags to apply from your tag library</li>
          <li>Click "Apply Tags" to update all selected pins</li>
        </ol>
      </div>

      {/* Pin Selection Header */}
      {activeView === 'pins' && (
        <div className="flex flex-col mb-4 space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center bg-gray-800 p-4 rounded-lg">
          <div className="flex-1 flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search pins..."
                value={pinSearchQuery}
                onChange={(e) => setPinSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {pinSearchQuery && (
                <button
                  onClick={() => setPinSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <FaTimes size={14} />
                </button>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={selectAllVisiblePins}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center"
                disabled={loadingPins}
              >
                <FaCheck className="mr-1" /> Select All
              </button>
              <button
                onClick={deselectAllPins}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm flex items-center"
                disabled={Object.keys(selectedPins).length === 0}
              >
                <FaTimes className="mr-1" /> Clear
              </button>
            </div>
          </div>
          <div className="flex space-x-2 items-center">
            <span className="text-white text-sm">
              {Object.keys(selectedPins).length} selected
            </span>
            <button
              onClick={() => setShowTagSelector(!showTagSelector)}
              className={`px-3 py-2 text-white rounded-lg text-sm flex items-center ${
                Object.keys(selectedPins).length > 0 ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 opacity-60 cursor-not-allowed'
              }`}
              disabled={Object.keys(selectedPins).length === 0}
            >
              <FaTags className="mr-1" /> {showTagSelector ? 'Hide Tags' : 'Select Tags'}
            </button>
            <button
              onClick={applyTagsToSelectedPins}
              className={`px-3 py-2 text-white rounded-lg text-sm flex items-center ${
                Object.keys(selectedPins).length > 0 && tagsToApply.length > 0
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-700 opacity-60 cursor-not-allowed'
              }`}
              disabled={Object.keys(selectedPins).length === 0 || tagsToApply.length === 0 || loading}
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>
              ) : (
                <FaCheck className="mr-1" />
              )}
              Apply Tags
            </button>
          </div>
        </div>
      )}

      {/* Selected Tags Display */}
      {(showTagSelector || activeView !== 'pins') && (
        <div className="mb-4 bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-white font-semibold">
              {activeView === 'pins' ? 'Tags to Apply' : 'All Tags'}
            </h2>
            <div className="relative w-1/3">
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1 bg-gray-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <FaTimes size={12} />
                </button>
              )}
            </div>
          </div>
          
          {activeView === 'pins' ? (
            <div className="flex flex-wrap gap-2">
              {tagsToApply.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No tags selected. Choose tags to apply below.</p>
              ) : (
                tagsToApply.map((tag, index) => (
                  <div key={index} className="flex items-center bg-purple-900 rounded-full px-3 py-1 text-white text-sm">
                    {tag}
                    <button 
                      onClick={() => toggleTagToApply(tag)}
                      className="ml-2 text-white hover:text-red-300"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag, index) => (
                <div key={index} className="px-3 py-1 bg-purple-900 rounded-full text-white text-sm flex items-center">
                  {tag}
                  <button 
                    onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                    className="ml-2 text-white hover:text-red-300"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : error ? (
              <div className="col-span-full text-red-500 text-center py-4">{error}</div>
            ) : filteredTags.length === 0 ? (
              <div className="col-span-full text-gray-400 text-center py-4">No tags available</div>
            ) : (
              filteredTags.map((tag, index) => (
                <div 
                  key={index} 
                  className={`rounded-lg p-2 flex justify-between items-center cursor-pointer transition-colors ${
                    activeView === 'pins'
                      ? tagsToApply.includes(tag.name)
                        ? 'bg-purple-700 text-white' 
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                      : selectedTags.includes(tag.name)
                        ? 'bg-purple-700 text-white'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                  onClick={() => activeView === 'pins' ? toggleTagToApply(tag.name) : setSelectedTags(prev => {
                    if (prev.includes(tag.name)) {
                      return prev.filter(t => t !== tag.name);
                    } else {
                      return [...prev, tag.name];
                    }
                  })}
                >
                  <div className="flex flex-col truncate">
                    <span className="font-medium truncate">{tag.name}</span>
                    <span className="text-xs text-gray-400">{tag.count} pins</span>
                  </div>
                  {activeView === 'pins' 
                    ? tagsToApply.includes(tag.name) && <FaCheck className="text-green-400" />
                    : selectedTags.includes(tag.name) && <FaCheck className="text-green-400" />
                  }
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Tag Form */}
      {activeView === 'create' && (
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
              disabled={!newTag.trim()}
            >
              <FaPlus className="mr-2" /> Add Tag
            </button>
          </form>
        </div>
      )}

      {/* Pin Grid */}
      {activeView === 'pins' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {loadingPins && pins.length === 0 ? (
              Array(12).fill(0).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg overflow-hidden aspect-square animate-pulse"></div>
              ))
            ) : filteredPins.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-400">
                {pins.length === 0 ? "No pins in your collection to tag" : "No pins match your search"}
              </div>
            ) : (
              filteredPins.map((pin) => (
                <div 
                  key={pin.id} 
                  className={`relative bg-gray-900 rounded-lg overflow-hidden shadow-lg cursor-pointer transition-all duration-200 ${
                    selectedPins[pin.id] ? 'ring-2 ring-blue-500 scale-95' : 'hover:scale-105'
                  }`}
                  onClick={() => togglePinSelection(pin)}
                >
                  {/* Selected Indicator */}
                  {selectedPins[pin.id] && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white p-1 z-10">
                      <FaCheck size={12} />
                    </div>
                  )}
                  
                  {/* Pin ID Tag */}
                  <div className="absolute top-2 left-2 z-10 bg-gray-800 bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
                    {pin.pinId || 'No ID'}
                  </div>
                  
                  {/* Pin Image */}
                  <div className="aspect-square bg-gray-800 p-1">
                    <img 
                      src={pin.imageUrl ? `/api/image-proxy?url=${encodeURIComponent(pin.imageUrl)}` : '/placeholder.svg'} 
                      alt={pin.pinName || 'Pin'}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  
                  {/* Pin Details */}
                  <div className="p-2 bg-gray-800">
                    <h3 className="font-medium text-white text-sm truncate" title={pin.pinName}>
                      {pin.pinName || 'Unnamed Pin'}
                    </h3>
                    <div className="flex flex-wrap mt-1">
                      {pin.tags && pin.tags.length > 0 ? (
                        pin.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded mr-1 mb-1 truncate max-w-[100px]">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500 italic">No tags</span>
                      )}
                      {pin.tags && pin.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{pin.tags.length - 3} more</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Load More Button */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingPins}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {loadingPins ? (
                  <span className="flex items-center">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Loading...
                  </span>
                ) : (
                  'Load More Pins'
                )}
              </button>
            </div>
          )}
        </>
      )}
      
      {/* Tags Management View */}
      {activeView === 'tags' && selectedTags.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <h2 className="text-xl font-semibold text-white mb-2 sm:mb-0">
              {selectedTags.length} Tags Selected
            </h2>
            <div className="flex space-x-3">
              {selectedTags.length === 1 && (
                <button
                  onClick={() => {
                    const oldTagName = selectedTags[0];
                    const newTagName = prompt('Enter new tag name:', oldTagName);
                    
                    if (newTagName && newTagName.trim() !== '' && newTagName !== oldTagName) {
                      // Update tag
                      axios.put('/api/tags', { oldTag: oldTagName, newTag: newTagName.trim() })
                        .then(() => {
                          fetchTags();
                          setSelectedTags([newTagName.trim()]);
                          toast.success(`Updated tag "${oldTagName}" to "${newTagName.trim()}"`);
                        })
                        .catch(err => {
                          console.error('Error updating tag:', err);
                          toast.error(err.response?.data?.error || 'Failed to update tag');
                        });
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  disabled={loading}
                >
                  <FaEdit className="mr-2" /> Update Tag Name
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${selectedTags.length} tags? This will remove them from all pins.`)) {
                    axios.delete('/api/tags', { data: { tags: selectedTags } })
                      .then(() => {
                        fetchTags();
                        setSelectedTags([]);
                        toast.success(`Deleted ${selectedTags.length} tags from all pins`);
                      })
                      .catch(err => {
                        console.error('Error deleting tags:', err);
                        toast.error('Failed to delete tags');
                      });
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                disabled={loading}
              >
                <FaTrash className="mr-2" /> Delete Selected Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
