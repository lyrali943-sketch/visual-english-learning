import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Play, RotateCcw, BookOpen, ChevronRight } from 'lucide-react';
import { TOPICS, type Topic } from '../../data/topics';
import { CATEGORIES, QUESTION_TYPES } from '../../data/categories';
import { getRandomTopic } from '../../utils/random';
import { getRecentTopicIds, addRecentTopicId } from '../../services/storage';
import { sounds } from '../../services/audio';

type GeneratorState = 'idle' | 'spinning' | 'locked';

interface TopicGeneratorProps {
  onStartPractice: (topic: Topic) => void;
  onShowFramework: (topic: Topic) => void;
  reducedMotion: boolean;
}

export default function TopicGenerator({ onStartPractice, onShowFramework, reducedMotion }: TopicGeneratorProps) {
  const [state, setState] = useState<GeneratorState>('idle');
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [_displayTopics, setDisplayTopics] = useState<Topic[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const intervalRef = useRef<number | null>(null);
  const scrollSpeedRef = useRef<number>(50);

  const getFilteredTopics = useCallback(() => {
    let filtered = TOPICS;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.questionType === selectedType);
    }
    return filtered;
  }, [selectedCategory, selectedType]);

  const stopScrolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startGeneration = useCallback(() => {
    if (state === 'spinning') return;

    sounds.generateStart();
    setState('spinning');

    const filtered = getFilteredTopics();
    const recentIds = getRecentTopicIds();

    // Pick the final result first
    const finalTopic = getRandomTopic(filtered, recentIds);
    if (!finalTopic) return;

    // Create display topics for animation
    const animationTopics: Topic[] = [];
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);

    // Add random topics before the final one
    for (let i = 0; i < 12; i++) {
      animationTopics.push(shuffled[i % shuffled.length]);
    }
    // Add the final topic
    animationTopics.push(finalTopic);

    setDisplayTopics(animationTopics);
    setCurrentTopic(null);

    // Start fast scrolling
    let index = 0;
    scrollSpeedRef.current = reducedMotion ? 30 : 60;

    const scroll = () => {
      if (index < animationTopics.length - 1) {
        setCurrentTopic(animationTopics[index]);
        sounds.scroll();
        index++;

        // Gradually slow down
        if (index > animationTopics.length * 0.6) {
          scrollSpeedRef.current *= 1.15;
        }

        intervalRef.current = window.setTimeout(scroll, scrollSpeedRef.current) as unknown as number;
      } else {
        // Lock on final topic
        setCurrentTopic(finalTopic);
        setState('locked');
        sounds.lock();
        addRecentTopicId(finalTopic.id);
      }
    };

    intervalRef.current = window.setTimeout(scroll, scrollSpeedRef.current) as unknown as number;
  }, [state, getFilteredTopics, reducedMotion]);

  const resetGenerator = useCallback(() => {
    stopScrolling();
    setState('idle');
    setCurrentTopic(null);
    setDisplayTopics([]);
  }, [stopScrolling]);

  useEffect(() => {
    return () => stopScrolling();
  }, [stopScrolling]);

  const getCategoryName = (id: string) => CATEGORIES.find(c => c.id === id)?.name || id;
  const getTypeName = (id: string) => QUESTION_TYPES.find(t => t.id === id)?.shortName || id;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Filter Row */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-lg px-3 py-2 text-sm text-[#5B6479] focus:outline-none focus:border-[#8B5CF6]/50 cursor-pointer"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-lg px-3 py-2 text-sm text-[#5B6479] focus:outline-none focus:border-[#8B5CF6]/50 cursor-pointer"
        >
          <option value="all">All Types</option>
          {QUESTION_TYPES.map(type => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
      </div>

      {/* Main Generator Display */}
      <div className="relative">
        {/* Glow effect */}
        <AnimatePresence>
          {state === 'spinning' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -inset-4 bg-gradient-to-r from-[#8B5CF6]/20 via-[#6D5DFB]/20 to-[#8B5CF6]/20 rounded-3xl blur-2xl"
            />
          )}
        </AnimatePresence>

        <div className="relative bg-[#FFFFFF]/80 backdrop-blur-sm border border-[#E4E8F0] rounded-2xl p-6 sm:p-8 min-h-[280px] flex flex-col items-center justify-center">
          {/* Idle state */}
          {state === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#6D5DFB]/20 border border-[#8B5CF6]/30 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-[#A78BFA]" size={28} />
              </div>
              <p className="text-[#5B6479] text-sm">Ready to generate a topic?</p>
              <p className="text-[#7B8497] text-xs mt-1">Click the button below to get started</p>
            </motion.div>
          )}

          {/* Spinning / Locked state */}
          {(state === 'spinning' || state === 'locked') && currentTopic && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full"
            >
              {/* Topic display */}
              <div className="text-center mb-6">
                <motion.p
                  key={currentTopic.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#0D1020] text-lg sm:text-xl font-medium leading-relaxed"
                >
                  {currentTopic.question}
                </motion.p>
              </div>

              {/* Locked state - show details */}
              <AnimatePresence>
                {state === 'locked' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {/* Meta info */}
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                      <span className="px-3 py-1 rounded-full bg-[#8B5CF6]/15 text-[#A78BFA] text-xs font-medium">
                        {getCategoryName(currentTopic.category)}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#F1F4F9] text-[#5B6479] text-xs font-medium">
                        {getTypeName(currentTopic.questionType)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        currentTopic.difficulty === 'Easy' ? 'bg-[#16A34A]/15 text-[#16A34A]' :
                        currentTopic.difficulty === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' :
                        'bg-red-500/15 text-red-400'
                      }`}>
                        {currentTopic.difficulty}
                      </span>
                    </div>

                    {/* Time info */}
                    <div className="flex gap-4 justify-center mb-6 text-xs text-[#7B8497]">
                      <span>Prep: {currentTopic.preparationTime}s</span>
                      <span>•</span>
                      <span>Speak: {currentTopic.speakingTime}s</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => {
                          sounds.click();
                          onStartPractice(currentTopic);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D5DFB] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        <Play size={16} />
                        Start Practice
                      </button>
                      <button
                        onClick={() => {
                          sounds.click();
                          onShowFramework(currentTopic);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F1F4F9] border border-[#E4E8F0] text-[#0D1020] text-sm font-medium hover:bg-[#EAEFF7] transition-colors"
                      >
                        <BookOpen size={16} />
                        Show Framework
                      </button>
                      <button
                        onClick={() => {
                          sounds.click();
                          resetGenerator();
                          setTimeout(startGeneration, 100);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F1F4F9] border border-[#E4E8F0] text-[#5B6479] text-sm font-medium hover:bg-[#EAEFF7] hover:text-[#0D1020] transition-colors"
                      >
                        <RotateCcw size={16} />
                        Generate Again
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Generate Button */}
      {state !== 'locked' && (
        <div className="mt-6 text-center">
          <button
            onClick={startGeneration}
            disabled={state === 'spinning'}
            className={`group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-[#0D1020] font-semibold text-base transition-all duration-300 ${
              state === 'spinning'
                ? 'bg-[#8B5CF6]/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#8B5CF6] to-[#6D5DFB] hover:shadow-lg hover:shadow-[#8B5CF6]/25 hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {state === 'spinning' ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles size={20} />
                </motion.div>
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate Topic
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
