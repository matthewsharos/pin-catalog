"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FaCamera, FaSort, FaCalendarAlt, FaSearchMinus, FaSearchPlus, FaTimes } from 'react-icons/fa';
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

  // Fetch pins with abort controller
  const fetchPins = useCallback(async (pageNum = 1, append = false) => {
    if (!initialized) return;

    // Set loading state at the beginning of the fetch operation
    if (!append) {
      setLoading(true);
      console.log('Setting loading to true');
    }

    try {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      const params = new URLSearchParams();
      params.set('page', pageNum.toString());
      params.set('sort', sortOption);
      params.set('pageSize', '100');
      
      if (searchQuery) params.set('search', searchQuery);
      
      // Handle status filters
      if (statusFilters) {
        if (statusFilters.all) {
          params.set('all', 'true');
        } else {
          // Only add specific status filters if 'all' is not selected
          if (statusFilters.collected) params.set('collected', 'true');
          if (statusFilters.uncollected) params.set('uncollected', 'true');
          if (statusFilters.wishlist) params.set('wishlist', 'true');
          if (statusFilters.underReview) params.set('underReview', 'true');
        }
      }
      
      // Add filter parameters
      if (filterCategories.length) params.set('categories', filterCategories.join(','));
      if (filterOrigins.length) params.set('origins', filterOrigins.join(','));
      if (filterSeries.length) params.set('series', filterSeries.join(','));
      if (filterIsLimitedEdition) params.set('isLimitedEdition', 'true');
      if (filterIsMystery) params.set('isMystery', 'true');
      if (yearFilters.length) params.set('years', yearFilters.join(','));
      
      // Add tag filter
      if (selectedTag !== null) {
        params.set('tag', selectedTag);
      }
      
      // Log the API request URL for debugging
      console.log('Fetching pins with URL:', `/api/pins?${params.toString()}`);
      
      const response = await fetch(`/api/pins?${params.toString()}`, { 
        signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      // If request was aborted, just return without updating state
      if (signal.aborted) {
        console.log('Request was aborted');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch pins');
      }
      
      const data = await response.json();
      
      // If request was aborted during the json parsing, just return without updating state
      if (signal.aborted) {
        console.log('Request was aborted during JSON parsing');
        return;
      }
      
      setPins(prevPins => {
        const newPins = append 
          ? { 
              data: [...prevPins.data, ...data.pins],
              pagination: {
                page: data.currentPage,
                totalPages: data.totalPages,
                total: data.totalCount,
                hasMore: data.currentPage < data.totalPages
              }
            }
          : { 
              data: data.pins,
              pagination: {
                page: data.currentPage,
                totalPages: data.totalPages,
                total: data.totalCount,
                hasMore: data.currentPage < data.totalPages
              }
            };
        
        console.log('New pins state:', {
          length: newPins.data.length,
          firstPin: newPins.data[0],
          pagination: newPins.pagination
        });
        
        return newPins;
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted:', error);
      } else {
        console.error('Error fetching pins:', error);
        toast.error('Failed to fetch pins');
        
        // If there was an error and we're not appending, set pins to empty array
        if (!append) {
          setPins({ 
            data: [], 
            pagination: { 
              page: 1, 
              totalPages: 1, 
              total: 0,
              hasMore: false 
            } 
          });
        }
      }
    } finally {
      // Only set loading to false if this wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
        console.log('Setting loading to false');
      }
    }
  }, [initialized, sortOption, searchQuery, selectedTag, statusFilters, filterCategories, filterOrigins, filterSeries, filterIsLimitedEdition, filterIsMystery, yearFilters]);

  // Fetch available filters with abort controller
  const fetchAvailableFilters = useCallback(async () => {
    if (!initialized) return;

    try {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      const params = new URLSearchParams();
      params.append('filtersOnly', 'true');
      
      // Handle status filters
      if (statusFilters) {
        if (statusFilters.all) {
          params.append('all', 'true');
        } else {
          // Only add specific status filters if 'all' is not selected
          if (statusFilters.collected) params.append('collected', 'true');
          if (statusFilters.uncollected) params.append('uncollected', 'true');
          if (statusFilters.wishlist) params.append('wishlist', 'true');
          if (statusFilters.underReview) params.append('underReview', 'true');
        }
      }
      
      // Add current search query
      if (searchQuery) params.append('search', searchQuery);
      
      // Add current filter selections to get dynamic filter options
      if (filterCategories.length) params.append('categories', filterCategories.join(','));
      if (filterOrigins.length) params.append('origins', filterOrigins.join(','));
      if (filterSeries.length) params.append('series', filterSeries.join(','));
      if (filterIsLimitedEdition) params.append('isLimitedEdition', 'true');
      if (filterIsMystery) params.append('isMystery', 'true');
      if (yearFilters.length) params.append('years', yearFilters.join(','));

      const response = await fetch(`/api/pins?${params.toString()}`, { signal });
      
      // If request was aborted, just return
      if (signal.aborted) return;
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch filters');
      }
      
      const filters = await response.json();
      
      // Only update state if the request wasn't aborted
      if (!signal.aborted) {
        setAvailableCategories(filters.tags || []);
        setAvailableOrigins(filters.origins || []);
        setAvailableSeries(filters.series || []);
        setAvailableYears(filters.years || []);
      }
    } catch (error) {
      // Ignore abort errors as they're expected
      if (error.name !== 'AbortError') {
        console.error('Error fetching filters:', error);
        toast.error('Failed to load filter options');
        setAvailableCategories([]);
        setAvailableOrigins([]);
        setAvailableSeries([]);
        setAvailableYears([]);
      }
    }
  }, [statusFilters, searchQuery, filterCategories, filterOrigins, filterSeries, filterIsLimitedEdition, filterIsMystery, yearFilters, initialized]);

  // Effects
  // Initialize component
  useEffect(() => {
    console.log('Initializing PinCatalog with default filters');
    setStatusFilters(defaultStatusFilters);
    setInitialized(true);
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (!initialized) return;
    
    console.log('PinCatalog initial data fetch:', {
      pinsLength: pins.data.length,
      total: pins.pagination.total,
      hasMore: pins.pagination.hasMore,
      loading,
      statusFilters
    });
    
    // Use a local abort controller that won't be affected by other fetches
    const localController = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('sort', sortOption);
        params.set('pageSize', '100');
        
        if (searchQuery) params.set('search', searchQuery);
        
        // Handle status filters
        if (statusFilters) {
          if (statusFilters.all) {
            params.set('all', 'true');
          } else {
            // Only add specific status filters if 'all' is not selected
            if (statusFilters.collected) params.set('collected', 'true');
            if (statusFilters.uncollected) params.set('uncollected', 'true');
            if (statusFilters.wishlist) params.set('wishlist', 'true');
            if (statusFilters.underReview) params.set('underReview', 'true');
          }
        }
        
        // Add filter parameters
        if (filterCategories.length) params.set('categories', filterCategories.join(','));
        if (filterOrigins.length) params.set('origins', filterOrigins.join(','));
        if (filterSeries.length) params.set('series', filterSeries.join(','));
        if (filterIsLimitedEdition) params.set('isLimitedEdition', 'true');
        if (filterIsMystery) params.set('isMystery', 'true');
        if (yearFilters.length) params.set('years', yearFilters.join(','));
        
        // Add tag filter
        if (selectedTag !== null) {
          params.set('tag', selectedTag);
        }
        
        console.log('Initial fetch with URL:', `/api/pins?${params.toString()}`);
        
        const response = await fetch(`/api/pins?${params.toString()}`, { 
          signal: localController.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (localController.signal.aborted) {
          console.log('Initial fetch aborted');
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch pins');
        }
        
        const data = await response.json();
        console.log('Initial fetch received data:', {
          totalCount: data.totalCount,
          pinsLength: data.pins?.length,
        });
        
        if (!data.pins) {
          console.error('No pins array in API response:', data);
          toast.error('Error loading pins: Invalid data format');
          return;
        }
        
        setPins({ 
          data: data.pins,
          pagination: {
            page: data.currentPage,
            totalPages: data.totalPages,
            total: data.totalCount,
            hasMore: data.currentPage < data.totalPages
          }
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Initial fetch aborted');
        } else {
          console.error('Error in initial fetch:', error);
          toast.error('Failed to load pins');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    return () => {
      localController.abort();
    };
  }, [initialized]);

  // Refresh pins when filters change - use fetchPins for subsequent fetches
  useEffect(() => {
    if (!initialized) return;
    
    // Skip the initial render
    const timer = setTimeout(() => {
      setPins({ 
        data: [], 
        pagination: { 
          page: 1, 
          totalPages: 1, 
          total: 0,
          hasMore: true 
        } 
      });
      fetchPins(1, false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [statusFilters, sortOption, yearFilters, searchQuery, filterCategories, filterOrigins, filterSeries, filterIsLimitedEdition, filterIsMystery, initialized]);

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

  // Load more pins when page changes
  useEffect(() => {
    if (pins.pagination.page > 1) {
      fetchPins(pins.pagination.page, true);
    }
  }, [pins.pagination.page, fetchPins]);

  // Add click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close year dropdown if clicking outside
      if (showYearDropdown && !event.target.closest('[data-dropdown="year"]')) {
        setShowYearDropdown(false);
      }
      
      // Close sort dropdown if clicking outside
      if (showSortDropdown && !event.target.closest('[data-dropdown="sort"]')) {
        setShowSortDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showYearDropdown, showSortDropdown]);

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

      // If no specific status is selected, turn on 'all'
      const hasActiveStatus = Object.entries(newFilters).some(([key, value]) => key !== 'all' && value);
      if (!hasActiveStatus) {
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
