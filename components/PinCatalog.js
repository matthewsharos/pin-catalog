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
  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterYears, setFilterYears] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterOrigin, setFilterOrigin] = useState('');
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
        sortBy: sortField,
        sortOrder,
        year: filterYears.join(','),
        category: filterCategories.join(','),
        origin: filterOrigin,
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
  }, [page, debouncedSearch, sortField, sortOrder, filterYears, filterCategories, filterOrigin, initialLoad]);

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

  const handleEditPin = async (pinId) => {
    try {
      console.log('Pin object:', pins.find(p => p.id === pinId));
      const response = await api.get(`/api/pins/${pinId}`);
      setEditingPin(response.data);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching pin details:', error);
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
      toast.error('Failed to fetch pin details');
    }
  };

  const handleUpdatePinStatus = async (pinId, status) => {
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
          isDeleted: true,
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
      }
      
      const response = await api.post('/api/pins/bulk-update', {
        pinIds: [pinId],
        updates: updates
      });

      toast.success('Pin updated');
      fetchPins();
    } catch (error) {
      console.error('Error updating pin status:', error);
      toast.error('Failed to update pin');
    } finally {
      setLoading(false);
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
    setFilterYears([]);
    setFilterCategories([]);
    setFilterOrigin('');
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
            </div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative inline-block">
          <div className="flex items-center">
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value && !filterYears.includes(value)) {
                    setFilterYears([...filterYears, value]);
                  }
                  e.target.value = ""; // Reset select after selection
                }}
                value=""
              >
                <option value="" disabled>Select Years...</option>
                {filterOptions.years
                  .filter(year => !filterYears.includes(year))
                  .map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            {filterYears.length > 0 && (
              <button 
                onClick={() => setFilterYears([])} 
                className="ml-2 text-xs text-red-400 hover:text-red-300"
                title="Clear all years"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {filterYears.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 max-w-xs">
              {filterYears.map(year => (
                <span 
                  key={year} 
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                >
                  {year}
                  <button
                    type="button"
                    className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                    onClick={() => setFilterYears(filterYears.filter(y => y !== year))}
                  >
                    <span className="sr-only">Remove {year}</span>
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="relative inline-block">
          <div className="flex items-center">
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value && !filterCategories.includes(value)) {
                    setFilterCategories([...filterCategories, value]);
                  }
                  e.target.value = ""; // Reset select after selection
                }}
                value=""
              >
                <option value="" disabled>Select Categories...</option>
                {filterOptions.series
                  .filter(category => !filterCategories.includes(category))
                  .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            {filterCategories.length > 0 && (
              <button 
                onClick={() => setFilterCategories([])} 
                className="ml-2 text-xs text-red-400 hover:text-red-300"
                title="Clear all categories"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {filterCategories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 max-w-xs">
              {filterCategories.map(category => (
                <span 
                  key={category} 
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                >
                  {category}
                  <button
                    type="button"
                    className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-purple-400 hover:bg-purple-200 hover:text-purple-500 focus:outline-none focus:bg-purple-500 focus:text-white"
                    onClick={() => setFilterCategories(filterCategories.filter(c => c !== category))}
                  >
                    <span className="sr-only">Remove {category}</span>
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {loading && !initialLoad ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-400">Updating results...</p>
          </div>
        ) : (
          <>
            {pins.length > 0 ? (
              <div>
                {/* Sort Controls */}
                <div className="p-4 border-b border-gray-700 flex items-center justify-end">
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="mr-2">Sort by:</span>
                    <select 
                      value={`${sortField}-${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split('-');
                        setSortField(field);
                        setSortOrder(order);
                      }}
                      className="bg-gray-700 border-gray-600 rounded text-white text-sm p-1"
                    >
                      <option value="updatedAt-desc">Recently Updated</option>
                      <option value="releaseDate-desc">Newest First</option>
                      <option value="releaseDate-asc">Oldest First</option>
                      <option value="pinName-asc">Name (A-Z)</option>
                      <option value="pinName-desc">Name (Z-A)</option>
                      <option value="series-asc">Series (A-Z)</option>
                    </select>
                  </div>
                </div>
                
                {/* Pin Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                  {pins.map((pin) => (
                    <div 
                      key={pin.id} 
                      className={`bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg ${
                        pin.isCollected && !pin.isDeleted ? 'border-t-2 border-green-500' : ''
                      } ${
                        pin.isDeleted && pin.isWishlist ? 'border-t-2 border-blue-400' : ''
                      } ${
                        pin.isDeleted && !pin.isWishlist ? 'border-t-2 border-yellow-500' : ''
                      }`}
                    >
                      {/* Pin Image */}
                      <div 
                        className="relative aspect-square bg-gray-900 cursor-pointer overflow-hidden"
                        onClick={() => handleEditPin(pin.id)}
                      >
                        {pin.imageUrl ? (
                          <img
                            src={pin.imageUrl}
                            alt={pin.pinName}
                            className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FaImages className="text-gray-600 text-4xl" />
                          </div>
                        )}
                        
                        {/* Pin ID Badge */}
                        {pin.pinId && (
                          <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-70 text-xs text-gray-300 px-1.5 py-0.5 rounded">
                            {pin.pinId}
                          </div>
                        )}
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-3">
                        {/* Pin Name */}
                        <h3 
                          className="text-white font-medium text-sm mb-1 line-clamp-2 hover:text-blue-300 cursor-pointer"
                          onClick={() => handleEditPin(pin.id)}
                          title={pin.pinName}
                        >
                          {pin.pinName || "Unnamed Pin"}
                        </h3>
                        
                        {/* Series • Release Date */}
                        <div className="text-gray-400 text-xs mb-2 line-clamp-1" title={`${pin.series || 'No Series'} • ${pin.releaseDate ? new Date(pin.releaseDate).toLocaleDateString() : 'No Date'}`}>
                          {cleanText(pin.series) || 'No Series'} • {pin.releaseDate ? new Date(pin.releaseDate).toLocaleDateString() : 'No Date'}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-center space-x-1 pt-1 border-t border-gray-700">
                          {pin.isDeleted ? (
                            pin.isWishlist ? (
                              // WISHLIST pins - show collected and uncollected buttons
                              <>
                                <button
                                  onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white"
                                  title="Mark as Collected"
                                >
                                  <FaCheck className="text-sm" />
                                </button>
                                <button
                                  onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white"
                                  title="Mark as Uncollected"
                                >
                                  <FaTimes className="text-sm" />
                                </button>
                                <button
                                  onClick={() => handleUpdatePinStatus(pin.id, 'uncategorize')}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
                                  title="Uncategorize"
                                >
                                  <FaQuestionCircle className="text-sm" />
                                </button>
                              </>
                            ) : (
                              // UNCOLLECTED pins - show collected and uncategorize buttons
                              <>
                                <button
                                  onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white"
                                  title="Mark as Collected"
                                >
                                  <FaCheck className="text-sm" />
                                </button>
                                <button
                                  onClick={() => handleUpdatePinStatus(pin.id, 'wishlist')}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-blue-400 hover:text-white"
                                  title="Add to Wishlist"
                                >
                                  <span className="text-xs">🙏</span>
                                </button>
                                <button
                                  onClick={() => handleUpdatePinStatus(pin.id, 'uncategorize')}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
                                  title="Uncategorize"
                                >
                                  <FaQuestionCircle className="text-sm" />
                                </button>
                              </>
                            )
                          ) : (
                            pin.isCollected ? (
                              // COLLECTED pins - show uncollected and wishlist buttons
                              <>
                                <button
                                  onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white"
                                  title="Mark as Uncollected"
                                >
                                  <FaTimes className="text-sm" />
                                </button>
                                <button
                                  onClick={() => handleUpdatePinStatus(pin.id, 'wishlist')}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-blue-400 hover:text-white"
                                  title="Add to Wishlist"
                                >
                                  <span className="text-xs">🙏</span>
                                </button>
                                <button
                                  onClick={() => handleEditPin(pin.id)}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-purple-600 hover:text-white"
                                  title="Edit Pin"
                                >
                                  <FaEdit className="text-sm" />
                                </button>
                              </>
                            ) : (
                              // UNCATEGORIZED pins - show collected, uncollected, and wishlist buttons
                              <>
                                <button
                                  onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white"
                                  title="Mark as Collected"
                                >
                                  <FaCheck className="text-sm" />
                                </button>
                                <button
                                  onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white"
                                  title="Mark as Uncollected"
                                >
                                  <FaTimes className="text-sm" />
                                </button>
                                <button
                                  onClick={() => handleUpdatePinStatus(pin.id, 'wishlist')}
                                  className="p-1.5 rounded-full bg-gray-700 text-gray-400 hover:bg-blue-400 hover:text-white"
                                  title="Add to Wishlist"
                                >
                                  <span className="text-xs">🙏</span>
                                </button>
                              </>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
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
