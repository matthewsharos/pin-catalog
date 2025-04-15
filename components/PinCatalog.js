"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaSearch, FaEdit, FaTrash, FaCheck, FaQuestionCircle, FaPlus, FaImages, FaCandyCane, FaTags, FaStar, FaTimes, FaInbox, FaChevronDown, FaHeart, FaCalendar, FaSort } from 'react-icons/fa';
import debounce from 'lodash/debounce';
import EditPin from './EditPin';
import AddPinModal from './AddPinModal';
import EditTagsModal from './EditTagsModal';
import Link from 'next/link';
import YearFilterModal from './YearFilterModal';
import { Dancing_Script } from 'next/font/google';
import SmokeEffect from './SmokeEffect';

const dancingScript = Dancing_Script({ subsets: ['latin'] });

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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterYears, setFilterYears] = useState([]);
  const [lastSelectedYear, setLastSelectedYear] = useState(null);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterOrigins, setFilterOrigins] = useState([]);
  const [filterSeries, setFilterSeries] = useState([]);
  const [filterLimitedEdition, setFilterLimitedEdition] = useState(false);
  const [filterMystery, setFilterMystery] = useState(false);
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
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [smokeEffects, setSmokeEffects] = useState([]);
  const [error, setError] = useState(null);
  const yearButtonRef = useRef(null);
  const sortButtonRef = useRef(null);

  const searchInputRef = useRef(null);
  const contentRef = useRef(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPins = useCallback(async () => {
    try {
      // Only show loading indicator on initial load
      if (initialLoad) {
        setLoading(true);
      }

      const queryParams = new URLSearchParams();
      
      // Search query
      if (debouncedSearch) queryParams.set('search', debouncedSearch);
      
      // Year filter
      if (filterYears.length > 0) {
        queryParams.set('year', filterYears.join(','));
      }

      // Category filter (tags)
      if (filterCategories.length > 0) {
        queryParams.set('tags', filterCategories.join(','));
      }

      // Origin filter
      if (filterOrigins.length > 0) {
        queryParams.set('origins', filterOrigins.join(','));
      }

      // Series filter
      if (filterSeries.length > 0) {
        queryParams.set('series', filterSeries.join(','));
      }

      // Limited Edition & Mystery filters
      if (filterLimitedEdition) queryParams.set('limitedEdition', 'true');
      if (filterMystery) queryParams.set('mystery', 'true');

      // Status filters
      if (statusFilters.collected) queryParams.set('status', 'collected');
      if (statusFilters.uncollected) queryParams.set('status', 'uncollected');
      if (statusFilters.wishlist) queryParams.set('status', 'wishlist');

      // Sort and pagination
      queryParams.set('sortField', sortField);
      queryParams.set('sortOrder', sortOrder);
      queryParams.set('page', page.toString());

      const response = await api.get(`/api/pins?${queryParams.toString()}`);
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
      });
      setError('Failed to load pins');
      // Even on error, we should stop showing the loading state
      setInitialLoad(false);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    debouncedSearch,
    sortField,
    sortOrder,
    filterYears,
    filterCategories,
    filterOrigins,
    filterSeries,
    filterLimitedEdition,
    filterMystery,
    statusFilters,
    initialLoad
  ]);

  // Fetch pins when filters change
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

  const getSortLabel = () => {
    switch (sortField) {
      case 'updatedAt':
        return 'Recently Updated';
      case 'releaseDate':
        return 'Release Date';
      case 'pinName':
        return 'Pin Name';
      case 'series':
        return 'Series';
      case 'origin':
        return 'Origin';
      default:
        return 'Unknown';
    }
  };

  const handleEditPin = async (pinId) => {
    try {
      console.log('Pin object:', pins.find(p => p.id === pinId));
      const response = await api.get(`/api/pins/${pinId}`);
      setEditingPin(response.data);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching pin details:', error);
      toast.error('Failed to fetch pin details');
    }
  };

  const handleUpdatePinStatus = async (pinId, newStatus) => {
    try {
      // Get pin position before updating
      const pinElement = document.querySelector(`[data-pin-id="${pinId}"]`);
      const rect = pinElement?.getBoundingClientRect();
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

      await api.post('/api/pins/bulk-update', {
        pinIds: [pinId],
        updates: updates
      });

      // Remove pin from list
      setPins(prev => prev.filter(p => p.id !== pinId));
      
      toast.success('Pin updated');
    } catch (error) {
      console.error('Error updating pin status:', error);
      toast.error('Failed to update pin status');
    }
  };

  const handleUpdatePin = async (updatedPin) => {
    try {
      const response = await api.put(`/api/pins/${updatedPin.id}`, updatedPin);
      const savedPin = response.data;
      
      // Remove the pin from the current view if its status changed
      if (savedPin.status !== updatedPin.status) {
        setPins(prev => prev.filter(p => p.id !== savedPin.id));
        setTotal(prev => prev - 1);
      } else {
        // Otherwise just update it
        setPins(prev => prev.map(p => p.id === savedPin.id ? savedPin : p));
      }
      
      // Only close modal if it's not a status-only update
      if (!('status' in updatedPin && Object.keys(updatedPin).length === 2)) {
        setShowEditModal(false);
      }
      
      toast.success('Pin updated successfully');
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

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setFilterYears([]);
    setFilterCategories([]);
    setFilterOrigins([]);
    setFilterSeries([]);
    setFilterLimitedEdition(false);
    setFilterMystery(false);
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

  const handleStatusFilterChange = (status, value, e) => {
    e.preventDefault(); // Prevent text selection
    
    let newFilters = { ...statusFilters };
    
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      // Multi-select with modifier key
      newFilters[status] = value;
    } else {
      // Single select without modifier
      newFilters = {
        collected: false,
        uncollected: false,
        wishlist: false
      };
      newFilters[status] = value;
    }
    
    setStatusFilters(newFilters);
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearButtonRef.current && !yearButtonRef.current.contains(event.target)) {
        setShowYearDropdown(false);
      }
      if (sortButtonRef.current && !sortButtonRef.current.contains(event.target)) {
        setShowSortMenu(false);
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
    <div className={`min-h-screen bg-gray-800 text-white ${dancingScript.variable}`}>
      {/* Sticky Header Navigation */}
      <div className="sticky top-0 z-50 bg-gray-900 shadow-lg">
        {/* Row 1: Logo, Title, Pin Count, Action Buttons */}
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-2">
              <img
                src="/icon.png"
                alt="Pin Icon"
                className="w-12 h-12 sm:w-16 sm:h-16"
              />
              <div className="flex items-center space-x-3">
                <h1 className={`${dancingScript.className} text-2xl sm:text-3xl font-medium`}>
                  <span className="hidden sm:inline">Sharos Pin </span>
                  <span>Catalog</span>
                </h1>
                <div className="text-gray-400 text-sm">
                  {total.toLocaleString()} pins
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Link
                href="/tags"
                className="hidden sm:flex items-center space-x-1 h-7 px-2 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                title="Manage Tags"
              >
                <FaTags />
                <span>Tags</span>
              </Link>
              <button
                onClick={() => setShowAddPinModal(true)}
                className="h-7 px-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <FaPlus className="mr-1 text-xs" />
                Pin
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="px-2 pb-3">
          {/* Row 1: Search */}
          <div className="flex items-center space-x-2 mb-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search pins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-7 pl-8 pr-3 text-xs bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                ref={searchInputRef}
              />
              <FaSearch className="absolute left-2.5 top-2 text-gray-400 text-xs" />
            </div>
            
            <button
              onClick={clearAllFilters}
              className="h-7 px-2 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center whitespace-nowrap"
            >
              Clear All
            </button>
          </div>

          {/* Row 2: Status Buttons */}
          <div className="inline-flex bg-gray-800 rounded-lg p-0.5 space-x-0.5">
            <button
              onClick={(e) => handleStatusFilterChange('all', true, e)}
              className={`h-7 px-2 text-xs font-medium rounded transition-colors flex items-center justify-center ${
                !statusFilters.collected && !statusFilters.uncollected && !statusFilters.wishlist
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FaInbox className="mr-1 text-xs" />
              All
            </button>
            <button
              onClick={(e) => handleStatusFilterChange('collected', !statusFilters.collected, e)}
              className={`h-7 px-2 text-xs font-medium rounded transition-colors flex items-center justify-center ${
                statusFilters.collected
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FaCheck className="mr-1 text-xs" />
              Owned
            </button>
            <button
              onClick={(e) => handleStatusFilterChange('uncollected', !statusFilters.uncollected, e)}
              className={`h-7 px-2 text-xs font-medium rounded transition-colors flex items-center justify-center ${
                statusFilters.uncollected
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FaTimes className="mr-1 text-xs" />
              Uncollected
            </button>
            <button
              onClick={(e) => handleStatusFilterChange('wishlist', !statusFilters.wishlist, e)}
              className={`h-7 px-2 text-xs font-medium rounded transition-colors flex items-center justify-center ${
                statusFilters.wishlist
                  ? 'bg-blue-400 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Hold ⌘/Ctrl or Shift to select multiple statuses"
            >
              <FaHeart className="mr-1 text-xs" />
              Wishlist
            </button>
            <button
              onClick={() => setShowFilterModal(true)}
              className="h-7 w-7 flex items-center justify-center text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              title="More Filters"
            >
              <FaPlus />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        {/* Sort and Filter Controls */}
        <div className="flex justify-end mb-4 space-x-2">
          {/* Year Filter Button */}
          <div className="relative" ref={yearButtonRef}>
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className="flex items-center space-x-1 h-7 px-2 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <span>Year{filterYears.length > 0 ? ` (${filterYears.length})` : ''}</span>
              <FaChevronDown className={`transform transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Year Dropdown */}
            {showYearDropdown && (
              <div className="absolute right-0 z-50 mt-2 py-2 w-48 bg-gray-800 rounded-lg shadow-xl">
                <div className="max-h-60 overflow-y-auto">
                  {filterOptions.years.map(year => (
                    <label
                      key={year}
                      className="flex items-center px-4 py-2 hover:bg-gray-700 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={filterYears.includes(year)}
                        onChange={() => {
                          if (filterYears.includes(year)) {
                            setFilterYears(prev => prev.filter(y => y !== year));
                          } else {
                            setFilterYears(prev => [...prev, year]);
                          }
                        }}
                        className="form-checkbox h-4 w-4 text-purple-500 rounded border-gray-600 bg-gray-700 focus:ring-purple-500"
                      />
                      <span className="ml-3 text-sm text-gray-300 group-hover:text-white">
                        {year}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sort Menu */}
          <div className="relative" ref={sortButtonRef}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center space-x-1 h-7 px-2 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <FaSort className="mr-1.5 text-xs" />
              Sort: {getSortLabel()}
            </button>
            
            {showSortMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-gray-800 rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={() => handleSort('updatedAt')}
                  className={`w-full px-2 py-1 text-xs text-left hover:bg-gray-700 transition-colors ${
                    sortField === 'updatedAt' ? 'text-blue-400' : 'text-white'
                  }`}
                >
                  Recently Updated
                </button>
                <button
                  onClick={() => handleSort('releaseDate')}
                  className={`w-full px-2 py-1 text-xs text-left hover:bg-gray-700 transition-colors ${
                    sortField === 'releaseDate' ? 'text-blue-400' : 'text-white'
                  }`}
                >
                  Release Date
                </button>
                <button
                  onClick={() => handleSort('pinName')}
                  className={`w-full px-2 py-1 text-xs text-left hover:bg-gray-700 transition-colors ${
                    sortField === 'pinName' ? 'text-blue-400' : 'text-white'
                  }`}
                >
                  Pin Name
                </button>
                <button
                  onClick={() => handleSort('series')}
                  className={`w-full px-2 py-1 text-xs text-left hover:bg-gray-700 transition-colors ${
                    sortField === 'series' ? 'text-blue-400' : 'text-white'
                  }`}
                >
                  Series
                </button>
                <button
                  onClick={() => handleSort('origin')}
                  className={`w-full px-2 py-1 text-xs text-left hover:bg-gray-700 transition-colors ${
                    sortField === 'origin' ? 'text-blue-400' : 'text-white'
                  }`}
                >
                  Origin
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pin Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
          {pins.map((pin) => (
            <div 
              key={pin.id} 
              data-pin-id={pin.id}
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
                      // WISHLIST pins - show collected and uncollected buttons only
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
                          <FaTimes className="mr-1 text-sm" />
                        </button>
                      </>
                    ) : (
                      // UNCOLLECTED (Missing) pins - show collected and wishlist buttons only
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
                      </>
                    ) : (
                      // UNCATEGORIZED pins - show all buttons
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

      {/* Pagination */}
      {Math.ceil(total / 100) > 1 && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center space-x-3 text-sm text-gray-300">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-2 py-0.5 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              Previous
            </button>
            <span className="text-xs">
              Page {page} of {Math.ceil(total / 100)}
            </span>
            <button
              onClick={() => setPage(Math.min(Math.ceil(total / 100), page + 1))}
              disabled={page >= Math.ceil(total / 100)}
              className="px-2 py-0.5 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showEditModal && editingPin && (
        <EditPin
          pin={editingPin}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingPin(null);
          }}
          onSave={handleUpdatePin}
          onStatusChange={() => {
            fetchPins();
          }}
          onEditTags={(pin) => {
            setEditingTags(pin);
            setShowTagModal(true);
          }}
          onNext={() => {
            const currentIndex = pins.findIndex(p => p.id === editingPin.id);
            if (currentIndex < pins.length - 1) {
              setEditingPin(pins[currentIndex + 1]);
            } else if (currentIndex === pins.length - 1) {
              // If we're on the last pin, close the modal
              setShowEditModal(false);
              setEditingPin(null);
            }
          }}
          onPrev={() => {
            const currentIndex = pins.findIndex(p => p.id === editingPin.id);
            if (currentIndex > 0) {
              setEditingPin(pins[currentIndex - 1]);
            }
          }}
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

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h3 className="text-lg font-medium text-white">Filters</h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categories
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {filterOptions.tags.map(category => (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterCategories.includes(category)}
                        onChange={() => {
                          setFilterCategories(prev => {
                            if (prev.includes(category)) {
                              return prev.filter(c => c !== category);
                            } else {
                              return [...prev, category];
                            }
                          });
                        }}
                        className="form-checkbox"
                      />
                      <span className="ml-2 text-sm text-gray-300">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Origins */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Origins
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {filterOptions.origins.map(origin => (
                    <label key={origin} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterOrigins.includes(origin)}
                        onChange={() => {
                          setFilterOrigins(prev => {
                            if (prev.includes(origin)) {
                              return prev.filter(o => o !== origin);
                            } else {
                              return [...prev, origin];
                            }
                          });
                        }}
                        className="form-checkbox"
                      />
                      <span className="ml-2 text-sm text-gray-300">{origin}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Series */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Series
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {filterOptions.series.map(series => (
                    <label key={series} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filterSeries.includes(series)}
                        onChange={() => {
                          setFilterSeries(prev => {
                            if (prev.includes(series)) {
                              return prev.filter(s => s !== series);
                            } else {
                              return [...prev, series];
                            }
                          });
                        }}
                        className="form-checkbox"
                      />
                      <span className="ml-2 text-sm text-gray-300">{series}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Limited Edition & Mystery */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filterLimitedEdition}
                    onChange={(e) => setFilterLimitedEdition(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-300">Limited Edition</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filterMystery}
                    onChange={(e) => setFilterMystery(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-300">Mystery</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-800">
              <button
                onClick={() => {
                  setFilterCategories([]);
                  setFilterOrigins([]);
                  setFilterSeries([]);
                  setFilterLimitedEdition(false);
                  setFilterMystery(false);
                }}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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
