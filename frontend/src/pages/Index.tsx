import { useEffect } from "react";
import Header from "@/components/Header";
import FloatingShapes from "@/components/FloatingShapes";
import HeroSection from "@/components/HeroSection";
import VideoGallery from "@/components/VideoGallery";

const Index = () => {
  useEffect(() => {
    // SEO meta tags
    document.title = "JAVault - Personalized Video Streaming Platform";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Discover and watch personalized videos on JAVault. Find your perfect content with our curated collection of tutorials, documentaries, and creative content.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <FloatingShapes />
      <Header />
      
      <main>
        <HeroSection />
        <VideoGallery />
      </main>
    </div>
  );
};

export default Index;
