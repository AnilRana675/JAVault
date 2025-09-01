import React from 'react';
import VideoCard from './VideoCard';
import { Grid, List, Filter, Search, SortAsc, Eye, Play, Clock, CheckCircle, XCircle, Sparkles, ChevronDown, Check } from 'lucide-react';
import LoadingSpinner, { PageSpinner } from './LoadingSpinner';

const VideoGallery = ({ videos, onVideoPlay, onVideoDeleted, isLoading = false, isInitialLoad = false, error = null }) => {
  const [viewMode, setViewMode] = React.useState('grid'); // 'grid' or 'list'
  const [filter, setFilter] = React.useState('all'); // 'all', 'completed', 'processing', 'failed'
  const [sortBy, setSortBy] = React.useState('newest'); // 'newest', 'oldest', 'title'
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isSortOpen, setIsSortOpen] = React.useState(false);
  const sortMenuRef = React.useRef(null);

  // Filter videos based on status and search term
  const filteredVideos = React.useMemo(() => {
    let filtered = videos;

    // Filter by status
    if (filter === 'editor') {
      filtered = filtered.filter(video => video.editor_choice);
    } else if (filter !== 'all') {
      filtered = filtered.filter(video => video.status === filter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(video =>
        video.video_code.toLowerCase().includes(term) ||
        (video.title_en && video.title_en.toLowerCase().includes(term)) ||
        (video.maker_en && video.maker_en.toLowerCase().includes(term)) ||
        (video.actresses && video.actresses.some(actress =>
          actress.name_romaji && actress.name_romaji.toLowerCase().includes(term)
        ))
      );
    }

    // Sort videos
    switch (sortBy) {
      case 'newest':
        filtered = [...filtered].sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
        break;
      case 'oldest':
        filtered = [...filtered].sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
        break;
      case 'title':
        filtered = [...filtered].sort((a, b) => (a.title_en || a.video_code).localeCompare(b.title_en || b.video_code));
        break;
      case 'code':
        filtered = [...filtered].sort((a, b) => a.video_code.localeCompare(b.video_code));
        break;
      default:
        break;
    }

    return filtered;
  }, [videos, filter, sortBy, searchTerm]);

  const statusCounts = React.useMemo(() => {
    return videos.reduce((acc, video) => {
      acc[video.status] = (acc[video.status] || 0) + 1;
      return acc;
    }, {});
  }, [videos]);

  const statusFilters = [
    { key: 'all', label: 'All Videos', icon: Eye, count: videos.length, color: 'text-gray-400' },
    { key: 'editor', label: 'Editor Picks', icon: Sparkles, count: videos.filter(v => v.editor_choice).length, color: 'text-neon-purple' },
    { key: 'completed', label: 'Completed', icon: CheckCircle, count: statusCounts.completed || 0, color: 'text-green-400' },
    { key: 'processing', label: 'Processing', icon: Play, count: statusCounts.processing || 0, color: 'text-blue-400' },
    { key: 'queued', label: 'Queued', icon: Clock, count: statusCounts.queued || 0, color: 'text-yellow-400' },
    { key: 'failed', label: 'Failed', icon: XCircle, count: statusCounts.failed || 0, color: 'text-red-400' },
  ];

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setIsSortOpen(false); };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const sortLabel = sortBy === 'newest' ? 'Newest First' : sortBy === 'oldest' ? 'Oldest First' : sortBy === 'title' ? 'By Title' : 'By Code';

  if (error) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="card-glass p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Error Loading Videos</h3>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Show loading spinner only for non-initial loads
  if (isLoading && !isInitialLoad) {
    return (
      <PageSpinner text="Refreshing Videos..." />
    );
  }

  // Show spinner during initial load if no videos yet
  if (isInitialLoad && videos.length === 0 && !error) {
    return (
      <PageSpinner text="" />
    );
  }

  if (videos.length === 0 && !isInitialLoad) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="card-glass p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500/20 to-neon-blue/20 rounded-2xl
                        flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">No Videos Found</h3>
          <p className="text-gray-400 mb-6">
            Start by searching for a video code using the search bar above.
          </p>
          <div className="text-sm text-gray-500">
            Try codes like: PPPE-356, SSIS-123, MIDV-789
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Gallery Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 animate-fade-in-up">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gradient">
            Video Collection
          </h2>
          <p className="text-gray-400">
            {filteredVideos.length} of {videos.length} videos
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search videos, codes, actresses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="backdrop-glass rounded-2xl p-2 flex flex-wrap gap-2 animate-fade-in-up delay-200">
        {statusFilters.map((filterItem) => (
          <button
            key={filterItem.key}
            onClick={() => setFilter(filterItem.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
              filter === filterItem.key
                ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                : 'bg-transparent border-white/10 text-gray-400 hover:border-primary-500/30 hover:text-primary-400'
            } border`}
          >
            <filterItem.icon className={`w-4 h-4 ${filterItem.color}`} />
            <span className="font-medium">{filterItem.label}</span>
            {filterItem.count > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                filter === filterItem.key
                  ? 'bg-primary-500/30 text-primary-200'
                  : 'bg-dark-700 text-gray-300'
              }`}>
                {filterItem.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Controls Bar */}
      <div className="relative z-40 backdrop-glass rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 animate-fade-in-up delay-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-primary-400" />
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => setIsSortOpen((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${isSortOpen ? 'bg-primary-500/20 border-primary-500/50 text-primary-300' : 'bg-transparent border-white/10 text-gray-400 hover:border-primary-500/30 hover:text-primary-400'} border focus:outline-none focus:border-primary-500/50`}
              >
                <span>{sortLabel}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {isSortOpen && (
                <div className="absolute mt-2 left-0 z-50 w-56 backdrop-glass p-2 rounded-xl shadow-dark-lg">
                  {[
                    { key: 'newest', label: 'Newest First' },
                    { key: 'oldest', label: 'Oldest First' },
                    { key: 'title', label: 'By Title' },
                    { key: 'code', label: 'By Code' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortBy(opt.key); setIsSortOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${sortBy === opt.key ? 'bg-primary-500/20 text-primary-200 border-primary-500/30' : 'bg-transparent text-gray-300 border-white/10 hover:border-primary-500/30 hover:text-primary-400 hover:bg-white/10'}`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.key && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-dark-700/50 rounded-lg p-1 border border-dark-600">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-all duration-300 ${
              viewMode === 'grid'
                ? 'bg-primary-500 text-white shadow-glow'
                : 'text-gray-400 hover:text-white hover:bg-dark-600'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-all duration-300 ${
              viewMode === 'list'
                ? 'bg-primary-500 text-white shadow-glow'
                : 'text-gray-400 hover:text-white hover:bg-dark-600'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video Grid/List */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="card-glass p-8 max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">No Videos Found</h3>
            <p className="text-gray-400">
              {searchTerm
                ? `No videos match "${searchTerm}" with the current filters.`
                : 'No videos match the current filter criteria.'
              }
            </p>
            {(searchTerm || filter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilter('all');
                }}
                className="btn-secondary mt-4"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`animate-fade-in-up delay-500 ${
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6'
            : 'space-y-4'
        }`}>
          {filteredVideos.map((video, index) => (
            <div
              key={video._id || video.video_code}
              className={`animate-fade-in-up delay-${Math.min(index * 50, 500)}`}
            >
              <VideoCard
                video={video}
                onPlay={onVideoPlay}
                onDelete={onVideoDeleted}
                compact={viewMode === 'list'}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoGallery;
