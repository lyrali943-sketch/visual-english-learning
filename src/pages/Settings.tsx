import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Zap, Trash2, Info } from 'lucide-react';
import { getSettings, saveSettings, clearAllData } from '../services/storage';
import { setSoundEnabled, sounds } from '../services/audio';
import { useState } from 'react';

interface SettingsProps {
  onBack: () => void;
  onSettingsChange: (settings: { soundEnabled: boolean; reducedMotion: boolean }) => void;
}

export default function Settings({ onBack, onSettingsChange }: SettingsProps) {
  const [settings, setSettings] = useState(getSettings());
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleToggleSound = () => {
    const newEnabled = !settings.soundEnabled;
    setSoundEnabled(newEnabled);
    setSettings({ ...settings, soundEnabled: newEnabled });
    saveSettings({ soundEnabled: newEnabled });
    onSettingsChange({ ...settings, soundEnabled: newEnabled });
    if (newEnabled) sounds.click();
  };

  const handleToggleMotion = () => {
    const newReduced = !settings.reducedMotion;
    setSettings({ ...settings, reducedMotion: newReduced });
    saveSettings({ reducedMotion: newReduced });
    onSettingsChange({ ...settings, reducedMotion: newReduced });
    sounds.click();
  };

  const handleClearAll = () => {
    clearAllData();
    setShowConfirmClear(false);
    onBack();
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-[#5B6479] hover:text-[#0D1020] hover:bg-[#F4F6FA] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#0D1020]">Settings</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Audio */}
          <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
            <h3 className="text-[#0D1020] font-semibold mb-4">Audio</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.soundEnabled ? (
                  <Volume2 size={18} className="text-[#A78BFA]" />
                ) : (
                  <VolumeX size={18} className="text-[#7B8497]" />
                )}
                <div>
                  <p className="text-[#0D1020] text-sm">Sound Effects</p>
                  <p className="text-[#7B8497] text-xs">UI feedback sounds</p>
                </div>
              </div>
              <button
                onClick={handleToggleSound}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.soundEnabled ? 'bg-[#8B5CF6]' : 'bg-[#EAEFF7]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Accessibility */}
          <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
            <h3 className="text-[#0D1020] font-semibold mb-4">Accessibility</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap size={18} className="text-[#A78BFA]" />
                <div>
                  <p className="text-[#0D1020] text-sm">Reduce Motion</p>
                  <p className="text-[#7B8497] text-xs">Minimize animations</p>
                </div>
              </div>
              <button
                onClick={handleToggleMotion}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.reducedMotion ? 'bg-[#8B5CF6]' : 'bg-[#EAEFF7]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    settings.reducedMotion ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Data */}
          <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
            <h3 className="text-[#0D1020] font-semibold mb-4">Data</h3>
            <button
              onClick={() => setShowConfirmClear(true)}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={18} />
              <div className="text-left">
                <p className="text-sm">Clear All Data</p>
                <p className="text-xs opacity-70">Delete all practice history and settings</p>
              </div>
            </button>
          </div>

          {/* About */}
          <div className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-5">
            <h3 className="text-[#0D1020] font-semibold mb-4">About</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Info size={16} className="text-[#7B8497]" />
                <div>
                  <p className="text-[#5B6479]">NEON SPEAK v1.0.0</p>
                  <p className="text-[#7B8497] text-xs">TOEFL Speaking Practice Platform</p>
                </div>
              </div>
              <p className="text-[#7B8497] text-xs leading-relaxed">
                Randomize. Think. Speak. Improve.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Clear Confirmation */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#FFFFFF] border border-[#E4E8F0] rounded-2xl p-6 max-w-sm w-full"
          >
            <h3 className="text-[#0D1020] font-semibold mb-2">Clear All Data?</h3>
            <p className="text-[#5B6479] text-sm mb-6">
              This will permanently delete all your practice history, favorites, and settings.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-[#F1F4F9] text-[#0D1020] text-sm hover:bg-[#EAEFF7] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
