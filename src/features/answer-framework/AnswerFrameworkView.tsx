import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  X, Lightbulb, MessageSquare, Languages, RefreshCw, Loader2,
  AlertTriangle, Sparkles, FlaskConical, ChevronDown, Target, ShieldAlert,
  ScrollText, BookOpen, Quote, AlignLeft, Tags, Check,
} from 'lucide-react';
import type { Topic } from '../../data/topics';
import {
  getSpeakingPlan,
  peekSpeakingPlan,
  type AnswerResult,
} from '../../services/answerGenerator';
import { sounds } from '../../services/audio';
import '../../styles/speaking.css';

interface AnswerFrameworkViewProps {
  topic: Topic;
  onClose: () => void;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  opinion: 'Opinion',
  discussion: 'Discussion',
  preference: 'Preference',
  compare: 'Compare',
  solution: 'Solution',
  problem_solution: 'Problem → Solution',
};

type SectionKey = 'analysis' | 'arguments' | 'language' | 'modelAnswer';

function Section({
  icon,
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="spk-section">
      <button type="button" onClick={onToggle} aria-expanded={open} className="spk-section-head">
        <span className="flex min-w-0 items-center gap-3">
          <span className="spk-section-icon">{icon}</span>
          <span className="min-w-0">
            <span className="spk-section-title block truncate">{title}</span>
            {hint && <span className="spk-section-hint block truncate">{hint}</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="spk-section-toggle">{open ? 'Hide' : 'Show'}</span>
          <ChevronDown size={16} className={`spk-chevron ${open ? 'spk-chevron-open' : ''}`} />
        </span>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-5 pt-1 sm:px-5">{children}</div>
        </motion.div>
      )}
    </section>
  );
}

/**
 * Clearly-labelled wrapper so invented practice material can never read as a
 * real study, statistic or person's experience.
 */
function ScenarioBlock({ scenario }: { scenario: AnswerResult['arguments'][number]['scenario'] }) {
  const flagged = scenario.isHypothetical === true;

  return (
    <div className="spk-scenario">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="spk-scenario-badge">
          <FlaskConical size={11} />
          Invented practice scenario
        </span>
        <span className="spk-scenario-note">
          Made up for rehearsal — not a real study, person or event
        </span>
      </div>

      <dl className="spk-dl">
        {[
          ['Situation', scenario.setup],
          ['Action', scenario.action],
          ['Result', scenario.result],
          ['Why it answers the question', scenario.whyItSupports],
        ].map(([label, value]) => (
          <div key={label} className="spk-dl-row">
            <dt className="spk-dl-key">{label}</dt>
            <dd className="spk-dl-val">{value}</dd>
          </div>
        ))}
      </dl>

      {!flagged && (
        <p className="spk-note spk-note-warn mt-3">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <span>
            The coach did not mark this as hypothetical — treat the whole scenario as invented.
          </span>
        </p>
      )}
    </div>
  );
}

/** Restrained skeleton used only while there is nothing to show yet. */
function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-14 text-center">
      <span className="spk-spin text-[#2563eb]">
        <Loader2 size={26} />
      </span>
      <div>
        <p className="spk-title !text-base">Analysing this question…</p>
        <p className="spk-muted mt-1 max-w-xs">
          The coach reads the whole question, then builds two argument directions for it.
        </p>
      </div>
      <div className="w-full max-w-md space-y-3" aria-hidden="true">
        <div className="spk-skel h-3 w-full" />
        <div className="spk-skel h-3 w-11/12" />
        <div className="spk-skel h-3 w-3/4" />
      </div>
    </div>
  );
}

