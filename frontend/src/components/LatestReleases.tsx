import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoCard from "./VideoCard";

const LatestReleases = () => {
  const videos = [
    {
      title: "Creative Workflow Masterclass",
      duration: "45m",
      rating: "4.8",
      thumbnail: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=225&fit=crop",
      category: "Tutorial"
    },
    {
      title: "Behind the Scenes: Tech Innovation",
      duration: "32m", 
      rating: "4.6",
      thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=225&fit=crop",
      category: "Documentary"
    },
    {
      title: "Design Thinking Workshop",
      duration: "1h 15m",
      rating: "4.9",
      thumbnail: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=225&fit=crop",
      category: "Workshop"
    },
    {
      title: "Future of AI Technology",
      duration: "28m",
      rating: "4.7",
      thumbnail: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=225&fit=crop",
      category: "Tech Talk"
    },
    {
      title: "Productivity Hacks for Creators",
      duration: "38m",
      rating: "4.5",
      thumbnail: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=225&fit=crop",
      category: "Productivity"
    },
    {
      title: "Mindful Workspace Design",
      duration: "42m",
      rating: "4.8",
      thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=225&fit=crop",
      category: "Lifestyle"
    }
  ];

  return (
    <section className="px-6 pb-20 animate-fade-in" style={{ animationDelay: '0.6s' }}>
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8 animate-scale-in" style={{ animationDelay: '0.8s' }}>
          <h2 className="text-3xl font-bold hover:scale-105 transition-transform duration-200">Latest Releases</h2>
          <Button variant="ghost" className="text-primary hover:text-primary/80 hover:scale-105 transition-all duration-200 hover:shadow-glow">
            View more
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video, index) => (
            <div 
              key={index} 
              className="animate-fade-in hover-scale"
              style={{ animationDelay: `${1 + index * 0.1}s` }}
            >
              <VideoCard {...video} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestReleases;