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
  const [animatingPins, setAnimatingPins] = useState({});
  const [flashingButtons, setFlashingButtons] = useState({});

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
    <div 
      className={`grid gap-4 ${getGridColumnsClass()} auto-rows-max w-full`}
      ref={contentRef}
    >
      {pins && pins.length > 0 ? (
        pins.map((pin, index) => {
          // Skip rendering pins that are being animated out
          if (animatingPins[pin.id]) return null;
          
          // Determine if this is the last element for infinite scrolling
          const isLastElement = index === pins.length - 1;
          const ref = isLastElement ? lastPinElementRef : null;
          
          const imageUrl = pin.imageUrl ? 
            `/api/image-proxy?url=${encodeURIComponent(pin.imageUrl)}${pin.imageRefreshKey ? `&t=${pin.imageRefreshKey}` : ''}` : 
            '/placeholder.png';
          
          return (
            <div
              key={`${pin.id}-${pin.updatedAt || ''}`}
              ref={ref}
              className={`relative bg-gray-800 rounded-lg overflow-hidden shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl cursor-pointer ${
                animatingPins[pin.id] ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
              }`}
              onClick={() => onPinClick(pin, index)}
              style={{ minHeight: '100px' }}
            >
              {/* Pin ID Badge */}
              <div className="absolute top-0 left-0 bg-black bg-opacity-70 text-white text-xs px-2 py-1 z-10 rounded-br-lg">
                {pin.pinId || 'No ID'}
              </div>
              
              {/* Status Indicators */}
              <div className="absolute top-0 right-0 flex flex-row-reverse z-10">
                {pin.isCollected && (
                  <div className="bg-green-600 text-white p-1 rounded-bl-lg">
                    <FaCheck size={16} />
                  </div>
                )}
                {pin.isWishlist && (
                  <div className="bg-red-600 text-white p-1 rounded-bl-lg">
                    <FaHeart size={16} />
                  </div>
                )}
                {pin.isUnderReview && (
                  <div className="bg-yellow-600 text-white p-1 rounded-bl-lg">
                    <FaStar size={16} />
                  </div>
                )}
                {pin.isDeleted && (
                  <div className="bg-gray-600 text-white p-1 rounded-bl-lg">
                    <FaTimes size={16} />
                  </div>
                )}
              </div>
              
              {/* Pin Image */}
              <div className="relative pt-[100%]">
                <img
                  src={imageUrl}
                  alt={pin.name || 'Pin Image'}
                  className="absolute top-0 left-0 w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    console.error(`Error loading image for pin ${pin.id}:`, e);
                    e.target.src = '/placeholder.png';
                  }}
                />
              </div>
              
              {/* Pin Info */}
              <div className="p-2 bg-gray-900 text-white">
                <h3 className="text-sm font-semibold truncate">{pin.name || 'Unnamed Pin'}</h3>
                <div className="flex flex-wrap mt-1 gap-1">
                  {pin.tags && pin.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="text-xs bg-blue-700 px-1 rounded cursor-pointer hover:bg-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (setSelectedTag) setSelectedTag(tag);
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Status Change Buttons */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between bg-black bg-opacity-70 text-white">
                <button 
                  className={`flex-1 p-1 text-xs ${flashingButtons[`${pin.id}-collected`] ? 'bg-green-600' : 'hover:bg-green-700'}`}
                  onClick={(e) => handleStatusChange(e, pin, 'collected')}
                >
                  <FaCheck size={12} className="mx-auto" />
                </button>
                <button 
                  className={`flex-1 p-1 text-xs ${flashingButtons[`${pin.id}-wishlist`] ? 'bg-red-600' : 'hover:bg-red-700'}`}
                  onClick={(e) => handleStatusChange(e, pin, 'wishlist')}
                >
                  <FaHeart size={12} className="mx-auto" />
                </button>
                <button 
                  className={`flex-1 p-1 text-xs ${flashingButtons[`${pin.id}-deleted`] ? 'bg-gray-600' : 'hover:bg-gray-700'}`}
                  onClick={(e) => handleStatusChange(e, pin, 'deleted')}
                >
                  <FaTimes size={12} className="mx-auto" />
                </button>
                <button 
                  className={`flex-1 p-1 text-xs ${flashingButtons[`${pin.id}-underReview`] ? 'bg-yellow-600' : 'hover:bg-yellow-700'}`}
                  onClick={(e) => handleStatusChange(e, pin, 'underReview')}
                >
                  <FaStar size={12} className="mx-auto" />
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="col-span-full flex justify-center items-center py-10 text-gray-400">
          {loading ? 'Loading pins...' : 'No pins found matching your criteria'}
        </div>
      )}
    </div>
  );
}
