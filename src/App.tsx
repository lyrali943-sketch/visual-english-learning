import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Background from './components/Background';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import TopicLab from './pages/TopicLab';
import SpeakingArena from './pages/SpeakingArena';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import AnswerFrameworkView from './features/answer-framework/AnswerFrameworkView';
import type { Topic } from './data/topics';
import { getSettings } from './services/storage';
import { setSoundEnabled as setAudioSoundEnabled } from './services/audio';

type Page = 'home' | 'topics' | 'arena' | 'progress' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showFramework, setShowFramework] = useState<Topic | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const settings = getSettings();
    setSoundEnabledState(settings.soundEnabled);
    setReducedMotion(settings.reducedMotion);
    setAudioSoundEnabled(settings.soundEnabled);

    // Check system preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setReducedMotion(true);
    }
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    setSelectedTopic(null);
  };

  const handleStartPractice = (topic: Topic) => {
    setSelectedTopic(topic);
    setCurrentPage('arena');
  };

  const handleShowFramework = (topic: Topic) => {
    setShowFramework(topic);
  };

  const handleToggleSound = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabledState(newEnabled);
    setAudioSoundEnabled(newEnabled);
  };

  const handleSettingsChange = (settings: { soundEnabled: boolean; reducedMotion: boolean }) => {
    setSoundEnabledState(settings.soundEnabled);
    setReducedMotion(settings.reducedMotion);
    setAudioSoundEnabled(settings.soundEnabled);
  };

  return (
    <div className="min-h-screen bg-[#08090D] text-white">
      <Background />
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      <main className="relative z-10">
        {currentPage === 'home' && (
          <Home
            onNavigate={handleNavigate}
            onStartPractice={handleStartPractice}
            onShowFramework={handleShowFramework}
            reducedMotion={reducedMotion}
          />
        )}
        {currentPage === 'topics' && (
          <TopicLab onStartPractice={handleStartPractice} />
        )}
        {currentPage === 'arena' && selectedTopic && (
          <SpeakingArena
            topic={selectedTopic}
            onBack={() => setCurrentPage('home')}
            onShowFramework={handleShowFramework}
          />
        )}
        {currentPage === 'progress' && (
          <Progress onNavigate={handleNavigate} />
        )}
        {currentPage === 'settings' && (
          <Settings
            onBack={() => setCurrentPage('home')}
            onSettingsChange={handleSettingsChange}
          />
        )}
      </main>

      {/* Answer Framework Modal */}
      <AnimatePresence>
        {showFramework && (
          <AnswerFrameworkView
            topic={showFramework}
            onClose={() => setShowFramework(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
