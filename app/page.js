'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const PinCatalog = dynamic(() => import('../components/PinCatalog'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading Pin Catalog...</div>
    </div>
  )
});

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900">
      <PinCatalog />
    </main>
  );
}
