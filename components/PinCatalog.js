"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FaCamera, FaSort, FaCalendarAlt } from 'react-icons/fa';
import HeaderNavigation from './HeaderNavigation';
import StatusFilters from './StatusFilters';
import FilterModal from './FilterModal';
import PinGrid from './PinGrid';
import PinModal from './PinModal';
import AddPinModal from './AddPinModal';
import ExportModal from './ExportModal';

// Add debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function PinCatalog() {
  // State
  const [pins, setPins] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('Recently Updated');
  const [yearFilters, setYearFilters] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [statusFilters, setStatusFilters] = useState({
    all: true,
    collected: false,
    uncollected: false,
    wishlist: false,
    underReview: false
  });
  // Add a flag to track if filters are being updated
  const [isFilterUpdating, setIsFilterUpdating] = useState(false);

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
  const filterStateRef = useRef({
    statusFilters,
    searchQuery,
    filterCategories,
    filterOrigins,
    filterSeries,
    filterIsLimitedEdition,
    filterIsMystery,
    yearFilters,
    sortOption
  });

  // Update the ref whenever filter state changes
  useEffect(() => {
    filterStateRef.current = {
      statusFilters,
      searchQuery,
      filterCategories,
      filterOrigins,
      filterSeries,
      filterIsLimitedEdition,
      filterIsMystery,
      yearFilters,
      sortOption
    };
  }, [statusFilters, searchQuery, filterCategories, filterOrigins, filterSeries, filterIsLimitedEdition, filterIsMystery, yearFilters, sortOption]);

  const lastPinElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // Fetch pins with abort controller to cancel previous requests
  const fetchPins = useCallback(async (pageNum = 1, append = false) => {
    try {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      setLoading(true);
      
      // Use the current filter state from the ref to avoid closure issues
      const currentFilterState = filterStateRef.current;
      
      const params = new URLSearchParams();
      params.append('page', pageNum);
      params.append('search', currentFilterState.searchQuery);
      
      if (currentFilterState.statusFilters.collected) params.append('collected', 'true');
      if (currentFilterState.statusFilters.uncollected) params.append('uncollected', 'true');
      if (currentFilterState.statusFilters.wishlist) params.append('wishlist', 'true');
      if (currentFilterState.statusFilters.underReview) params.append('underReview', 'true');
      if (currentFilterState.statusFilters.all) params.append('all', 'true');

      if (currentFilterState.filterCategories.length) params.append('categories', currentFilterState.filterCategories.join(','));
      if (currentFilterState.filterOrigins.length) params.append('origins', currentFilterState.filterOrigins.join(','));
      if (currentFilterState.filterSeries.length) params.append('series', currentFilterState.filterSeries.join(','));
      if (currentFilterState.filterIsLimitedEdition) params.append('isLimitedEdition', 'true');
      if (currentFilterState.filterIsMystery) params.append('isMystery', 'true');
      if (currentFilterState.yearFilters.length) params.append('years', currentFilterState.yearFilters.join(','));
      params.append('sort', currentFilterState.sortOption);

      const response = await fetch(`/api/pins?${params.toString()}`, { signal });
      
      // If request was aborted, just return
      if (signal.aborted) return;
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pins');
      }
      
      const data = await response.json();
      setTotal(data.totalCount);
      setHasMore(pageNum < data.totalPages);
      
      // Only update pins if the request wasn't aborted during the await
      if (!signal.aborted) {
        setPins(prevPins => append ? [...prevPins, ...data.pins] : data.pins);
      }
    } catch (error) {
      // Ignore abort errors as they're expected
      if (error.name !== 'AbortError') {
        console.error('Error fetching pins:', error);
        toast.error('Failed to load pins');
      }
    } finally {
      // Only update loading state if the request wasn't aborted
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setLoading(false);
        setIsFilterUpdating(false);
      }
    }
  }, []);

  // Debounced version of fetchPins for search and rapid filter changes
  const debouncedFetchPins = useCallback(
    debounce((pageNum, append) => {
      fetchPins(pageNum, append);
    }, 300),
    [fetchPins]
  );

  // Fetch available filters with abort controller
  const fetchAvailableFilters = useCallback(async () => {
    try {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      const currentFilterState = filterStateRef.current;
      
      const params = new URLSearchParams();
      params.append('filtersOnly', 'true');
      
      // Add all current filter states to get dynamic filter options
      if (currentFilterState.statusFilters.collected) params.append('collected', 'true');
      if (currentFilterState.statusFilters.uncollected) params.append('uncollected', 'true');
      if (currentFilterState.statusFilters.wishlist) params.append('wishlist', 'true');
      if (currentFilterState.statusFilters.underReview) params.append('underReview', 'true');
      if (currentFilterState.statusFilters.all) params.append('all', 'true');

      if (currentFilterState.searchQuery) params.append('search', currentFilterState.searchQuery);
      
      // Add current filter selections to get dynamic options
      if (currentFilterState.filterCategories.length) params.append('categories', currentFilterState.filterCategories.join(','));
      if (currentFilterState.filterOrigins.length) params.append('origins', currentFilterState.filterOrigins.join(','));
      if (currentFilterState.filterSeries.length) params.append('series', currentFilterState.filterSeries.join(','));
      if (currentFilterState.filterIsLimitedEdition) params.append('isLimitedEdition', 'true');
      if (currentFilterState.filterIsMystery) params.append('isMystery', 'true');
      if (currentFilterState.yearFilters.length) params.append('years', currentFilterState.yearFilters.join(','));

      const response = await fetch(`/api/pins?${params.toString()}`, { signal });
      
      // If request was aborted, just return
      if (signal.aborted) return;
      
      if (!response.ok) {
        const errorData = await response.json();
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
  }, []);

  // Debounced version of fetchAvailableFilters
  const debouncedFetchAvailableFilters = useCallback(
    debounce(() => {
      fetchAvailableFilters();
    }, 300),
    [fetchAvailableFilters]
  );

  // Effects
  // Initial load
  useEffect(() => {
    setPage(1);
    fetchPins(1, false);
    
    // Cleanup function to abort any pending requests when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPins]);

  // Fetch filters when modal is opened
  useEffect(() => {
    if (showFilterModal) {
      debouncedFetchAvailableFilters();
    }
  }, [showFilterModal, debouncedFetchAvailableFilters]);
  
  // Fetch years when dropdown is opened
  useEffect(() => {
    if (showYearDropdown) {
      debouncedFetchAvailableFilters();
    }
  }, [showYearDropdown, debouncedFetchAvailableFilters]);

  // Update available filters when filter selections change
  useEffect(() => {
    debouncedFetchAvailableFilters();
  }, [filterCategories, filterOrigins, filterSeries, filterIsLimitedEdition, filterIsMystery, debouncedFetchAvailableFilters]);

  // Load more pins when page changes
  useEffect(() => {
    if (page > 1) {
      debouncedFetchPins(page, true);
    }
  }, [page, debouncedFetchPins]);

  // Refresh pins when filters change
  useEffect(() => {
    if (!isFilterUpdating) {
      setIsFilterUpdating(true);
      setPage(1);
      debouncedFetchPins(1, false);
    }
  }, [statusFilters, sortOption, yearFilters, searchQuery, filterCategories, filterOrigins, filterSeries, filterIsLimitedEdition, filterIsMystery, debouncedFetchPins]);

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
    setStatusFilters({
      all: true,
      collected: false,
      uncollected: false,
      wishlist: false,
      underReview: false
    });
    setFilterCategories([]);
    setFilterOrigins([]);
    setFilterSeries([]);
    setFilterIsLimitedEdition(false);
    setFilterIsMystery(false);
    setYearFilters([]);
    setPage(1);
    
    // Update the filter state ref immediately
    filterStateRef.current = {
      statusFilters: {
        all: true,
        collected: false,
        uncollected: false,
        wishlist: false,
        underReview: false
      },
      searchQuery: '',
      filterCategories: [],
      filterOrigins: [],
      filterSeries: [],
      filterIsLimitedEdition: false,
      filterIsMystery: false,
      yearFilters: [],
      sortOption
    };
    
    // Force an immediate fetch with the cleared filters
    setIsFilterUpdating(true);
    fetchPins(1, false);
  }, [sortOption, fetchPins]);

  const handleStatusClick = useCallback((status, event) => {
    event.preventDefault();
    const multiSelect = event.metaKey || event.ctrlKey || event.shiftKey;
    
    setStatusFilters(prev => {
      let newFilters = { ...prev };
      
      if (status === 'all') {
        newFilters = {
          all: !prev.all,
          collected: false,
          uncollected: false,
          wishlist: false,
          underReview: false
        };
      } else if (multiSelect) {
        // Toggle the clicked status
        newFilters[status] = !prev[status];
        
        // If we're enabling a specific status, disable 'all'
        if (newFilters[status]) {
          newFilters.all = false;
        }
        
        // If no status is selected, enable 'all'
        const hasActiveFilter = Object.entries(newFilters)
          .filter(([key]) => key !== 'all')
          .some(([_, value]) => value);
          
        if (!hasActiveFilter) {
          newFilters.all = true;
        }
      } else {
        // Single selection mode - set only the clicked status to true
        Object.keys(newFilters).forEach(key => {
          newFilters[key] = key === status;
        });
      }
      
      // Update the filter state ref immediately
      filterStateRef.current = {
        ...filterStateRef.current,
        statusFilters: newFilters
      };
      
      return newFilters;
    });
    
    setPage(1);
    setIsFilterUpdating(true);
  }, []);

  const handleFilterChange = useCallback((type, value) => {
    switch (type) {
      case 'categories':
        setFilterCategories(value || []);
        // Update ref immediately
        filterStateRef.current.filterCategories = value || [];
        break;
      case 'origins':
        setFilterOrigins(value || []);
        // Update ref immediately
        filterStateRef.current.filterOrigins = value || [];
        break;
      case 'series':
        setFilterSeries(value || []);
        // Update ref immediately
        filterStateRef.current.filterSeries = value || [];
        break;
    }
    setPage(1);
    setIsFilterUpdating(true);
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    // Update ref immediately
    filterStateRef.current.searchQuery = value;
    setPage(1);
    setIsFilterUpdating(true);
  }, []);

  const handlePinUpdate = useCallback((updatedPin, currentIndex) => {
    // Remove the updated pin from the current view
    setPins(prevPins => {
      // Create a copy of the pins array without the updated pin
      const newPins = prevPins.filter(pin => pin.id !== updatedPin.id);
      
      // If we have a currentIndex, navigate to the next pin in the list
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
      
      return newPins;
    });
    
    // Send update to the server
    updatePinStatus(updatedPin);
  }, [selectedPin]);

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
          isCollected: pin.isCollected,
          isWishlist: pin.isWishlist,
          isDeleted: pin.isDeleted,
          isUnderReview: pin.isUnderReview,
          updatedAt: now.toISOString() // Update the timestamp
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update pin status');
      }
      
      // No need to refresh pins immediately since we've already removed the pin
      // from the view and the modal is closed. This prevents the sorting from resetting.
    } catch (error) {
      console.error('Error updating pin status:', error);
      toast.error('Failed to update pin status');
    }
  };

  const handlePinDelete = useCallback((deletedPinId) => {
    setPins(prevPins => prevPins.filter(pin => pin.id !== deletedPinId));
    setTotal(prev => prev - 1);
  }, []);

  const handleAddPin = useCallback((newPin) => {
    setPins(prevPins => [newPin, ...prevPins]);
    setTotal(prev => prev + 1);
  }, []);

  const handleScrollToTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleYearChange = useCallback((year) => {
    setYearFilters(prev => {
      let newYearFilters;
      // If the year is already in the array, remove it
      if (prev.includes(year)) {
        newYearFilters = prev.filter(y => y !== year);
      } else {
        // Otherwise, add it to the array
        newYearFilters = [...prev, year];
      }
      
      // Update the filter state ref immediately
      filterStateRef.current = {
        ...filterStateRef.current,
        yearFilters: newYearFilters
      };
      
      return newYearFilters;
    });
    
    setPage(1);
    setIsFilterUpdating(true);
  }, []);

  const handleSortChange = useCallback((option) => {
    setSortOption(option);
    
    // Update the filter state ref immediately
    filterStateRef.current = {
      ...filterStateRef.current,
      sortOption: option
    };
    
    setShowSortDropdown(false);
    setPage(1);
    setIsFilterUpdating(true);
  }, []);

  const handlePinNavigation = useCallback((direction, currentPin) => {
    const currentIndex = pins.findIndex(p => p.id === currentPin.id);
    if (currentIndex === -1 || pins.length <= 1) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % pins.length;
    } else {
      newIndex = (currentIndex - 1 + pins.length) % pins.length;
    }
    
    setSelectedPin(pins[newIndex]);
  }, [pins]);

  const handleAddPinClick = useCallback(() => {
    console.log("Add Pin button clicked");
    setShowAddPinModal(true);
  }, []);

  const handleExportClick = useCallback(() => {
    console.log("Export button clicked, showing export modal");
    setShowExportModal(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-800 text-white">
      <HeaderNavigation
        total={total}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onAddPinClick={handleAddPinClick}
        onScrollToTop={handleScrollToTop}
        searchInputRef={searchInputRef}
        onClearAllFilters={handleClearAllFilters}
        statusFilters={statusFilters}
        onStatusClick={handleStatusClick}
        onMoreFiltersClick={() => setShowFilterModal(true)}
      />

      <div className="px-2 sm:px-6 py-4">
        <div className="flex justify-end items-center mb-4">
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
                <span>Sort: {sortOption}</span>
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
          pins={pins}
          onPinClick={setSelectedPin}
          loading={loading}
          contentRef={contentRef}
          onStatusChange={(updatedPin, currentIndex) => handlePinUpdate(updatedPin, currentIndex)}
          lastPinElementRef={lastPinElementRef}
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
          pins={pins}
          currentIndex={pins.findIndex(p => p.id === selectedPin.id)}
          onNavigate={handlePinNavigation}
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
          pins={pins}
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
