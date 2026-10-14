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

  /* The bar used to switch between a dark and a light theme, which is what let
     the practice flow drift away from the rest of the product. NEON SPEAK is a
     single light workspace now, so there is nothing to switch. */
  const bar = 'border-[#0D1020]/[0.07] bg-white/85';
  const wordmark = 'text-[#0D1020]';
  const idle = 'text-[#5B6479] hover:text-[#0D1020] hover:bg-[#0D1020]/[0.04]';
  const active = 'bg-[#7C3AED]/10 text-[#7C3AED]';
  const idleIcon = 'text-[#64748B] hover:text-[#0D1020]';
  const mobilePanel = 'border-t border-[#0D1020]/[0.07] bg-white/95';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl ${bar}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#6D5DFB] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className={`font-semibold text-lg tracking-tight ${wordmark}`}>NEON SPEAK</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentPage === item.id ? active : idle
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
              className={`p-2 rounded-lg transition-colors ${idle}`}
              aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              onClick={() => handleNav('settings')}
              className={`p-2 rounded-lg transition-colors ${currentPage === 'settings' ? active : idle}`}
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${idleIcon}`}
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
            className={`md:hidden backdrop-blur-xl ${mobilePanel}`}
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === item.id ? active : idle
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
