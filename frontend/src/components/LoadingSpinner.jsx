import React from 'react';
import { Sparkles, Play, Zap, RefreshCw } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'md', 
  type = 'default', 
  text = '', 
  className = '',
  showIcon = true 
}) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6', 
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20'
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl'
  };

  // Different spinner types
  const renderSpinner = () => {
    const baseSize = sizeClasses[size];
    
    switch (type) {
      case 'dots':
        return (
          <div className={`flex space-x-1 ${className}`}>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
          </div>
        );
        
      case 'pulse':
        return (
          <div className={`relative ${baseSize} ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-neon-blue rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-gradient-to-r from-primary-600 to-neon-blue rounded-full w-full h-full flex items-center justify-center">
              {showIcon && <Sparkles className="w-1/2 h-1/2 text-white" />}
            </div>
          </div>
        );
        
      case 'ring':
        return (
          <div className={`relative ${baseSize} ${className}`}>
            <div className="absolute inset-0 border-4 border-primary-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-primary-500 rounded-full animate-spin"></div>
            {showIcon && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-1/3 h-1/3 text-primary-400" />
              </div>
            )}
          </div>
        );
        
      case 'gradient':
        return (
          <div className={`relative ${baseSize} ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 via-neon-blue to-neon-purple rounded-full animate-spin">
              <div className="absolute inset-1 bg-dark-950 rounded-full"></div>
            </div>
            {showIcon && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-1/2 h-1/2 text-primary-400 animate-pulse" />
              </div>
            )}
          </div>
        );
        
      case 'neon':
        return (
          <div className={`relative ${baseSize} ${className}`}>
            <div className="absolute inset-0 border-2 border-neon-blue rounded-full animate-neon-pulse"></div>
            <div className="absolute inset-0 border-2 border-transparent border-t-neon-blue rounded-full animate-spin"></div>
            <div className="absolute inset-0 bg-neon-blue/10 rounded-full animate-pulse"></div>
            {showIcon && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-1/2 h-1/2 text-neon-blue animate-pulse" />
              </div>
            )}
          </div>
        );
        
      case 'orbit':
        return (
          <div className={`relative ${baseSize} ${className}`}>
            <div className="absolute inset-0 border border-primary-500/30 rounded-full"></div>
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-primary-500 rounded-full transform -translate-x-1/2 -translate-y-1 animate-spin origin-center"></div>
            <div className="absolute top-1/2 right-0 w-1.5 h-1.5 bg-neon-blue rounded-full transform translate-x-1 -translate-y-1/2 animate-spin origin-center [animation-delay:0.5s]"></div>
            {showIcon && (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-1/3 h-1/3 text-primary-400 animate-pulse" />
              </div>
            )}
          </div>
        );
        
      default: // 'default'
        return (
          <div className={`relative ${baseSize} ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-neon-blue rounded-full animate-spin opacity-75">
              <div className="absolute inset-2 bg-dark-950 rounded-full"></div>
            </div>
            {showIcon && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-1/2 h-1/2 text-primary-400 animate-pulse" />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {renderSpinner()}
      {text && (
        <p className={`text-gray-400 font-medium ${textSizes[size]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );
};

// Preset spinner components for common use cases
export const ButtonSpinner = ({ className = '' }) => (
  <LoadingSpinner 
    size="xs" 
    type="ring" 
    showIcon={false}
    className={`mr-2 ${className}`}
  />
);

export const PageSpinner = ({ text = "Loading..." }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner
      size="xl"
      type="ring"
      text={text}
      showIcon={false}
    />
  </div>
);

export const CardSpinner = ({ text = "" }) => (
  <div className="flex items-center justify-center p-8">
    <LoadingSpinner 
      size="lg" 
      type="neon" 
      text={text}
    />
  </div>
);

export const InlineSpinner = ({ className = '' }) => (
  <LoadingSpinner 
    size="sm" 
    type="dots" 
    showIcon={false}
    className={`inline-flex ${className}`}
  />
);

export const FullScreenSpinner = ({ text = "Loading...", subtitle = "" }) => (
  <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="text-center space-y-6 p-8">
      <LoadingSpinner
        size="2xl"
        type="ring"
        text={text}
        showIcon={false}
      />
      {subtitle && (
        <p className="text-gray-500 text-sm max-w-md">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

export default LoadingSpinner;