export default function AnswerFrameworkView({ topic, onClose }: AnswerFrameworkViewProps) {
  const [result, setResult] = useState<AnswerResult | null>(() => peekSpeakingPlan(topic) ?? null);
  const [loading, setLoading] = useState(() => peekSpeakingPlan(topic) === null);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    analysis: true,
    arguments: true,
    language: true,
    modelAnswer: false,
  });

  // Guards against a late response for a previous question overwriting the
  // current one when the learner switches topics quickly.
  const requestSeq = useRef(0);
  const topicIdRef = useRef(topic.id);

  const load = useCallback(
    async (force: boolean) => {
      const seq = ++requestSeq.current;
      topicIdRef.current = topic.id;
      if (force) sounds.click();
      setLoading(true);
      const next = await getSpeakingPlan(topic, force);
      if (seq !== requestSeq.current) return;
      setResult(next);
      setLoading(false);
    },
    [topic],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // The modal is portalled to <body> so it always paints above the fixed
  // navbar (which lives outside <main>'s stacking context), and the page
  // behind it cannot scroll while it is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Escape closes the coach.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = (key: SectionKey) => {
    sounds.click();
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAi = result?.source === 'ai';
  const shownArguments = result?.arguments.slice(0, 2) ?? [];

  return createPortal(
    <div
      className="spk-scope spk-modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Speaking Coach"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="spk-panel"
      >
        {/* ---------------------------------------------------------- Header */}
        <header className="spk-panel-head">
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
            <div className="spk-head-title">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="spk-kicker">
                  <Sparkles size={12} />
                  Speaking Coach
                </span>
                {result && (
                  <span className={`spk-chip ${isAi ? 'spk-chip-blue' : 'spk-chip-amber'}`}>
                    {isAi ? <Sparkles size={11} /> : <AlertTriangle size={11} />}
                    {isAi ? 'AI analysis' : 'Local template'}
                  </span>
                )}
              </div>
              <h2 className="spk-title !text-[1rem] !leading-snug line-clamp-2">{topic.question}</h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void load(true)}
                disabled={loading}
                className="spk-btn spk-btn-primary spk-btn-sm"
              >
                {loading ? <Loader2 size={14} className="spk-spin" /> : <RefreshCw size={14} />}
                {loading ? 'Analysing…' : 'Analyse again'}
              </button>
              <button type="button" onClick={onClose} aria-label="Close" className="spk-btn spk-btn-icon spk-btn-sm">
                <X size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
          {loading && !result && <LoadingState />}

          {result && (
            <>
              {/* Provenance ------------------------------------------------ */}
              <div className="flex flex-wrap items-center gap-2">
                {isAi ? (
                  <span className="spk-chip spk-chip-blue">
                    <Sparkles size={12} />
                    Generated by the AI coach
                    {result.attempts && result.attempts > 1 ? ` · ${result.attempts} attempts` : ''}
                  </span>
                ) : (
                  <span className="spk-chip spk-chip-amber spk-chip-wrap">
                    <AlertTriangle size={12} />
                    Local template — not written by a model
                  </span>
                )}
                <span className="spk-chip spk-chip-slate capitalize">
                  {TASK_TYPE_LABELS[result.analysis.taskType] ?? result.analysis.taskType}
                </span>
                {result.modelAnswer && (
                  <span className="spk-chip spk-chip-slate">
                    <BookOpen size={11} />
                    Model answer included
                  </span>
                )}
              </div>

              {result.source === 'template' && result.fallbackReason && (
                <div className="spk-note spk-note-warn">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    {result.fallbackReason} You are seeing the built-in template, which is clearly
                    labelled and is not an AI analysis.
                  </span>
                </div>
              )}

              {/* A. Analysis ---------------------------------------------- */}
              <Section
                icon={<Lightbulb size={17} />}
                title="Question analysis"
                hint="What the task really asks for"
                open={open.analysis}
                onToggle={() => toggle('analysis')}
              >
                <div className="space-y-4">
                  {/* The panel header already shows the raw question, so only
                      restate it when the coach actually reframed it. */}
                  {result.analysis.coreQuestion.trim() &&
                  result.analysis.coreQuestion.trim() !== topic.question.trim() ? (
                    <div className="spk-hero-block">
                      <p className="spk-label mb-1.5">Core question</p>
                      <p className="spk-title !text-[0.98rem]">{result.analysis.coreQuestion}</p>
                    </div>
                  ) : null}

                  {result.analysis.stanceHint && (
                    <div className="spk-note spk-note-info">
                      <Target size={16} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="mb-1 font-semibold">How to open</p>
                        <p>{result.analysis.stanceHint}</p>
                      </div>
                    </div>
                  )}

                  {result.analysis.requirements.length > 0 && (
                    <div>
                      <p className="spk-label mb-2 flex items-center gap-1.5">
                        <Target size={12} />
                        What a strong answer must do
                      </p>
                      <ul className="spk-bullets">
                        {result.analysis.requirements.map((r) => (
                          <li key={r} className="spk-bullet">
                            <Check size={14} className="mt-0.5 shrink-0" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.analysis.constraints.length > 0 && (
                    <div className="spk-note spk-note-warn">
                        <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="mb-1 font-semibold">Limits to watch</p>
                          <ul className="list-disc space-y-1 pl-4">
                            {result.analysis.constraints.map((c) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                  )}

                  {result.analysis.subject.length > 0 && (
                    <div>
                      <p className="spk-label mb-2 flex items-center gap-1.5">
                        <Tags size={12} />
                        Subject matter
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.analysis.subject.map((s) => (
                          <span key={s} className="spk-token spk-token-blue">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              {/* B. Two argument directions ------------------------------- */}
              <Section
                icon={<MessageSquare size={17} />}
                title="Two argument directions"
                hint="Pick one, then support it with the scenario"
                open={open.arguments}
                onToggle={() => toggle('arguments')}
              >
                <div className="spk-arg-wrap">
                  <div className="spk-arg-grid">
                    {shownArguments.map((arg, i) => (
                      <article key={arg.label} className="spk-arg">
                        <div className="mb-2.5 flex items-center gap-2">
                          <span className="spk-index">{i + 1}</span>
                          <span className="spk-arg-tag">{arg.label}</span>
                        </div>
                        <h3 className="spk-title mb-1.5 !text-[0.98rem]">{arg.title}</h3>
                        <p className="spk-body mb-4">{arg.explanation}</p>
                        <ScenarioBlock scenario={arg.scenario} />
                      </article>
                    ))}
                  </div>
                </div>

                {result.arguments.length !== 2 && (
                  <p className="spk-note spk-note-warn mt-4">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <span>
                      Expected exactly 2 argument directions, received {result.arguments.length}.
                    </span>
                  </p>
                )}
              </Section>

              {/* C. Language ----------------------------------------------- */}
              <Section
                icon={<Languages size={17} />}
                title="Language to reuse"
                hint="Phrases, frames and words for this task type"
                open={open.language}
                onToggle={() => toggle('language')}
              >
                <div className="space-y-4">
                  <div className="spk-group">
                    <p className="spk-label mb-2.5 flex items-center gap-1.5">
                      <Quote size={12} />
                      Key expressions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.language.keyExpressions.map((e) => (
                        <span key={e} className="spk-token spk-token-blue">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="spk-group">
                    <p className="spk-label mb-2.5 flex items-center gap-1.5">
                      <AlignLeft size={12} />
                      Sentence patterns
                    </p>
                    <ul className="spk-bullets">
                      {result.language.sentencePatterns.map((p) => (
                        <li key={p} className="spk-bullet">
                          <span className="spk-bullet-dot" aria-hidden="true" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="spk-group">
                    <p className="spk-label mb-2.5 flex items-center gap-1.5">
                      <Tags size={12} />
                      Vocabulary
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.language.vocabulary.map((v) => (
                        <span key={v} className="spk-token">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              {/* C2. Optional model answer -------------------------------- */}
              {result.modelAnswer && (
                <Section
                  icon={<BookOpen size={17} />}
                  title="Full model answer"
                  hint="Optional — read it after you have spoken"
                  open={open.modelAnswer}
                  onToggle={() => toggle('modelAnswer')}
                >
                  <div className="spk-hero-block">
                    {result.modelAnswer.note && (
                      <p className="spk-muted mb-2.5 flex items-start gap-1.5">
                        <ScrollText size={13} className="mt-0.5 shrink-0" />
                        <span>{result.modelAnswer.note}</span>
                      </p>
                    )}
                    <p className="spk-body !text-[0.88rem] !leading-[1.75]">
                      {result.modelAnswer.english}
                    </p>

                    {result.modelAnswer.chinese && (
                      <div className="mt-4 border-t border-[rgba(15,23,42,0.08)] pt-3.5">
                        <p className="spk-label mb-1.5">中文翻译</p>
                        <p className="spk-body !text-[0.88rem]">{result.modelAnswer.chinese}</p>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Re-analyse is duplicated at the foot so it stays findable
                  after scrolling a long coach plan. */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(15,23,42,0.08)] pt-4">
                <p className="spk-muted">
                  {result.arguments.length === 2
                    ? 'Not happy with this plan? Ask the coach again.'
                    : 'This plan came back incomplete — asking again usually fixes it.'}
                </p>
                <button
                  type="button"
                  onClick={() => void load(true)}
                  disabled={loading}
                  className="spk-btn spk-btn-sm"
                >
                  {loading ? <Loader2 size={14} className="spk-spin" /> : <RefreshCw size={14} />}
                  Analyse again
                </button>
              </div>

              {/* Developer detail */}
              {result.source === 'template' && result.fallbackDetail && (
                <details className="spk-disclosure">
                  <summary className="spk-disclosure-head !text-xs !font-medium">
                    Technical detail
                    <ChevronDown size={14} className="spk-chevron ml-auto" />
                  </summary>
                  <p className="spk-muted break-words px-4 pb-4 font-mono !text-[0.7rem]">
                    {result.fallbackDetail}
                  </p>
                </details>
              )}
            </>
          )}

          {!loading && !result && (
            <div className="py-14 text-center">
              <p className="spk-title !text-base">No plan available</p>
              <p className="spk-muted mt-1">The coach could not produce an analysis for this question.</p>
              <button
                type="button"
                onClick={() => void load(true)}
                className="spk-btn spk-btn-sm mt-4"
              >
                <RefreshCw size={14} />
                Analyse again
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}