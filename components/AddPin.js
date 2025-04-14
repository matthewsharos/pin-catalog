"use client";

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AddPin() {
  const [pinUrl, setPinUrl] = useState('');
  const [pinData, setPinData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleScrape = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post('/api/pins/scrape', { url: pinUrl });
      setPinData(response.data);
      toast.success('Pin data scraped successfully');
    } catch (error) {
      toast.error('Failed to scrape pin data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await axios.post('/api/pins', pinData);
      toast.success('Pin saved to database');
      setPinData(null);
      setPinUrl('');
    } catch (error) {
      toast.error('Failed to save pin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPinData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h2 className="text-xl font-bold mb-2">Add New Pin</h2>
      <form onSubmit={handleScrape} className="mb-4">
        <div className="flex items-center">
          <input
            type="text"
            value={pinUrl}
            onChange={(e) => setPinUrl(e.target.value)}
            placeholder="Enter Pin and Pop URL (https://pinandpop.com/pins/[pin_id]/...)"
            className="border rounded-l p-2 flex-grow"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-disney-blue text-white p-2 rounded-r disabled:opacity-50"
            disabled={isLoading || !pinUrl}
          >
            {isLoading ? 'Scraping...' : 'Scrape Data'}
          </button>
        </div>
      </form>

      {pinData && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Edit Pin Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pin ID</label>
              <input
                type="text"
                name="pinId"
                value={pinData.pinId || ''}
                readOnly
                className="border rounded p-2 w-full bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                name="pinName"
                value={pinData.pinName || ''}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Image URL</label>
              <input
                type="text"
                name="imageUrl"
                value={pinData.imageUrl || ''}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Series</label>
              <input
                type="text"
                name="series"
                value={pinData.series || ''}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Origin</label>
              <input
                type="text"
                name="origin"
                value={pinData.origin || ''}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Edition</label>
              <input
                type="text"
                name="edition"
                value={pinData.edition || ''}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Release Date</label>
              <input
                type="text"
                name="releaseDate"
                value={pinData.releaseDate || ''}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <input
                type="number"
                name="year"
                value={pinData.year || ''}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rarity</label>
              <input
                type="text"
                name="rarity"
                value={pinData.rarity || ''}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
              <input
                type="text"
                name="tags"
                value={pinData.tags ? pinData.tags.join(', ') : ''}
                onChange={(e) => setPinData(prev => ({ ...prev, tags: e.target.value.split(', ').filter(Boolean) }))}
                className="border rounded p-2 w-full"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setPinData(null)}
              className="bg-gray-300 text-black p-2 rounded mr-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-green-500 text-white p-2 rounded disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save to Database'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
