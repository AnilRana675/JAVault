import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { videoAPI } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';
import VideoCard from '../components/VideoCard';
import { Play, ArrowLeft, Calendar, Users, Star, AlertCircle, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';

const VideoDetail = () => {
  const { code } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const v = await videoAPI.getVideoByCode(code);
        if (mounted) setVideo(v || null);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [code]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!video || !Array.isArray(video.categories) || video.categories.length === 0) {
        if (active) setRelated([]);
        return;
      }
      try {
        const all = await videoAPI.getVideos();
        const catIds = new Set(
          video.categories.map(c => (c && (c.id != null ? String(c.id) : (c.name_en || '').toLowerCase()))).filter(Boolean)
        );
        const scored = all
          .filter(v => v && v.video_code !== video.video_code)
          .map(v => {
            const ids = new Set(
              (v.categories || []).map(c => (c && (c.id != null ? String(c.id) : (c.name_en || '').toLowerCase()))).filter(Boolean)
            );
            let overlap = 0;
            ids.forEach(id => { if (catIds.has(id)) overlap += 1; });
            return { v, score: overlap };
          })
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score || new Date(b.v.release_date || 0) - new Date(a.v.release_date || 0))
          .slice(0, 8)
          .map(x => x.v);
        if (active) setRelated(scored);
      } catch (e) {
        if (active) setRelated([]);
      }
    })();
    return () => { active = false; };
  }, [video]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try { return new Date(dateString).toLocaleDateString(); } catch { return dateString; }
  };

  return (
    <div className="min-h-screen relative overflow-hidden grid-pattern">
      {/* Header */}
      <header className="relative backdrop-glass border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-neon-blue rounded-xl flex items-center justify-center shadow-glow">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">{code}</h1>
              <p className="text-xs text-gray-400">Video Details</p>
            </div>
          </div>
          <div />
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading && (
          <div className="text-center py-16 card-glass">
            <p className="text-gray-400">Loading video...</p>
          </div>
        )}

        {!loading && (error || !video) && (
          <div className="card-glass p-8 max-w-xl mx-auto text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Video not found</h3>
            <p className="text-gray-400">{error || `No video found for code ${code}`}</p>
          </div>
        )}

        {!loading && video && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Top section: poster + meta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-dark-800/40 backdrop-blur-md rounded-2xl border border-dark-700/50 overflow-hidden">
                <div className="relative">
                  {(video.poster_url || video.thumbnail_url) ? (
                    <img
                      src={video.poster_url || video.thumbnail_url}
                      alt={video.title_en || video.video_code}
                      className="w-full h-auto object-cover"
                    />
                  ) : (
                    <div className="aspect-[3/4] flex items-center justify-center text-gray-500">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500/20 to-neon-blue/20 rounded-2xl flex items-center justify-center mx-auto">
                          <Play className="w-8 h-8 text-primary-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-400">{video.video_code}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 card-glass p-6 space-y-4">
                <h2 className="text-2xl font-bold text-white">{video.title_en || video.video_code}</h2>
                <div className="flex flex-wrap gap-3 text-sm text-gray-300">
                  {video.release_date && (
                    <span className="inline-flex items-center gap-2 bg-dark-700/50 px-3 py-1 rounded-lg">
                      <Calendar className="w-4 h-4 text-primary-400" /> {formatDate(video.release_date)}
                    </span>
                  )}
                  {video.runtime_mins && (
                    <span className="inline-flex items-center gap-2 bg-dark-700/50 px-3 py-1 rounded-lg">
                      <Clock className="w-4 h-4 text-primary-400" /> {video.runtime_mins} mins
                    </span>
                  )}
                  {video.maker_en && (
                    <span className="inline-flex items-center gap-2 bg-dark-700/50 px-3 py-1 rounded-lg">
                      <Star className="w-4 h-4 text-neon-purple" /> {video.maker_en}
                    </span>
                  )}
                  {video.label_en && (
                    <span className="inline-flex items-center gap-2 bg-dark-700/50 px-3 py-1 rounded-lg">
                      <Star className="w-4 h-4 text-neon-purple" /> {video.label_en}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2 bg-dark-700/50 px-3 py-1 rounded-lg">
                    Code: {video.video_code}
                  </span>
                  {video.actresses && video.actresses.length > 0 && (
                    <span className="inline-flex items-center gap-2 bg-dark-700/50 px-3 py-1 rounded-lg">
                      <Users className="w-4 h-4 text-neon-blue" /> {video.actresses.map(a => a.name_romaji).filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
                {video.categories && video.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {video.categories.map((c) => (
                      <span key={c.id || c.name_en} className="px-2 py-1 rounded-lg text-xs bg-primary-500/10 text-primary-300 border border-primary-500/20">
                        {c.name_en}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Player */}
            {video.video_url ? (
              <VideoPlayer video={video} embed />
            ) : (
              <div className="card-glass p-6 text-center">
                <p className="text-gray-400">Video is not ready yet. Status: <span className="font-semibold capitalize">{video.status || 'unknown'}</span></p>
              </div>
            )}

            {/* Cast */}
            {video.actresses && video.actresses.length > 0 && (
              <div className="card-glass p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Cast</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {video.actresses.map((a) => (
                    <div key={a.id || a.name_romaji} className="bg-dark-800/40 rounded-xl border border-dark-700/50 p-4 flex flex-col items-center text-center">
                      <div className="w-24 h-24 rounded-full overflow-hidden border border-dark-700/50 shadow-dark">
                        {a.image_url ? (
                          <img src={a.image_url} alt={a.name_romaji} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-dark-900/50 flex items-center justify-center text-gray-500 text-xs">N/A</div>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-gray-300 truncate w-full">{a.name_romaji}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {video.galleries && video.galleries.length > 0 && (
              <div className="card-glass p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Gallery</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {video.galleries.map((g, idx) => (
                    <button key={g.image_full || g.image_thumb || idx} onClick={() => { setLightboxIndex(idx); setIsLightboxOpen(true); }} className="block group w-full text-left">
                      <div className="relative rounded-xl overflow-hidden border border-dark-700/50 bg-dark-900/40">
                        {(g.image_thumb || g.image_full) ? (
                          <img src={g.image_thumb || g.image_full} alt={`Gallery ${idx + 1}`} className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-40 flex items-center justify-center text-gray-500">Image</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Related */}
            {related.length > 0 && (
              <div className="card-glass p-6">
                <h3 className="text-lg font-semibold text-white mb-4">You may like</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {related.map((rv, idx) => (
                    <div key={rv._id || rv.video_code} className={`animate-fade-in-up delay-${Math.min(idx * 50, 500)}`}>
                      <VideoCard
                        video={rv}
                        onPlay={(v) => {
                          const next = v?.video_code || rv.video_code;
                          if (!next) return;
                          window.location.assign(`/video/${next}`);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </main>
      {isLightboxOpen && video.galleries && video.galleries.length > 0 && createPortal(
        (
          <div className="fixed inset-0 z-[9999] w-screen h-screen bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            <button onClick={() => setIsLightboxOpen(false)} className="absolute top-6 right-6 video-control-btn hover:bg-red-500/50">
              <X className="w-5 h-5" />
            </button>
            <button onClick={() => setLightboxIndex((lightboxIndex - 1 + video.galleries.length) % video.galleries.length)} className="absolute left-6 md:left-10 video-control-btn">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-4xl h-[75vh] p-0 flex items-center justify-center">
              <img src={video.galleries[lightboxIndex].image_full || video.galleries[lightboxIndex].image_thumb} alt={`Gallery ${lightboxIndex + 1}`} className="block max-w-full max-h-full object-contain rounded-xl shadow-glow" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-sm text-gray-300 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                <span>Image {lightboxIndex + 1} / {video.galleries.length}</span>
                {(video.galleries[lightboxIndex].image_full || video.galleries[lightboxIndex].image_thumb) && (
                  <a href={video.galleries[lightboxIndex].image_full || video.galleries[lightboxIndex].image_thumb} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1">Open original</a>
                )}
              </div>
            </div>
            <button onClick={() => setLightboxIndex((lightboxIndex + 1) % video.galleries.length)} className="absolute right-6 md:right-10 video-control-btn">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        ),
        document.body
      )}
    </div>
  );
};

export default VideoDetail;
