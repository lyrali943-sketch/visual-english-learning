import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Heart, Play, Shuffle, X } from 'lucide-react';
import { TOPICS, type Topic } from '../data/topics';
import { CATEGORIES, QUESTION_TYPES, DIFFICULTIES } from '../data/categories';
import { isFavorite, toggleFavorite } from '../services/storage';
import { sounds } from '../services/audio';
interface TopicLabProps {
  onStartPractice: (topic: Topic) => void;
}

export default function TopicLab({ onStartPractice }: TopicLabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(isFavorite.length ? JSON.parse(localStorage.getItem('neon_speak_favorites') || '[]') : []);

  const filteredTopics = useMemo(() => {
    let result = TOPICS;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.question.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter(t => t.category === selectedCategory);
    }

    if (selectedType !== 'all') {
      result = result.filter(t => t.questionType === selectedType);
    }

    if (selectedDifficulty !== 'all') {
      result = result.filter(t => t.difficulty === selectedDifficulty);
    }

    if (showFavoritesOnly) {
      result = result.filter(t => favorites.includes(t.id));
    }

    return result;
  }, [searchQuery, selectedCategory, selectedType, selectedDifficulty, showFavoritesOnly, favorites]);

  const handleToggleFavorite = (topicId: string) => {
    sounds.click();
    const isNowFav = toggleFavorite(topicId);
    if (isNowFav) {
      setFavorites([...favorites, topicId]);
    } else {
      setFavorites(favorites.filter(id => id !== topicId));
    }
  };

  const handleRandomTopic = () => {
    sounds.click();
    if (filteredTopics.length > 0) {
      const random = filteredTopics[Math.floor(Math.random() * filteredTopics.length)];
      onStartPractice(random);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedType('all');
    setSelectedDifficulty('all');
    setShowFavoritesOnly(false);
  };

  const getCategoryName = (id: string) => CATEGORIES.find(c => c.id === id)?.name || id;
  const getTypeName = (id: string) => QUESTION_TYPES.find(t => t.id === id)?.shortName || id;

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Explore Your Next Topic</h1>
          <p className="text-[#9695A8]">Find a question. Build an argument. Make your point.</p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#12121C] border border-white/[0.08] rounded-2xl p-4 sm:p-6 mb-6"
        >
          {/* Search */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6A7C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics by keyword..."
              className="w-full bg-[#0B0C12] border border-white/[0.08] rounded-xl pl-12 pr-4 py-3 text-white placeholder-[#6B6A7C] focus:outline-none focus:border-[#8B5CF6]/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6A7C] hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#0B0C12] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#9695A8] focus:outline-none focus:border-[#8B5CF6]/50 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#0B0C12] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#9695A8] focus:outline-none focus:border-[#8B5CF6]/50 cursor-pointer"
            >
              <option value="all">All Types</option>
              {QUESTION_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-[#0B0C12] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#9695A8] focus:outline-none focus:border-[#8B5CF6]/50 cursor-pointer"
            >
              <option value="all">All Difficulties</option>
              {DIFFICULTIES.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFavoritesOnly
                  ? 'bg-pink-500/15 text-pink-400'
                  : 'bg-[#0B0C12] border border-white/[0.08] text-[#9695A8] hover:text-white'
              }`}
            >
              <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
              Favorites
            </button>

            <button
              onClick={handleRandomTopic}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6D5DFB] text-white text-sm font-medium hover:opacity-90 transition-opacity ml-auto"
            >
              <Shuffle size={14} />
              Random Topic
            </button>
          </div>

          {/* Active filters */}
          {(selectedCategory !== 'all' || selectedType !== 'all' || selectedDifficulty !== 'all' || searchQuery || showFavoritesOnly) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.06]">
              <span className="text-[#6B6A7C] text-xs">Active filters:</span>
              {searchQuery && (
                <span className="px-2 py-1 rounded bg-[#8B5CF6]/15 text-[#A78BFA] text-xs">"{searchQuery}"</span>
              )}
              {selectedCategory !== 'all' && (
                <span className="px-2 py-1 rounded bg-[#8B5CF6]/15 text-[#A78BFA] text-xs">{getCategoryName(selectedCategory)}</span>
              )}
              {selectedType !== 'all' && (
                <span className="px-2 py-1 rounded bg-[#8B5CF6]/15 text-[#A78BFA] text-xs">{getTypeName(selectedType)}</span>
              )}
              {selectedDifficulty !== 'all' && (
                <span className="px-2 py-1 rounded bg-[#8B5CF6]/15 text-[#A78BFA] text-xs">{selectedDifficulty}</span>
              )}
              {showFavoritesOnly && (
                <span className="px-2 py-1 rounded bg-pink-500/15 text-pink-400 text-xs">Favorites</span>
              )}
              <button
                onClick={clearFilters}
                className="text-[#6B6A7C] text-xs hover:text-white ml-auto"
              >
                Clear all
              </button>
            </div>
          )}
        </motion.div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[#6B6A7C] text-sm">
            {filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Topic Grid */}
        {filteredTopics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.5) }}
                className="group bg-[#12121C] border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.14] hover:-translate-y-1 transition-all duration-200"
              >
                {/* Category & Difficulty */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#A78BFA] text-xs font-medium">
                    {getCategoryName(topic.category)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    topic.difficulty === 'Easy' ? 'bg-[#C7F36B]/15 text-[#C7F36B]' :
                    topic.difficulty === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    {topic.difficulty}
                  </span>
                </div>

                {/* Question */}
                <p className="text-white text-sm leading-relaxed mb-4 line-clamp-3">
                  {topic.question}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-[#6B6A7C] mb-4">
                  <span>{getTypeName(topic.questionType)}</span>
                  <span>•</span>
                  <span>Prep: {topic.preparationTime}s</span>
                  <span>•</span>
                  <span>Speak: {topic.speakingTime}s</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      sounds.click();
                      onStartPractice(topic);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#8B5CF6]/15 text-[#A78BFA] text-sm font-medium hover:bg-[#8B5CF6]/25 transition-colors"
                  >
                    <Play size={14} />
                    Practice
                  </button>
                  <button
                    onClick={() => handleToggleFavorite(topic.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      favorites.includes(topic.id)
                        ? 'bg-pink-500/15 text-pink-400'
                        : 'bg-white/[0.06] text-[#6B6A7C] hover:text-white'
                    }`}
                    aria-label={favorites.includes(topic.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart size={16} fill={favorites.includes(topic.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-[#6B6A7C] text-lg mb-2">No topics found</p>
            <p className="text-[#6B6A7C] text-sm mb-4">Try adjusting your filters or search query</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-lg bg-[#8B5CF6]/15 text-[#A78BFA] text-sm font-medium hover:bg-[#8B5CF6]/25 transition-colors"
            >
              Clear Filters
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
