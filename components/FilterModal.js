"use client";

import { useState } from 'react';
import { FaTimes, FaChevronDown } from 'react-icons/fa';

export default function FilterModal({
  isOpen,
  onClose,
  availableCategories,
  availableOrigins,
  availableSeries,
  filterCategories,
  filterOrigins,
  filterSeries,
  filterIsLimitedEdition,
  filterIsMystery,
  onFilterChange,
  onLimitedEditionChange,
  onMysteryChange
}) {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showSeriesDropdown, setShowSeriesDropdown] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="text-xl font-medium text-white">Filters</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Categories Dropdown */}
          <div>
            <label className="block text-base text-white mb-2">
              Category
            </label>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 focus:outline-none flex items-center justify-between"
            >
              <span>
                {filterCategories.length > 0 
                  ? filterCategories[0]
                  : 'All Categories'}
              </span>
              <FaChevronDown className={`transform transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showCategoryDropdown && (
              <div className="mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    onFilterChange('category', []);
                    setShowCategoryDropdown(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm text-white hover:bg-gray-700 rounded"
                >
                  All Categories
                </button>
                <div className="border-t border-gray-700 my-1"></div>
                {availableCategories.length > 0 ? (
                  availableCategories.map(category => (
                    <button
                      key={category}
                      onClick={() => {
                        onFilterChange('category', [category]);
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-700 rounded ${
                        filterCategories[0] === category ? 'text-blue-400' : 'text-white'
                      }`}
                    >
                      {category}
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-gray-400 px-2 py-1.5">No categories available</div>
                )}
              </div>
            )}
          </div>

          {/* Origins Dropdown */}
          <div>
            <label className="block text-base text-white mb-2">
              Origin
            </label>
            <button
              onClick={() => setShowOriginDropdown(!showOriginDropdown)}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 focus:outline-none flex items-center justify-between"
            >
              <span>
                {filterOrigins.length > 0 
                  ? filterOrigins[0]
                  : 'All Origins'}
              </span>
              <FaChevronDown className={`transform transition-transform ${showOriginDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showOriginDropdown && (
              <div className="mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    onFilterChange('origin', []);
                    setShowOriginDropdown(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm text-white hover:bg-gray-700 rounded"
                >
                  All Origins
                </button>
                <div className="border-t border-gray-700 my-1"></div>
                {availableOrigins.length > 0 ? (
                  availableOrigins.map(origin => (
                    <button
                      key={origin}
                      onClick={() => {
                        onFilterChange('origin', [origin]);
                        setShowOriginDropdown(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-700 rounded ${
                        filterOrigins[0] === origin ? 'text-blue-400' : 'text-white'
                      }`}
                    >
                      {origin}
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-gray-400 px-2 py-1.5">No origins available</div>
                )}
              </div>
            )}
          </div>

          {/* Series Dropdown */}
          <div>
            <label className="block text-base text-white mb-2">
              Series
            </label>
            <button
              onClick={() => setShowSeriesDropdown(!showSeriesDropdown)}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 focus:outline-none flex items-center justify-between"
            >
              <span>
                {filterSeries.length > 0 
                  ? filterSeries[0]
                  : 'All Series'}
              </span>
              <FaChevronDown className={`transform transition-transform ${showSeriesDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showSeriesDropdown && (
              <div className="mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    onFilterChange('series', []);
                    setShowSeriesDropdown(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm text-white hover:bg-gray-700 rounded"
                >
                  All Series
                </button>
                <div className="border-t border-gray-700 my-1"></div>
                {availableSeries.length > 0 ? (
                  availableSeries.map(series => (
                    <button
                      key={series}
                      onClick={() => {
                        onFilterChange('series', [series]);
                        setShowSeriesDropdown(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-700 rounded ${
                        filterSeries[0] === series ? 'text-blue-400' : 'text-white'
                      }`}
                    >
                      {series}
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-gray-400 px-2 py-1.5">No series available</div>
                )}
              </div>
            )}
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="limited-edition"
                checked={filterIsLimitedEdition}
                onChange={() => onLimitedEditionChange(!filterIsLimitedEdition)}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="limited-edition" className="text-sm text-white cursor-pointer">
                Limited Edition Only
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="mystery"
                checked={filterIsMystery}
                onChange={() => onMysteryChange(!filterIsMystery)}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="mystery" className="text-sm text-white cursor-pointer">
                Mystery Pins Only
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-800 flex justify-between">
          <button
            onClick={() => {
              // Call the parent's clear filters function
              onFilterChange('categories', []);
              onFilterChange('origins', []);
              onFilterChange('series', []);
              onLimitedEditionChange(false);
              onMysteryChange(false);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none"
          >
            Reset Filters
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
