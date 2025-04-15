"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaSearch, FaEdit, FaTrash, FaCheck, FaQuestionCircle, FaPlus, FaImages, FaCandyCane, FaTags, FaStar, FaTimes } from 'react-icons/fa';
import debounce from 'lodash/debounce';
import EditPin from './EditPin';
import AddPinModal from './AddPinModal';
import EditTagsModal from './EditTagsModal';
import Link from 'next/link';

// Create axios instance with base URL
const api = axios.create({
  baseURL: ''  // Use relative URLs by default, which will work across all domains
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
  const [statusFilters, setStatusFilters] = useState({
    collected: false,
    uncollected: false,
    wishlist: false
  });
  const [filterOptions, setFilterOptions] = useState({
    years: [],
    series: [],
    origins: [],
    tags: [],
  });
  const [editingPin, setEditingPin] = useState(null);
  const [showAddPinModal, setShowAddPinModal] = useState(false);
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
        collected: statusFilters.collected ? 'true' : '',
        wishlist: statusFilters.wishlist ? 'true' : '',
        uncollected: statusFilters.uncollected ? 'true' : '',
      });

      // Debug logging
      console.log('Fetching pins with URL:', `/api/pins?${params}`);
      console.log('Current domain:', window.location.origin);
      console.log('API base URL:', api.defaults.baseURL);
      
      const response = await api.get(`/api/pins?${params}`);
      console.log('API response:', response.status, response.statusText);
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
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
      toast.error('Failed to load pins');
      // Even on error, we should stop showing the loading state
      setInitialLoad(false);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, sortField, sortOrder, filterYear, filterCategory, filterOrigin, statusFilters, initialLoad]);

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
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
      toast.error('Failed to mark pins as collected');
    }
  };

  const handleUpdatePinStatus = async (pinIds, status) => {
    if (!Array.isArray(pinIds)) {
      pinIds = [pinIds]; // Convert single ID to array
    }
    
    if (pinIds.length === 0) {
      toast.error('No pins selected');
      return;
    }

    try {
      setLoading(true);
      
      let updates = {};
      
      if (status === 'collected') {
        updates = {
          isCollected: true,
          isDeleted: false,
          isWishlist: false
        };
      } else if (status === 'uncollected') {
        updates = {
          isCollected: false,
          isDeleted: false,
          isWishlist: false
        };
      } else if (status === 'wishlist') {
        updates = {
          isCollected: false,
          isDeleted: true,
          isWishlist: true
        };
      } else if (status === 'uncategorize') {
        updates = {
          isCollected: false,
          isDeleted: false,
          isWishlist: false
        };
      } else if (status === 'delete') {
        updates = {
          isCollected: false,
          isDeleted: true,
          isWishlist: false
        };
      }
      
      const response = await api.post('/api/pins/bulk-update', {
        pinIds: pinIds,
        updates: updates
      });

      toast.success(`Updated ${pinIds.length} ${pinIds.length === 1 ? 'pin' : 'pins'}`);
      // Clear selection after successful update
      setSelectedPins([]);
      fetchPins();
    } catch (error) {
      console.error('Error updating pin status:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
      toast.error('Failed to update pin status');
    } finally {
      setLoading(false);
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
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
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
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
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
    setStatusFilters({
      collected: false,
      uncollected: false,
      wishlist: false
    });
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

  const handleStatusFilterChange = (field, value) => {
    setStatusFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filters change
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
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
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
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
      toast.error('Failed to update pins');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedPins.length === 0) {
      toast.error('No pins selected');
      return;
    }

    try {
      setLoading(true);
      let updates = {};

      switch (action) {
        case 'collected':
          updates = { isCollected: true, isDeleted: false, isWishlist: false };
          break;
        case 'uncollected':
          updates = { isCollected: false, isDeleted: false, isWishlist: false };
          break;
        case 'wishlist':
          updates = { isCollected: false, isDeleted: true, isWishlist: true };
          break;
        case 'uncategorize':
          updates = { isCollected: false, isDeleted: false, isWishlist: false };
          break;
        case 'delete':
          updates = { isCollected: false, isDeleted: true, isWishlist: false };
          break;
      }

      const response = await api.post('/api/pins/bulk-update', {
        pinIds: selectedPins,
        updates
      });

      toast.success(`Updated ${selectedPins.length} pins`);
      setSelectedPins([]);
      fetchPins();
    } catch (error) {
      console.error('Error performing bulk action:', error);
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
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gray-900 shadow-lg border-b border-gray-800 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div className="flex items-center">
              <img src="/icon.png" alt="Pin Icon" className="w-16 h-16 mr-3" />
              <h1 
                className="text-3xl font-bold text-white"
                style={{ 
                  fontFamily: 'var(--font-pacifico)',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                }}
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
                  onClick={() => setShowAddPinModal(true)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Pin
                </button>
              </div>
            </div>
          </div>
          
          {/* Search Row - Now in sticky header */}
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
              
              {/* Status Filter Buttons */}
              <div className="flex items-center space-x-2">
                <div className="flex bg-gray-800 rounded-lg p-1 space-x-1">
                  <button
                    onClick={() => {
                      setStatusFilters({
                        collected: false,
                        uncollected: false,
                        wishlist: false
                      });
                    }}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      !statusFilters.collected && !statusFilters.uncollected && !statusFilters.wishlist
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Uncategorized
                  </button>
                  <button
                    onClick={() => handleStatusFilterChange('collected', !statusFilters.collected)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors flex items-center ${
                      statusFilters.collected
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <FaCheck className={`mr-1 ${statusFilters.collected ? 'opacity-100' : 'opacity-50'}`} />
                    Collected
                  </button>
                  <button
                    onClick={() => handleStatusFilterChange('uncollected', !statusFilters.uncollected)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors flex items-center ${
                      statusFilters.uncollected
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <FaTimes className={`mr-1 ${statusFilters.uncollected ? 'opacity-100' : 'opacity-50'}`} />
                    Uncollected
                  </button>
                  <button
                    onClick={() => handleStatusFilterChange('wishlist', !statusFilters.wishlist)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors flex items-center ${
                      statusFilters.wishlist
                        ? 'bg-blue-400 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span className={`mr-1 ${statusFilters.wishlist ? 'opacity-100' : 'opacity-50'}`}>🙏</span>
                    Wishlist
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
          {filterOptions.series.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedPins.length > 0 && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-2 md:mb-0">
              <span className="text-white">{selectedPins.length} pins selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleUpdatePinStatus(selectedPins, 'collected')}
                className="px-2 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <FaCheck className="mr-1" /> Collected
              </button>
              
              <button
                onClick={() => handleUpdatePinStatus(selectedPins, 'uncollected')}
                className="px-2 py-1 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
              >
                <FaTimes className="mr-1" /> Uncollected
              </button>
              
              <button
                onClick={() => handleUpdatePinStatus(selectedPins, 'wishlist')}
                className="px-2 py-1 text-sm bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center"
              >
                <span className="mr-1">🙏</span> Wishlist
              </button>
              
              <button
                onClick={() => handleUpdatePinStatus(selectedPins, 'uncategorize')}
                className="px-2 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <FaQuestionCircle className="mr-1" /> Uncategorize
              </button>
              
              <button
                onClick={() => handleUpdatePinStatus(selectedPins, 'delete')}
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
                        onClick={() => handleSort('releaseDate')}
                      >
                        <span>Release Date</span>
                        {sortField === 'releaseDate' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </th>
                    <th className="p-2 text-left text-gray-300 cursor-pointer">Actions</th>
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
                          <span className="text-sm">
                            {pin.releaseDate ? new Date(pin.releaseDate).toLocaleDateString() : '-'}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex justify-center">
                            {pin.isDeleted ? (
                              pin.isWishlist ? (
                                // WISHLIST pins - show collected and uncollected buttons
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                                    className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white"
                                    title="Mark as Collected"
                                  >
                                    <FaCheck className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                                    className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white"
                                    title="Mark as Uncollected"
                                  >
                                    <FaTimes className="text-sm" />
                                  </button>
                                </div>
                              ) : (
                                // This case shouldn't happen with the new status system, but handle it just in case
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                                    className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white"
                                    title="Mark as Collected"
                                  >
                                    <FaCheck className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdatePinStatus(pin.id, 'uncategorize')}
                                    className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
                                    title="Uncategorize"
                                  >
                                    <FaQuestionCircle className="text-sm" />
                                  </button>
                                </div>
                              )
                            ) : (
                              pin.isCollected ? (
                                // COLLECTED pins - show uncollected and wishlist buttons
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                                    className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white"
                                    title="Mark as Uncollected"
                                  >
                                    <FaTimes className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdatePinStatus(pin.id, 'wishlist')}
                                    className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-blue-400 hover:text-white"
                                    title="Add to Wishlist"
                                  >
                                    <span className="text-xs">🙏</span>
                                  </button>
                                </div>
                              ) : (
                                // UNCATEGORIZED pins - show collected, uncollected, and wishlist buttons
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                                    className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white"
                                    title="Mark as Collected"
                                  >
                                    <FaCheck className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                                    className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white"
                                    title="Mark as Uncollected"
                                  >
                                    <FaTimes className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdatePinStatus(pin.id, 'wishlist')}
                                    className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-blue-400 hover:text-white"
                                    title="Add to Wishlist"
                                  >
                                    <span className="text-xs">🙏</span>
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-8">
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
                        pin.isCollected && !pin.isDeleted ? 'border-l-4 border-green-500' : ''
                      } ${pin.isDeleted ? 'border-l-4 border-red-500' : ''}`}
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
                      <div className="flex justify-center">
                        {pin.isDeleted ? (
                          pin.isWishlist ? (
                            // WISHLIST pins - show collected and uncollected buttons
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                                className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white"
                                title="Mark as Collected"
                              >
                                <FaCheck className="text-sm" />
                              </button>
                              <button
                                onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                                className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white"
                                title="Mark as Uncollected"
                              >
                                <FaTimes className="text-sm" />
                              </button>
                            </div>
                          ) : (
                            // This case shouldn't happen with the new status system, but handle it just in case
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                                className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white"
                                title="Mark as Collected"
                              >
                                <FaCheck className="text-sm" />
                              </button>
                              <button
                                onClick={() => handleUpdatePinStatus(pin.id, 'uncategorize')}
                                className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
                                title="Uncategorize"
                              >
                                <FaQuestionCircle className="text-sm" />
                              </button>
                            </div>
                          )
                        ) : (
                          pin.isCollected ? (
                            // COLLECTED pins - show uncollected and wishlist buttons
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                                className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white"
                                title="Mark as Uncollected"
                              >
                                <FaTimes className="text-sm" />
                              </button>
                              <button
                                onClick={() => handleUpdatePinStatus(pin.id, 'wishlist')}
                                className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-blue-400 hover:text-white"
                                title="Add to Wishlist"
                              >
                                <span className="text-xs">🙏</span>
                              </button>
                            </div>
                          ) : (
                            // UNCATEGORIZED pins - show collected, uncollected, and wishlist buttons
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                                className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white"
                                title="Mark as Collected"
                              >
                                <FaCheck className="text-sm" />
                              </button>
                              <button
                                onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                                className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white"
                                title="Mark as Uncollected"
                              >
                                <FaTimes className="text-sm" />
                              </button>
                              <button
                                onClick={() => handleUpdatePinStatus(pin.id, 'wishlist')}
                                className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-blue-400 hover:text-white"
                                title="Add to Wishlist"
                              >
                                <span className="text-xs">🙏</span>
                              </button>
                            </div>
                          )
                        )}
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
