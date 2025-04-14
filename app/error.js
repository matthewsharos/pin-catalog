'use client';

import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const copyError = () => {
    const errorText = `Error: ${error.message}\n\nStack: ${error.stack}`;
    navigator.clipboard.writeText(errorText);
    toast.success('Error details copied to clipboard');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
        <h2 className="text-xl font-semibold text-white mb-4">Something went wrong!</h2>
        
        <div className="bg-gray-900 rounded p-4 mb-4">
          <pre className="text-red-400 whitespace-pre-wrap overflow-auto max-h-96">
            {error.message}
            
            {error.stack}
          </pre>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={copyError}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Copy Error
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
