"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { FaCamera, FaSort, FaCalendarAlt, FaSearchMinus, FaSearchPlus, FaTimes, FaCheck, FaHeart, FaQuestion } from 'react-icons/fa';
import HeaderNavigation from './HeaderNavigation';
import StatusFilters from './StatusFilters';
import FilterModal from './FilterModal';
import PinGrid from './PinGrid';
import PinModal from './PinModal';
import AddPinModal from './AddPinModal';
import ExportModal from './ExportModal';

const defaultStatusFilters = {
  all: true,
  collected: false,
  uncollected: false,
  wishlist: false,
  underReview: false
};

export default function PinCatalog() {
  // State
  const [pins, setPins] = useState({ 
    data: [], 
    pagination: { 
      page: 1, 
      totalPages: 1, 
      total: 0,
      hasMore: true 
    } 
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('Recently Updated');
  const [yearFilters, setYearFilters] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [statusFilters, setStatusFilters] = useState(defaultStatusFilters);
  const [initialized, setInitialized] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(3);

  // Filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterOrigins, setFilterOrigins] = useState([]);
  const [filterSeries, setFilterSeries] = useState([]);
  const [filterIsLimitedEdition, setFilterIsLimitedEdition] = useState(false);
  const [filterIsMystery, setFilterIsMystery] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableOrigins, setAvailableOrigins] = useState([]);
  const [availableSeries, setAvailableSeries] = useState([]);

  // Modal state
  const [selectedPin, setSelectedPin] = useState(null);
  const [showAddPinModal, setShowAddPinModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Refs
  const contentRef = useRef(null);
  const searchInputRef = useRef(null);
  const observer = useRef(null);
  const abortControllerRef = useRef(null);
  const searchDebounceTimerRef = useRef(null);
  const filterTimerRef = useRef(null);
  const loadingTimerRef = useRef(null);

  // Memoized filter state
  const filterState = useMemo(() => ({
    search: searchQuery,
    sort: sortOption,
    tag: selectedTag,
    years: yearFilters,
    categories: filterCategories,
    origins: filterOrigins,
    series: filterSeries,
    isLimitedEdition: filterIsLimitedEdition,
    isMystery: filterIsMystery,
    ...statusFilters
  }), [
    searchQuery,
    sortOption,
    selectedTag,
    yearFilters,
    filterCategories,
    filterOrigins,
    filterSeries,
    filterIsLimitedEdition,
    filterIsMystery,
    statusFilters
  ]);

  // Memoized intersection observer callback
  const lastPinElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pins.pagination.hasMore) {
        setPins(prevPins => ({
          ...prevPins,
          pagination: {
            ...prevPins.pagination,
            page: prevPins.pagination.page + 1
          }
        }));
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, pins.pagination.hasMore]);

  // Optimized fetch pins function
  const fetchPins = useCallback(async (pageNum = 1, append = false) => {
    if (!initialized) return;

    // Clear any existing loading timer
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }

    // Set loading after a short delay to prevent flashing
    loadingTimerRef.current = setTimeout(() => {
      if (!append) {
        setLoading(true);
      }
    }, 150);

    try {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create a new abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      // Build query params
      const params = new URLSearchParams();
      params.set('page', pageNum.toString());
      params.set('pageSize', '100');

      // Add filter params
      Object.entries(filterState).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          params.set(key, value.join(','));
        } else if (value !== null && value !== undefined && value !== '') {
          params.set(key, value.toString());
        }
      });

      // Fetch data with timeout
      const response = await Promise.race([
        fetch(`/api/pins?${params.toString()}`, { signal: controller.signal }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      ]);

      if (!response.ok) {
        throw new Error('Failed to fetch pins');
      }

      const data = await response.json();

      // Update pins state
      setPins(prevPins => ({
        data: append ? [...prevPins.data, ...data.data] : data.data,
        pagination: data.pagination
      }));
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error fetching pins:', error);
      toast.error('Failed to load pins');
    } finally {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
      setLoading(false);
    }
  }, [initialized, filterState]);

  // Debounced filter update
  const updateFilters = useCallback(() => {
    if (filterTimerRef.current) {
      clearTimeout(filterTimerRef.current);
    }

    filterTimerRef.current = setTimeout(() => {
      setPins(prev => ({
        ...prev,
        pagination: { ...prev.pagination, page: 1 }
      }));
      fetchPins(1, false);
    }, 300);
  }, [fetchPins]);

  // Effect for filter changes
  useEffect(() => {
    updateFilters();
    return () => {
      if (filterTimerRef.current) {
        clearTimeout(filterTimerRef.current);
      }
    };
  }, [filterState, updateFilters]);

  // Effect for pagination
  useEffect(() => {
    if (pins.pagination.page > 1) {
      fetchPins(pins.pagination.page, true);
    }
  }, [pins.pagination.page, fetchPins]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (filterTimerRef.current) {
        clearTimeout(filterTimerRef.current);
      }
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  // Initialize filters
  useEffect(() => {
    const initFilters = async () => {
      try {
        const response = await fetch('/api/pins?filtersOnly=true');
        if (!response.ok) throw new Error('Failed to fetch filters');
        
        const filters = await response.json();
        setAvailableCategories(filters.categories);
        setAvailableOrigins(filters.origins);
        setAvailableSeries(filters.series);
        setAvailableYears(filters.years);
        setInitialized(true);
      } catch (error) {
        console.error('Error fetching filters:', error);
        toast.error('Failed to load filters');
      }
    };

    initFilters();
  }, []);

  // Fetch available filters when modal is opened
  useEffect(() => {
    if (showFilterModal && initialized) {
      fetchAvailableFilters();
    }
  }, [showFilterModal, initialized]);

  // Fetch years when dropdown is opened
  useEffect(() => {
    if (showYearDropdown && initialized) {
      fetchAvailableFilters();
    }
  }, [showYearDropdown, initialized]);

  // Update available filters when filter selections change
  useEffect(() => {
    if (!initialized) return;
    
    const timer = setTimeout(() => {
      fetchAvailableFilters();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filterCategories, filterOrigins, filterSeries, filterIsLimitedEdition, filterIsMystery, initialized]);

  // Handle tag selection
  const handleTagSelect = (tag) => {
    setSelectedTag(tag);
    // Reset pagination when changing tag filter
    setPins({ 
      data: [], 
      pagination: { 
        page: 1, 
        totalPages: 1, 
        total: 0,
        hasMore: true 
      } 
    });
  };

  // Handlers
  const handleClearAllFilters = useCallback(() => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setSearchQuery('');
    setStatusFilters(defaultStatusFilters);
    setFilterCategories([]);
    setFilterOrigins([]);
    setFilterSeries([]);
    setFilterIsLimitedEdition(false);
    setFilterIsMystery(false);
    setYearFilters([]);
    setSelectedTag(null);
    setPins({ 
      data: [], 
      pagination: { 
        page: 1, 
        totalPages: 1, 
        total: 0,
        hasMore: true 
      } 
    });
    
    // Force an immediate fetch with the cleared filters
    // Cancel any in-flight requests first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Reset to page 1 and fetch pins with cleared tag filter
    setPins({ 
      data: [], 
      pagination: { 
        page: 1, 
        totalPages: 1, 
        total: 0,
        hasMore: true 
      } 
    });
    setTimeout(() => {
      fetchPins(1, false);
    }, 0);
  }, [fetchPins]);

  const handleStatusClick = useCallback((status, event) => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear the current pins and show loading state immediately
    setPins({ 
      data: [], 
      pagination: { 
        page: 1, 
        totalPages: 1, 
        total: 0,
        hasMore: true 
      } 
    });
    setLoading(true);
    
    // Update status filters
    setStatusFilters(prevFilters => {
      // Create a copy of the current filters
      const newFilters = { ...prevFilters };

      // Handle modifier keys for multi-select
      if (event.metaKey || event.ctrlKey || event.shiftKey) {
        // Toggle the clicked status
        newFilters[status] = !newFilters[status];
        
        // If any specific status is selected, turn off 'all'
        if (status !== 'all' && newFilters[status]) {
          newFilters.all = false;
        }
        
        // If 'all' is selected, turn off all other statuses
        if (status === 'all' && newFilters.all) {
          newFilters.collected = false;
          newFilters.wishlist = false;
          newFilters.uncollected = false;
          newFilters.underReview = false;
        }
      } else {
        // Reset all filters to false
        Object.keys(newFilters).forEach(key => {
          newFilters[key] = false;
        });
        
        // Set only the clicked status to true
        newFilters[status] = true;
        
        // If 'all' is selected, make sure other status flags are false
        if (status === 'all') {
          newFilters.collected = false;
          newFilters.wishlist = false;
          newFilters.uncollected = false;
          newFilters.underReview = false;
        }
      }

      // If no specific status is selected and 'all' is not selected, turn on 'all'
      const hasActiveStatus = Object.entries(newFilters).some(([key, value]) => key !== 'all' && value);
      if (!hasActiveStatus && !newFilters.all) {
        return defaultStatusFilters; // Reset to default (all: true, others: false)
      }

      return newFilters;
    });
    
    // Reset page to 1 when changing filters
    setPins({ 
      data: [], 
      pagination: { 
        page: 1, 
        totalPages: 1, 
        total: 0,
        hasMore: true 
      } 
    });
    
    // Directly fetch fresh data from the server with a very short delay
    // to ensure state updates have been processed
    setTimeout(() => {
      fetchPins(1, false);
    }, 10);
  }, [fetchPins]);

  const handleFilterChange = useCallback((type, value) => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    switch (type) {
      case 'categories':
        setFilterCategories(value || []);
        break;
      case 'origins':
        setFilterOrigins(value || []);
        break;
      case 'series':
        setFilterSeries(value || []);
        break
    }
    setPins({ 
      data: [], 
      pagination: { 
        page: 1, 
        totalPages: 1, 
        total: 0,
        hasMore: true 
      } 
    });
  }, []);

  const handleSearchChange = useCallback((value) => {
    // Update the search query immediately for UI feedback
    setSearchQuery(value);
    
    // Clear any existing debounce timer
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    
    // If search is empty, fetch immediately
    if (!value.trim()) {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear pins and show loading
      setPins({ 
        data: [], 
        pagination: { 
          page: 1, 
          totalPages: 1, 
          total: 0,
          hasMore: true 
        } 
      });
      setLoading(true);
      
      // Fetch pins with empty search
      fetchPins(1, false);
      return;
    }
    
    // For non-empty searches, debounce the API call to prevent rapid consecutive requests
    // Only show loading state and clear pins when we're actually going to make the request
    searchDebounceTimerRef.current = setTimeout(() => {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear pins and show loading
      setPins({ 
        data: [], 
        pagination: { 
          page: 1, 
          totalPages: 1, 
          total: 0,
          hasMore: true 
        } 
      });
      setLoading(true);
      
      // Fetch pins with the new search query
      fetchPins(1, false);
    }, 300); // 300ms debounce time
  }, [fetchPins]);

  const handleYearChange = useCallback((year) => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setYearFilters(prev => {
      // If the year is already in the array, remove it
      if (prev.includes(year)) {
        return prev.filter(y => y !== year);
      }
      // Otherwise, add it to the array
      return [...prev, year];
    });
    setPins({ 
      data: [], 
      pagination: { 
        page: 1, 
        totalPages: 1, 
        total: 0,
        hasMore: true 
      } 
    });
  }, []);

  const handleSortChange = useCallback((option) => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setSortOption(option);
    setShowSortDropdown(false);
    setPins({ 
      data: [], 
      pagination: { 
        page: 1, 
        totalPages: 1, 
        total: 0,
        hasMore: true 
      } 
    });
  }, []);

  const handlePinUpdate = useCallback((updatedPin, currentIndex) => {
    // Update the pin in the current view
    setPins(prevPins => {
      // Create a copy of the pins array
      const newPins = [...prevPins.data];
      
      // Find the pin index
      const pinIndex = newPins.findIndex(pin => pin.id === updatedPin.id);
      if (pinIndex === -1) return { data: newPins, pagination: prevPins.pagination }; // Pin not found
      
      // Check if the pin should remain visible based on current filters
      const shouldRemovePin = (() => {
        // If "No Status" filter is active and the pin now has a status, remove it
        if (statusFilters.all && 
            (updatedPin.isCollected || updatedPin.isWishlist || 
             updatedPin.isDeleted || updatedPin.isUnderReview)) {
          return true;
        }
        
        // If specific status filters are active, check if the pin still matches
        if (!statusFilters.all) {
          const matchesCurrentFilter = 
            (statusFilters.collected && updatedPin.isCollected) ||
            (statusFilters.wishlist && updatedPin.isWishlist) ||
            (statusFilters.uncollected && updatedPin.isDeleted) ||
            (statusFilters.underReview && updatedPin.isUnderReview);
          
          if (!matchesCurrentFilter) {
            return true;
          }
        }
        
        return false;
      })();
      
      // If the pin should be removed based on filters, remove it with animation
      if (shouldRemovePin) {
        // Remove the pin from the array
        newPins.splice(pinIndex, 1);
        
        // Update total count
        setTimeout(() => {
          setPins(prev => ({ data: newPins, pagination: { ...prev.pagination, total: prev.pagination.total - 1 } }));
        }, 300);
        
        // Force a complete refresh after a short delay
        // This ensures the grid layout is properly updated
        setTimeout(() => {
          // Make a shallow copy of the pins array to force a re-render
          setPins(prev => ({ data: [...newPins], pagination: prev.pagination }));
        }, 350);
      } else {
        // Otherwise, update the pin in the array
        newPins[pinIndex] = updatedPin;
      }
      
      // If we have a currentIndex and this is the selected pin
      if (currentIndex !== undefined && selectedPin && selectedPin.id === updatedPin.id) {
        // If there are pins left in the list
        if (newPins.length > 0) {
          // Determine which pin to show next
          let nextIndex = currentIndex;
          // If we're at the end of the list, go to the last remaining pin
          if (nextIndex >= newPins.length) {
            nextIndex = newPins.length - 1;
          }
          // Set the selected pin to the next one in the list
          setSelectedPin(newPins[nextIndex]);
        } else {
          // If no pins left, close the modal
          setSelectedPin(null);
        }
      }
      
      return { data: newPins, pagination: prevPins.pagination };
    });
    
    // If this is a status change or tag update, update the pin in the database
    if ('isCollected' in updatedPin || 'isWishlist' in updatedPin || 
        'isDeleted' in updatedPin || 'isUnderReview' in updatedPin || 
        'tags' in updatedPin) {
      
      // Call the API to update the pin status in the database
      updatePinStatus(updatedPin);
      
      // We no longer need to refresh the entire catalog
      // The pin has already been updated in the local state above
      // or removed if it no longer matches the current filter
    }
  }, [selectedPin, statusFilters]);

  const updatePinStatus = async (pin) => {
    try {
      // Add current timestamp to the update
      const now = new Date();
      
      const response = await fetch(`/api/pins/${pin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: pin.id,
          isCollected: pin.isCollected,
          isWishlist: pin.isWishlist,
          isDeleted: pin.isDeleted,
          isUnderReview: pin.isUnderReview,
          tags: pin.tags || [],
          updatedAt: now.toISOString() // Update the timestamp
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from server:', errorData);
        throw new Error('Failed to update pin status');
      }
      
      const updatedPin = await response.json();
      console.log('Pin status updated successfully:', updatedPin);
      
      // Add imageRefreshKey to the local state only (not stored in database)
      updatedPin.imageRefreshKey = now.getTime();
      
      // Update the pin in the local state with the refresh key
      setPins(prevPins => {
        return { data: prevPins.data.map(p => {
          if (p.id === updatedPin.id) {
            return { ...p, ...updatedPin };
          }
          return p;
        }), pagination: prevPins.pagination };
      });
      
      // No need to refresh pins immediately since we've already updated the pin
      // in the view and we'll refresh the list after this.
    } catch (error) {
      console.error('Error updating pin status:', error);
      toast.error('Failed to update pin status');
    }
  };

  const handlePinDelete = useCallback((deletedPinId) => {
    setPins(prevPins => ({ data: prevPins.data.filter(pin => pin.id !== deletedPinId), pagination: { ...prevPins.pagination, total: prevPins.pagination.total - 1 } }));
  }, []);

  const handleAddPin = useCallback((newPin) => {
    setPins(prevPins => ({ data: [newPin, ...prevPins.data], pagination: { ...prevPins.pagination, total: prevPins.pagination.total + 1 } }));
  }, []);

  const handleScrollToTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePinNavigation = useCallback((direction, currentPin) => {
    const currentIndex = pins.data.findIndex(p => p.id === currentPin.id);
    if (currentIndex === -1 || pins.data.length <= 1) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % pins.data.length;
    } else {
      newIndex = (currentIndex - 1 + pins.data.length) % pins.data.length;
    }
    
    setSelectedPin(pins.data[newIndex]);
  }, [pins.data]);

  const handleAddPinClick = useCallback(() => {
    console.log("Add Pin button clicked");
    setShowAddPinModal(true);
  }, []);

  const handleExportClick = useCallback(() => {
    console.log("Export button clicked, showing export modal");
    setShowExportModal(true);
  }, []);

  // Handle zoom level change
  const handleZoomChange = useCallback((e) => {
    setZoomLevel(parseInt(e.target.value));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <HeaderNavigation
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortOption={sortOption}
        showSortDropdown={showSortDropdown}
        setShowSortDropdown={setShowSortDropdown}
        onSortChange={handleSortChange}
        yearFilters={yearFilters}
        availableYears={availableYears}
        showYearDropdown={showYearDropdown}
        setShowYearDropdown={setShowYearDropdown}
        onYearChange={handleYearChange}
        onAddPinClick={() => setShowAddPinModal(true)}
        onExportClick={() => setShowExportModal(true)}
        statusFilters={statusFilters}
        onStatusClick={handleStatusClick}
        onClearAllFilters={handleClearAllFilters}
        total={pins.pagination.total}
        onScrollToTop={handleScrollToTop}
        searchInputRef={searchInputRef}
        onMoreFiltersClick={() => setShowFilterModal(true)}
        onTagSelect={handleTagSelect}
      />
      <div className="container mx-auto px-4 py-4">
        {selectedTag && (
          <div className="mb-4 flex items-center">
            <span className="text-sm text-gray-400 mr-2">Filtering by tag:</span>
            <div className="bg-purple-900 text-white text-xs px-3 py-1 rounded-full flex items-center">
              {selectedTag}
              <button
                onClick={() => {
                  // Clear both the selected tag and filter categories
                  setSelectedTag(null);
                  setFilterCategories([]);
                  
                  // Force a refresh of the pins with the updated filters
                  // Cancel any in-flight requests first
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                  
                  // Reset to page 1 and fetch pins with cleared tag filter
                  setPins({ 
                    data: [], 
                    pagination: { 
                      page: 1, 
                      totalPages: 1, 
                      total: 0,
                      hasMore: true 
                    } 
                  });
                  setTimeout(() => {
                    fetchPins(1, false);
                  }, 0);
                }}
                className="ml-2 hover:text-gray-300"
                aria-label="Clear tag filter"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          {/* Zoom Slider - Left Side */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-gray-700 rounded-lg px-3 py-1">
              <FaSearchMinus className="text-gray-400 text-xs mr-1" />
              <input
                type="range"
                min="1"
                max="6"
                value={zoomLevel}
                onChange={handleZoomChange}
                className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                title="Adjust number of pins per row"
              />
              <FaSearchPlus className="text-gray-400 text-xs ml-1" />
            </div>
          </div>
          
          {/* Action Buttons - Right Side */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportClick}
              className="flex items-center space-x-1 h-8 px-3 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              title="Export as Image"
            >
              <FaCamera className="mr-1" />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowYearDropdown(!showYearDropdown)}
                className="flex items-center space-x-1 h-8 px-3 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                data-dropdown="year"
              >
                <FaCalendarAlt className="mr-1" />
                <span>Year {yearFilters.length > 0 ? `(${yearFilters.length})` : ''}</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              {showYearDropdown && (
                <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto w-40" data-dropdown="year">
                  <div className="p-2">
                    {availableYears.map(year => (
                      <div key={year} className="flex items-center px-4 py-2 hover:bg-gray-700 rounded" data-dropdown="year">
                        <input
                          type="checkbox"
                          id={`year-${year}`}
                          checked={yearFilters.includes(year)}
                          onChange={() => handleYearChange(year)}
                          className="mr-2 h-4 w-4"
                          data-dropdown="year"
                        />
                        <label htmlFor={`year-${year}`} className="text-sm text-white cursor-pointer flex-grow" data-dropdown="year">
                          {year}
                        </label>
                      </div>
                    ))}
                    {availableYears.length === 0 && (
                      <div className="text-sm text-gray-400 px-4 py-2" data-dropdown="year">
                        No years available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center space-x-1 h-8 px-3 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                data-dropdown="sort"
              >
                <FaSort className="mr-1" />
                <span>{sortOption}</span>
              </button>
              
              {showSortDropdown && (
                <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50" data-dropdown="sort">
                  <div className="p-2">
                    <button
                      onClick={() => handleSortChange('Recently Updated')}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded"
                      data-dropdown="sort"
                    >
                      Recently Updated
                    </button>
                    <button
                      onClick={() => handleSortChange('Name (A-Z)')}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded"
                      data-dropdown="sort"
                    >
                      Name (A-Z)
                    </button>
                    <button
                      onClick={() => handleSortChange('Name (Z-A)')}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded"
                      data-dropdown="sort"
                    >
                      Name (Z-A)
                    </button>
                    <button
                      onClick={() => handleSortChange('Newest First')}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded"
                      data-dropdown="sort"
                    >
                      Newest First
                    </button>
                    <button
                      onClick={() => handleSortChange('Oldest First')}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded"
                      data-dropdown="sort"
                    >
                      Oldest First
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <PinGrid
          pins={pins.data}
          onPinClick={(pin) => setSelectedPin(pin)}
          loading={loading}
          contentRef={contentRef}
          onStatusChange={handlePinUpdate}
          lastPinElementRef={lastPinElementRef}
          zoomLevel={zoomLevel}
          setSelectedTag={setSelectedTag}
        />
      </div>

      {showFilterModal && (
        <FilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          availableCategories={availableCategories}
          availableOrigins={availableOrigins}
          availableSeries={availableSeries}
          filterCategories={filterCategories}
          filterOrigins={filterOrigins}
          filterSeries={filterSeries}
          filterIsLimitedEdition={filterIsLimitedEdition}
          filterIsMystery={filterIsMystery}
          onFilterChange={handleFilterChange}
          onLimitedEditionChange={setFilterIsLimitedEdition}
          onMysteryChange={setFilterIsMystery}
        />
      )}

      {selectedPin && (
        <PinModal
          pin={selectedPin}
          onClose={() => setSelectedPin(null)}
          onUpdate={(updatedPin, currentIndex) => handlePinUpdate(updatedPin, currentIndex)}
          onDelete={handlePinDelete}
          pins={pins.data}
          currentIndex={pins.data.findIndex(p => p.id === selectedPin.id)}
          onNavigate={handlePinNavigation}
          setSelectedTag={setSelectedTag}
        />
      )}

      {showAddPinModal && (
        <AddPinModal
          isOpen={showAddPinModal}
          onClose={() => setShowAddPinModal(false)}
          onPinAdded={handleAddPin}
        />
      )}

      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          pins={pins.data}
          filters={{
            statusFilters,
            filterCategories,
            filterOrigins,
            filterSeries,
            filterIsLimitedEdition,
            filterIsMystery,
            searchQuery,
            yearFilters,
            sortOption
          }}
        />
      )}
    </div>
  );
}
