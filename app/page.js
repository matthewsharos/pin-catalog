'use client';

import React, { useEffect } from 'react';
import PinCatalog from '../components/PinCatalog';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-white">
          <h1>Something went wrong.</h1>
          <pre className="mt-2 text-red-400">{this.state.error?.toString()}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Home() {
  useEffect(() => {
    console.log('Home page mounted');
  }, []);

  return (
    <main className="min-h-screen bg-gray-900">
      <ErrorBoundary>
        <PinCatalog />
      </ErrorBoundary>
    </main>
  );
}
