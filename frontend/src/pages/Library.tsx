import Header from "@/components/Header";
import VideoGallery from "@/components/VideoGallery";

const Library = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <h2 className="text-3xl font-bold mb-8 text-center text-white drop-shadow-glow">Library</h2>
        <VideoGallery />
      </main>
    </div>
  );
};

export default Library;
