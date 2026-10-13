import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Pause, Square, Mic, RotateCcw,
  BookOpen, Heart, AlertCircle, Check, SkipForward,
} from 'lucide-react';
import type { Topic } from '../data/topics';
import { CATEGORIES } from '../data/categories';
import { RecorderService, type RecordingResult } from '../services/recorder';
import { formatTime } from '../utils/random';
import { savePracticeRecord, isFavorite, toggleFavorite } from '../services/storage';
import { sounds } from '../services/audio';
import { generateAnswer } from '../services/answerGenerator';

type SessionPhase = 'preparation' | 'speaking' | 'review';

const PHASE_STEPS: { id: SessionPhase; label: string }[] = [
  { id: 'preparation', label: 'Preparation' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'review', label: 'Review' },
];

const PREP_OPTIONS = [15, 30, 60];
const SPEAK_OPTIONS = [30, 45, 60];

interface SpeakingArenaProps {
  topic: Topic;
  onBack: () => void;
  onShowFramework: (topic: Topic) => void;
}

export default function SpeakingArena({ topic, onBack, onShowFramework }: SpeakingArenaProps) {
  const [phase, setPhase] = useState<SessionPhase>('preparation');
  const [prepTime, setPrepTime] = useState(15);
  const [speakTime, setSpeakTime] = useState(45);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isRunning, setIsRunning] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [recording, setRecording] = useState<RecordingResult | null>(null);
  const [selfRating, setSelfRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [isFav, setIsFav] = useState(() => isFavorite(topic.id));
  const [micError, setMicError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [customSpeak, setCustomSpeak] = useState('');

  const recorderRef = useRef(new RecorderService());
  // Deadline-based timing: immune to interval drift and background-tab throttling.
  const deadlineRef = useRef<number | null>(null);
  const timeLeftRef = useRef(15);
  const prepTimeRef = useRef(15);
  const speakTimeRef = useRef(45);
  const lastBeepRef = useRef<number | null>(null);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Wire recorder callbacks once.
  useEffect(() => {
    const recorder = recorderRef.current;
    recorder.onStateChange = (state) => {
      if (state.error) setMicError(state.error);
    };
    recorder.onVolumeLevel = (level) => setVolumeLevel(level);
    return () => {
      recorder.cancelRecording();
    };
  }, []);

  // Stable transitions — no dependency arrays to get wrong.
  const beginSpeaking = useCallback(() => {
    const duration = speakTimeRef.current;
    setPhase('speaking');
    setTimeLeft(duration);
    deadlineRef.current = Date.now() + duration * 1000;
    lastBeepRef.current = null;
    setIsRunning(true);
    sounds.click();
    recorderRef.current.startRecording().then((ok) => {
      if (ok) sounds.recordingStart();
    });
  }, []);

  const finishSpeaking = useCallback(() => {
    deadlineRef.current = null;
    setIsRunning(false);
    recorderRef.current.stopRecording().then((result) => {
      if (result) {
        sounds.recordingStop();
        setRecording(result);
      }
      setPhase('review');
    });
  }, []);

  const startPreparation = useCallback(() => {
    const duration = prepTimeRef.current;
    sounds.click();
    setPhase('preparation');
    setTimeLeft(duration);
    deadlineRef.current = Date.now() + duration * 1000;
    lastBeepRef.current = null;
    setIsRunning(true);
  }, []);

  // Single ticker driving the whole session.
  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline == null) return;

      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining > 0 && remaining <= 5 && lastBeepRef.current !== remaining) {
        lastBeepRef.current = remaining;
        sounds.countdownEnd();
      }

      if (remaining === 0) {
        lastBeepRef.current = null;
        if (phase === 'preparation') beginSpeaking();
        else if (phase === 'speaking') finishSpeaking();
      }
    };

    const id = window.setInterval(tick, 200);
    tick();
    return () => window.clearInterval(id);
  }, [isRunning, phase, beginSpeaking, finishSpeaking]);

  const selectPrepTime = (seconds: number) => {
    sounds.click();
    setPrepTime(seconds);
    prepTimeRef.current = seconds;
    if (!isRunning) {
      deadlineRef.current = null;
      setTimeLeft(seconds);
    }
  };

  const selectSpeakTime = (seconds: number) => {
    sounds.click();
    setSpeakTime(seconds);
    speakTimeRef.current = seconds;
    setCustomSpeak('');
    if (!isRunning) {
      deadlineRef.current = null;
      setTimeLeft(seconds);
    }
  };

  const applyCustomSpeak = () => {
    const parsed = Number(customSpeak);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.min(300, Math.max(10, Math.round(parsed)));
    setSpeakTime(clamped);
    speakTimeRef.current = clamped;
    setCustomSpeak('');
    if (!isRunning) {
      deadlineRef.current = null;
      setTimeLeft(clamped);
    }
  };

  const handlePauseResume = () => {
    if (isRunning) {
      sounds.click();
      deadlineRef.current = null;
      setIsRunning(false);
      recorderRef.current.pauseRecording();
    } else {
      sounds.click();
      deadlineRef.current = Date.now() + timeLeftRef.current * 1000;
      lastBeepRef.current = null;
      setIsRunning(true);
      recorderRef.current.resumeRecording();
    }
  };

  const handleSave = () => {
    sounds.click();
    savePracticeRecord({
      id: Date.now().toString(),
      topicId: topic.id,
      topic,
      practicedAt: Date.now(),
      duration: recording?.duration || speakTime,
      preparationTime: prepTime,
      speakingTime: speakTime,
      selfRating,
      notes,
      hasRecording: !!recording,
    });
    onBack();
  };

  const handleToggleFavorite = () => {
    sounds.click();
    setIsFav(toggleFavorite(topic.id));
  };

  const handleRetry = () => {
    sounds.click();
    deadlineRef.current = null;
    lastBeepRef.current = null;
    setIsRunning(false);
    setPhase('preparation');
    setTimeLeft(prepTimeRef.current);
    setRecording(null);
    setSelfRating(0);
    setNotes('');
    setVolumeLevel(0);
    setShowAnswer(false);
  };

  const generatedAnswer = showAnswer ? generateAnswer(topic) : null;
  const categoryName = CATEGORIES.find((c) => c.id === topic.category)?.name || topic.category;
  const phaseIndex = PHASE_STEPS.findIndex((s) => s.id === phase);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#9695A8] transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              aria-pressed={isFav}
              aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                isFav
                  ? 'bg-pink-500/15 text-pink-400'
                  : 'bg-white/[0.06] text-[#6B6A7C] hover:bg-white/[0.1] hover:text-white'
              }`}
            >
              <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => onShowFramework(topic)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm font-medium text-[#9695A8] transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              <BookOpen size={16} />
              Framework
            </button>
          </div>
        </div>

        {/* Phase stepper */}
        <ol className="mb-6 flex items-center gap-2" aria-label="Session progress">
          {PHASE_STEPS.map((step, i) => {
            const done = i < phaseIndex;
            const active = i === phaseIndex;
            return (
              <li key={step.id} className="flex flex-1 items-center gap-2">
                <span
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    done
                      ? 'bg-[#8B5CF6]/60'
                      : active
                        ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D5DFB]'
                        : 'bg-white/[0.08]'
                  }`}
                />
                <span
                  className={`text-[11px] font-medium tracking-wide ${
                    active ? 'text-[#C4B5FD]' : done ? 'text-[#9695A8]' : 'text-[#6B6A7C]'
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Topic card */}
        <div className="mb-8 rounded-2xl border border-white/[0.08] bg-[#12121C] p-5 sm:p-6">
          <p className="text-base leading-relaxed text-white sm:text-lg">{topic.question}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#6B6A7C]">
            <span className="rounded-full bg-[#8B5CF6]/15 px-2.5 py-1 font-medium text-[#A78BFA]">
              {categoryName}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 font-medium ${
                topic.difficulty === 'Easy'
                  ? 'bg-[#C7F36B]/15 text-[#C7F36B]'
                  : topic.difficulty === 'Medium'
                    ? 'bg-yellow-500/15 text-yellow-400'
                    : 'bg-red-500/15 text-red-400'
              }`}
            >
              {topic.difficulty}
            </span>
            <span>Prep {topic.preparationTime}s</span>
            <span>·</span>
            <span>Speak {topic.speakingTime}s</span>
          </div>
        </div>

        {/* Phase: Preparation */}
        <AnimatePresence mode="wait">
          {phase === 'preparation' && (
            <motion.section
              key="prep"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-white/[0.08] bg-[#12121C] p-6 text-center sm:p-8"
            >
              <p className="text-sm font-medium tracking-wide text-[#9695A8]">
                Preparation Time
              </p>

              <p
                className="my-5 font-bold tabular-nums text-white text-6xl sm:text-7xl"
                aria-live="polite"
              >
                {formatTime(isRunning ? timeLeft : prepTime)}
              </p>

              <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
                {PREP_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => selectPrepTime(t)}
                    aria-pressed={prepTime === t}
                    className={`min-w-[4rem] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      prepTime === t
                        ? 'bg-[#8B5CF6]/20 text-[#A78BFA]'
                        : 'bg-white/[0.06] text-[#9695A8] hover:bg-white/[0.1] hover:text-white'
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowHints((v) => !v)}
                aria-expanded={showHints}
                className="text-sm font-medium text-[#A78BFA] transition-colors hover:text-[#C4B5FD]"
              >
                {showHints ? 'Hide hints' : 'Show hints'}
              </button>

              {showHints && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-xl bg-[#8B5CF6]/10 p-4 text-left">
                    <p className="mb-2 text-sm font-medium text-[#A78BFA]">Quick Tips</p>
                    <ul className="space-y-1.5 text-sm text-[#9695A8]">
                      <li>· State your main point clearly in the first sentence</li>
                      <li>· Use two reasons, each with one concrete example</li>
                      <li>· Reserve the last few seconds for a short conclusion</li>
                    </ul>
                  </div>
                </motion.div>
              )}

              <div className="mt-7 flex flex-col items-center gap-3">
                {!isRunning && (
                  <button
                    onClick={startPreparation}
                    className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6D5DFB] px-8 py-4 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#8B5CF6]/25 active:translate-y-0"
                  >
                    <Play size={20} />
                    Start Preparation
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={beginSpeaking}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-[#9695A8] transition-colors hover:bg-white/[0.1] hover:text-white"
                  >
                    <SkipForward size={16} />
                    Start speaking now
                  </button>
                )}
              </div>
            </motion.section>
          )}

          {/* Phase: Speaking */}
          {phase === 'speaking' && (
            <motion.section
              key="speak"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-white/[0.08] bg-[#12121C] p-6 text-center sm:p-8"
            >
              <p className="text-sm font-medium tracking-wide text-[#9695A8]">Speaking</p>

              <p
                className="my-5 font-bold tabular-nums text-white text-6xl sm:text-7xl"
                aria-live="polite"
              >
                {formatTime(timeLeft)}
              </p>
              <p className="mb-6 text-xs text-[#6B6A7C]">
                {isRunning ? 'remaining' : 'paused'}
              </p>

              {/* Live level meter driven by real microphone input */}
              <div className="mb-6 flex h-12 items-center justify-center gap-1" aria-hidden="true">
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.span
                    key={i}
                    animate={{
                      height: volumeLevel > i / 24 ? '100%' : '18%',
                      backgroundColor:
                        volumeLevel > 0.7 ? '#C7F36B' : volumeLevel > 0.3 ? '#8B5CF6' : '#2A2A38',
                    }}
                    transition={{ duration: 0.08 }}
                    className="w-1.5 rounded-full"
                  />
                ))}
              </div>

              <div className="mb-7 flex min-h-[24px] items-center justify-center gap-2 text-sm">
                {micError ? (
                  <span className="inline-flex items-center gap-2 text-yellow-400">
                    <AlertCircle size={16} />
                    {micError}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 text-[#C7F36B]">
                    <Mic size={16} />
                    {isRunning ? 'Recording…' : 'Recording paused'}
                  </span>
                )}
              </div>

              <div className="mb-7 flex items-center justify-center gap-4">
                <button
                  onClick={handlePauseResume}
                  aria-label={isRunning ? 'Pause recording' : 'Resume recording'}
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.08] text-white transition-colors hover:bg-white/[0.14]"
                >
                  {isRunning ? <Pause size={22} /> : <Play size={22} />}
                </button>
                <button
                  onClick={finishSpeaking}
                  aria-label="Stop recording"
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30"
                >
                  <Square size={22} />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/[0.06] pt-5">
                {SPEAK_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => selectSpeakTime(t)}
                    aria-pressed={speakTime === t}
                    className={`min-w-[4rem] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      speakTime === t
                        ? 'bg-[#8B5CF6]/20 text-[#A78BFA]'
                        : 'bg-white/[0.06] text-[#9695A8] hover:bg-white/[0.1] hover:text-white'
                    }`}
                  >
                    {t}s
                  </button>
                ))}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={10}
                    max={300}
                    inputMode="numeric"
                    value={customSpeak}
                    onChange={(e) => setCustomSpeak(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyCustomSpeak();
                    }}
                    placeholder="Custom"
                    aria-label="Custom speaking time in seconds"
                    className="h-8 w-24 rounded-lg border border-white/[0.08] bg-[#0B0C12] px-2 text-center text-xs text-white placeholder-[#6B6A7C] focus:border-[#8B5CF6]/50 focus:outline-none"
                  />
                  <button
                    onClick={applyCustomSpeak}
                    className="h-8 rounded-lg bg-white/[0.06] px-3 text-xs font-medium text-[#9695A8] transition-colors hover:bg-white/[0.1] hover:text-white"
                  >
                    Set
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {/* Phase: Review */}
          {phase === 'review' && (
            <motion.section
              key="review"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#12121C] p-5 sm:p-6">
                <h3 className="mb-5 font-semibold text-white">Session Review</h3>

                <div className="mb-5 flex items-center gap-5">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {recording ? formatTime(recording.duration) : '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B6A7C]">Actual</p>
                  </div>
                  <span className="h-8 w-px bg-white/[0.08]" />
                  <div>
                    <p className="text-2xl font-bold text-white">{formatTime(speakTime)}</p>
                    <p className="mt-0.5 text-xs text-[#6B6A7C]">Target</p>
                  </div>
                </div>

                {recording && (
                  <div className="mb-5">
                    <p className="mb-2 text-sm text-[#9695A8]">Recording</p>
                    <audio controls src={recording.url} className="h-10 w-full" />
                  </div>
                )}

                <div className="mb-5">
                  <p className="mb-2 text-sm text-[#9695A8]">Self Rating</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setSelfRating(n)}
                        aria-pressed={selfRating === n}
                        className={`h-10 w-10 rounded-lg text-sm font-medium transition-colors ${
                          selfRating >= n
                            ? 'bg-[#8B5CF6]/20 text-[#A78BFA]'
                            : 'bg-white/[0.06] text-[#6B6A7C] hover:bg-white/[0.1] hover:text-white'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm text-[#9695A8]">Practice Notes</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What went well? What could be improved?"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#0B0C12] p-3 text-sm text-white placeholder-[#6B6A7C] focus:border-[#8B5CF6]/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleSave}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D5DFB] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
                >
                  <Check size={18} />
                  Save Session
                </button>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.06] px-6 py-3 font-medium text-white transition-colors hover:bg-white/[0.1]"
                >
                  <RotateCcw size={18} />
                  Try Again
                </button>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setShowAnswer((v) => !v)}
                  aria-expanded={showAnswer}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#A78BFA] transition-colors hover:text-[#C4B5FD]"
                >
                  <BookOpen size={16} />
                  {showAnswer ? 'Hide' : 'Show'} Model Answer
                </button>

                {showAnswer && generatedAnswer && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#12121C] p-5 sm:p-6">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="font-semibold text-white">Model Answer</h4>
                        <span className="text-xs text-[#6B6A7C]">
                          {generatedAnswer.modelAnswer.wordCount} words · ~
                          {generatedAnswer.modelAnswer.estimatedDuration}s
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-[#9695A8]">
                        {generatedAnswer.modelAnswer.text}
                      </p>
                      <div className="mt-4 border-t border-white/[0.06] pt-4">
                        <p className="mb-1 text-xs text-[#6B6A7C]">Translation</p>
                        <p className="text-sm text-[#9695A8]">
                          {generatedAnswer.modelAnswer.translation}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
