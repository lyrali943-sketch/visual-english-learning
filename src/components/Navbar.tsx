import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, FlaskConical, BarChart3, Volume2, VolumeX, Settings, Menu, X } from 'lucide-react';
import { sounds } from '../services/audio';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function Navbar({ currentPage, onNavigate, soundEnabled, onToggleSound }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'topics', label: 'Topic Lab', icon: FlaskConical },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
  ];

  const handleNav = (page: string) => {
    sounds.click();
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#08090D]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#6D5DFB] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">NEON SPEAK</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentPage === item.id
                    ? 'bg-[#8B5CF6]/15 text-[#A78BFA]'
                    : 'text-[#9695A8] hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onToggleSound();
                sounds.click();
              }}
              className="p-2 rounded-lg text-[#9695A8] hover:text-white hover:bg-white/[0.05] transition-colors"
              aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              onClick={() => handleNav('settings')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'settings'
                  ? 'text-[#A78BFA] bg-[#8B5CF6]/15'
                  : 'text-[#9695A8] hover:text-white hover:bg-white/[0.05]'
              }`}
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#9695A8] hover:text-white hover:bg-white/[0.05] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/[0.06] bg-[#0B0C12]/95 backdrop-blur-xl"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === item.id
                      ? 'bg-[#8B5CF6]/15 text-[#A78BFA]'
                      : 'text-[#9695A8] hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
