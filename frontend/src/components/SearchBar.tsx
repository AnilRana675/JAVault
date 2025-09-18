import React, { useState } from 'react';
import { scrapeVideo } from '../services/api';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const SearchBar: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await scrapeVideo(input.trim());
      setInput('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to queue video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex gap-2 mb-4 w-full max-w-xl mx-auto items-center"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="relative flex-1 group">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Search className="w-5 h-5" />
        </span>
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter video code..."
          required
          disabled={loading}
          className="h-14 w-full rounded-3xl border border-input bg-background px-5 py-3 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-lg pl-12 pr-4 transition-shadow duration-300 group-hover:shadow-glow group-focus-within:shadow-glow focus:shadow-glow hover:shadow-glow"
        />
      </div>
      {error && (
        <motion.div
          className="text-red-500 text-sm mt-2 w-full text-center absolute left-0 top-full"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}
    </motion.form>
  );
};

export default SearchBar;
