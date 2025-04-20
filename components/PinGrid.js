"use client";

import { FaCheck, FaTimes, FaHeart, FaStar } from 'react-icons/fa';
import { useState, useEffect } from 'react';

export default function PinGrid({
  pins,
  onPinClick,
  loading,
  contentRef,
  onStatusChange,
  lastPinElementRef,
  zoomLevel = 3, // Default to 3 which is the current layout
  setSelectedTag // Add this prop to handle tag selection
}) {
  const [imageErrors, setImageErrors] = useState({});
  const [animatingPins, setAnimatingPins] = useState({});
  const [flashingButtons, setFlashingButtons] = useState({});

  useEffect(() => {
    console.log('PinGrid received pins:', { 
      pinsLength: pins?.length,
      firstPin: pins?.[0],
      loading
    });
  }, [pins, loading]);

  // Reset image errors when pins change
  useEffect(() => {
    setImageErrors({});
  }, [pins]);

  // Function to get grid columns class based on zoom level
  const getGridColumnsClass = () => {
    switch (zoomLevel) {
      case 1: // Minimum zoom - fewer pins per row
        return "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      case 2:
        return "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
      case 3: // Default - current layout
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
      case 4:
        return "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7";
      case 5:
        return "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8";
      case 6: // Maximum zoom - more pins per row
        return "grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10";
      default:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
    }
  };

  const handleStatusChange = (e, pin, status) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent any default behavior
    
    const updatedPin = { ...pin };
    
    // Check if the clicked status is already active
    const isActive = 
      (status === 'collected' && pin.isCollected) ||
      (status === 'wishlist' && pin.isWishlist) ||
      (status === 'uncollected' && pin.isDeleted) ||
      (status === 'underReview' && pin.isUnderReview);
    
    // Reset all status flags first
    updatedPin.isCollected = false;
    updatedPin.isWishlist = false;
    updatedPin.isDeleted = false;
    updatedPin.isUnderReview = false;
    
    // If the status was not already active, set the appropriate flag
    if (!isActive) {
      if (status === 'collected') {
        updatedPin.isCollected = true;
      } else if (status === 'wishlist') {
        updatedPin.isWishlist = true;
      } else if (status === 'uncollected') {
        updatedPin.isDeleted = true;
      } else if (status === 'underReview') {
        updatedPin.isUnderReview = true;
      }
    }
    
    // Set flashing state for the button
    setFlashingButtons(prev => ({
      ...prev,
      [`${pin.id}-${status}`]: true
    }));
    
    // Clear flashing state after animation completes
    setTimeout(() => {
      setFlashingButtons(prev => ({
        ...prev,
        [`${pin.id}-${status}`]: false
      }));
    }, 500);
    
    // Set animating state for the pin card
    setAnimatingPins(prev => ({
      ...prev,
      [pin.id]: true
    }));
    
    // Find the current index of the pin
    const currentIndex = pins.findIndex(p => p.id === pin.id);
    
    // Apply the update after animation completes
    setTimeout(() => {
      if (typeof onStatusChange === 'function') {
        onStatusChange(updatedPin, currentIndex);
      }
    }, 300); // Keep this at 300ms to match the animation duration
  };

  return (
    <div ref={contentRef} className={`grid ${getGridColumnsClass()} gap-4 px-2 md:px-4 lg:px-6`}>
      {pins.map((pin, index) => (
        <div
          key={`${pin.id}-${pin.pinId}-${index}`}
          ref={index === pins.length - 1 ? lastPinElementRef : null}
          className={`relative bg-gray-900 rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 ${
            animatingPins[pin.id] ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 hover:scale-105 md:hover:shadow-xl'
          }`}
        >
          {/* Status Indicator */}
          <div className="absolute top-2 left-2 z-10">
            {pin.isCollected && (
              <div className="bg-green-600 text-white p-1 rounded-full">
                <FaCheck size={12} />
              </div>
            )}
            {!pin.isCollected && pin.isWishlist && (
              <div className="bg-blue-400 text-white p-1 rounded-full">
                <FaHeart size={12} />
              </div>
            )}
            {!pin.isCollected && !pin.isWishlist && pin.isDeleted && (
              <div className="bg-yellow-600 text-white p-1 rounded-full">
                <FaTimes size={12} />
              </div>
            )}
            {pin.isUnderReview && !pin.isCollected && !pin.isWishlist && !pin.isDeleted && (
              <div className="bg-amber-500 text-white p-1 rounded-full">
                <FaStar size={12} />
              </div>
            )}
          </div>

          {/* Pin ID Tag */}
          <div className="absolute top-2 right-2 z-10 bg-gray-800 bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
            {pin.pinId || 'No ID'}
          </div>

          {/* Pin Image */}
          <div 
            className="aspect-square bg-gray-800 cursor-pointer p-1 md:p-2"
            onClick={() => onPinClick(pin)}
          >
            {pin.imageUrl ? (
              <img
                src={`${pin.imageUrl}${pin.imageUrl.includes('?') ? '&' : '?'}cache=${new Date().getTime()}`}
                alt={pin.pinName}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // If this is the first error for this image, try reloading it
                  if (!imageErrors[pin.id]) {
                    console.log(`Retrying image load for pin ${pin.id}`);
                    setImageErrors(prev => ({
                      ...prev,
                      [pin.id]: true
                    }));
                    
                    // Add a slight delay before retrying
                    setTimeout(() => {
                      e.target.src = `${pin.imageUrl}${pin.imageUrl.includes('?') ? '&' : '?'}cache=${new Date().getTime()}`;
                    }, 500);
                  } else {
                    // If we've already tried once, show the fallback
                    e.target.style.display = 'none';
                    e.target.onerror = null;
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <span className="text-gray-600">No Image</span>
              </div>
            )}
            {/* Fallback for images that fail to load even after retry */}
            {imageErrors[pin.id] && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <span className="text-gray-600">Image Error</span>
              </div>
            )}
          </div>

          {/* Pin Info */}
          <div className="p-3">
            <h3 className="text-sm font-medium text-white truncate">
              {pin.pinName || 'Unnamed Pin'}
            </h3>
            {pin.series && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {pin.series}
              </p>
            )}
            
            {/* Display tags if available */}
            {pin.tags && pin.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {pin.tags.slice(0, 2).map((tag, index) => (
                  <span 
                    key={index} 
                    className="bg-purple-900 text-white text-xs px-1.5 py-0.5 rounded-full cursor-pointer hover:bg-purple-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening the pin modal
                      if (typeof setSelectedTag === 'function') {
                        setSelectedTag(tag);
                      }
                    }}
                    title={`Filter by tag: ${tag}`}
                  >
                    {tag.length > 10 ? `${tag.substring(0, 8)}...` : tag}
                  </span>
                ))}
                {pin.tags.length > 2 && (
                  <span className="text-xs text-gray-500">+{pin.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>

          {/* Status Action Buttons */}
          <div className="flex border-t border-gray-800">
            <button
              onClick={(e) => handleStatusChange(e, pin, 'collected')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                pin.isCollected ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${flashingButtons[`${pin.id}-collected`] ? 'animate-pulse-green' : ''}`}
              title="Mark as Collected"
            >
              <FaCheck className="mx-auto" />
            </button>
            <button
              onClick={(e) => handleStatusChange(e, pin, 'wishlist')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                pin.isWishlist ? 'bg-blue-400 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${flashingButtons[`${pin.id}-wishlist`] ? 'animate-pulse-blue' : ''}`}
              title="Add to Wishlist"
            >
              <FaHeart className="mx-auto" />
            </button>
            <button
              onClick={(e) => handleStatusChange(e, pin, 'uncollected')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                pin.isDeleted ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${flashingButtons[`${pin.id}-uncollected`] ? 'animate-pulse-yellow' : ''}`}
              title="Mark as Uncollected"
            >
              <FaTimes className="mx-auto" />
            </button>
            <button
              onClick={(e) => handleStatusChange(e, pin, 'underReview')}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                pin.isUnderReview ? 'bg-amber-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${flashingButtons[`${pin.id}-underReview`] ? 'animate-pulse-amber' : ''}`}
              title="Mark for Review"
            >
              <FaStar className="mx-auto" />
            </button>
          </div>
        </div>
      ))}

      {/* Loading State */}
      {loading && (
        <div className="col-span-full flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}
    </div>
  );
}
