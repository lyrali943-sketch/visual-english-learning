import { motion } from 'framer-motion';
import { ArrowRight, Flame, Clock, Heart, BookOpen } from 'lucide-react';
import TopicGenerator from '../features/topic-generator/TopicGenerator';
import { getPracticeHistory, getFavorites } from '../services/storage';
import { getTopicById } from '../data/topics';
import type { Topic } from '../data/topics';

interface HomeProps {
  onNavigate: (page: string) => void;
  onStartPractice: (topic: Topic) => void;
  onShowFramework: (topic: Topic) => void;
  reducedMotion: boolean;
}

export default function Home({ onNavigate, onStartPractice, onShowFramework, reducedMotion }: HomeProps) {
  const history = getPracticeHistory();
  const favorites = getFavorites();

  // Calculate streak
  const calculateStreak = (): number => {
    if (history.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let checkDate = new Date(today);

    for (let i = 0; i < 365; i++) {
      const hasPractice = history.some(h => {
        const d = new Date(h.practicedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === checkDate.getTime();
      });
      if (hasPractice) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Today doesn't count yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();
  const todayPractice = history.filter(h => {
    const d = new Date(h.practicedAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const recentTopics = history.slice(0, 3).map(h => h.topic);
  const favoriteTopics = favorites.slice(0, 3).map(id => getTopicById(id)).filter(Boolean) as Topic[];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: reducedMotion ? 0 : 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <motion.p variants={itemVariants} className="text-[#A78BFA] text-sm font-medium tracking-wider uppercase mb-4">
            Your Daily Speaking Session
          </motion.p>
          <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0D1020] mb-4 tracking-tight">
            Think faster.<br />
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#6D5DFB] bg-clip-text text-transparent">
              Speak with confidence.
            </span>
          </motion.h1>
          <motion.p variants={itemVariants} className="text-[#5B6479] text-lg max-w-2xl mx-auto mb-8">
            Practice real-world topics, build clear arguments, and improve your spoken English one question at a time.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D5DFB] text-white font-medium hover:shadow-lg hover:shadow-[#8B5CF6]/25 transition-all"
            >
              Start Practicing
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => onNavigate('topics')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#F1F4F9] border border-[#E4E8F0] text-[#0D1020] font-medium hover:bg-[#EAEFF7] transition-colors"
            >
              Explore Topics
            </button>
          </motion.div>
        </motion.div>

        {/* Topic Generator */}
        <motion.div
          id="generator"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reducedMotion ? 0 : 0.3 }}
          className="mb-16"
        >
          <TopicGenerator
            onStartPractice={onStartPractice}
            onShowFramework={onShowFramework}
            reducedMotion={reducedMotion}
          />
        </motion.div>

        {/* Stats & Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reducedMotion ? 0 : 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Today's Practice */}
          <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center">
                <Clock size={18} className="text-[#A78BFA]" />
              </div>
              <span className="text-[#5B6479] text-sm">Today's Practice</span>
            </div>
            <p className="text-3xl font-bold text-[#0D1020]">{todayPractice.length}</p>
            <p className="text-[#7B8497] text-xs mt-1">sessions completed</p>
          </div>

          {/* Streak */}
          <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#16A34A]/15 flex items-center justify-center">
                <Flame size={18} className="text-[#16A34A]" />
              </div>
              <span className="text-[#5B6479] text-sm">Practice Streak</span>
            </div>
            <p className="text-3xl font-bold text-[#0D1020]">{streak}</p>
            <p className="text-[#7B8497] text-xs mt-1">{streak === 1 ? 'day' : 'days'} in a row</p>
          </div>

          {/* Total Sessions */}
          <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#6D5DFB]/15 flex items-center justify-center">
                <BookOpen size={18} className="text-[#A78BFA]" />
              </div>
              <span className="text-[#5B6479] text-sm">Total Sessions</span>
            </div>
            <p className="text-3xl font-bold text-[#0D1020]">{history.length}</p>
            <p className="text-[#7B8497] text-xs mt-1">all time</p>
          </div>

          {/* Favorites */}
          <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
                <Heart size={18} className="text-pink-400" />
              </div>
              <span className="text-[#5B6479] text-sm">Favorites</span>
            </div>
            <p className="text-3xl font-bold text-[#0D1020]">{favorites.length}</p>
            <p className="text-[#7B8497] text-xs mt-1">saved topics</p>
          </div>
        </motion.div>

        {/* Recent & Favorites */}
        {(recentTopics.length > 0 || favoriteTopics.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : 0.7 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"
          >
            {/* Recent Topics */}
            {recentTopics.length > 0 && (
              <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6">
                <h3 className="text-[#0D1020] font-semibold mb-4">Recent Topics</h3>
                <div className="space-y-3">
                  {recentTopics.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => onStartPractice(topic)}
                      className="w-full text-left p-3 rounded-xl bg-[#F7F9FC] hover:bg-[#F1F4F9] transition-colors group"
                    >
                      <p className="text-[#5B6479] text-sm line-clamp-2 group-hover:text-[#0D1020] transition-colors">
                        {topic.question}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite Topics */}
            {favoriteTopics.length > 0 && (
              <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6">
                <h3 className="text-[#0D1020] font-semibold mb-4">Favorite Topics</h3>
                <div className="space-y-3">
                  {favoriteTopics.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => onStartPractice(topic)}
                      className="w-full text-left p-3 rounded-xl bg-[#F7F9FC] hover:bg-[#F1F4F9] transition-colors group"
                    >
                      <p className="text-[#5B6479] text-sm line-clamp-2 group-hover:text-[#0D1020] transition-colors">
                        {topic.question}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Empty state for new users */}
        {history.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reducedMotion ? 0 : 0.9 }}
            className="text-center py-12"
          >
            <p className="text-[#7B8497] text-sm">
              Your practice history will appear here after your first session.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
