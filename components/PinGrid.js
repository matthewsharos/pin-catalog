"use client";

import { FaCheck, FaTimes, FaHeart, FaStar } from 'react-icons/fa';
import { useState } from 'react';

export default function PinGrid({
  pins,
  onPinClick,
  loading,
  contentRef,
  onStatusChange,
  lastPinElementRef
}) {
  const [animatingPins, setAnimatingPins] = useState({});
  const [flashingButtons, setFlashingButtons] = useState({});

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
    
    // If the status was already active, we're toggling it off (all flags remain false)
    // Otherwise, set the appropriate flag based on the clicked status
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
      onStatusChange(updatedPin, currentIndex);
      setAnimatingPins(prev => ({
        ...prev,
        [pin.id]: false
      }));
    }, 300);
  };

  return (
    <div ref={contentRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-2 md:px-4 lg:px-6">
      {pins.map((pin, index) => (
        <div
          key={pin.id}
          ref={index === pins.length - 1 ? lastPinElementRef : null}
          className={`relative bg-gray-900 rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 md:hover:shadow-xl ${
            animatingPins[pin.id] ? 'opacity-0 scale-95' : 'opacity-100'
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
                src={pin.imageUrl}
                alt={pin.pinName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
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
