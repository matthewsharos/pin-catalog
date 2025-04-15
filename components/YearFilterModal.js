import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FaTimes } from 'react-icons/fa';

export default function YearFilterModal({ isOpen, onClose, years, selectedYears, onYearsChange }) {
  const toggleYear = (year) => {
    const newYears = selectedYears.includes(year)
      ? selectedYears.filter(y => y !== year)
      : [...selectedYears, year];
    onYearsChange(newYears);
  };

  const clearYears = () => {
    onYearsChange([]);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gray-800 p-6 shadow-xl transition-all">
                <Dialog.Title className="text-lg font-medium text-white mb-4 flex justify-between items-center">
                  Filter by Year
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </Dialog.Title>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {years.map((year) => (
                    <button
                      key={year}
                      onClick={() => toggleYear(year)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedYears.includes(year)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={clearYears}
                    className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
