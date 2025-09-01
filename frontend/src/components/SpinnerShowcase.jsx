import React from 'react';
import LoadingSpinner, { 
  ButtonSpinner, 
  PageSpinner, 
  CardSpinner, 
  InlineSpinner, 
  FullScreenSpinner 
} from './LoadingSpinner';

const SpinnerShowcase = () => {
  const [showFullScreen, setShowFullScreen] = React.useState(false);

  return (
    <div className="p-8 space-y-12 bg-dark-950 min-h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gradient">Loading Spinner Showcase</h1>
        <p className="text-gray-400">Modern, animated loading spinners for your application</p>
      </div>

      {/* Spinner Types */}
      <div className="space-y-8">
        <h2 className="text-2xl font-semibold text-white mb-6">Spinner Types</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {[
            { type: 'default', name: 'Default' },
            { type: 'dots', name: 'Dots' },
            { type: 'pulse', name: 'Pulse' },
            { type: 'ring', name: 'Ring' },
            { type: 'gradient', name: 'Gradient' },
            { type: 'neon', name: 'Neon' },
            { type: 'orbit', name: 'Orbit' },
          ].map(({ type, name }) => (
            <div key={type} className="card text-center space-y-4">
              <LoadingSpinner size="lg" type={type} />
              <p className="text-sm text-gray-400 font-medium">{name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sizes */}
      <div className="space-y-8">
        <h2 className="text-2xl font-semibold text-white mb-6">Sizes</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {[
            { size: 'xs', name: 'Extra Small' },
            { size: 'sm', name: 'Small' },
            { size: 'md', name: 'Medium' },
            { size: 'lg', name: 'Large' },
            { size: 'xl', name: 'Extra Large' },
            { size: '2xl', name: '2X Large' },
          ].map(({ size, name }) => (
            <div key={size} className="card text-center space-y-4">
              <LoadingSpinner size={size} type="gradient" />
              <p className="text-sm text-gray-400 font-medium">{name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* With Text */}
      <div className="space-y-8">
        <h2 className="text-2xl font-semibold text-white mb-6">With Text</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="card text-center">
            <LoadingSpinner size="lg" type="pulse" text="Loading..." />
          </div>
          <div className="card text-center">
            <LoadingSpinner size="lg" type="neon" text="Processing..." />
          </div>
          <div className="card text-center">
            <LoadingSpinner size="lg" type="orbit" text="Please wait..." />
          </div>
        </div>
      </div>

      {/* Preset Components */}
      <div className="space-y-8">
        <h2 className="text-2xl font-semibold text-white mb-6">Preset Components</h2>
        
        <div className="space-y-6">
          {/* Button Spinner */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Button Spinner</h3>
            <div className="flex gap-4">
              <button className="btn-primary">
                <ButtonSpinner />
                Loading...
              </button>
              <button className="btn-secondary">
                <ButtonSpinner />
                Processing...
              </button>
            </div>
          </div>

          {/* Inline Spinner */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Inline Spinner</h3>
            <p className="text-gray-300">
              Your request is being processed <InlineSpinner /> please wait...
            </p>
          </div>

          {/* Card Spinner */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Card Spinner</h3>
            <div className="bg-dark-800/50 rounded-lg">
              <CardSpinner text="Loading content..." />
            </div>
          </div>

          {/* Page Spinner */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Page Spinner</h3>
            <div className="bg-dark-800/50 rounded-lg h-64">
              <PageSpinner text="Loading page..." />
            </div>
          </div>

          {/* Full Screen Spinner */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Full Screen Spinner</h3>
            <button 
              onClick={() => setShowFullScreen(true)}
              className="btn-primary"
            >
              Show Full Screen Spinner
            </button>
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="space-y-8">
        <h2 className="text-2xl font-semibold text-white mb-6">Usage Examples</h2>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Code Examples</h3>
          <div className="space-y-4 text-sm">
            <div className="bg-dark-800 rounded-lg p-4 font-mono">
              <p className="text-gray-400 mb-2">// Basic spinner</p>
              <p className="text-green-400">&lt;LoadingSpinner size="lg" type="gradient" /&gt;</p>
            </div>
            
            <div className="bg-dark-800 rounded-lg p-4 font-mono">
              <p className="text-gray-400 mb-2">// Spinner with text</p>
              <p className="text-green-400">&lt;LoadingSpinner size="xl" type="neon" text="Loading..." /&gt;</p>
            </div>
            
            <div className="bg-dark-800 rounded-lg p-4 font-mono">
              <p className="text-gray-400 mb-2">// Button spinner</p>
              <p className="text-green-400">&lt;ButtonSpinner /&gt;</p>
            </div>
            
            <div className="bg-dark-800 rounded-lg p-4 font-mono">
              <p className="text-gray-400 mb-2">// Page spinner</p>
              <p className="text-green-400">&lt;PageSpinner text="Loading page..." /&gt;</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Spinner */}
      {showFullScreen && (
        <FullScreenSpinner 
          text="Loading Application..."
          subtitle="This is a full screen loading spinner overlay. Click anywhere to close."
          onClick={() => setShowFullScreen(false)}
        />
      )}
    </div>
  );
};

export default SpinnerShowcase;
