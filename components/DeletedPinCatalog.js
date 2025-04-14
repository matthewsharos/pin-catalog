"use client";

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import axios from 'axios';
import { FaSort, FaFilter, FaHeart, FaTrash, FaSearch, FaImages, FaEdit } from 'react-icons/fa';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';
import EditPin from './EditPin';

const fetcher = async (url) => {
  const res = await axios.get(url);
  return res.data;
};

export default function DeletedPinCatalog() {
  const [selectedPins, setSelectedPins] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterCollected, setFilterCollected] = useState('all');
  const [page, setPage] = useState(1);
  const [editingPinId, setEditingPinId] = useState(null);

  const { data, error, mutate } = useSWR(
    `/api/pins?page=${page}&sortField=${sortField}&sortOrder=${sortOrder}&search=${debouncedSearch}&filterCollected=${filterCollected}&showDeleted=true`,
    fetcher
  );

  // Debounce the search term updates
  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300),
    []
  );

  // Update search term immediately in UI but debounce the actual search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSetSearch(value);
  };

  useEffect(() => {
    setSelectedPins([]);
  }, [page, debouncedSearch, sortField, sortOrder, filterCollected]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [debouncedSetSearch]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleCheckboxChange = (pinId) => {
    setSelectedPins(prev => 
      prev.includes(pinId) 
        ? prev.filter(id => id !== pinId) 
        : [...prev, pinId]
    );
  };

  const handleMarkWishlist = async () => {
    try {
      await axios.post('/api/pins/bulk-wishlist', { pinIds: selectedPins });
      mutate();
      setSelectedPins([]);
      toast.success('Pins added to wishlist');
    } catch (error) {
      toast.error('Failed to add pins to wishlist');
    }
  };

  const handleGenerateCollage = () => {
    window.open(`/api/collage?search=${encodeURIComponent(searchTerm)}&showDeleted=true`, '_blank');
  };

  const handleEditPin = (pinId) => {
    setEditingPinId(pinId);
  };

  const handleCloseEdit = () => {
    setEditingPinId(null);
    mutate(); // Refresh data after editing
  };

  if (error) {
    return <div className="text-red-500">Error loading pins: {error.message}</div>;
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <div className="text-center p-4 bg-white rounded-lg shadow-md">No deleted pins found.</div>;
  }

  const pins = Array.isArray(data) ? data : data.pins || [];
  const total = data.total || pins.length;

  if (pins.length === 0) {
    return <div className="text-center p-4 bg-white rounded-lg shadow-md">No deleted pins found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-md">
        <div className="flex-1 min-w-[200px] max-w-xl">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search deleted pins by name or series..."
              className="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>
        <div className="flex gap-2">
          {selectedPins.length > 0 && (
            <button
              onClick={handleMarkWishlist}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
            >
              <FaHeart /> Add to Wishlist ({selectedPins.length})
            </button>
          )}
          <button
            onClick={handleGenerateCollage}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            <FaImages /> Generate Collage
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="p-2 w-10">
                  <input
                    type="checkbox"
                    checked={selectedPins.length > 0 && selectedPins.length === pins.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPins(pins.map(pin => pin.id));
                      } else {
                        setSelectedPins([]);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th scope="col" className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Image
                </th>
                <th scope="col" className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-500" onClick={() => handleSort('id')}>
                  ID {sortField === 'id' && <FaSort className={`inline ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                </th>
                <th scope="col" className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-500" onClick={() => handleSort('pinName')}>
                  Name {sortField === 'pinName' && <FaSort className={`inline ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                </th>
                <th scope="col" className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-500" onClick={() => handleSort('series')}>
                  Series {sortField === 'series' && <FaSort className={`inline ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                </th>
                <th scope="col" className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-500" onClick={() => handleSort('origin')}>
                  Origin {sortField === 'origin' && <FaSort className={`inline ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                </th>
                <th scope="col" className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-500" onClick={() => handleSort('releaseDate')}>
                  Release Date {sortField === 'releaseDate' && <FaSort className={`inline ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                </th>
                <th scope="col" className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th scope="col" className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pins.map((pin) => (
                <tr key={pin.id} className="hover:bg-gray-50">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedPins.includes(pin.id)}
                      onChange={() => handleCheckboxChange(pin.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-2">
                    {pin.imageUrl && (
                      <img
                        src={pin.imageUrl}
                        alt={pin.pinName}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                  </td>
                  <td className="p-2 whitespace-nowrap">{pin.id}</td>
                  <td className="p-2">{pin.pinName}</td>
                  <td className="p-2">{pin.series}</td>
                  <td className="p-2">{pin.origin}</td>
                  <td className="p-2 whitespace-nowrap">
                    {pin.releaseDate ? new Date(pin.releaseDate).toISOString().split('T')[0] : 'Unknown'}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {pin.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => handleEditPin(pin.id)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      <FaEdit />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div>
          Showing {pins.length} of {total} pins
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={pins.length < 20}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
      </div>
      {editingPinId && (
        <EditPin pinId={editingPinId} onClose={handleCloseEdit} />
      )}
    </div>
  );
}
