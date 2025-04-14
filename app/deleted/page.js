'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import axios from 'axios';
import { FaTrashRestore, FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';

const fetcher = async (url) => {
  const res = await axios.get(url);
  return res.data;
};

export default function DeletedPins() {
  const [selectedPins, setSelectedPins] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const { data, error, mutate } = useSWR(
    `/api/pins/deleted${searchTerm ? `?search=${searchTerm}` : ''}`,
    fetcher
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleRestore = async (pinId) => {
    try {
      await axios.post(`/api/pins/restore`, { pinIds: [pinId] });
      mutate();
      toast.success('Pin restored successfully');
    } catch (error) {
      console.error('Error restoring pin:', error);
      toast.error('Failed to restore pin');
    }
  };

  const handleCheckboxChange = (pinId) => {
    setSelectedPins(prev => 
      prev.includes(pinId) 
        ? prev.filter(id => id !== pinId) 
        : [...prev, pinId]
    );
  };

  const handleRestoreSelected = async () => {
    try {
      await axios.post('/api/pins/restore', { pinIds: selectedPins });
      mutate();
      setSelectedPins([]);
      toast.success('Pins restored successfully');
    } catch (error) {
      console.error('Error restoring pins:', error);
      toast.error('Failed to restore pins');
    }
  };

  if (error) {
    return <div className="text-red-500">Error loading deleted pins: {error.message}</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const pins = data.pins || [];

  return (
    <main className="min-h-screen bg-gray-900">
      <div className="container mx-auto p-4">
        <div className="mb-4 flex flex-wrap gap-4 items-center justify-between bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-md">
          <div className="flex-1 min-w-[200px] max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search deleted pins..."
                className="w-full p-2 pl-10 bg-gray-700 border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              />
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
          <div className="flex gap-2">
            {selectedPins.length > 0 && (
              <button
                onClick={handleRestoreSelected}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaTrashRestore /> Restore Selected ({selectedPins.length})
              </button>
            )}
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Catalog
            </button>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
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
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                  </th>
                  <th scope="col" className="p-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-20">
                    Image
                  </th>
                  <th scope="col" className="p-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="p-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="p-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Series
                  </th>
                  <th scope="col" className="p-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Origin
                  </th>
                  <th scope="col" className="p-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Release Date
                  </th>
                  <th scope="col" className="p-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {pins.map((pin) => (
                  <tr key={pin.id} className="hover:bg-gray-700 transition-colors">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedPins.includes(pin.id)}
                        onChange={() => handleCheckboxChange(pin.id)}
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      {pin.imageUrl && (
                        <img
                          src={pin.imageUrl}
                          alt={pin.pinName}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-700"
                        />
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap text-gray-300">{pin.id}</td>
                    <td className="p-2 text-gray-300">{pin.pinName}</td>
                    <td className="p-2 text-gray-300">{pin.series}</td>
                    <td className="p-2 text-gray-300">{pin.origin}</td>
                    <td className="p-2 whitespace-nowrap text-gray-300">
                      {pin.releaseDate ? new Date(pin.releaseDate).toISOString().split('T')[0] : 'Unknown'}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => handleRestore(pin.id)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="Restore pin"
                      >
                        <FaTrashRestore />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-gray-300">
          Found {pins.length} deleted pin{pins.length !== 1 ? 's' : ''}
        </div>
      </div>
    </main>
  );
}
