import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import VideoPlayer from "@/components/VideoPlayer";
import { ArrowLeft } from "lucide-react";
import { fetchVideos } from "../services/api";

const VideoDetailView: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [popupImg, setPopupImg] = React.useState<string | null>(null);
  const [popupIdx, setPopupIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetchVideos().then((videos) => {
      const found = videos.find((v: any) => v.video_code === code);
      setVideo(found);
      setLoading(false);
    });
  }, [code]);

  if (loading) return <div className="text-center py-20 text-lg text-muted-foreground">Loading...</div>;
  if (!video) return <div className="text-center py-20 text-lg text-red-500">Video not found.</div>;

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <button
        className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-base shadow-md hover:bg-primary/20 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
        onClick={() => navigate(-1)}
        type="button"
        aria-label="Go back"
      >
        <ArrowLeft className="w-6 h-6 font-bold" />
        <span className="font-semibold tracking-wide">Back</span>
      </button>
      <VideoPlayer videoUrl={video.video_url} thumbnail={video.poster_url || "/placeholder.svg"} />
      <div className="mt-8 bg-card rounded-2xl shadow-elevated border border-border p-6">
        <h2 className="text-2xl font-bold mb-2 text-white">
          <span className="text-primary">({video.video_code})</span> {video.title_en}
        </h2>
        <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
          {video.runtime_mins && <span>Duration: <b>{video.runtime_mins} min</b></span>}
          {video.release_date && <span>Release: <b>{video.release_date}</b></span>}
        </div>
        {video.actresses && video.actresses.length > 0 && (
          <div className="mb-2">
            <b>Actresses:</b> {
              video.actresses
                .map((a: any, i: number) => (
                  <Link
                    key={a.id || a.name_romaji}
                    to={`/search?actress=${encodeURIComponent(a.name_romaji)}`}
                    className="text-primary hover:underline hover:text-primary/80 transition-colors"
                  >
                    {a.name_romaji}
                  </Link>
                ))
                .reduce((prev: any, curr: any) => [prev, ', ', curr])
            }
          </div>
        )}
        {video.categories && video.categories.length > 0 && (
          <div className="mb-2">
            <b>Categories:</b> {
              video.categories
                .map((c: any, i: number) => (
                  <Link
                    key={c.id || c.name_en}
                    to={`/search?category=${encodeURIComponent(c.name_en)}`}
                    className="text-primary hover:underline hover:text-primary/80 transition-colors"
                  >
                    {c.name_en}
                  </Link>
                ))
                .reduce((prev: any, curr: any) => [prev, ', ', curr])
            }
          </div>
        )}
        {video.directors && video.directors.length > 0 && (
          <div className="mb-2"><b>Directors:</b> {video.directors.map((d: any) => d.name_romaji).join(", ")}</div>
        )}
        {video.series_en && <div className="mb-2"><b>Series:</b> {video.series_en}</div>}
        {video.maker_en && (
          <div className="mb-2">
            <b>Maker:</b> <Link to={`/search?maker=${encodeURIComponent(video.maker_en)}`} className="text-primary hover:underline hover:text-primary/80 transition-colors">{video.maker_en}</Link>
          </div>
        )}
        {video.label_en && (
          <div className="mb-2">
            <b>Label:</b> <Link to={`/search?label=${encodeURIComponent(video.label_en)}`} className="text-primary hover:underline hover:text-primary/80 transition-colors">{video.label_en}</Link>
          </div>
        )}
        {video.galleries && video.galleries.length > 0 && (
          <div className="mt-4">
            <b>Gallery:</b>
            <div className="flex flex-wrap gap-2 mt-2">
              {video.galleries.map((g: any, i: number) => (
                <img
                  key={i}
                  src={g.image_thumb}
                  alt="Gallery"
                  className="w-24 h-16 object-cover rounded-lg border border-border cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => {
                    setPopupImg(g.image_full || g.image_thumb);
                    setPopupIdx(i);
                  }}
                />
              ))}
            </div>
            {/* Popup Modal */}
            {popupImg && popupIdx !== null && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={() => { setPopupImg(null); setPopupIdx(null); }}
              >
                <div className="relative flex items-center" onClick={e => e.stopPropagation()}>
                  {/* Prev Button */}
                  {video.galleries.length > 1 && (
                    <button
                      className="absolute left-[-3rem] top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/70 text-white rounded-full shadow-lg hover:bg-primary/90 hover:scale-110 hover:ring-2 hover:ring-primary transition-all duration-200 text-2xl font-bold"
                      onClick={() => {
                        const prevIdx = (popupIdx - 1 + video.galleries.length) % video.galleries.length;
                        setPopupImg(video.galleries[prevIdx].image_full || video.galleries[prevIdx].image_thumb);
                        setPopupIdx(prevIdx);
                      }}
                      aria-label="Previous image"
                      type="button"
                    >
                      &#8592;
                    </button>
                  )}
                  {/* Close Button */}
                  <button
                    className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center bg-black/80 text-white rounded-full shadow-lg hover:bg-primary/90 hover:scale-110 hover:ring-2 hover:ring-primary transition-all duration-200 text-2xl font-bold"
                    onClick={() => { setPopupImg(null); setPopupIdx(null); }}
                    aria-label="Close image popup"
                  >
                    ×
                  </button>
                  <img
                    src={popupImg}
                    alt="Gallery Full"
                    className="max-w-[90vw] max-h-[80vh] rounded-xl shadow-lg border border-border"
                  />
                  {/* Next Button */}
                  {video.galleries.length > 1 && (
                    <button
                      className="absolute right-[-3rem] top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/70 text-white rounded-full shadow-lg hover:bg-primary/90 hover:scale-110 hover:ring-2 hover:ring-primary transition-all duration-200 text-2xl font-bold"
                      onClick={() => {
                        const nextIdx = (popupIdx + 1) % video.galleries.length;
                        setPopupImg(video.galleries[nextIdx].image_full || video.galleries[nextIdx].image_thumb);
                        setPopupIdx(nextIdx);
                      }}
                      aria-label="Next image"
                      type="button"
                    >
                      &#8594;
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoDetailView;
