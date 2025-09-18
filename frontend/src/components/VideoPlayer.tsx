
import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnail?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, thumbnail }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && videoUrl && videoUrl.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(videoUrl);
        hls.attachMedia(videoRef.current);
        return () => {
          hls.destroy();
        };
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = videoUrl;
      }
    }
  }, [videoUrl]);

  return (
    <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
      <video
        ref={videoRef}
        src={!videoUrl.endsWith('.m3u8') ? videoUrl : undefined}
        controls
        className="w-full h-full object-contain bg-black rounded-2xl"
        poster={thumbnail || "/placeholder.svg"}
      />
    </div>
  );
};

export default VideoPlayer;
