import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, AlertCircle,
         Settings, Download, Share2, SkipBack, SkipForward, RotateCcw, X, Check } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const VideoPlayer = ({ video, onClose, embed = false }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [playbackRate, setPlaybackRate] = useState(1);
  const settingsContainerRef = useRef(null);

  // Use the URL provided by backend (already proxied if needed)
  const getStreamUrl = (url) => url || null;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !video.video_url) return;

    const streamUrl = getStreamUrl(video.video_url);
    if (!streamUrl) {
      setError('No video URL available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (Hls.isSupported()) {
      // Use HLS.js for browsers that support MSE
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded');
        setIsLoading(false);
        try {
          const levels = (hls.levels || []).map((lvl, idx) => ({ index: idx, height: lvl.height, bitrate: lvl.bitrate }));
          setAvailableQualities(levels);
          const storedQ = localStorage.getItem('player.quality');
          if (storedQ && storedQ !== 'auto') {
            const idx = parseInt(storedQ, 10);
            if (!Number.isNaN(idx)) {
              hls.currentLevel = idx;
              setSelectedQuality(idx);
            }
          } else {
            hls.currentLevel = -1;
            setSelectedQuality('auto');
          }
        } catch {}
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          setError(`Playback error: ${data.details}`);
          setIsLoading(false);
        }
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoElement.src = streamUrl;
      setIsLoading(false);
    } else {
      setError('HLS playback not supported in this browser');
      setIsLoading(false);
    }

    // Apply stored playback rate
    try {
      const storedRate = parseFloat(localStorage.getItem('player.playbackRate') || '1');
      if (!Number.isNaN(storedRate)) {
        videoElement.playbackRate = storedRate;
        setPlaybackRate(storedRate);
      }
    } catch {}

    // Video event listeners
    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(videoElement.volume);
      setIsMuted(videoElement.muted);
    };

    const handleError = () => {
      setError('Failed to load video');
      setIsLoading(false);
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('volumechange', handleVolumeChange);
    videoElement.addEventListener('error', handleError);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('volumechange', handleVolumeChange);
      videoElement.removeEventListener('error', handleError);
    };
  }, [video.video_url]);

  const togglePlay = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play().catch(console.error);
    }
  };

  const toggleMute = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    videoElement.muted = !videoElement.muted;
  };

  const handleVolumeChange = (e) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const newVolume = parseFloat(e.target.value);
    videoElement.volume = newVolume;
    setVolume(newVolume);
  };

  const handleSeek = (e) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoElement.currentTime = pos * duration;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current || videoRef.current;
    const videoElement = videoRef.current;
    if (!container && !videoElement) return;

    const inFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (!inFs) {
      const target = container || videoElement;
      if (target.requestFullscreen) target.requestFullscreen();
      else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
      else if (target.mozRequestFullScreen) target.mozRequestFullScreen();
      else if (target.msRequestFullscreen) target.msRequestFullscreen();
      else if (videoElement && videoElement.webkitEnterFullscreen) videoElement.webkitEnterFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
      else if (videoElement && videoElement.webkitExitFullscreen) videoElement.webkitExitFullscreen();
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      const active = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      setIsFullscreen(active);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange', onFsChange);
    document.addEventListener('MSFullscreenChange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('mozfullscreenchange', onFsChange);
      document.removeEventListener('MSFullscreenChange', onFsChange);
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (settingsContainerRef.current && !settingsContainerRef.current.contains(e.target)) {
        setIsSettingsOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setIsSettingsOpen(false);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const formatTime = (time) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Settings handlers
  const handleSelectQuality = (q) => {
    if (!hlsRef.current) { setSelectedQuality('auto'); return; }
    if (q === 'auto') {
      hlsRef.current.currentLevel = -1;
      setSelectedQuality('auto');
      localStorage.setItem('player.quality', 'auto');
    } else if (typeof q === 'number') {
      hlsRef.current.currentLevel = q;
      setSelectedQuality(q);
      localStorage.setItem('player.quality', String(q));
    }
    setIsSettingsOpen(false);
  };

  const handleChangeSpeed = (rate) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    setPlaybackRate(rate);
    localStorage.setItem('player.playbackRate', String(rate));
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="card-glass p-8 max-w-md mx-4 animate-scale-in">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Playback Error</h3>
              <p className="text-gray-400">{error}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </button>
              <button onClick={onClose} className="btn-primary w-full">
                <X className="w-4 h-4 mr-2" />
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (embed) {
    return (
      <div ref={containerRef} className="relative w-full h-[60vh] bg-gradient-to-br from-dark-900 to-black rounded-2xl overflow-hidden shadow-dark-lg">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <LoadingSpinner size="xl" type="orbit" text="Loading Video" className="text-center" />
          </div>
        )}
        <video ref={videoRef} className="w-full h-full object-contain" poster={video.poster_url || video.thumbnail_url} playsInline />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-6">
          <div className="mb-6">
            <div className="progress-bar group cursor-pointer" onClick={handleSeek}>
              <div className="progress-bar-fill relative" style={{ width: `${(currentTime / duration) * 100}%` }}>
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-6">
              <button onClick={togglePlay} className="video-control-btn p-3 hover:scale-110">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10); }} className="video-control-btn"><SkipBack className="w-5 h-5" /></button>
                <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min(duration, v.currentTime + 10); }} className="video-control-btn"><SkipForward className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={toggleMute} className="video-control-btn">{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
                <div className="relative group">
                  <input type="range" min="0" max="1" step="0.1" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer hover:bg-white/30 transition-colors" />
                </div>
              </div>
              <div className="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-mono">{formatTime(currentTime)} / {formatTime(duration)}</div>
            </div>
            <div ref={settingsContainerRef} className="relative flex items-center gap-4">
              <button onClick={() => setIsSettingsOpen((v) => !v)} className="video-control-btn"><Settings className="w-5 h-5" /></button>
              <button onClick={toggleFullscreen} className="video-control-btn">{isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}</button>
              {isSettingsOpen && (
                <div className="absolute bottom-12 right-0 z-30 w-64 card-glass bg-dark-900/90 border-white/10 p-3 rounded-xl">
                  <div className="text-sm text-gray-300 font-semibold mb-2">Playback</div>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                      <button key={r} onClick={() => handleChangeSpeed(r)} className={`px-2 py-1 rounded-lg text-xs border ${playbackRate === r ? 'bg-primary-500/20 text-primary-200 border-primary-500/30' : 'bg-black/30 text-gray-300 border-white/10 hover:bg-dark-800/70'}`}>{r}x</button>
                    ))}
                  </div>
                  {availableQualities && availableQualities.length > 0 && (
                    <>
                      <div className="text-sm text-gray-300 font-semibold mb-2">Quality</div>
                      <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                        <button onClick={() => handleSelectQuality('auto')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${selectedQuality === 'auto' ? 'bg-primary-500/20 text-primary-200 border-primary-500/30' : 'bg-black/30 text-gray-300 border-white/10 hover:bg-dark-800/70'}`}>
                          <span>Auto</span>
                          {selectedQuality === 'auto' && <Check className="w-4 h-4" />}
                        </button>
                        {availableQualities.slice().reverse().map((lvl, idx) => {
                          const actualIndex = availableQualities.length - 1 - idx;
                          const isActive = selectedQuality === actualIndex;
                          const label = lvl.height ? `${lvl.height}p` : `${Math.round((lvl.bitrate || 0)/1000)}kbps`;
                          return (
                            <button key={actualIndex} onClick={() => handleSelectQuality(actualIndex)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${isActive ? 'bg-primary-500/20 text-primary-200 border-primary-500/30' : 'bg-black/30 text-gray-300 border-white/10 hover:bg-dark-800/70'}`}>
                              <span>{label}</span>
                              {isActive && <Check className="w-4 h-4" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {!isPlaying && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center cursor-pointer group" onClick={togglePlay}>
            <div className="relative">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-all duration-300 group-hover:bg-white/20">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div ref={containerRef} className="relative w-full h-full max-w-7xl max-h-screen p-4">
        {/* Header Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="card-glass px-4 py-2">
              <h3 className="text-white font-semibold truncate max-w-md">
                {video.title_en || video.video_code}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="video-control-btn">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="video-control-btn">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={() => setIsSettingsOpen((v) => !v)} className="video-control-btn">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="video-control-btn hover:bg-red-500/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div className="relative w-full h-full bg-gradient-to-br from-dark-900 to-black rounded-2xl overflow-hidden shadow-dark-lg">
          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <LoadingSpinner
                size="xl"
                type="orbit"
                text="Loading Video"
                className="text-center"
              />
            </div>
          )}

          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            poster={video.poster_url || video.thumbnail_url}
            playsInline
          />

          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-6">
            {/* Progress Bar */}
            <div className="mb-6">
              <div
                className="progress-bar group cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="progress-bar-fill relative"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3
                                bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-6">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="video-control-btn p-3 hover:scale-110"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>

                {/* Skip Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const video = videoRef.current;
                      if (video) video.currentTime = Math.max(0, video.currentTime - 10);
                    }}
                    className="video-control-btn"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      const video = videoRef.current;
                      if (video) video.currentTime = Math.min(duration, video.currentTime + 10);
                    }}
                    className="video-control-btn"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Volume Controls */}
                <div className="flex items-center gap-3">
                  <button onClick={toggleMute} className="video-control-btn">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <div className="relative group">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                               [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                               hover:bg-white/30 transition-colors"
                    />
                  </div>
                </div>

                {/* Time Display */}
                <div className="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right Controls */}
              <div ref={settingsContainerRef} className="relative flex items-center gap-4">
                {/* Quality/Settings */}
                <button onClick={() => setIsSettingsOpen((v) => !v)} className="video-control-btn">
                  <Settings className="w-5 h-5" />
                </button>

                {/* Fullscreen */}
                <button onClick={toggleFullscreen} className="video-control-btn">
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>

                {isSettingsOpen && (
                  <div className="absolute bottom-12 right-0 z-30 w-64 card-glass bg-dark-900/90 border-white/10 p-3 rounded-xl">
                    <div className="text-sm text-gray-300 font-semibold mb-2">Playback</div>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                        <button key={r} onClick={() => handleChangeSpeed(r)} className={`px-2 py-1 rounded-lg text-xs border ${playbackRate === r ? 'bg-primary-500/20 text-primary-200 border-primary-500/30' : 'bg-black/30 text-gray-300 border-white/10 hover:bg-dark-800/70'}`}>{r}x</button>
                      ))}
                    </div>
                    {availableQualities && availableQualities.length > 0 && (
                      <>
                        <div className="text-sm text-gray-300 font-semibold mb-2">Quality</div>
                        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                          <button onClick={() => handleSelectQuality('auto')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${selectedQuality === 'auto' ? 'bg-primary-500/20 text-primary-200 border-primary-500/30' : 'bg-black/30 text-gray-300 border-white/10 hover:bg-dark-800/70'}`}>
                            <span>Auto</span>
                            {selectedQuality === 'auto' && <Check className="w-4 h-4" />}
                          </button>
                          {availableQualities.slice().reverse().map((lvl, idx) => {
                            const actualIndex = availableQualities.length - 1 - idx;
                            const isActive = selectedQuality === actualIndex;
                            const label = lvl.height ? `${lvl.height}p` : `${Math.round((lvl.bitrate || 0)/1000)}kbps`;
                            return (
                              <button key={actualIndex} onClick={() => handleSelectQuality(actualIndex)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${isActive ? 'bg-primary-500/20 text-primary-200 border-primary-500/30' : 'bg-black/30 text-gray-300 border-white/10 hover:bg-dark-800/70'}`}>
                                <span>{label}</span>
                                {isActive && <Check className="w-4 h-4" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Click to Play Overlay */}
          {!isPlaying && !isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer group"
              onClick={togglePlay}
            >
              <div className="relative">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center
                              border border-white/20 group-hover:scale-110 transition-all duration-300
                              group-hover:bg-white/20">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
