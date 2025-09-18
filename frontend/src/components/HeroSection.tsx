import { Button } from "@/components/ui/button";
import SearchBar from "./SearchBar";

const HeroSection = () => {
  return (
    <section className="relative pt-44 pb-20 px-6">
      <div className="container mx-auto text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-12 leading-tight">
            What would you like to{" "}
            <span className="gradient-primary bg-clip-text text-transparent">
              watch
            </span>{" "}
            this morning?
          </h1>

          <div className="max-w-2xl mx-auto mb-10 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <SearchBar />
          </div>
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in mt-12 mb-0" style={{ animationDelay: '0.4s' }}>
            <Button variant="category" className="rounded-full hover:scale-105 transition-transform duration-200">
              Videos
            </Button>
            <Button variant="category" className="rounded-full hover:scale-105 transition-transform duration-200">
              Documentaries
            </Button>
            <Button variant="category" className="rounded-full hover:scale-105 transition-transform duration-200">
              Editor Picks
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;