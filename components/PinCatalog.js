"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaSearch, FaEdit, FaTrash, FaCheck, FaQuestionCircle, FaPlus, FaImages, FaCandyCane, FaTags, FaStar, FaTimes, FaInbox, FaChevronDown, FaHeart, FaCalendar, FaSort, FaCamera } from 'react-icons/fa';
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
    all: true,
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
  const [isExporting, setIsExporting] = useState(false);
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

  // State for lazy loading
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedAll, setHasLoadedAll] = useState(false);

  const fetchPins = useCallback(async (loadMore = false) => {
    try {
      if (!loadMore && initialLoad) {
        setLoading(true);
      }
      if (loadMore) {
        setIsLoadingMore(true);
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
      if (statusFilters.all) queryParams.set('all', 'true');
      if (statusFilters.collected) queryParams.set('collected', 'true');
      if (statusFilters.uncollected) queryParams.set('uncollected', 'true');
      if (statusFilters.wishlist) queryParams.set('wishlist', 'true');

      // Sort and pagination
      queryParams.set('sortBy', sortField);
      queryParams.set('sortOrder', sortOrder);
      queryParams.set('page', page.toString());

      console.log('Fetching with params:', queryParams.toString()); // Debug log

      const response = await api.get(`/api/pins?${queryParams.toString()}`);
      const data = response.data;

      if (loadMore) {
        setPins(prevPins => [...prevPins, ...data.pins]);
      } else {
        setPins(data.pins || []);
      }
      setTotal(data.total || 0);
      
      setFilterOptions({
        years: data.filterOptions?.years || [],
        series: data.filterOptions?.series || [],
        origins: data.filterOptions?.origins || [],
        tags: data.filterOptions?.tags || [],
      });
      
      // Check if we've loaded all available pins
      setHasLoadedAll(pins.length >= Math.min(300, data.total));

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
      setIsLoadingMore(false);
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
    initialLoad,
    pins.length
  ]);

  // Fetch pins when filters change
  useEffect(() => {
    fetchPins(false);
  }, [fetchPins]);

  // Add a function to load more pins
  const loadMorePins = useCallback(() => {
    if (!isLoadingMore && !hasLoadedAll && pins.length < 300) {
      setPage(prevPage => prevPage + 1);
      fetchPins(true);
    }
  }, [isLoadingMore, hasLoadedAll, pins.length, fetchPins]);

  // Add scroll event listener for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000 &&
        !isLoadingMore &&
        !hasLoadedAll &&
        pins.length < 300
      ) {
        loadMorePins();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasLoadedAll, pins.length, loadMorePins]);

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
      params.append('isLimitedEdition', filterIsLimitedEdition.toString());
      params.append('isMystery', filterIsMystery.toString());

      // Add status filters
      if (statusFilters.collected) params.append('collected', 'true');
      if (statusFilters.uncollected) params.append('uncollected', 'true');
      if (statusFilters.wishlist) params.append('wishlist', 'true');

      const response = await api.get(`/api/pins/options?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching options:', error);
      // Return default empty options instead of null to prevent errors
      return {
        categories: [],
        origins: [],
        series: []
      };
    }
  };

  // Update available options when filters change
  const updateAvailableOptions = async () => {
    try {
      const categoryOptions = await getAvailableOptions('category');
      const originOptions = await getAvailableOptions('origin');
      const seriesOptions = await getAvailableOptions('series');

      setAvailableCategories(categoryOptions?.categories || []);
      setAvailableOrigins(originOptions?.origins || []);
      setAvailableSeries(seriesOptions?.series || []);
    } catch (error) {
      console.error('Error updating available options:', error);
      // Set empty arrays as fallback
      setAvailableCategories([]);
      setAvailableOrigins([]);
      setAvailableSeries([]);
    }
  };

  // Initialize available options
  useEffect(() => {
    updateAvailableOptions();
  }, []);

  // Update available options when any filter changes including status filters
  useEffect(() => {
    updateAvailableOptions();
  }, [filterCategories, filterOrigins, filterSeries, filterIsLimitedEdition, filterIsMystery, statusFilters.collected, statusFilters.uncollected, statusFilters.wishlist]);

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
      all: true,
      collected: false,
      uncollected: false,
      wishlist: false
    });
    setPage(1);
    // Remove focus from search input after clearing
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const handleStatusClick = (status, e) => {
    e.preventDefault(); // Prevent text selection
    
    setStatusFilters(prev => {
      if (e.metaKey || e.ctrlKey) {
        // Command/Ctrl click - toggle this status only
        const newState = {
          ...prev,
          [status]: !prev[status]
        };
        
        // If all statuses would be deselected, keep this one selected
        if (!newState.all && !newState.collected && !newState.uncollected && !newState.wishlist) {
          return {
            ...newState,
            all: true // Default to All if trying to deselect everything
          };
        }
        
        return newState;
      } else {
        // Normal click - set only this status
        return {
          all: status === 'all',
          collected: status === 'collected',
          uncollected: status === 'uncollected',
          wishlist: status === 'wishlist'
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

  const exportPinsAsImage = async () => {
    try {
      setIsExporting(true);
      toast.loading('Generating image...', { id: 'export-toast' });
      
      // Get up to 300 pins
      const pinsToExport = pins.slice(0, 300);
      
      if (pinsToExport.length === 0) {
        toast.error('No pins to export');
        setIsExporting(false);
        return;
      }
      
      // Calculate grid dimensions
      const imageWidth = 2500;
      const pinWidth = 250; // Width of each pin in the grid
      
      // For selections of 30 pins or less, use 5 pins per row instead of 10
      const pinsPerRow = pinsToExport.length <= 30 ? 5 : Math.floor(imageWidth / pinWidth);
      const adjustedPinWidth = pinsToExport.length <= 30 ? (imageWidth / pinsPerRow) : pinWidth;
      
      // Make the image container square
      const imageContainerSize = Math.min(adjustedPinWidth - 20, adjustedPinWidth - 20);
      
      // Adjust pin height to accommodate square image + text area
      const pinHeight = imageContainerSize + 80; // Square image + 80px for text
      
      const rows = Math.ceil(pinsToExport.length / pinsPerRow);
      
      // Calculate dynamic height: header (200px) + pins + footer (60px)
      const headerHeight = 200; // Space for title and subtitle
      const footerHeight = 60; // Space for filter info
      const imageHeight = headerHeight + (rows * pinHeight) + footerHeight;
      
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d');
      
      // Fill background
      ctx.fillStyle = '#1f2937'; // Dark background
      ctx.fillRect(0, 0, imageWidth, imageHeight);
      
      // Draw title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      const title = `Pin Collection - ${new Date().toLocaleDateString()}`;
      ctx.fillText(title, imageWidth / 2, 80);
      
      // Draw subtitle with search info
      ctx.font = '40px Arial';
      let subtitle = '';
      if (searchQuery) subtitle += `Search: "${searchQuery}" `;
      if (filterYears.length > 0) subtitle += `Years: ${filterYears.join(', ')} `;
      if (filterCategories.length > 0) subtitle += `Categories: ${filterCategories.length} categories `;
      ctx.fillText(subtitle || 'All Pins', imageWidth / 2, 140);
      
      // First, prepare by loading all images
      toast.loading('Loading pin images...', { id: 'export-toast' });
      
      // Create a temporary image cache of all pin images first
      // Create a temporary div to hold images while they load
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);
      
      // Load all images via proxy or direct source
      const loadImagePromises = pinsToExport.map((pin) => {
        return new Promise((resolve) => {
          // Create temporary image element
          const tempImg = document.createElement('img');
          
          // Determine image URL based on pin data
          let imageUrl;
          if (pin.imageUrl) {
            // Use image proxy for external URLs to avoid tainted canvas
            if (pin.imageUrl.startsWith('http')) {
              imageUrl = `/api/proxy-image?url=${encodeURIComponent(pin.imageUrl)}`;
            } else if (pin.imageUrl.startsWith('/')) {
              imageUrl = pin.imageUrl; // Relative URL
            } else {
              imageUrl = `/api/images/${pin.id}`;
            }
          } else {
            imageUrl = '/placeholder.png';
          }
          
          // Set attributes for loading
          tempImg.crossOrigin = 'anonymous';
          tempImg.setAttribute('data-pin-id', pin.id);
          tempImg.style.width = 'auto';
          tempImg.style.height = 'auto';
          tempImg.style.maxWidth = '100%';
          tempImg.style.maxHeight = '100%';
          tempImg.style.objectFit = 'contain';
          
          // Handle load events
          tempImg.onload = () => {
            console.log(`Image loaded for pin ${pin.id}`);
            resolve({ pin, img: tempImg, success: true });
          };
          
          tempImg.onerror = () => {
            console.error(`Failed to load image for pin ${pin.id}`);
            // Create a fallback "pin" placeholder
            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.width = imageContainerSize;
            fallbackCanvas.height = imageContainerSize;
            const fallbackCtx = fallbackCanvas.getContext('2d');
            
            // Draw placeholder background
            fallbackCtx.fillStyle = '#2d3748';
            fallbackCtx.fillRect(0, 0, imageContainerSize, imageContainerSize);
            
            // Draw pin icon
            fallbackCtx.fillStyle = '#4b5563';
            fallbackCtx.beginPath();
            fallbackCtx.arc(5 + (imageContainerSize / 2), 5 + (imageContainerSize / 2), 20, 0, 2 * Math.PI);
            fallbackCtx.fill();
            
            // Create an image from this canvas
            const dataURL = fallbackCanvas.toDataURL();
            tempImg.src = dataURL;
            
            resolve({ pin, img: tempImg, success: false });
          };
          
          // Append to temp div and start loading
          tempDiv.appendChild(tempImg);
          tempImg.src = imageUrl;
        });
      });
      
      // Wait for all images to load or fail
      toast.loading('Preparing images...', { id: 'export-toast' });
      
      const loadedImages = await Promise.all(loadImagePromises);
      
      // Now draw everything to the canvas
      toast.loading('Creating image...', { id: 'export-toast' });
      
      // Draw pins on canvas
      let x = 0;
      let y = 200; // Start below the title
      
      for (let i = 0; i < loadedImages.length; i++) {
        const { pin, img, success } = loadedImages[i];
        
        // Calculate position
        if (i > 0 && i % pinsPerRow === 0) {
          x = 0;
          y += pinHeight;
        }
        
        // Draw pin background
        ctx.fillStyle = '#374151'; // Slightly lighter than background
        ctx.fillRect(x, y, adjustedPinWidth - 10, pinHeight - 10);
        
        // Draw pin image if available
        try {
          // Create a square for the image
          ctx.fillStyle = '#2d3748';
          ctx.fillRect(x + 5, y + 5, imageContainerSize, imageContainerSize);
          
          // Calculate dimensions to maintain aspect ratio
          const imgWidth = img.naturalWidth || img.width;
          const imgHeight = img.naturalHeight || img.height;
          
          if (imgWidth && imgHeight) {
            const containerWidth = imageContainerSize;
            const containerHeight = imageContainerSize;
            
            // Calculate dimensions to fit in container while maintaining aspect ratio
            let drawWidth, drawHeight;
            const imgRatio = imgWidth / imgHeight;
            const containerRatio = containerWidth / containerHeight;
            
            if (imgRatio > containerRatio) {
              // Image is wider than container ratio
              drawWidth = containerWidth;
              drawHeight = containerWidth / imgRatio;
            } else {
              // Image is taller than container ratio
              drawHeight = containerHeight;
              drawWidth = containerHeight * imgRatio;
            }
            
            // Calculate position to center the image
            const drawX = x + 5 + (containerWidth - drawWidth) / 2;
            const drawY = y + 5 + (containerHeight - drawHeight) / 2;
            
            // Draw the image centered in its container
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
          } else {
            // Fallback if dimensions aren't available
            ctx.drawImage(img, x + 5, y + 5, imageContainerSize, imageContainerSize);
          }
        } catch (err) {
          console.error('Error drawing image:', err);
          // Draw fallback if drawing fails
          ctx.fillStyle = '#2d3748';
          ctx.fillRect(x + 5, y + 5, imageContainerSize, imageContainerSize);
          ctx.fillStyle = '#4b5563';
          ctx.beginPath();
          ctx.arc(5 + (imageContainerSize / 2), 5 + (imageContainerSize / 2), 20, 0, 2 * Math.PI);
          ctx.fill();
        }
        
        // Draw pin name
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        const pinName = pin.pinName || 'Unnamed Pin';
        // Truncate long names
        const truncatedName = pinName.length > 25 ? pinName.substring(0, 22) + '...' : pinName;
        ctx.fillText(truncatedName, x + (adjustedPinWidth - 10) / 2, y + pinHeight - 40);
        
        // Draw pin ID
        ctx.font = '14px Arial';
        ctx.fillStyle = '#cccccc';
        ctx.fillText(pin.pinId || '', x + (adjustedPinWidth - 10) / 2, y + pinHeight - 20);
        
        // Add status indicator
        if (pin.isCollected) {
          ctx.fillStyle = '#10B981'; // Green
          ctx.beginPath();
          ctx.arc(x + 15, y + 15, 8, 0, 2 * Math.PI);
          ctx.fill();
        } else if (pin.isDeleted && pin.isWishlist) {
          ctx.fillStyle = '#3B82F6'; // Blue
          ctx.beginPath();
          ctx.arc(x + 15, y + 15, 8, 0, 2 * Math.PI);
          ctx.fill();
        } else if (pin.isDeleted && !pin.isWishlist) {
          ctx.fillStyle = '#F59E0B'; // Yellow
          ctx.beginPath();
          ctx.arc(x + 15, y + 15, 8, 0, 2 * Math.PI);
          ctx.fill();
        }
        
        x += adjustedPinWidth;
      }
      
      // Remove the temporary div
      document.body.removeChild(tempDiv);
      
      // Add watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '24px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('Generated by Sharos Pin Catalog', imageWidth - 20, imageHeight - 20);
      
      // Add filter information at the bottom
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '18px Arial';
      ctx.textAlign = 'left';
      
      // Compile filter information
      let filterInfo = '';
      if (searchQuery) filterInfo += `Search: "${searchQuery}" `;
      if (filterYears.length > 0) filterInfo += `Years: ${filterYears.join(', ')} `;
      if (filterCategories.length > 0) filterInfo += `Categories: ${filterCategories.join(', ')} `;
      if (filterOrigins.length > 0) filterInfo += `Origins: ${filterOrigins.join(', ')} `;
      if (filterSeries.length > 0) filterInfo += `Series: ${filterSeries.join(', ')} `;
      if (filterIsLimitedEdition) filterInfo += 'Limited Edition ';
      if (filterIsMystery) filterInfo += 'Mystery ';
      
      // Add status filters
      let statusFiltersText = [];
      if (statusFilters.collected) statusFiltersText.push('Collected');
      if (statusFilters.uncollected) statusFiltersText.push('Uncollected');
      if (statusFilters.wishlist) statusFiltersText.push('Wishlist');
      if (statusFiltersText.length > 0) filterInfo += `Status: ${statusFiltersText.join(', ')} `;
      
      // Add sort information
      filterInfo += `Sort: ${sortField} ${sortOrder === 'asc' ? '↑' : '↓'} `;
      
      // If filter info is too long, truncate it
      if (filterInfo.length > 150) {
        filterInfo = filterInfo.substring(0, 147) + '...';
      }
      
      // Draw filter info at the bottom
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, imageHeight - 40, imageWidth, 40);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(filterInfo || 'No filters applied', 20, imageHeight - 20);
      
      // Convert to image and download
      toast.loading('Downloading image...', { id: 'export-toast' });
      
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `pin-collection-${new Date().toISOString().split('T')[0]}.png`;
        link.href = dataUrl;
        link.click();
        
        toast.dismiss('export-toast');
        toast.success('Image exported successfully');
      } catch (canvasError) {
        console.error('Canvas export error:', canvasError);
        toast.dismiss('export-toast');
        toast.error('Unable to export canvas due to security restrictions. Try using the browser screenshot feature instead.');
      }
    } catch (error) {
      console.error('Error exporting pins:', error);
      toast.dismiss('export-toast');
      toast.error('Failed to export pins: ' + error.message);
    } finally {
      setIsExporting(false);
    }
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
        <div className="px-2 sm:px-6 py-1.5">
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
        <div className="px-2 sm:px-6 pb-3">
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
                style={{ fontSize: '16px' }}
                inputMode="search"
                autoComplete="off"
              />
              <FaSearch className="absolute left-2.5 top-2 text-gray-400 text-xs" />
              <style jsx>{`
                input::placeholder {
                  font-size: 13px;
                }
              `}</style>
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
                statusFilters.all
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
          {/* Export Button */}
          <button
            onClick={exportPinsAsImage}
            disabled={isExporting}
            title="Export pins as image"
            className={`h-7 w-7 flex items-center justify-center bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FaCamera className="text-xs" />
          </button>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 p-4">
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
                <div className={`grid ${pin.isCollected || pin.isDeleted ? 'grid-cols-2' : 'grid-cols-3'} gap-1 pt-1 border-t border-gray-700`}>
                  {pin.isDeleted ? (
                    pin.isWishlist ? (
                      // WISHLIST pins - show uncollected and collected buttons
                      <>
                        <button
                          onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                          className="px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white flex items-center justify-center"
                          title="Mark as Uncollected"
                        >
                          <FaTimes className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                          className="px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white flex items-center justify-center"
                          title="Mark as Collected"
                        >
                          <FaCheck className="text-sm" />
                        </button>
                      </>
                    ) : (
                      // UNCOLLECTED pins - show collected and wishlist buttons
                      <>
                        <button
                          onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                          className="px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white flex items-center justify-center"
                          title="Mark as Collected"
                        >
                          <FaCheck className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleUpdatePinStatus(pin.id, 'wishlist')}
                          className="px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-blue-700 hover:text-white flex items-center justify-center"
                          title="Add to Wishlist"
                        >
                          <FaHeart className="text-sm" />
                        </button>
                      </>
                    )
                  ) : pin.isCollected ? (
                    // COLLECTED (Owned) pins - show uncollected and wishlist buttons
                    <>
                      <button
                        onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                        className="px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white flex items-center justify-center"
                        title="Mark as Uncollected"
                      >
                        <FaTimes className="text-sm" />
                      </button>
                      <button
                        onClick={() => handleUpdatePinStatus(pin.id, 'wishlist')}
                        className="px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-blue-700 hover:text-white flex items-center justify-center"
                        title="Add to Wishlist"
                      >
                        <FaHeart className="text-sm" />
                      </button>
                    </>
                  ) : (
                    // UNCATEGORIZED pins - show all three buttons
                    <>
                      <button
                        onClick={() => handleUpdatePinStatus(pin.id, 'uncollected')}
                        className="px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-yellow-700 hover:text-white flex items-center justify-center"
                        title="Mark as Uncollected"
                      >
                        <FaTimes className="text-sm" />
                      </button>
                      <button
                        onClick={() => handleUpdatePinStatus(pin.id, 'collected')}
                        className="px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-green-700 hover:text-white flex items-center justify-center"
                        title="Mark as Collected"
                      >
                        <FaCheck className="text-sm" />
                      </button>
                      <button
                        onClick={() => handleUpdatePinStatus(pin.id, 'wishlist')}
                        className="px-2 py-1 rounded bg-gray-700 text-gray-400 hover:bg-blue-700 hover:text-white flex items-center justify-center"
                        title="Add to Wishlist"
                      >
                        <FaHeart className="text-sm" />
                      </button>
                    </>
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
            // Refresh the pins list after status change
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
