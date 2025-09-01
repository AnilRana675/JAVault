import React, { useState } from 'react';
import { Search, Loader2, Sparkles, Zap, Target } from 'lucide-react';
import { ButtonSpinner } from './LoadingSpinner';

const SearchBar = ({ onSearch, isLoading = false }) => {
  const [videoCode, setVideoCode] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const validateVideoCode = (code) => {
    // Basic validation for video codes (adjust pattern as needed)
    const codePattern = /^[a-zA-Z0-9-_]+$/;
    if (!code.trim()) {
      return 'Video code is required';
    }
    if (code.length < 3) {
      return 'Video code must be at least 3 characters';
    }
    if (!codePattern.test(code)) {
      return 'Video code can only contain letters, numbers, hyphens, and underscores';
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationError = validateVideoCode(videoCode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    onSearch(videoCode.trim().toUpperCase());
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setVideoCode(value);

    // Clear error when user starts typing
    if (error && value.trim()) {
      setError('');
    }
  };

  const exampleCodes = ['PPPE-356', 'SSIS-123', 'MIDV-789', 'WAAA-456'];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Main Search Form */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className={`relative transition-all duration-500 ${
          isFocused ? 'transform scale-105' : ''
        }`}>
          {/* Glow Effect */}
          <div className={`absolute inset-0 bg-gradient-to-r from-primary-500/20 to-neon-blue/20 rounded-2xl blur-xl transition-opacity duration-500 ${
            isFocused ? 'opacity-100' : 'opacity-0'
          }`}></div>

          {/* Search Container */}
          <div className={`relative flex rounded-2xl shadow-dark overflow-hidden border transition-all duration-500 ${
            error
              ? 'border-red-500/50 bg-red-500/5'
              : isLoading
                ? 'border-primary-500/50 bg-primary-500/5 animate-pulse'
                : isFocused
                  ? 'border-primary-500/50 bg-primary-500/5'
                  : 'border-dark-600 bg-dark-800/50'
          } backdrop-blur-md`}>

            {/* Input Field */}
            <div className="relative flex-1">
              <input
                type="text"
                value={videoCode}
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isLoading ? "Processing..." : "Enter video code..."}
                className={`w-full pl-12 pr-6 py-4 text-lg bg-transparent text-white transition-all duration-300
                          focus:outline-none ${
                            isLoading
                              ? 'placeholder-primary-400 cursor-not-allowed'
                              : 'placeholder-gray-400'
                          }`}
                disabled={isLoading}
                autoComplete="off"
              />

              {/* Search Icon */}
              <div className="absolute left-6 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Search className={`w-5 h-5 transition-colors duration-300 ${
                  isFocused ? 'text-primary-400' : 'text-gray-500'
                }`} />
              </div>

              {/* Input decorator line */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-neon-blue transform origin-center transition-all duration-500 ${
                isFocused ? 'scale-x-100' : 'scale-x-0'
              }`}></div>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              disabled={isLoading || !videoCode.trim()}
              className="relative px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700
                       hover:from-primary-500 hover:to-primary-600 disabled:from-gray-700 disabled:to-gray-800
                       text-white font-semibold transition-all duration-300 group overflow-hidden
                       disabled:cursor-not-allowed"
            >
              {/* Button Background Animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 transform translate-x-full
                            group-hover:translate-x-0 transition-transform duration-500"></div>

              {/* Button Content */}
              <div className="relative flex items-center gap-3">
                {isLoading ? (
                  <>
                    <ButtonSpinner />
                    <span className="hidden sm:inline">Processing...</span>
                  </>
                ) : (
                  <>
                    <Target className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    <span className="hidden sm:inline">Search</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-slide-up">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-300 font-medium">{error}</p>
            </div>
          </div>
        )}
      </form>

      {/* Quick Examples */}
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-neon-blue" />
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Quick Examples
            </span>
            <Sparkles className="w-4 h-4 text-neon-purple" />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {exampleCodes.map((code, index) => (
              <button
                key={code}
                onClick={() => {
                  setVideoCode(code);
                  setError('');
                }}
                className={`px-4 py-2 bg-dark-800/50 hover:bg-primary-500/20 border border-dark-600
                          hover:border-primary-500/50 rounded-lg text-sm text-gray-300 hover:text-white
                          transition-all duration-300 hover:scale-105 animate-fade-in-up delay-${index * 100}`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <div className="card-glass p-6 max-w-2xl mx-auto animate-fade-in-up delay-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span>Enter code without spaces</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-neon-blue rounded-full"></div>
                <span>Automatically converted to uppercase</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-neon-purple rounded-full"></div>
                <span>Minimum 3 characters required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Letters, numbers, hyphens, underscores only</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
