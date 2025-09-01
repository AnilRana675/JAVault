import React, { useState } from 'react';
import LoadingSpinner, { ButtonSpinner, InlineSpinner, PageSpinner } from './LoadingSpinner';

const SpinnerTest = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleTestClick = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 3000);
  };

  return (
    <div className="p-8 space-y-8 bg-dark-950 min-h-screen">
      <h1 className="text-3xl font-bold text-white">Spinner Test</h1>
      
      {/* Test all spinner types */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center p-4">
          <LoadingSpinner size="md" type="default" />
          <p className="text-white mt-2">Default</p>
        </div>
        
        <div className="card text-center p-4">
          <LoadingSpinner size="md" type="dots" />
          <p className="text-white mt-2">Dots</p>
        </div>
        
        <div className="card text-center p-4">
          <LoadingSpinner size="md" type="ring" />
          <p className="text-white mt-2">Ring</p>
        </div>
        
        <div className="card text-center p-4">
          <LoadingSpinner size="md" type="neon" />
          <p className="text-white mt-2">Neon</p>
        </div>
      </div>

      {/* Button test */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4">Button Spinner Test</h2>
        <button 
          onClick={handleTestClick}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? (
            <>
              <ButtonSpinner />
              Loading...
            </>
          ) : (
            'Click to Test'
          )}
        </button>
      </div>

      {/* Inline spinner test */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4">Inline Spinner Test</h2>
        <p className="text-white">
          Processing your request <InlineSpinner /> please wait...
        </p>
      </div>

      {/* Page spinner test */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <PageSpinner text="Testing page spinner..." />
        </div>
      )}
    </div>
  );
};

export default SpinnerTest;
