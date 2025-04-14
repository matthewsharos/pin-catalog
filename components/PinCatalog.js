"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaSearch, FaEdit, FaTrash, FaCheck, FaQuestionCircle, FaPlus, FaImages, FaCandyCane, FaTags, FaStar, FaTimes } from 'react-icons/fa';
import debounce from 'lodash/debounce';
import EditPin from './EditPin';
import DeleteConfirmation from './DeleteConfirmation';
import AddPinModal from './AddPinModal';
import EditTagsModal from './EditTagsModal';
import Link from 'next/link';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || ''  // Empty string will use relative URLs
});

const fetcher = async (url) => {
  const res = await api.get(url);
  return res.data;
};

export default function PinCatalog() {
  const [pins, setPins] = useState([]);  
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('releaseDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedPins, setSelectedPins] = useState([]);
  const [filterYear, setFilterYear] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterCollected, setFilterCollected] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    years: [],
    series: [],
    origins: [],
    tags: [],
  });
  const [editingPin, setEditingPin] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showAddPinModal, setShowAddPinModal] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [editingTags, setEditingTags] = useState(null);
  const [isCollectedBulkAction, setIsCollectedBulkAction] = useState(null);

  const searchInputRef = useRef(null);
  const contentRef = useRef(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to first page when search changes
    }, 300); // Wait 300ms after last keystroke before searching

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPins = useCallback(async () => {
    try {
      // Only show loading indicator on initial load
      if (initialLoad) {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: page.toString(),
        search: debouncedSearch,
        sortField,
        sortOrder,
        year: filterYear,
        category: filterCategory,
        origin: filterOrigin,
        collected: filterCollected,
        showDeleted: showDeleted.toString(),
      });

      const response = await api.get(`/api/pins?${params}`);
      const data = response.data;
      
      // Update pins without triggering loading state
      setPins(data.pins || []);
      setTotal(data.total || 0);
      
      // Update filter options based on current filters
      setFilterOptions({
        years: data.filterOptions?.years || [],
        series: data.filterOptions?.series || [],
        origins: data.filterOptions?.origins || [],
        tags: data.filterOptions?.tags || [],
      });
      
      // After first successful load, set initialLoad to false
      if (initialLoad) {
        setInitialLoad(false);
      }
    } catch (error) {
      console.error('Error fetching pins:', error);
      toast.error('Failed to load pins');
      // Even on error, we should stop showing the loading state
      setInitialLoad(false);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, sortField, sortOrder, filterYear, filterCategory, filterOrigin, filterCollected, showDeleted, initialLoad]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleCheckboxChange = (pinId) => {
    setSelectedPins(prev => 
      prev.includes(pinId) 
        ? prev.filter(id => id !== pinId) 
        : [...prev, pinId]
    );
  };

  const handleMarkCollected = async () => {
    try {
      await api.post('/api/pins/bulk-collect', { pinIds: selectedPins });
      fetchPins();
      setSelectedPins([]);
      toast.success('Pins marked as collected');
    } catch (error) {
      console.error('Error marking pins as collected:', error);
      toast.error('Failed to mark pins as collected');
    }
  };

  const handleDeleteSelected = async () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    try {
      await api.post('/api/pins/bulk-delete', { pinIds: selectedPins });
      fetchPins();
      setSelectedPins([]);
      setShowDeleteConfirmation(false);
      toast.success('Pins deleted successfully');
    } catch (error) {
      console.error('Error deleting pins:', error);
      toast.error('Failed to delete pins');
    }
  };

  const handleEditPin = async (pinId) => {
    try {
      console.log('Pin object:', pins.find(p => p.id === pinId));
      console.log('Making API request to:', `/api/pins/${pinId}`);
      const response = await api.get(`/api/pins/${pinId}`);
      console.log('API Response:', response.data);
      setEditingPin(response.data);
      setShowEditModal(true);
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response?.data);
      toast.error(`Failed to load pin details: ${error.response?.data?.details || error.message}`);
    }
  };

  const handleNextPin = () => {
    const currentIndex = pins.findIndex(p => p.id === editingPin.id);
    if (currentIndex < pins.length - 1) {
      handleEditPin(pins[currentIndex + 1].id);
    }
  };

  const handlePrevPin = () => {
    const currentIndex = pins.findIndex(p => p.id === editingPin.id);
    if (currentIndex > 0) {
      handleEditPin(pins[currentIndex - 1].id);
    }
  };

  const handleUpdatePin = async (pin) => {
    try {
      await api.put(`/api/pins/${pin.id}`, pin);
      fetchPins();
      setShowEditModal(false);
      setEditingPin(null);
      toast.success('Pin updated');
    } catch (error) {
      console.error('Error updating pin:', error);
      toast.error('Failed to update pin');
    }
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setEditingPin(null);
    fetchPins(); // Refresh data after editing
  };

  const handleEditTags = (pin) => {
    setEditingTags(pin);
    setShowTagModal(true);
  };

  const handleTagsUpdated = (updatedPin) => {
    // Update the pin in the local state
    setPins(pins.map(p => p.id === updatedPin.id ? updatedPin : p));
    setShowTagModal(false);
    setEditingTags(null);
  };

  const cleanText = (text) => {
    if (!text) return '-';
    // Remove any text within parentheses (including the parentheses)
    return text.replace(/\s*\([^)]*\)/g, '').trim();
  };

  const truncateText = (text, length = 30) => {
    if (!text) return '-';
    return text.length > length ? `${text.substring(0, length)}...` : text;
  };

  // Clear all filters and reset search
  const clearAllFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setFilterYear('');
    setFilterCategory('');
    setFilterOrigin('');
    setFilterCollected('');
    setPage(1);
    // Restore focus to search input after clearing
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1); // Reset to first page when filters change
  };

  const toggleShowDeleted = () => {
    setShowDeleted(prev => !prev);
  };

  const handleApplyTags = async () => {
    if (!selectedPins.length || !selectedTag) {
      toast.error('Please select pins and a tag');
      return;
    }

    try {
      const response = await axios.post('/api/pins/bulk-update', {
        pinIds: selectedPins,
        updates: {
          tags: [selectedTag]
        }
      });

      toast.success(`Added tag to ${selectedPins.length} pins`);
      // Clear selection after successful update
      setSelectedPins([]);
      fetchPins();
      setSelectedTag('');
    } catch (error) {
      console.error('Error applying tags:', error);
      toast.error('Failed to apply tags');
    }
  };

  const handleBulkCollectedUpdate = async (isCollected) => {
    if (!selectedPins.length) {
      toast.error('Please select pins first');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/pins/bulk-update', {
        pinIds: selectedPins,
        updates: {
          isCollected
        }
      });

      toast.success(`Updated ${selectedPins.length} pins`);
      // Clear selection after successful update
      setSelectedPins([]);
      fetchPins();
      setIsCollectedBulkAction(null);
    } catch (error) {
      console.error('Error updating pins:', error);
      toast.error('Failed to update pins');
    } finally {
      setLoading(false);
    }
  };

  // Only show full-page loading on initial app load
  if (initialLoad && loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-400">Loading pins...</p>
        </div>
      </div>
    );
  }

  const getCollectedLabel = () => {
    return showDeleted ? 'Wishlist' : 'Collected';
  };

  return (
    <div ref={contentRef} className="container mx-auto px-4 py-8">
      <style>{`
        @keyframes wiggle {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(3deg); }
          100% { transform: rotate(0deg); }
        }
        .wiggle-on-hover:hover {
          animation: wiggle 0.5s ease-in-out;
        }
      `}</style>
      {/* Header with Logo and Add Button */}
      <div className="sticky top-0 bg-gray-900 py-2 z-10 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
          <div className="flex items-center space-x-4">
            <img 
              src="/icon.png" 
              alt="Pin Catalog Logo" 
              className="h-10 w-10 md:h-12 md:w-12 cursor-pointer transition-transform hover:scale-110" 
              onClick={scrollToTop}
            />
            <h1 
              className="text-2xl md:text-3xl text-white cursor-pointer hover:text-blue-300 transition-colors" 
              style={{ fontFamily: 'var(--font-pacifico)', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
              onClick={scrollToTop}
            >
              Sharos Pin Catalog
            </h1>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 mt-2 md:mt-0 w-full md:w-auto">
            <div className="text-gray-300 mr-2 text-sm md:text-base">
              {total} {total === 1 ? 'pin' : 'pins'} total
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Link href="/tags" className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Manage Tags
              </Link>
              <button
                onClick={toggleShowDeleted}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  showDeleted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                } text-white`}
              >
                {showDeleted ? 'Hide Deleted' : 'View Deleted'}
              </button>
              <button
                onClick={() => setShowAddPinModal(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Pin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Row */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
          <div className="relative flex-1 w-full">
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search pins..."
              className="w-full p-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear Search
            </button>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filterCollected === 'true'}
                onChange={(e) => handleFilterChange(setFilterCollected, e.target.checked ? 'true' : '')}
                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                id="collected-checkbox"
              />
              <label htmlFor="collected-checkbox" className="text-white whitespace-nowrap">
                {showDeleted ? 'Wishlist Only' : 'Collected Only'}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <select
          value={filterYear}
          onChange={(e) => handleFilterChange(setFilterYear, e.target.value)}
          className="p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Years</option>
          {filterOptions.years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => handleFilterChange(setFilterCategory, e.target.value)}
          className="p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Categories</option>
          {filterOptions.tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>

        <select
          value={filterOrigin}
          onChange={(e) => handleFilterChange(setFilterOrigin, e.target.value)}
          className="p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Origins</option>
          {filterOptions.origins.map((origin) => (
            <option key={origin} value={origin}>
              {origin}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedPins.length > 0 && (
        <div className="mb-6 bg-gray-800 p-3 rounded-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 flex-wrap">
            <div className="text-white text-sm">
              <span className="font-semibold">{selectedPins.length}</span> selected
            </div>
            
            <div className="flex-1 flex flex-wrap items-center gap-2">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="p-1 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Tag</option>
                {filterOptions.tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <button
                onClick={handleApplyTags}
                disabled={!selectedTag}
                className={`px-2 py-1 text-sm rounded-lg transition-colors ${
                  !selectedTag ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                } text-white flex items-center`}
              >
                <FaTags className="mr-1" /> Tag
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkCollectedUpdate(true)}
                className="px-2 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <FaCheck className="mr-1" /> {showDeleted ? 'Add to Wishlist' : 'Collected'}
              </button>
              
              <button
                onClick={() => handleBulkCollectedUpdate(false)}
                className="px-2 py-1 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
              >
                <FaTimes className="mr-1" /> {showDeleted ? 'Remove from Wishlist' : 'Not Collected'}
              </button>
              
              <button
                onClick={() => setShowDeleteConfirmation(true)}
                className="px-2 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <FaTrash className="mr-1" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {loading && !initialLoad ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-400">Updating results...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr className="bg-gray-800">
                    <th className="w-8 p-2">
                      <input
                        type="checkbox"
                        checked={selectedPins.length > 0 && selectedPins.length === pins.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPins(pins.map(pin => pin.id));
                          } else {
                            setSelectedPins([]);
                          }
                        }}
                        className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                      />
                    </th>
                    <th className="p-2">
                      <button
                        className="flex items-center space-x-1 text-left text-sm font-semibold text-gray-300 hover:text-white"
                        onClick={() => handleSort('pinId')}
                      >
                        <span>Pin ID</span>
                        {sortField === 'pinId' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="p-2">
                      <span className="text-left text-sm font-semibold text-gray-300">Image</span>
                    </th>
                    <th className="p-2">
                      <button
                        className="flex items-center space-x-1 text-left text-sm font-semibold text-gray-300 hover:text-white"
                        onClick={() => handleSort('pinName')}
                      >
                        <span>Name</span>
                        {sortField === 'pinName' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="p-2">
                      <button
                        className="flex items-center space-x-1 text-left text-sm font-semibold text-gray-300 hover:text-white"
                        onClick={() => handleSort('series')}
                      >
                        <span>Series</span>
                        {sortField === 'series' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="p-2">
                      <button
                        className="flex items-center space-x-1 text-left text-sm font-semibold text-gray-300 hover:text-white"
                        onClick={() => handleSort('origin')}
                      >
                        <span>Origin</span>
                        {sortField === 'origin' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="p-2">
                      <button
                        className="flex items-center space-x-1 text-left text-sm font-semibold text-gray-300 hover:text-white"
                        onClick={() => handleSort('releaseDate')}
                      >
                        <span>Release Date</span>
                        {sortField === 'releaseDate' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="p-2">
                      <span className="text-left text-sm font-semibold text-gray-300">Tags</span>
                    </th>
                    <th className="p-2 text-left text-gray-300 cursor-pointer" onClick={() => handleSort('isCollected')}>
                      {getCollectedLabel()}
                      {sortField === 'isCollected' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="transition-opacity duration-300">
                  {pins.length > 0 ? (
                    pins.map((pin) => (
                      <tr 
                        key={pin.id} 
                        className={`hover:bg-gray-700 transition-colors ${
                          pin.isCollected ? 'bg-green-900 bg-opacity-20' : ''
                        }`}
                      >
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selectedPins.includes(pin.id)}
                            onChange={() => handleCheckboxChange(pin.id)}
                            className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-2 text-gray-300">
                          <div 
                            className="flex items-center space-x-2 cursor-pointer hover:text-white"
                            onClick={() => handleCheckboxChange(pin.id)}
                          >
                            <span className="text-sm">{pin.pinId || '-'}</span>
                            {pin.pinpopUrl && (
                              <a
                                href={pin.pinpopUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pink-400 hover:text-pink-300"
                                title="View on Pin&Pop"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FaCandyCane />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-gray-300">
                          {pin.imageUrl ? (
                            <button
                              onClick={() => handleEditPin(pin.id)}
                              className="wiggle-on-hover hover:opacity-75 transition-opacity"
                            >
                              <img
                                src={pin.imageUrl}
                                alt={pin.pinName}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-700"
                              />
                            </button>
                          ) : (
                            <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                              <FaImages className="text-gray-500" />
                            </div>
                          )}
                        </td>
                        <td 
                          className="p-2 text-gray-300 cursor-pointer hover:text-white"
                          onClick={() => handleEditPin(pin.id)}
                        >
                          <span className="text-sm" title={pin.pinName}>{truncateText(pin.pinName)}</span>
                        </td>
                        <td className="p-2 text-gray-300">
                          <span className="text-sm" title={pin.series}>{truncateText(cleanText(pin.series))}</span>
                        </td>
                        <td className="p-2 text-gray-300">
                          <span className="text-sm">{cleanText(pin.origin)}</span>
                        </td>
                        <td className="p-2 text-gray-300">
                          <span className="text-sm">
                            {pin.releaseDate ? new Date(pin.releaseDate).toLocaleDateString() : '-'}
                          </span>
                        </td>
                        <td className="p-2 text-gray-300">
                          <div 
                            className="flex flex-wrap gap-1 cursor-pointer hover:opacity-80"
                            onClick={() => handleEditTags(pin)}
                          >
                            {pin.tags && pin.tags.length > 0 ? (
                              pin.tags.slice(0, 3).map((tag, index) => (
                                <span 
                                  key={index} 
                                  className="inline-block px-2 py-1 text-xs bg-purple-900 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500 text-xs">No tags</span>
                            )}
                            {pin.tags && pin.tags.length > 3 && (
                              <span className="text-gray-400 text-xs">+{pin.tags.length - 3} more</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex justify-center">
                            {pin.isCollected && (
                              pin.isDeleted ? (
                                <span className="text-blue-400" title="In Wishlist">🙏</span>
                              ) : (
                                <FaCheck className="text-green-500" title="Collected" />
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <p className="text-lg mb-2">No pins found</p>
                          <p className="text-sm mb-4">
                            Try adjusting your search or filters
                          </p>
                          <button
                            onClick={clearAllFilters}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Clear All Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (visible only on mobile) */}
            <div className="md:hidden">
              {pins.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 p-4">
                  {pins.map((pin) => (
                    <div 
                      key={pin.id} 
                      className={`bg-gray-800 rounded-lg p-3 shadow ${
                        pin.isCollected ? 'border-l-4 border-green-500' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedPins.includes(pin.id)}
                            onChange={() => handleCheckboxChange(pin.id)}
                            className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 mb-2"
                          />
                          {pin.imageUrl ? (
                            <button
                              onClick={() => handleEditPin(pin.id)}
                              className="wiggle-on-hover hover:opacity-75 transition-opacity block"
                            >
                              <img
                                src={pin.imageUrl}
                                alt={pin.pinName}
                                className="w-20 h-20 object-cover rounded-lg border border-gray-700"
                              />
                            </button>
                          ) : (
                            <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                              <FaImages className="text-gray-500" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-white font-medium mb-1 cursor-pointer"
                            onClick={() => handleEditPin(pin.id)}
                          >
                            {pin.pinName}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                            <div className="text-gray-400">ID:</div>
                            <div className="text-gray-300">{pin.pinId || '-'}</div>
                            
                            <div className="text-gray-400">Series:</div>
                            <div className="text-gray-300">{cleanText(pin.series) || '-'}</div>
                            
                            <div className="text-gray-400">Release:</div>
                            <div className="text-gray-300">
                              {pin.releaseDate ? new Date(pin.releaseDate).toLocaleDateString() : '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <p className="text-lg mb-2">No pins found</p>
                    <p className="text-sm mb-4">
                      Try adjusting your search or filters
                    </p>
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-col md:flex-row justify-between items-center text-gray-300">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.ceil(total / 100)}
          </span>
          <button
            onClick={() => setPage(Math.min(Math.ceil(total / 100), page + 1))}
            disabled={page >= Math.ceil(total / 100)}
            className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {showEditModal && editingPin && (
        <EditPin
          pin={editingPin}
          onClose={() => {
            setShowEditModal(false);
            setEditingPin(null);
          }}
          onSave={handleUpdatePin}
          onNext={pins.findIndex(p => p.id === editingPin.id) < pins.length - 1 ? handleNextPin : null}
          onPrev={pins.findIndex(p => p.id === editingPin.id) > 0 ? handlePrevPin : null}
        />
      )}
      <DeleteConfirmation
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={confirmDelete}
        count={selectedPins.length}
      />
      {showAddPinModal && (
        <AddPinModal
          onClose={() => setShowAddPinModal(false)}
          onPinAdded={(newPin) => {
            setPins(prev => [newPin, ...prev]);
            setTotal(prev => prev + 1);
          }}
        />
      )}
      {showTagModal && editingTags && (
        <EditTagsModal
          pin={editingTags}
          onClose={() => {
            setShowTagModal(false);
            setEditingTags(null);
          }}
          onSave={handleTagsUpdated}
        />
      )}
    </div>
  );
}
