"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaSearch, FaEdit, FaTrash, FaCheck, FaQuestionCircle, FaPlus, FaImages, FaCandyCane, FaTags, FaStar, FaTimes, FaInbox, FaChevronDown, FaHeart, FaCalendar } from 'react-icons/fa';
import debounce from 'lodash/debounce';
import EditPin from './EditPin';
import AddPinModal from './AddPinModal';
import EditTagsModal from './EditTagsModal';
import Link from 'next/link';
import YearFilterModal from './YearFilterModal';

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
  const [lastSelectedYear, setLastSelectedYear] = useState(null);
  const [filterCategories, setFilterCategories] = useState([]);
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
  const [showYearFilterModal, setShowYearFilterModal] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const yearButtonRef = useRef(null);

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
  }, [page, debouncedSearch, sortField, sortOrder, filterYears, filterCategories, filterOrigin, statusFilters, initialLoad]);

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

  const handleYearClick = (year, e) => {
    e.preventDefault(); // Prevent text selection
    
    let newYears = [...filterYears];
    
    if (e.shiftKey && lastSelectedYear) {
      // Get the range of years between last selected and current
      const yearsList = filterOptions.years;
      const start = yearsList.indexOf(lastSelectedYear);
      const end = yearsList.indexOf(year);
      const [lower, upper] = start < end ? [start, end] : [end, start];
      
      const yearRange = yearsList.slice(lower, upper + 1);
      
      // Add all years in range if not already selected
      yearRange.forEach(y => {
        if (!newYears.includes(y)) {
          newYears.push(y);
        }
      });
    } else if (e.metaKey || e.ctrlKey) {
      // Toggle single year
      const yearIndex = newYears.indexOf(year);
      if (yearIndex === -1) {
        newYears.push(year);
      } else {
        newYears.splice(yearIndex, 1);
      }
    } else {
      // Normal click - toggle single year
      const yearIndex = newYears.indexOf(year);
      if (yearIndex === -1) {
        newYears = [year];
      } else {
        newYears = [];
      }
    }
    
    setLastSelectedYear(year);
    setFilterYears(newYears);
    setPage(1);
  };

  // Close year dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearButtonRef.current && !yearButtonRef.current.contains(event.target)) {
        setShowYearDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="min-h-screen bg-gray-800 text-white">
      {/* Sticky Header Navigation */}
      <div className="sticky top-0 z-50 bg-gray-900 shadow-lg">
        {/* Row 1: Logo, Title, Pin Count, Action Buttons */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <img src="/icon.png" alt="Pin Icon" className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-white">
              Sharos Pin Catalog
            </h1>
            <span className="text-gray-300 text-sm">
              {total} {total === 1 ? 'pin' : 'pins'} total
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Link 
              href="/tags" 
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
            >
              <FaTags className="mr-1" />
              Manage Tags
            </Link>
            <button
              onClick={() => setShowAddPinModal(true)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <FaPlus className="mr-1" />
              Add Pin
            </button>
          </div>
        </div>

        {/* Row 2: Search, Filters, Status Buttons */}
        <div className="px-4 py-2 flex items-center space-x-3">
          {/* Search with Icon */}
          <div className="relative w-64">
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search pins..."
              className="w-full h-8 pl-8 pr-3 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <FaSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
          </div>

          {/* Clear Search */}
          <button
            type="button"
            onClick={clearAllFilters}
            className="h-8 px-3 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center"
          >
            <FaTimes className="mr-1" />
            Clear
          </button>

          {/* Years Filter Button */}
          <div className="relative" ref={yearButtonRef}>
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className={`h-8 px-3 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center ${
                filterYears.length > 0 ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <FaCalendar className="mr-1.5" />
              Years
              {filterYears.length > 0 && (
                <span className="ml-1.5 bg-blue-600 text-white text-xs px-1.5 rounded-full">
                  {filterYears.length}
                </span>
              )}
            </button>

            {/* Year Selection Dropdown */}
            {showYearDropdown && (
              <div className="absolute z-50 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 w-48 max-h-64 overflow-y-auto">
                <div className="px-3 py-2 text-xs text-gray-400">
                  Hold ⌘/Ctrl or Shift to select multiple
                </div>
                {filterOptions.years.map(year => (
                  <button
                    key={year}
                    onClick={(e) => handleYearClick(year, e)}
                    className={`w-full px-3 py-1.5 text-sm text-left transition-colors ${
                      filterYears.includes(year)
                        ? 'bg-blue-600 text-white'
                        : 'text-white hover:bg-gray-700'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Categories Single-select Dropdown */}
          <div className="relative">
            <select
              value={filterCategories[0] || ''}
              onChange={(e) => {
                setFilterCategories(e.target.value ? [e.target.value] : []);
                setPage(1);
              }}
              className="h-8 px-3 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {filterOptions.tags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <FaChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Status Filter Buttons - Smaller Size */}
          <div className="flex bg-gray-800 rounded-lg p-0.5 space-x-0.5">
            <button
              onClick={() => {
                setStatusFilters({
                  collected: false,
                  uncollected: false,
                  wishlist: false
                });
              }}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center ${
                !statusFilters.collected && !statusFilters.uncollected && !statusFilters.wishlist
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FaInbox className="mr-1" />
              All
            </button>
            <button
              onClick={() => handleStatusFilterChange('collected', !statusFilters.collected)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center ${
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
              className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center ${
                statusFilters.uncollected
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FaTimes className={`mr-1 ${statusFilters.uncollected ? 'opacity-100' : 'opacity-50'}`} />
              Missing
            </button>
            <button
              onClick={() => handleStatusFilterChange('wishlist', !statusFilters.wishlist)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center ${
                statusFilters.wishlist
                  ? 'bg-blue-400 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FaHeart className={`mr-1 ${statusFilters.wishlist ? 'opacity-100' : 'opacity-50'}`} />
              Wishlist
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
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
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdatePin}
        />
      )}
      
      <AddPinModal
        isOpen={showAddPinModal}
        onClose={() => setShowAddPinModal(false)}
        onPinAdded={(newPin) => {
          setPins(prev => [newPin, ...prev]);
          setTotal(prev => prev + 1);
        }}
      />

      <YearFilterModal
        isOpen={showYearFilterModal}
        onClose={() => setShowYearFilterModal(false)}
        years={filterOptions.years}
        selectedYears={filterYears}
        onYearsChange={(years) => {
          setFilterYears(years);
          setPage(1);
        }}
      />
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
