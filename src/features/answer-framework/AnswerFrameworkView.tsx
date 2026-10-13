import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen, Lightbulb, MessageSquare, AlertTriangle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import type { Topic } from '../../data/topics';
import { generateAnswer, getAnswerLengthInfo, type AnswerLength } from '../../services/answerGenerator';
import { sounds } from '../../services/audio';

interface AnswerFrameworkViewProps {
  topic: Topic;
  onClose: () => void;
}

export default function AnswerFrameworkView({ topic, onClose }: AnswerFrameworkViewProps) {
  const [answerLength, setAnswerLength] = useState<AnswerLength>('standard');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    analysis: true,
    framework: true,
    answer: false,
    tips: false,
  });

  const answer = generateAnswer(topic, answerLength);
  const lengthInfo = getAnswerLengthInfo(answerLength);

  const toggleSection = (section: string) => {
    sounds.click();
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const timeMismatch = answer.modelAnswer.estimatedDuration > topic.speakingTime;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#12121C] border border-white/[0.08] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#12121C] border-b border-white/[0.06] p-6 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Answer Framework</h2>
            <p className="text-[#6B6A7C] text-sm">{topic.question}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9695A8] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Length Selector */}
          <div className="flex items-center gap-2">
            {(['short', 'standard', 'extended'] as AnswerLength[]).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  sounds.click();
                  setAnswerLength(mode);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  answerLength === mode
                    ? 'bg-[#8B5CF6]/20 text-[#A78BFA]'
                    : 'bg-white/[0.06] text-[#9695A8] hover:text-white'
                }`}
              >
                {getAnswerLengthInfo(mode).label}
              </button>
            ))}
            <span className="text-[#6B6A7C] text-xs ml-auto">
              {lengthInfo.wordRange} • ~{answer.modelAnswer.estimatedDuration}s
            </span>
          </div>

          {/* Time mismatch warning */}
          {timeMismatch && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm">
              <AlertTriangle size={16} />
              Estimated speaking time ({answer.modelAnswer.estimatedDuration}s) exceeds target ({topic.speakingTime}s)
            </div>
          )}

          {/* Analysis Section */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('analysis')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Lightbulb size={18} className="text-[#A78BFA]" />
                <span className="text-white font-medium">Analysis</span>
              </div>
              {expandedSections.analysis ? <ChevronUp size={16} className="text-[#6B6A7C]" /> : <ChevronDown size={16} className="text-[#6B6A7C]" />}
            </button>
            {expandedSections.analysis && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                className="px-4 pb-4"
              >
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-[#6B6A7C] text-xs mb-1">Recommended Reasons</p>
                    <div className="flex gap-2">
                      {answer.analysis.recommendedReasons.map(r => (
                        <span key={r.id} className="px-2 py-1 rounded bg-[#8B5CF6]/15 text-[#A78BFA] text-xs">
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[#6B6A7C] text-xs mb-1">Rationale</p>
                    <p className="text-[#9695A8]">{answer.analysis.reasonRationale}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Framework Section */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('framework')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen size={18} className="text-[#A78BFA]" />
                <span className="text-white font-medium">Framework</span>
              </div>
              {expandedSections.framework ? <ChevronUp size={16} className="text-[#6B6A7C]" /> : <ChevronDown size={16} className="text-[#6B6A7C]" />}
            </button>
            {expandedSections.framework && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                className="px-4 pb-4"
              >
                <div className="space-y-3">
                  {[
                    { label: 'Opening', content: answer.framework.opening },
                    { label: 'Reason 1', content: answer.framework.reason1 },
                    { label: 'Example 1', content: answer.framework.example1 },
                    { label: 'Reason 2', content: answer.framework.reason2 },
                    { label: 'Example 2', content: answer.framework.example2 },
                    { label: 'Closing', content: answer.framework.closing },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-[#8B5CF6] text-xs font-medium w-20 shrink-0 pt-0.5">{item.label}</span>
                      <p className="text-[#9695A8] text-sm">{item.content}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Model Answer Section */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('answer')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={18} className="text-[#A78BFA]" />
                <span className="text-white font-medium">Model Answer</span>
              </div>
              {expandedSections.answer ? <ChevronUp size={16} className="text-[#6B6A7C]" /> : <ChevronDown size={16} className="text-[#6B6A7C]" />}
            </button>
            {expandedSections.answer && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                className="px-4 pb-4"
              >
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={14} className="text-[#6B6A7C]" />
                      <span className="text-[#6B6A7C] text-xs">
                        {answer.modelAnswer.wordCount} words • ~{answer.modelAnswer.estimatedDuration}s
                      </span>
                    </div>
                    <p className="text-[#9695A8] text-sm leading-relaxed">
                      {answer.modelAnswer.text}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-white/[0.06]">
                    <p className="text-[#6B6A7C] text-xs mb-1">Translation</p>
                    <p className="text-[#9695A8] text-sm">
                      {answer.modelAnswer.translation}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Tips Section */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('tips')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-[#C7F36B]" />
                <span className="text-white font-medium">Practice Tips</span>
              </div>
              {expandedSections.tips ? <ChevronUp size={16} className="text-[#6B6A7C]" /> : <ChevronDown size={16} className="text-[#6B6A7C]" />}
            </button>
            {expandedSections.tips && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                className="px-4 pb-4"
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-[#6B6A7C] text-xs mb-2">Key Vocabulary</p>
                    <div className="flex flex-wrap gap-2">
                      {answer.tips.keyVocabulary.map((v, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-[#8B5CF6]/10 text-[#A78BFA] text-xs">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[#6B6A7C] text-xs mb-2">Replaceable Expressions</p>
                    <ul className="space-y-1">
                      {answer.tips.replaceableExpressions.map((e, i) => (
                        <li key={i} className="text-[#9695A8] text-xs">• {e}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[#6B6A7C] text-xs mb-2">Common Mistakes</p>
                    <ul className="space-y-1">
                      {answer.tips.commonMistakes.map((m, i) => (
                        <li key={i} className="text-[#9695A8] text-xs">• {m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
