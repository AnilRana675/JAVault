import { FileText, Video, Image as ImageIcon, Music } from "lucide-react";

const FloatingShapes = () => {
  const shapes = [
    { Icon: FileText, delay: "0s", position: "top-20 left-[10%]" },
    { Icon: Video, delay: "2s", position: "top-32 right-[15%]" },
    { Icon: ImageIcon, delay: "1s", position: "top-48 left-[20%]" },
    { Icon: Music, delay: "3s", position: "top-64 right-[25%]" },
    { Icon: FileText, delay: "1.5s", position: "top-80 left-[5%]" },
    { Icon: Video, delay: "2.5s", position: "top-96 right-[10%]" },
    { Icon: ImageIcon, delay: "0.5s", position: "top-[400px] left-[30%]" },
    { Icon: Music, delay: "3.5s", position: "top-[450px] right-[30%]" },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {shapes.map((shape, index) => (
        <div
          key={index}
          className={`absolute ${shape.position} opacity-10 ${
            index % 2 === 0 ? "animate-float" : "animate-float-delayed"
          } hover:opacity-20 transition-opacity duration-300`}
          style={{ animationDelay: shape.delay }}
        >
          <div className="p-6 bg-card/20 rounded-2xl backdrop-blur-sm border border-border/20 hover:scale-110 hover:rotate-12 transition-all duration-500 hover:bg-card/30 hover:shadow-glow">
            <shape.Icon className="w-8 h-8 text-primary hover:text-primary/80 transition-colors duration-300" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default FloatingShapes;