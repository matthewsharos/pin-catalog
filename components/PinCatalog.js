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
  const [filterIsLimitedEdition, setFilterIsLimitedEdition] = useState(false);
  const [filterIsMystery, setFilterIsMystery] = useState(false);
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
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableOrigins, setAvailableOrigins] = useState([]);
  const [availableSeries, setAvailableSeries] = useState([]);
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
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showSeriesDropdown, setShowSeriesDropdown] = useState(false);

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
        queryParams.set('category', filterCategories.join(','));
      }

      // Origin filter
      if (filterOrigins.length > 0) {
        queryParams.set('origin', filterOrigins.join(','));
      }

      // Series filter
      if (filterSeries.length > 0) {
        queryParams.set('series', filterSeries.join(','));
      }

      // Limited Edition & Mystery filters
      if (filterIsLimitedEdition) queryParams.set('isLimitedEdition', 'true');
      if (filterIsMystery) queryParams.set('isMystery', 'true');

      // Status filters - now supports multiple
      if (statusFilters.collected) queryParams.set('collected', 'true');
      if (statusFilters.uncollected) queryParams.set('uncollected', 'true');
      if (statusFilters.wishlist) queryParams.set('wishlist', 'true');

      // Sort and pagination
      queryParams.set('sortField', sortField);
      queryParams.set('sortOrder', sortOrder);
      queryParams.set('page', page.toString());

      console.log('Fetching with params:', queryParams.toString()); // Debug log

      const response = await api.get(`/api/pins?${queryParams.toString()}`);
      const data = response.data;

      setPins(data.pins || []);
      setTotal(data.total || 0);
      
      setFilterOptions({
        years: data.filterOptions?.years || [],
        series: data.filterOptions?.series || [],
        origins: data.filterOptions?.origins || [],
        tags: data.filterOptions?.tags || [],
      });
      
      if (initialLoad) {
        setInitialLoad(false);
      }
    } catch (error) {
      console.error('Error fetching pins:', error);
      console.error('Error details:', error.response?.data);
      setError('Failed to load pins');
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
    filterIsLimitedEdition,
    filterIsMystery,
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

  // Function to get available options based on current filters
  const getAvailableOptions = async (excludeFilter) => {
    try {
      const params = new URLSearchParams();
      
      // Add current filter selections except the one we're getting options for
      if (excludeFilter !== 'category' && filterCategories.length > 0) {
        params.append('categories', filterCategories.join(','));
      }
      if (excludeFilter !== 'origin' && filterOrigins.length > 0) {
        params.append('origins', filterOrigins.join(','));
      }
      if (excludeFilter !== 'series' && filterSeries.length > 0) {
        params.append('series', filterSeries.join(','));
      }
      
      // Add other filter states
      params.append('isLimitedEdition', filterIsLimitedEdition);
      params.append('isMystery', filterIsMystery);

      // Add status filters
      if (statusFilters.collected) params.append('isCollected', 'true');
      if (statusFilters.uncollected) params.append('isUncollected', 'true');
      if (statusFilters.wishlist) params.append('isWishlist', 'true');

      const response = await axios.get(`/api/pins/options?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching options:', error);
      return null;
    }
  };

  // Update available options when filters change
  const updateAvailableOptions = async () => {
    const categoryOptions = await getAvailableOptions('category');
    const originOptions = await getAvailableOptions('origin');
    const seriesOptions = await getAvailableOptions('series');

    if (categoryOptions) setAvailableCategories(categoryOptions.categories || []);
    if (originOptions) setAvailableOrigins(originOptions.origins || []);
    if (seriesOptions) setAvailableSeries(seriesOptions.series || []);
  };

  // Initialize available options
  useEffect(() => {
    updateAvailableOptions();
  }, []);

  // Update available options when any filter changes
  useEffect(() => {
    updateAvailableOptions();
  }, [filterCategories, filterOrigins, filterSeries, filterIsLimitedEdition, filterIsMystery]);

  // Handle filter selections
  const handleFilterChange = async (filterType, value) => {
    switch (filterType) {
      case 'category':
        if (value === null) {
          setFilterCategories([]);
        } else if (value === 'all') {
          setFilterCategories(availableCategories);
        } else if (Array.isArray(value)) {
          setFilterCategories(value);
        } else {
          setFilterCategories(prev => 
            prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
          );
        }
        break;

      case 'origin':
        if (value === null) {
          setFilterOrigins([]);
        } else if (value === 'all') {
          setFilterOrigins(availableOrigins);
        } else if (Array.isArray(value)) {
          setFilterOrigins(value);
        } else {
          setFilterOrigins(prev => 
            prev.includes(value) ? prev.filter(o => o !== value) : [...prev, value]
          );
        }
        break;

      case 'series':
        if (value === null) {
          setFilterSeries([]);
        } else if (value === 'all') {
          setFilterSeries(availableSeries);
        } else if (Array.isArray(value)) {
          setFilterSeries(value);
        } else {
          setFilterSeries(prev => 
            prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
          );
        }
        break;

      default:
        break;
    }

    // Reset page when filters change
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterYears([]);
    setFilterCategories([]);
    setFilterOrigins([]);
    setFilterSeries([]);
    setFilterIsLimitedEdition(false);
    setFilterIsMystery(false);
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

  const handleStatusClick = (status, e) => {
    e.preventDefault(); // Prevent text selection
    
    setStatusFilters(prev => {
      if (status === 'all') {
        // Clear all filters
        return {
          collected: false,
          uncollected: false,
          wishlist: false
        };
      }
      
      if (e.metaKey || e.ctrlKey) {
        // Command/Ctrl click - toggle this status only
        return {
          ...prev,
          [status]: !prev[status]
        };
      } else {
        // Normal click - set only this status
        return {
          collected: status === 'collected' && !prev.collected,
          uncollected: status === 'uncollected' && !prev.uncollected,
          wishlist: status === 'wishlist' && !prev.wishlist
        };
      }
    });
    
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
      // Close filter dropdowns
      if (!event.target.closest('.filter-dropdown')) {
        setShowCategoryDropdown(false);
        setShowOriginDropdown(false);
        setShowSeriesDropdown(false);
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
            {/* Header */}
            <div className="flex items-center">
              <div className="flex items-center">
                <button onClick={scrollToTop} className="flex items-center">
                  <img src="/icon.png" alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16" />
                  <h1 className={`text-2xl sm:text-3xl font-medium text-white ${dancingScript.className}`}>
                    <span className="hidden sm:inline">Sharos Pin </span>
                    <span className="sm:hidden">Sharos </span>
                    <span>Catalog</span>
                  </h1>
                </button>
                <div className="text-gray-400 text-sm ml-3">
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
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Allow Command+A to select all
                  if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                    e.target.select();
                  }
                }}
                placeholder="Search pins..."
                className="w-full h-7 pl-8 pr-3 text-xs bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <FaSearch className="absolute left-2.5 top-2 text-gray-400 text-xs" />
            </div>
            
            <button
              onClick={handleClearFilters}
              className="h-7 px-2 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center whitespace-nowrap"
            >
              Clear All
            </button>
          </div>

          {/* Row 2: Status Buttons */}
          <div className="inline-flex bg-gray-800 rounded-lg p-0.5 space-x-0.5">
            <button
              onClick={(e) => handleStatusClick('all', e)}
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
              onClick={(e) => handleStatusClick('collected', e)}
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
              onClick={(e) => handleStatusClick('uncollected', e)}
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
              onClick={(e) => handleStatusClick('wishlist', e)}
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
              className="px-2 py-0.5 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              Previous
            </button>
            <span className="text-xs">
              Page {page} of {Math.ceil(total / 100)}
            </span>
            <button
              onClick={() => setPage(Math.min(Math.ceil(total / 100), page + 1))}
              disabled={page >= Math.ceil(total / 100)}
              className="px-2 py-0.5 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
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
              {/* Categories Dropdown */}
              <div className="relative filter-dropdown">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center justify-between"
                >
                  <span>
                    {filterCategories[0] || 'All Categories'}
                  </span>
                  <FaChevronDown className={`transition-transform ${showCategoryDropdown ? 'transform rotate-180' : ''}`} />
                </button>
                {showCategoryDropdown && (
                  <div className="absolute left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleFilterChange('category', null);
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                      >
                        All Categories
                      </button>
                      <div className="border-t border-gray-700 my-1"></div>
                      {availableCategories.map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            handleFilterChange('category', [category]);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
                            filterCategories[0] === category ? 'text-blue-400' : 'text-white'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Origins Dropdown */}
              <div className="relative filter-dropdown">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Origin
                </label>
                <button
                  onClick={() => setShowOriginDropdown(!showOriginDropdown)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center justify-between"
                >
                  <span>
                    {filterOrigins[0] || 'All Origins'}
                  </span>
                  <FaChevronDown className={`transition-transform ${showOriginDropdown ? 'transform rotate-180' : ''}`} />
                </button>
                {showOriginDropdown && (
                  <div className="absolute left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleFilterChange('origin', null);
                          setShowOriginDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                      >
                        All Origins
                      </button>
                      <div className="border-t border-gray-700 my-1"></div>
                      {availableOrigins.map((origin) => (
                        <button
                          key={origin}
                          onClick={() => {
                            handleFilterChange('origin', [origin]);
                            setShowOriginDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
                            filterOrigins[0] === origin ? 'text-blue-400' : 'text-white'
                          }`}
                        >
                          {origin}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Series Dropdown */}
              <div className="relative filter-dropdown">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Series
                </label>
                <button
                  onClick={() => setShowSeriesDropdown(!showSeriesDropdown)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center justify-between"
                >
                  <span>
                    {filterSeries[0] || 'All Series'}
                  </span>
                  <FaChevronDown className={`transition-transform ${showSeriesDropdown ? 'transform rotate-180' : ''}`} />
                </button>
                {showSeriesDropdown && (
                  <div className="absolute left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleFilterChange('series', null);
                          setShowSeriesDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                      >
                        All Series
                      </button>
                      <div className="border-t border-gray-700 my-1"></div>
                      {availableSeries.map((series) => (
                        <button
                          key={series}
                          onClick={() => {
                            handleFilterChange('series', [series]);
                            setShowSeriesDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
                            filterSeries[0] === series ? 'text-blue-400' : 'text-white'
                          }`}
                        >
                          {series}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Limited Edition & Mystery */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filterIsLimitedEdition}
                    onChange={(e) => setFilterIsLimitedEdition(e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-300">Limited Edition</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filterIsMystery}
                    onChange={(e) => setFilterIsMystery(e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-300">Mystery</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-800">
              <button
                onClick={() => {
                  handleFilterChange('category', null);
                  handleFilterChange('origin', null);
                  handleFilterChange('series', null);
                  setFilterIsLimitedEdition(false);
                  setFilterIsMystery(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Close
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
