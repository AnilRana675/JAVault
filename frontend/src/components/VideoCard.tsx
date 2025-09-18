import { Play, Clock, Star, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import VideoPlayer from "./VideoPlayer";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";

type Actress = {
  id: number;
  name_romaji: string;
};
type Category = {
  id: number;
  name_en: string;
};

interface VideoCardProps {
  title: string;
  thumbnail: string;
  videoCode?: string;
  runtimeMins?: number;
  releaseDate?: string;
  actresses?: Actress[];
  categories?: Category[];
  onDelete?: (videoCode: string) => void;
}

const VideoCard = ({ title, thumbnail, videoCode, runtimeMins, releaseDate, actresses, categories, onDelete }: VideoCardProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (!videoCode || !onDelete) return;
    
    if (confirm(`Are you sure you want to delete video ${videoCode}?`)) {
      try {
        onDelete(videoCode);
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete video');
      }
    }
  };
  return (
    <motion.div
      whileHover={{ 
        scale: 1.08, 
        y: -15,
        rotateY: 3,
        rotateX: 2 
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 25,
        mass: 0.8
      }}
      className="group cursor-pointer perspective-1000"
      style={{ borderRadius: '1rem', transformStyle: 'preserve-3d' }}
      onClick={() => videoCode && navigate(`/video/${videoCode}`)}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-elevated transition-all duration-700 transform-gpu"
        whileHover={{ 
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 2px hsl(var(--primary) / 0.6), 0 0 40px hsl(var(--primary) / 0.3)"
        }}
        transition={{ 
          type: "spring", 
          stiffness: 280, 
          damping: 22,
          mass: 0.6
        }}
        style={{ borderRadius: '1rem' }}
      >
        <div className="aspect-[16/9] relative overflow-hidden">
          {isAdmin && videoCode && onDelete && (
            <motion.button
              onClick={handleDelete}
              className="absolute top-2 right-2 z-30 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 400,
                damping: 20
              }}
            >
              <Trash2 className="w-4 h-4 text-white" />
            </motion.button>
          )}
          <motion.img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover select-none transition-all duration-700"
            whileHover={{ 
              scale: 1.15,
              filter: "brightness(1.1) contrast(1.05) saturate(1.15)"
            }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 25,
              mass: 0.9
            }}
            draggable={false}
            style={{ display: 'block' }}
          />
          <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-600"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.div 
            className="absolute inset-0 flex items-center justify-center z-20"
            initial={{ opacity: 0, scale: 0.4, rotate: -180 }}
            whileHover={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 400,
              damping: 15,
              delay: 0.1
            }}
          >
            <motion.div 
              className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-2xl backdrop-blur-sm border-2 border-white/20"
              whileHover={{ 
                scale: 1.25,
                rotate: 360,
                boxShadow: "0 0 60px hsl(var(--primary) / 0.9), 0 0 100px hsl(var(--primary) / 0.4)"
              }}
              transition={{ 
                type: "spring",
                stiffness: 350,
                damping: 12,
                rotate: { duration: 0.8, ease: "easeInOut" }
              }}
            >
              <motion.div
                whileHover={{ scale: 1.15 }}
                transition={{ type: "spring", stiffness: 500, damping: 10 }}
              >
                <Play className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
        <motion.div 
          className="p-6 transform transition-all duration-600"
          initial={{ y: 6, opacity: 0.9 }}
          whileHover={{ y: 0, opacity: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 350,
            damping: 22,
            delay: 0.05
          }}
        >
          <motion.h3 
            className="font-semibold text-lg mb-3 line-clamp-2 transform origin-left transition-all duration-500"
            whileHover={{ 
              scale: 1.03, 
              color: "hsl(var(--primary))",
              textShadow: "0 0 25px hsl(var(--primary) / 0.4)"
            }}
            transition={{ 
              type: "spring",
              stiffness: 350,
              damping: 20
            }}
          >
            {videoCode && <span className="text-primary">({videoCode}) </span>}{title}
          </motion.h3>
          {/* Runtime and release date */}
          <motion.div 
            className="flex flex-wrap gap-2 mb-3"
            initial={{ opacity: 0.8, y: 4 }}
            whileHover={{ opacity: 1, y: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 400,
              damping: 25,
              delay: 0.1
            }}
          >
            {runtimeMins && (
              <motion.div 
                className="bg-background/90 backdrop-blur-sm text-foreground text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 border border-border/50"
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: "hsl(var(--primary) / 0.1)",
                  borderColor: "hsl(var(--primary) / 0.3)"
                }}
                transition={{ 
                  type: "spring",
                  stiffness: 400,
                  damping: 20
                }}
              >
                <Clock className="w-3 h-3" />
                <span>{runtimeMins} min</span>
              </motion.div>
            )}
            {releaseDate && (
              <motion.div 
                className="bg-background/90 backdrop-blur-sm text-foreground text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 border border-border/50"
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: "hsl(var(--primary) / 0.1)",
                  borderColor: "hsl(var(--primary) / 0.3)"
                }}
                transition={{ 
                  type: "spring",
                  stiffness: 400,
                  damping: 20
                }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>{releaseDate}</span>
              </motion.div>
            )}
          </motion.div>
          {/* Up to 2 actresses */}
          {actresses && actresses.length > 0 && (
            <motion.div 
              className="flex flex-wrap gap-1.5 mb-3"
              initial={{ opacity: 0.8, x: -4 }}
              whileHover={{ opacity: 1, x: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 400,
                damping: 25,
                delay: 0.15
              }}
            >
              {actresses.slice(0,2).map((a, index) => (
                <motion.span 
                  key={a.id} 
                  className="bg-primary/20 text-primary text-xs px-2.5 py-1 rounded-full font-medium border border-primary/20"
                  whileHover={{ 
                    scale: 1.1,
                    backgroundColor: "hsl(var(--primary) / 0.3)",
                    borderColor: "hsl(var(--primary) / 0.5)"
                  }}
                  transition={{ 
                    type: "spring",
                    stiffness: 500,
                    damping: 15,
                    delay: index * 0.05
                  }}
                >
                  {a.name_romaji}
                </motion.span>
              ))}
            </motion.div>
          )}
          {/* Up to 2 categories */}
          {categories && categories.length > 0 && (
            <motion.div 
              className="flex flex-wrap gap-1.5"
              initial={{ opacity: 0.8, x: -4 }}
              whileHover={{ opacity: 1, x: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 400,
                damping: 25,
                delay: 0.2
              }}
            >
              {categories.slice(0,2).map((c, index) => (
                <motion.span 
                  key={c.id} 
                  className="bg-muted/80 text-muted-foreground text-xs px-2.5 py-1 rounded-full border border-muted"
                  whileHover={{ 
                    scale: 1.08,
                    backgroundColor: "hsl(var(--muted) / 1)",
                    color: "hsl(var(--foreground))"
                  }}
                  transition={{ 
                    type: "spring",
                    stiffness: 500,
                    damping: 15,
                    delay: index * 0.05
                  }}
                >
                  {c.name_en}
                </motion.span>
              ))}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default VideoCard;
