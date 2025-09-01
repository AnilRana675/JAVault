import React, { useEffect, useRef, useState } from 'react';
import { Play, Clock, Users, Calendar, AlertCircle, Loader2, CheckCircle, XCircle, Star, Heart, Share2, MoreVertical, Link as LinkIcon, Copy, BadgeCheck, Trash2 } from 'lucide-react';
import { InlineSpinner } from './LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const VideoCard = ({ video, onPlay, onDelete, compact = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const menuRef = useRef(null);
  const { isAdmin } = useAuth();

  // Initialize like state from localStorage
  useEffect(() => {
    try {
      const liked = JSON.parse(localStorage.getItem('likedVideos') || '[]');
      setIsLiked(Array.isArray(liked) && liked.includes(video.video_code));
    } catch {}
  }, [video.video_code]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const persistLike = (next) => {
    try {
      const liked = JSON.parse(localStorage.getItem('likedVideos') || '[]');
      const setArr = new Set(Array.isArray(liked) ? liked : []);
      if (next) setArr.add(video.video_code); else setArr.delete(video.video_code);
      localStorage.setItem('likedVideos', JSON.stringify(Array.from(setArr)));
    } catch {}
  };

  const showMessage = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(''), 2000);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    const next = !isLiked;
    setIsLiked(next);
    persistLike(next);
    showMessage(next ? 'Added to Likes' : 'Removed from Likes');
  };

  const shareUrl = () => {
    try {
      const origin = window?.location?.origin || '';
      return `${origin}/video/${video.video_code}`;
    } catch {
      return `/video/${video.video_code}`;
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const url = shareUrl();
    const title = video.title_en || video.video_code;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url });
        showMessage('Shared');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showMessage('Link copied');
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showMessage('Link copied');
      }
    } catch (err) {
      showMessage('Share failed');
      console.error(err);
    }
  };

  const handleOpenDetails = (e) => {
    e.stopPropagation();
    window.location.assign(`/video/${video.video_code}`);
  };

  const handleCopyCode = (e) => {
    e.stopPropagation();
    const text = video.video_code;
    if (!text) return;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showMessage('Code copied'));
    else {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showMessage('Code copied');
    }
  };

  const handleDownloadPoster = (e) => {
    e.stopPropagation();
    const url = video.poster_url || video.thumbnail_url;
    if (!url) { showMessage('No poster'); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.video_code}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showMessage('Downloading poster');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'queued':
        return 'status-queued';
      case 'processing':
        return 'status-processing';
      case 'completed':
        return 'status-completed';
      case 'failed':
        return 'status-failed';
      default:
        return 'status-badge bg-gray-100 text-gray-800';
    }
  };

  const formatRuntime = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const canPlay = video.status === 'completed' && video.video_url;

  return (
    <div
      className={`group relative ${isMenuOpen ? 'z-50' : isHovered ? 'z-30' : 'z-10'} bg-dark-800/40 backdrop-blur-md ${compact ? 'rounded-xl' : 'rounded-xl'} border border-dark-700/50
                 hover:border-primary-500/30 transition-all duration-500 hover:shadow-glow ${compact ? '' : 'transform hover:scale-[1.02] hover:-translate-y-2'} animate-fade-in-up`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Glow Effect */}
      <div className={`absolute inset-0 bg-gradient-to-r from-primary-500/10 to-neon-blue/10 rounded-xl transition-opacity duration-500 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`}></div>

      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {video.editor_choice && (
          <span className="status-badge bg-neon-purple/20 text-neon-purple border border-neon-purple/40 flex items-center gap-1.5">
            <BadgeCheck className="w-4 h-4" /> Editor Pick
          </span>
        )}
        <span className={`${getStatusClass(video.status)} flex items-center gap-1.5 backdrop-blur-sm ${
          video.status === 'processing' ? 'animate-pulse' : ''
        }`}>
          {getStatusIcon(video.status)}
          <span className="font-medium capitalize">{video.status}</span>
        </span>
      </div>

      {/* Action Buttons */}
      <div className={`absolute top-4 left-4 z-20 flex gap-2 transition-all duration-300 ${
        isHovered ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'
      }`} ref={menuRef}>
        <button
          onClick={handleLike}
          className={`p-2 rounded-full backdrop-blur-md transition-all duration-300 ${
            isLiked
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-dark-800/50 text-gray-400 hover:text-red-400 border border-dark-600 hover:border-red-500/30'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={handleShare}
          className="p-2 rounded-full bg-dark-800/50 text-gray-400 hover:text-primary-400
                         backdrop-blur-md border border-dark-600 hover:border-primary-500/30
                         transition-all duration-300"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {isAdmin && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const next = !video.editor_choice;
                await api.patch(`/videos/${video.video_code}/editor-choice`, { value: next });
                video.editor_choice = next;
                showMessage(next ? 'Marked as Editor Pick' : 'Removed from Editor Picks');
              } catch (err) {
                showMessage('Failed to update');
              }
            }}
            className={`p-2 rounded-full backdrop-blur-md transition-all duration-300 ${
              video.editor_choice ? 'bg-purple-500/20 text-neon-purple border border-purple-500/40' : 'bg-dark-800/50 text-gray-400 hover:text-neon-purple border border-dark-600 hover:border-purple-500/30'
            }`}
          >
            <BadgeCheck className="w-4 h-4" />
          </button>
        )}

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen((v) => !v); }}
            className="p-2 rounded-full bg-dark-800/50 text-gray-400 hover:text-white
                         backdrop-blur-md border border-dark-600 hover:border-gray-500
                         transition-all duration-300"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMenuOpen && (
            <div className="absolute mt-2 left-0 z-50 min-w-[180px] card-glass p-2 text-sm bg-dark-900/80 border-dark-700/60">
              <button onClick={handleOpenDetails} className="w-full text-left px-3 py-2 rounded-lg hover:bg-dark-800/70 flex items-center gap-2">
                <Play className="w-4 h-4 text-primary-400" /> Open details
              </button>
              <button onClick={handleShare} className="w-full text-left px-3 py-2 rounded-lg hover:bg-dark-800/70 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-neon-blue" /> Share link
              </button>
              <button onClick={handleCopyCode} className="w-full text-left px-3 py-2 rounded-lg hover:bg-dark-800/70 flex items-center gap-2">
                <Copy className="w-4 h-4 text-gray-300" /> Copy code
              </button>
              <button onClick={handleDownloadPoster} className="w-full text-left px-3 py-2 rounded-lg hover:bg-dark-800/70 flex items-center gap-2">
                <Star className="w-4 h-4 text-neon-purple" /> Download poster
              </button>
              {isAdmin && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const confirmed = window.confirm(`Delete ${video.video_code}? This cannot be undone.`);
                    if (!confirmed) return;
                    try {
                      await api.delete(`/videos/${encodeURIComponent(video.video_code)}`);
                      if (typeof onDelete === 'function') onDelete(video.video_code);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 flex items-center gap-2 text-red-300"
                >
                  <Trash2 className="w-4 h-4" /> Delete video
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Small Toast */}
      {actionMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg text-xs bg-black/60 backdrop-blur-sm border border-white/10 text-white">
          {actionMessage}
        </div>
      )}

      {/* Thumbnail/Poster */}
      <div className={`${compact ? 'flex gap-4 items-stretch' : ''}`}>
      <div className={`relative ${compact ? 'mb-0 w-40 sm:w-56 md:w-64 lg:w-72 aspect-video rounded-xl flex-shrink-0' : 'mb-4 rounded-t-xl aspect-video'} bg-dark-900/50 overflow-hidden`}>
        {video.poster_url || video.thumbnail_url ? (
          <img
            src={video.poster_url || video.thumbnail_url}
            alt={video.title_en || video.video_code}
            className={compact ? 'block w-full h-full object-contain object-center transition-transform duration-700' : 'block w-full h-full object-cover transition-transform duration-700 group-hover:scale-110'}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        {/* Fallback placeholder */}
        <div className="hidden absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900 text-gray-500">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500/20 to-neon-blue/20 rounded-2xl
                          flex items-center justify-center mx-auto">
              <Play className="w-8 h-8 text-primary-400" />
            </div>
            <p className="text-sm font-medium text-gray-400">{video.video_code}</p>
          </div>
        </div>

        {/* Gradient Overlay */}
        <div className={compact ? "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" : "hidden"}></div>

        {/* Play Button Overlay */}
        {canPlay && (
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isHovered ? 'bg-black/30' : 'bg-black/0'
          }`}>
            <button
              onClick={() => onPlay(video)}
              className={`group/play relative transition-all duration-300 ${
                isHovered ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              }`}
            >
              {/* Button Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-neon-blue rounded-full blur-lg opacity-50
                            group-hover/play:opacity-75 transition-opacity duration-300"></div>

              {/* Button */}
              <div className="relative w-16 h-16 bg-gradient-to-r from-primary-500 to-neon-blue rounded-full
                            flex items-center justify-center shadow-glow hover:shadow-glow-lg
                            transform hover:scale-110 transition-all duration-300">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
            </button>
          </div>
        )}

        {/* Processing Overlay */}
        {video.status === 'processing' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center space-y-2">
              <InlineSpinner />
              <p className="text-xs text-blue-300 font-medium">Processing...</p>
            </div>
          </div>
        )}

        {/* Runtime Badge */}
        {video.runtime_mins && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm
                        rounded-lg text-xs text-white font-medium">
            {formatRuntime(video.runtime_mins)}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className={`${compact ? 'p-4 flex-1 min-w-0' : 'p-6'} space-y-4`}>
        <div className="space-y-2">
          <h3 className={`font-bold ${compact ? 'text-base' : 'text-lg'} text-white line-clamp-2 group-hover:text-primary-300 transition-colors duration-300`}>
            {video.title_en || `Video ${video.video_code}`}
          </h3>
          <p className="text-sm text-primary-400 font-mono bg-primary-500/10 px-2 py-1 rounded-md inline-block">
            {video.video_code}
          </p>
        </div>

        {/* Metadata */}
        <div className="space-y-3 text-sm">
          {video.release_date && (
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-4 h-4 text-primary-400" />
              <span>{formatDate(video.release_date)}</span>
            </div>
          )}

          {video.actresses && video.actresses.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-400">
                <Users className="w-4 h-4 text-neon-blue" />
                <span className="font-medium">Cast</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {video.actresses.slice(0, 3).map((actress) => (
                  <span
                    key={actress.id || actress.name_romaji}
                    className="inline-block bg-gradient-to-r from-primary-500/20 to-neon-blue/20
                             text-primary-300 px-2 py-1 rounded-lg text-xs font-medium
                             border border-primary-500/20 hover:border-primary-500/40
                             transition-all duration-300 cursor-pointer"
                  >
                    {actress.name_romaji}
                  </span>
                ))}
                {video.actresses.length > 3 && (
                  <span className="inline-block bg-dark-700/50 text-gray-400 px-2 py-1 rounded-lg text-xs">
                    +{video.actresses.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {video.maker_en && (
            <div className="flex items-center gap-2 text-gray-400">
              <Star className="w-4 h-4 text-neon-purple" />
              <span className="text-xs">
                <span className="font-medium text-gray-300">Studio:</span> {video.maker_en}
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {video.status === 'failed' && video.failure_reason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 animate-pulse">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-300">
                <span className="font-medium">Error:</span> {video.failure_reason}
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {canPlay ? (
            <button
              onClick={() => onPlay(video)}
              className="btn-primary w-full group/btn relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 transform translate-x-full
                            group-hover/btn:translate-x-0 transition-transform duration-500"></div>
              <div className="relative flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                <span className="font-semibold">Watch Now</span>
              </div>
            </button>
          ) : video.status === 'processing' ? (
            <div className="w-full py-3 px-4 bg-blue-500/20 border border-blue-500/30 rounded-xl
                          text-blue-300 text-center font-medium cursor-not-allowed">
              <div className="flex items-center justify-center gap-2">
                <InlineSpinner />
                <span>Processing...</span>
              </div>
            </div>
          ) : video.status === 'queued' ? (
            <div className="w-full py-3 px-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl
                          text-yellow-300 text-center font-medium cursor-not-allowed">
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>In Queue</span>
              </div>
            </div>
          ) : video.status === 'failed' ? (
            <div className="w-full py-3 px-4 bg-red-500/20 border border-red-500/30 rounded-xl
                          text-red-300 text-center font-medium cursor-not-allowed">
              <div className="flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>Failed</span>
              </div>
            </div>
          ) : (
            <div className="w-full py-3 px-4 bg-dark-700/50 border border-dark-600 rounded-xl
                          text-gray-500 text-center font-medium cursor-not-allowed">
              <span>Not Available</span>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default VideoCard;
