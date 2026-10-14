import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Trash2, TrendingUp, Award, Target } from 'lucide-react';
import { getPracticeHistory, clearPracticeHistory } from '../services/storage';
import { CATEGORIES } from '../data/categories';
import { formatTime } from '../utils/random';
import { sounds } from '../services/audio';

interface ProgressProps {
  onNavigate: (page: string) => void;
}

export default function Progress({ onNavigate }: ProgressProps) {
  const [history, setHistory] = useState(getPracticeHistory());
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const stats = useMemo(() => {
    const totalSessions = history.length;
    const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
    const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

    // Last 7 days activity
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      const count = history.filter(h => {
        const d = new Date(h.practicedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === date.getTime();
      }).length;
      return { date, count };
    });

    // Category distribution
    const categoryCount: Record<string, number> = {};
    history.forEach(h => {
      categoryCount[h.topic.category] = (categoryCount[h.topic.category] || 0) + 1;
    });

    // Streak
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
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        } else {
          break;
        }
      }
      return streak;
    };

    // Practiced topics percentage
    const uniqueTopics = new Set(history.map(h => h.topicId));
    const practicedPercentage = Math.round((uniqueTopics.size / 104) * 100);

    return {
      totalSessions,
      totalDuration,
      avgDuration,
      last7Days,
      categoryCount,
      streak: calculateStreak(),
      practicedPercentage,
      uniqueTopics: uniqueTopics.size,
    };
  }, [history]);

  const handleClearHistory = () => {
    sounds.click();
    clearPracticeHistory();
    setHistory([]);
    setShowConfirmClear(false);
  };

  const maxDayCount = Math.max(...stats.last7Days.map(d => d.count), 1);

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0D1020] mb-2">Your Progress</h1>
            <p className="text-[#5B6479]">Track your speaking practice journey</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setShowConfirmClear(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={16} />
              Clear History
            </button>
          )}
        </motion.div>

        {history.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-2xl bg-[#8B5CF6]/10 flex items-center justify-center mx-auto mb-6">
              <BarChart3 size={36} className="text-[#A78BFA]" />
            </div>
            <h2 className="text-xl font-semibold text-[#0D1020] mb-2">No Practice Data Yet</h2>
            <p className="text-[#5B6479] mb-6 max-w-md mx-auto">
              Start practicing to see your progress, statistics, and achievements here.
            </p>
            <button
              onClick={() => onNavigate('home')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D5DFB] text-white font-medium hover:shadow-lg hover:shadow-[#8B5CF6]/25 transition-all"
            >
              Start Your First Session
            </button>
          </motion.div>
        ) : (
          <>
            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            >
              <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-[#A78BFA]" />
                  <span className="text-[#5B6479] text-xs">Total Sessions</span>
                </div>
                <p className="text-2xl font-bold text-[#0D1020]">{stats.totalSessions}</p>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-[#16A34A]" />
                  <span className="text-[#5B6479] text-xs">Total Time</span>
                </div>
                <p className="text-2xl font-bold text-[#0D1020]">{formatTime(stats.totalDuration)}</p>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-[#A78BFA]" />
                  <span className="text-[#5B6479] text-xs">Avg Duration</span>
                </div>
                <p className="text-2xl font-bold text-[#0D1020]">{stats.avgDuration}s</p>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={16} className="text-[#16A34A]" />
                  <span className="text-[#5B6479] text-xs">Streak</span>
                </div>
                <p className="text-2xl font-bold text-[#0D1020]">{stats.streak} days</p>
              </div>
            </motion.div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Weekly Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6"
              >
                <h3 className="text-[#0D1020] font-semibold mb-4">Last 7 Days</h3>
                <div className="flex items-end gap-2 h-32">
                  {stats.last7Days.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(day.count / maxDayCount) * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#8B5CF6] to-[#6D5DFB] min-h-[4px]"
                        style={{ minHeight: day.count > 0 ? '8px' : '4px' }}
                      />
                      <span className="text-[#7B8497] text-xs">
                        {day.date.toLocaleDateString('en', { weekday: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Category Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6"
              >
                <h3 className="text-[#0D1020] font-semibold mb-4">Topic Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(stats.categoryCount)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([cat, count]) => {
                      const category = CATEGORIES.find(c => c.id === cat);
                      const percentage = Math.round((count / stats.totalSessions) * 100);
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#5B6479]">{category?.name || cat}</span>
                            <span className="text-[#7B8497]">{count} ({percentage}%)</span>
                          </div>
                          <div className="h-1.5 bg-[#F1F4F9] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ delay: 0.5 }}
                              className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#6D5DFB] rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            </div>

            {/* Topic Coverage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6"
            >
              <h3 className="text-[#0D1020] font-semibold mb-4">Topic Coverage</h3>
              <div className="flex items-center gap-4 mb-2">
                <div className="flex-1 h-2 bg-[#F1F4F9] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.practicedPercentage}%` }}
                    transition={{ delay: 0.6 }}
                    className="h-full bg-gradient-to-r from-[#16A34A] to-[#8B5CF6] rounded-full"
                  />
                </div>
                <span className="text-[#5B6479] text-sm">{stats.practicedPercentage}%</span>
              </div>
              <p className="text-[#7B8497] text-xs">
                You've practiced {stats.uniqueTopics} out of 104 topics
              </p>
            </motion.div>
          </>
        )}

        {/* Clear Confirmation Modal */}
        {showConfirmClear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6 max-w-sm w-full"
            >
              <h3 className="text-[#0D1020] font-semibold mb-2">Clear All History?</h3>
              <p className="text-[#5B6479] text-sm mb-6">
                This will permanently delete all your practice records. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#F1F4F9] text-[#0D1020] text-sm hover:bg-[#EAEFF7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearHistory}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
