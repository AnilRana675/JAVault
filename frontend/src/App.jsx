import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import VideoGallery from './components/VideoGallery';
import { FullScreenSpinner } from './components/LoadingSpinner';
import VideoPlayer from './components/VideoPlayer';
import { videoAPI } from './services/api';
import { useSocket } from './hooks/useSocket';
import { Wifi, WifiOff, RefreshCw, Play, Sparkles, Zap, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

function AdminAuthControls() {
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();
  
  if (isAdmin) {
    return (
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-lg text-sm bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Admin
        </span>
        <button onClick={logout} className="btn-ghost flex items-center gap-2">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    );
  }
  
  return (
    <button 
      onClick={() => navigate('/admin')} 
      className="btn-ghost flex items-center gap-2"
    >
      <Shield className="w-4 h-4" /> Admin Login
    </button>
  );
}

function App() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const { isConnected, subscribeToVideoUpdates } = useSocket();

  const navigate = useNavigate();

  // Load initial videos
  useEffect(() => {
    loadVideos();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToVideoUpdates((eventType, data) => {
      console.log('Received update:', eventType, data);
      
      switch (eventType) {
        case 'status-update':
          updateVideoInList(data.video_code, { status: data.status });
          showNotification(`Video ${data.video_code}: ${data.status}`, 'info');
          break;
        
        case 'queued':
          updateVideoInList(data.video_code, { 
            status: 'queued',
            video_code: data.video_code
          });
          showNotification(`Video ${data.video_code} queued for processing`, 'info');
          break;
        
        case 'completed':
          if (data.video) {
            updateVideoInList(data.video_code, {
              ...data.video,
              status: 'completed'
            });
          } else {
            updateVideoInList(data.video_code, { status: 'completed' });
          }
          showNotification(`Video ${data.video_code} completed!`, 'success');
          break;
        
        case 'failed':
          updateVideoInList(data.video_code, {
            status: 'failed',
            failure_reason: data.reason || data.failure_reason
          });
          showNotification(`Video ${data.video_code} failed: ${data.reason || data.failure_reason}`, 'error');
          break;

        case 'updated':
          if (data.video) {
            updateVideoInList(data.video_code, data.video);
          } else {
            updateVideoInList(data.video_code, { 
              status: data.status,
              failure_reason: data.failure_reason
            });
          }
          
          if (data.status === 'completed') {
            showNotification(`Video ${data.video_code} completed!`, 'success');
          } else if (data.status === 'failed') {
            showNotification(`Video ${data.video_code} failed: ${data.failure_reason}`, 'error');
          }
          break;
      }
    });

    return unsubscribe;
  }, [subscribeToVideoUpdates]);

  const loadVideos = async () => {
    try {
      setError(null);

      // Only show loading state after a delay to prevent flash
      const loadingTimeout = setTimeout(() => {
        setIsLoading(true);
      }, 300); // Show loading only if request takes longer than 300ms

      const fetchedVideos = await videoAPI.getVideos();
      setVideos(fetchedVideos);

      // Clear the timeout since request completed
      clearTimeout(loadingTimeout);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load videos:', err);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  const handleSearch = async (videoCode) => {
    try {
      setIsSearching(true);
      setError(null);
      
      // Check if video already exists
      const existingVideo = videos.find(v => v.video_code === videoCode);
      if (existingVideo) {
        if (['queued', 'processing'].includes(existingVideo.status)) {
          showNotification(`Video ${videoCode} is already being processed`, 'info');
          return;
        }
      }

      const response = await videoAPI.scrapeVideo(videoCode);
      
      // Add or update video in the list immediately
      if (response.video) {
        updateVideoInList(videoCode, response.video);
      } else {
        // Fallback: create a basic video entry
        updateVideoInList(videoCode, {
          video_code: videoCode,
          status: response.status || 'queued'
        });
      }
      
      showNotification(response.message || `Started processing ${videoCode}`, 'success');
    } catch (err) {
      setError(err.message);
      showNotification(err.message, 'error');
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const updateVideoInList = useCallback((videoCode, updates) => {
    setVideos(prevVideos => {
      const existingIndex = prevVideos.findIndex(v => v.video_code === videoCode);
      
      if (existingIndex >= 0) {
        // Update existing video
        const updatedVideos = [...prevVideos];
        updatedVideos[existingIndex] = { ...updatedVideos[existingIndex], ...updates };
        return updatedVideos;
      } else {
        // Add new video
        return [{ video_code: videoCode, ...updates }, ...prevVideos];
      }
    });
  }, []);

  const handleVideoPlay = (video) => {
    if (!video || !video.video_code) return;
    navigate(`/video/${video.video_code}`);
  };

  const handleClosePlayer = () => {
    setSelectedVideo(null);
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRefresh = () => {
    loadVideos();
  };

  return (
    <div className="min-h-screen relative overflow-hidden grid-pattern">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-neon-purple/10 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-neon-blue/5 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Header */}
      <header className="backdrop-glass border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 animate-fade-in-down">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-neon-blue rounded-xl flex items-center justify-center shadow-glow">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-neon-blue rounded-xl blur opacity-50 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient">JAVault</h1>
                <p className="text-sm text-gray-400">Advanced Video Scraper & Player</p>
              </div>
            </div>

            <div className="flex items-center gap-4 animate-fade-in-down delay-200">
              {/* Connection Status */}
              <div className="card-glass px-3 py-2 flex items-center gap-2">
                {isConnected ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="relative">
                      <Wifi className="w-4 h-4" />
                      <div className="absolute inset-0 animate-ping">
                        <Wifi className="w-4 h-4 opacity-75" />
                      </div>
                    </div>
                    <span className="text-sm font-medium">Live</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <div className="relative">
                      <WifiOff className="w-4 h-4" />
                      <div className="absolute inset-0 animate-pulse">
                        <WifiOff className="w-4 h-4 opacity-50" />
                      </div>
                    </div>
                    <span className="text-sm font-medium">Reconnecting...</span>
                  </div>
                )}
              </div>

              {/* Admin */}
              <AdminAuthControls />

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className={`btn-secondary flex items-center gap-2 group transition-all duration-300 ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${
                  isLoading ? 'animate-spin text-primary-400' : 'group-hover:rotate-180'
                }`} />
                <span className="hidden sm:inline">
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-glow max-w-sm animate-slide-left backdrop-blur-xl border ${
          notification.type === 'success'
            ? 'bg-green-500/20 text-green-300 border-green-500/30' :
          notification.type === 'error'
            ? 'bg-red-500/20 text-red-300 border-red-500/30' :
            'bg-blue-500/20 text-blue-300 border-blue-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              notification.type === 'success' ? 'bg-green-400' :
              notification.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
            }`}></div>
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Full-screen loading spinner on initial load or when refreshing empty list */}
      {(isInitialLoad || (isLoading && videos.length === 0)) && (
        <FullScreenSpinner text="" />
      )}

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {/* Hero Section with Search */}
          <div className="text-center space-y-8 animate-fade-in-up">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-neon-blue animate-pulse" />
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Powered by JAVault
                </span>
                <Zap className="w-6 h-6 text-neon-purple animate-pulse" />
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-neon-gradient mb-4">
                Discover Videos
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Advanced scraping technology with real-time processing and instant streaming
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <SearchBar onSearch={handleSearch} isLoading={isSearching} />
            </div>
          </div>

          {/* Stats Section */}
          {videos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in-up delay-300">
              {[
                { label: 'Total Videos', value: videos.length, icon: Play, color: 'from-blue-500 to-blue-600' },
                { label: 'Completed', value: videos.filter(v => v.status === 'completed').length, icon: Sparkles, color: 'from-green-500 to-green-600' },
                { label: 'Processing', value: videos.filter(v => v.status === 'processing').length, icon: RefreshCw, color: 'from-yellow-500 to-yellow-600' },
                { label: 'Failed', value: videos.filter(v => v.status === 'failed').length, icon: Zap, color: 'from-red-500 to-red-600' },
              ].map((stat, index) => (
                <div key={stat.label} className={`card-glass p-6 text-center animate-scale-in delay-${index * 100}`}>
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-glow`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="card bg-red-500/10 border-red-500/30 animate-shake">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <p className="text-red-300 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Video Gallery */}
          <div className="animate-fade-in-up delay-500">
            <VideoGallery
              videos={videos}
              onVideoPlay={handleVideoPlay}
              onVideoDeleted={(code) => {
                setVideos((prev) => prev.filter((v) => v.video_code !== code));
                showNotification(`Deleted ${code}`, 'success');
              }}
              isLoading={isLoading && !isInitialLoad}
              isInitialLoad={isInitialLoad}
              error={error}
            />
          </div>
        </div>
      </main>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          onClose={handleClosePlayer}
        />
      )}
    </div>
  );
}

export default App;
