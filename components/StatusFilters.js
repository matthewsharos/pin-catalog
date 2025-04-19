"use client";

import { FaCheck, FaTimes, FaInbox, FaHeart, FaStar, FaPlus } from 'react-icons/fa';

export default function StatusFilters({
  statusFilters,
  onStatusClick,
  onMoreFiltersClick
}) {
  return (
    <div className="flex items-center">
      <button
        onClick={(e) => onStatusClick('all', e)}
        className={`h-7 px-2 text-xs font-medium transition-colors flex items-center justify-center rounded-l-md ${
          statusFilters.all
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        data-filter="status"
        data-status="all"
      >
        <FaInbox className="mr-1 text-xs" />
        All
      </button>
      <button
        onClick={(e) => onStatusClick('collected', e)}
        className={`h-7 px-2 text-xs font-medium transition-colors flex items-center justify-center border-l border-gray-800 ${
          statusFilters.collected
            ? 'bg-green-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        data-filter="status"
        data-status="collected"
      >
        <FaCheck className="mr-1 text-xs" />
        Owned
      </button>
      <button
        onClick={(e) => onStatusClick('uncollected', e)}
        className={`h-7 px-2 text-xs font-medium transition-colors flex items-center justify-center border-l border-gray-800 ${
          statusFilters.uncollected
            ? 'bg-yellow-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        data-filter="status"
        data-status="uncollected"
      >
        <FaTimes className="mr-1 text-xs" />
        Uncollected
      </button>
      <button
        onClick={(e) => onStatusClick('wishlist', e)}
        className={`h-7 px-2 text-xs font-medium transition-colors flex items-center justify-center border-l border-gray-800 ${
          statusFilters.wishlist
            ? 'bg-blue-400 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        title="Hold ⌘/Ctrl or Shift to select multiple statuses"
        data-filter="status"
        data-status="wishlist"
      >
        <FaHeart className="mr-1 text-xs" />
        Wishlist
      </button>
      <button
        onClick={(e) => onStatusClick('underReview', e)}
        className={`h-7 px-2 text-xs font-medium transition-colors flex items-center justify-center border-l border-gray-800 ${
          statusFilters.underReview
            ? 'bg-amber-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        data-filter="status"
        data-status="underReview"
      >
        <FaStar className="mr-1 text-xs" />
        Review
      </button>
      <button
        onClick={onMoreFiltersClick}
        className="h-7 w-7 flex items-center justify-center text-xs bg-gray-700 text-white rounded-r-md hover:bg-gray-600 transition-colors border-l border-gray-800"
        title="More Filters"
        data-filter="more"
      >
        <FaPlus />
      </button>
    </div>
  );
}
