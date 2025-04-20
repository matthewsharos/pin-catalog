"use client";

import { FaTags, FaPlus, FaSearch } from 'react-icons/fa';
import Link from 'next/link';
import { Dancing_Script } from 'next/font/google';
import StatusFilters from './StatusFilters';

const dancingScript = Dancing_Script({ subsets: ['latin'] });

export default function HeaderNavigation({
  total,
  searchQuery,
  onSearchChange,
  onAddPinClick,
  onScrollToTop,
  searchInputRef,
  onClearAllFilters,
  statusFilters,
  onStatusClick,
  onMoreFiltersClick,
  onTagSelect
}) {
  return (
    <div className="sticky top-0 z-50 bg-gray-900 shadow-lg">
      {/* Row 1: Logo, Title, Pin Count, Action Buttons */}
      <div className="px-2 md:px-4 lg:px-6 py-1.5">
        <div className="flex items-center justify-between">
          {/* Header */}
          <div className="flex items-center">
            <div className="flex items-center">
              <button onClick={onScrollToTop} className="flex items-center">
                <img src="/icon.png" alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16" />
                <h1 className={`text-2xl sm:text-3xl font-medium text-white ${dancingScript.className}`}>
                  <span className="hidden sm:inline">Sharos Pin </span>
                  <span className="sm:hidden">Sharos </span>
                  <span>Catalog</span>
                </h1>
              </button>
              <div className="text-gray-400 text-sm ml-3">
                {total ? total.toLocaleString() : '0'} pins
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
              onClick={onAddPinClick}
              className="flex items-center space-x-1 h-7 px-2 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              title="Add Pin"
            >
              <FaPlus />
              <span>Pin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Search Bar */}
      <div className="px-2 md:px-4 lg:px-6 py-1.5 border-t border-gray-800">
        <div className="relative flex">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search pins..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 text-sm bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={onClearAllFilters}
            className="ml-2 px-2.5 py-1.5 bg-gray-700 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
      
      {/* Row 3: Status Filters */}
      <div className="px-2 md:px-4 lg:px-6 py-2 border-t border-gray-800">
        <StatusFilters
          statusFilters={statusFilters}
          onStatusClick={onStatusClick}
          onMoreFiltersClick={onMoreFiltersClick}
          onTagSelect={onTagSelect}
        />
      </div>
    </div>
  );
}
