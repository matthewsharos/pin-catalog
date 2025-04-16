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
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef(null);

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
      if (statusFilters.collected) params.append('collected', 'true');
      if (statusFilters.uncollected) params.append('uncollected', 'true');
      if (statusFilters.wishlist) params.append('wishlist', 'true');

      const response = await api.get(`/api/pins/options?${params.toString()}`);
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

  // Update available options when any filter changes including status filters
  useEffect(() => {
    updateAvailableOptions();
  }, [filterCategories, filterOrigins, filterSeries, filterIsLimitedEdition, filterIsMystery, statusFilters.collected, statusFilters.uncollected, statusFilters.wishlist]);

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
    // Remove focus from search input after clearing
    if (searchInputRef.current) {
      searchInputRef.current.blur();
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

  const exportPinsAsImage = async () => {
    try {
      setIsExporting(true);
      toast.loading('Generating image...', { id: 'export-toast' });
      
      // Get the first 100 pins or less
      const pinsToExport = pins.slice(0, 100);
      
      if (pinsToExport.length === 0) {
        toast.error('No pins to export');
        setIsExporting(false);
        return;
      }
      
      // Calculate grid dimensions
      const imageWidth = 2500;
      const imageHeight = 3000;
      const pinWidth = 250; // Width of each pin in the grid
      const pinHeight = 300; // Height of each pin in the grid
      const pinsPerRow = Math.floor(imageWidth / pinWidth);
      const rows = Math.ceil(pinsToExport.length / pinsPerRow);
      
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
      
      // Load all images first
      const loadImage = (pin) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          // Determine the image URL based on pin data
          let imageUrl;
          if (pin.imageUrl) {
            // If it's a full URL, use it directly
            if (pin.imageUrl.startsWith('http')) {
              imageUrl = pin.imageUrl;
            } 
            // If it's a relative URL, use it as is
            else if (pin.imageUrl.startsWith('/')) {
              imageUrl = `${window.location.origin}${pin.imageUrl}`;
            } 
            // Otherwise, use the images API endpoint
            else {
              imageUrl = `${window.location.origin}/api/images/${pin.id}`;
            }
          } else {
            // Fallback to placeholder
            imageUrl = `${window.location.origin}/placeholder.png`;
          }
          
          img.onload = () => resolve(img);
          img.onerror = () => {
            console.error('Error loading image:', imageUrl);
            // Load placeholder on error
            const placeholderImg = new Image();
            placeholderImg.crossOrigin = 'anonymous';
            placeholderImg.onload = () => resolve(placeholderImg);
            placeholderImg.onerror = () => {
              // If even the placeholder fails, resolve with a dummy image
              resolve(null);
            };
            placeholderImg.src = `${window.location.origin}/placeholder.png`;
          };
          img.src = imageUrl;
        });
      };
      
      // Load all images in parallel
      toast.loading('Loading pin images...', { id: 'export-toast' });
      const images = await Promise.all(pinsToExport.map(loadImage));
      
      toast.loading('Creating image...', { id: 'export-toast' });
      
      // Draw pins on canvas
      let x = 0;
      let y = 200; // Start below the title
      
      for (let i = 0; i < pinsToExport.length; i++) {
        const pin = pinsToExport[i];
        const img = images[i];
        
        // Calculate position
        if (i > 0 && i % pinsPerRow === 0) {
          x = 0;
          y += pinHeight;
        }
        
        // Draw pin background
        ctx.fillStyle = '#374151'; // Slightly lighter than background
        ctx.fillRect(x, y, pinWidth - 10, pinHeight - 10);
        
        // Draw pin image if available
        if (img) {
          try {
            ctx.drawImage(img, x + 5, y + 5, pinWidth - 20, pinHeight - 70);
          } catch (err) {
            console.error('Error drawing image:', err);
          }
        }
        
        // Draw pin name
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        const pinName = pin.pinName || 'Unnamed Pin';
        // Truncate long names
        const truncatedName = pinName.length > 25 ? pinName.substring(0, 22) + '...' : pinName;
        ctx.fillText(truncatedName, x + (pinWidth - 10) / 2, y + pinHeight - 40);
        
        // Draw pin ID
        ctx.font = '14px Arial';
        ctx.fillStyle = '#cccccc';
        ctx.fillText(pin.pinId || '', x + (pinWidth - 10) / 2, y + pinHeight - 20);
        
        // Add status indicator
        if (pin.isCollected) {
          ctx.fillStyle = '#10B981'; // Green
          ctx.beginPath();
          ctx.arc(x + 15, y + 15, 8, 0, 2 * Math.PI);
          ctx.fill();
        } else if (pin.isWishlist) {
          ctx.fillStyle = '#3B82F6'; // Blue
          ctx.beginPath();
          ctx.arc(x + 15, y + 15, 8, 0, 2 * Math.PI);
          ctx.fill();
        } else if (pin.isDeleted) {
          ctx.fillStyle = '#F59E0B'; // Yellow
          ctx.beginPath();
          ctx.arc(x + 15, y + 15, 8, 0, 2 * Math.PI);
          ctx.fill();
        }
        
        x += pinWidth;
      }
      
      // Add watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '24px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('Generated by Sharos Pin Catalog', imageWidth - 20, imageHeight - 20);
      
      // Convert to image and download
      toast.loading('Downloading image...', { id: 'export-toast' });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `pin-collection-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.dismiss();
      toast.success('Image exported successfully');
    } catch (error) {
      console.error('Error exporting pins:', error);
      toast.dismiss();
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

  // ... rest of your code remains the same ...
