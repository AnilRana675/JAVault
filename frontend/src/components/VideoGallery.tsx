import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from './ui/pagination';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchVideos } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';
import VideoCard from './VideoCard';
interface Video {
  _id: string;
  video_code: string;
  title_en?: string;
  poster_url?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  failure_reason?: string;
  runtime_mins?: number;
  rating?: string;
  release_date?: string;
  actresses?: { id: number; name_romaji: string }[];
  categories?: { id: number; name_en: string }[];
  video_url?: string;
  // ...other fields as needed
}

const VideoGallery: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const navigate = useNavigate();
  const prevVideosRef = useRef<Video[]>([]);

  // Fetch initial videos
  useEffect(() => {
    fetchVideos().then(setVideos);
  }, []);

  // Handle real-time updates
  const handleSocketEvent = useCallback((event: string, data: any) => {
    setVideos((prev) => {
      if (!data || !data.video_code) return prev;
      const idx = prev.findIndex((v) => v.video_code === data.video_code);
      let updated;
      if (idx !== -1) {
        // Update existing video
        updated = [...prev];
        updated[idx] = { ...updated[idx], ...data };
      } else {
        // Add new video
        updated = [data, ...prev];
      }
      // If the new/updated video is completed and wasn't present before, navigate to its detail page
      if (data.status === 'completed' && (!prev.some(v => v.video_code === data.video_code) || (idx !== -1 && prev[idx].status !== 'completed'))) {
        setTimeout(() => {
          navigate(`/video/${data.video_code}`);
        }, 300); // slight delay to ensure state update
      }
      return updated;
    });
  }, [navigate]);

  useSocket(handleSocketEvent);

  // Pagination logic (4 per page)
  const PAGE_SIZE = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(videos.length / PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const visibleVideos = videos.slice(startIdx, endIdx);

  return (
    <section className="container mx-auto pt-2 pb-8">
      <motion.h2
        className="text-3xl font-bold mb-6 text-white drop-shadow-glow"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Video Gallery
      </motion.h2>

      <div className="relative">
        {/* Arrow buttons positioned relative to the grid container */}
        {page > 1 && (
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10 bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-primary/90 transition"
            onClick={() => setPage(page - 1)}
            aria-label="Previous"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        {page < totalPages && (
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10 bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-primary/90 transition"
            onClick={() => setPage(page + 1)}
            aria-label="Next"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}

        <div className="grid grid-cols-4 gap-8 items-stretch min-h-[300px]">
          <AnimatePresence>
            {visibleVideos.map((video, idx) => (
              <motion.div
                key={video._id}
                initial={{ opacity: 0, scale: 0.96, y: 32 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 32 }}
                transition={{ type: 'spring', stiffness: 80, damping: 18, mass: 0.7, delay: idx * 0.07 }}
                whileHover={{ scale: 1.035, boxShadow: '0 0 8px 0 hsl(258,90%,66%,0.06)' }}
                className="transition-all"
              >
                {video.status === 'completed' ? (
                  <VideoCard
                    title={video.title_en || video.video_code}
                    thumbnail={video.poster_url || '/placeholder.svg'}
                    videoCode={video.video_code}
                    runtimeMins={video.runtime_mins}
                    releaseDate={video.release_date || ''}
                    actresses={video.actresses || []}
                    categories={video.categories?.map((c, i) => ({ id: i, name_en: c.name_en })) || []}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[220px] rounded-2xl bg-card border border-border shadow-elevated p-6 text-center animate-pulse-glow">
                    <span className="text-lg font-semibold text-primary mb-2">{video.video_code}</span>
                    {video.status === 'queued' && <span className="text-muted-foreground">Queued...</span>}
                    {video.status === 'processing' && <span className="text-primary animate-pulse">Processing...</span>}
                    {video.status === 'failed' && <span className="text-red-500">Failed: {video.failure_reason}</span>}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default VideoGallery;
