"use client";

import { useState, useEffect, useRef } from 'react';
import { FaCheck, FaTimes, FaInbox, FaHeart, FaStar, FaPlus, FaCaretDown } from 'react-icons/fa';
import axios from 'axios';

export default function StatusFilters({
  statusFilters,
  onStatusClick,
  onTagSelect
}) {
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Define status filter options in a single array to prevent duplicates
  const statusOptions = [
    { id: 'all', label: 'No Status', icon: <FaInbox className="mr-1 text-xs" />, activeColor: 'bg-blue-600' },
    { id: 'collected', label: 'Collected', icon: <FaCheck className="mr-1 text-xs" />, activeColor: 'bg-green-600' },
    { id: 'uncollected', label: 'Uncollected', icon: <FaTimes className="mr-1 text-xs" />, activeColor: 'bg-yellow-600' },
    { id: 'wishlist', label: 'Wishlist', icon: <FaHeart className="mr-1 text-xs" />, activeColor: 'bg-blue-400' },
    { id: 'underReview', label: 'Review', icon: <FaStar className="mr-1 text-xs" />, activeColor: 'bg-amber-500' }
  ];

  useEffect(() => {
    // Fetch tags when component mounts
    const fetchTags = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/tags');
        // Sort tags alphabetically by name and add "No Tags" option at the top
        const sortedTags = ['No Tags', ...response.data
          .map(tag => tag.name)
          .sort((a, b) => a.localeCompare(b))];
        setTags(sortedTags);
      } catch (error) {
        console.error('Error fetching tags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowTagDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center">
      {statusOptions.map((option, index) => (
        <button
          key={option.id}
          onClick={(e) => onStatusClick(option.id, e)}
          className={`h-7 px-2 text-xs font-medium transition-colors flex items-center justify-center 
            ${index === 0 ? 'rounded-l-md' : 'border-l border-gray-800'} 
            ${statusFilters?.[option.id] 
              ? `${option.activeColor} text-white` 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          data-filter="status"
          data-status={option.id}
          title={option.id === 'wishlist' ? "Hold ⌘/Ctrl or Shift to select multiple statuses" : undefined}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowTagDropdown(!showTagDropdown)}
          className="h-7 w-7 flex items-center justify-center text-xs bg-gray-700 text-white rounded-r-md hover:bg-gray-600 transition-colors border-l border-gray-800"
          title="Filter by Tag"
          data-filter="tag"
        >
          <FaPlus />
        </button>
        {showTagDropdown && (
          <div className="absolute right-0 top-full mt-1 w-48 max-h-64 overflow-y-auto bg-gray-800 rounded-lg shadow-lg z-50">
            {loading ? (
              <div className="p-2 text-center text-gray-400">Loading tags...</div>
            ) : tags.length === 0 ? (
              <div className="p-2 text-center text-gray-400">No tags available</div>
            ) : (
              <div className="py-1">
                {tags.map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onTagSelect(tag);
                      setShowTagDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
