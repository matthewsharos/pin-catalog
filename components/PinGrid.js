"use client";

import { FaTimes, FaHeart, FaStar } from 'react-icons/fa';
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
  const [animatingPins, setAnimatingPins] = useState({});
  const [flashingButtons, setFlashingButtons] = useState({});
  const [imageStates, setImageStates] = useState({});

  useEffect(() => {
    console.log('PinGrid received pins:', { 
      pinsLength: pins?.length,
      firstPin: pins?.[0],
      loading
    });
  }, [pins, loading]);

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

  // Function to handle image loading states
  const handleImageLoad = (pinId) => {
    setImageStates(prev => ({
      ...prev,
      [pinId]: { loading: false, error: false }
    }));
  };

  const handleImageError = (pinId) => {
    setImageStates(prev => ({
      ...prev,
      [pinId]: { loading: false, error: true }
    }));
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

  // Create a base64 placeholder SVG
  const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMxRjI5MzciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzRCNTU2MyIgZm9udC1mYW1pbHk9InN5c3RlbS11aSwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';

  return (
    <div ref={contentRef} className={`grid ${getGridColumnsClass()} gap-4 px-2 md:px-4 lg:px-6`}>
      {pins && pins.length > 0 ? (
        pins.map((pin, index) => {
          // Skip rendering pins that are being animated out
          if (animatingPins[pin.id]) return null;
          
          // Determine if this is the last element for infinite scrolling
          const isLastElement = index === pins.length - 1;
          const ref = isLastElement ? lastPinElementRef : null;
          
          return (
            <div
              key={`${pin.id}-${pin.pinId}-${index}`}
              ref={ref}
              className={`relative bg-gray-900 rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 ${
                animatingPins[pin.id] ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 hover:scale-105 md:hover:shadow-xl'
              }`}
            >
              {/* Status Indicator */}
              <div className="absolute top-2 left-2 z-10">
                {pin.isCollected && (
                  <div className="bg-green-600 text-white p-1 rounded-full w-3 h-3"></div>
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
                className="aspect-square bg-gray-800 cursor-pointer p-1 md:p-2 relative"
                onClick={() => onPinClick(pin, index)}
              >
                {pin.imageUrl ? (
                  <>
                    <img
                      src={pin.imageUrl.startsWith('data:') ? pin.imageUrl : `/api/image-proxy?url=${encodeURIComponent(pin.imageUrl)}${pin.imageRefreshKey ? `&t=${pin.imageRefreshKey}` : ''}`}
                      alt={pin.pinName || 'Pin image'}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        imageStates[pin.id]?.loading === false && !imageStates[pin.id]?.error ? 'opacity-100' : 'opacity-0'
                      }`}
                      loading="lazy"
                      onLoad={() => handleImageLoad(pin.id)}
                      onError={() => handleImageError(pin.id)}
                    />
                    {(!imageStates[pin.id] || imageStates[pin.id]?.loading) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-pulse bg-gray-700 w-full h-full"></div>
                      </div>
                    )}
                    {imageStates[pin.id]?.error && (
                      <img
                        src={placeholderSvg}
                        alt="No image available"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <span className="text-gray-600">No Image</span>
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
                  <div className="bg-green-600 w-3 h-3 mx-auto rounded-full"></div>
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
          );
        })
      ) : (
        <div className="col-span-full flex justify-center items-center py-10 text-gray-400">
          {loading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          ) : (
            'No pins found matching your criteria'
          )}
        </div>
      )}
    </div>
  );
}
