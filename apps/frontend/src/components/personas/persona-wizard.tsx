'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@maverick/helpers/utils/custom.fetch';
import { LoadingComponent } from '@maverick/frontend/components/layout/loading';
import { useToaster } from '@maverick/react/toaster/toaster';

// ── Types ────────────────────────────────────────────────────────────────────

interface Persona {
  id: string;
  name: string;
  role: string;
  bio: string;
  tone: string[];
  formality: string;
  emojiUsage: string;
  sentenceStyle: string;
  topics: string[];
  preferredWords: string[];
  forbiddenWords: string[];
  hashtagStyle: string;
  isActive: boolean;
  createdAt: string;
}

type WizardStep = 'identity' | 'voice' | 'content' | 'review';

const STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: 'identity', label: 'Identity', number: 1 },
  { key: 'voice', label: 'Voice & Tone', number: 2 },
  { key: 'content', label: 'Content Rules', number: 3 },
  { key: 'review', label: 'Review', number: 4 },
];

const TONE_OPTIONS = [
  'Professional',
  'Witty',
  'Casual',
  'Authoritative',
  'Friendly',
  'Bold',
  'Thoughtful',
  'Provocative',
];

const FORMALITY_OPTIONS = ['Casual', 'Balanced', 'Professional', 'Formal'];
const EMOJI_OPTIONS = ['None', 'Minimal', 'Moderate', 'Heavy'];
const SENTENCE_OPTIONS = ['Short & punchy', 'Mixed', 'Long & detailed'];
const HASHTAG_OPTIONS = ['None', 'Minimal', 'Moderate', 'Branded'];

const DEFAULT_FORBIDDEN = ['synergy', 'leverage', 'disrupt', 'game-changer'];

// ── Tag Input Component ──────────────────────────────────────────────────────

const TagInput: FC<{
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}> = ({ tags, onChange, placeholder }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
        e.preventDefault();
        const value = input.trim().replace(/,$/g, '');
        if (value && !tags.includes(value)) {
          onChange([...tags, value]);
        }
        setInput('');
      }
      if (e.key === 'Backspace' && !input && tags.length > 0) {
        onChange(tags.slice(0, -1));
      }
    },
    [input, tags, onChange]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange]
  );

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-[#FAFAF8] border border-[#E8E6E1] rounded-[10px] focus-within:border-[#7C5CFC] transition-colors min-h-[48px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1.5 bg-[#EDE9FE] text-[#7C5CFC] text-sm font-medium px-3 py-1 rounded-full"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-[#7C5CFC]/50 hover:text-[#7C5CFC] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-[#1A1A1A] placeholder:text-[#A3A3A3]"
      />
    </div>
  );
};

// ── Segmented Control ────────────────────────────────────────────────────────

const SegmentedControl: FC<{
  options: string[];
  value: string;
  onChange: (value: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex bg-[#FAFAF8] border border-[#E8E6E1] rounded-[10px] p-1 gap-1">
    {options.map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all ${
          value === option
            ? 'bg-[#7C5CFC] text-white font-semibold shadow-sm'
            : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
        }`}
      >
        {option}
      </button>
    ))}
  </div>
);

// ── Tone Pills ───────────────────────────────────────────────────────────────

const TonePills: FC<{
  selected: string[];
  onChange: (tones: string[]) => void;
}> = ({ selected, onChange }) => {
  const toggle = useCallback(
    (tone: string) => {
      if (selected.includes(tone)) {
        onChange(selected.filter((t) => t !== tone));
      } else if (selected.length < 4) {
        onChange([...selected, tone]);
      }
    },
    [selected, onChange]
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TONE_OPTIONS.map((tone) => {
          const isSelected = selected.includes(tone);
          return (
            <button
              key={tone}
              type="button"
              onClick={() => toggle(tone)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 border hover:scale-105 active:scale-95 ${
                isSelected
                  ? 'bg-[#EDE9FE] border-[#7C5CFC] text-[#7C5CFC]'
                  : 'bg-white border-[#E8E6E1] text-[#6B6B6B] hover:border-[#D0CEC8] hover:text-[#1A1A1A]'
              }`}
            >
              {tone}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[#A3A3A3] mt-2">
        Select 2-4 tones. {selected.length}/4 selected.
      </p>
    </div>
  );
};

// ── Step Indicator ───────────────────────────────────────────────────────────

const StepIndicator: FC<{ currentStep: WizardStep }> = ({ currentStep }) => {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isCompleted = i < currentIndex;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-[#7C5CFC] text-white shadow-sm'
                    : isCompleted
                    ? 'bg-[#EDE9FE] text-[#7C5CFC] border border-[#7C5CFC]/30'
                    : 'bg-[#FAFAF8] text-[#A3A3A3] border border-[#E8E6E1]'
                }`}
              >
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`text-[11px] mt-1.5 font-medium ${
                  isActive ? 'text-[#7C5CFC]' : isCompleted ? 'text-[#6B6B6B]' : 'text-[#A3A3A3]'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-16 h-[2px] mx-2 mb-5 ${
                  i < currentIndex ? 'bg-[#7C5CFC]/50' : 'bg-[#E8E6E1]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Persona Card ─────────────────────────────────────────────────────────────

const PersonaCard: FC<{
  persona: Persona;
  onActivate: (id: string) => Promise<void>;
}> = ({ persona, onActivate }) => {
  const [activating, setActivating] = useState(false);

  const handleActivate = useCallback(async () => {
    setActivating(true);
    try {
      await onActivate(persona.id);
    } finally {
      setActivating(false);
    }
  }, [persona.id, onActivate]);

  return (
    <div
      className={`bg-white rounded-[16px] p-5 border transition-colors ${
        persona.isActive ? 'border-[#7C5CFC]' : 'border-[#E8E6E1]'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-[#1A1A1A]">{persona.name}</h3>
          <p className="text-sm text-[#6B6B6B]">{persona.role}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            persona.isActive
              ? 'bg-[#DCFCE7] text-[#16A34A]'
              : 'bg-[#FAFAF8] text-[#A3A3A3]'
          }`}
        >
          {persona.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {persona.bio && (
        <p className="text-sm text-[#6B6B6B] mb-3">{persona.bio}</p>
      )}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {persona.tone.map((t) => (
          <span
            key={t}
            className="text-xs bg-[#EDE9FE] text-[#7C5CFC] font-medium px-2 py-0.5 rounded-full"
          >
            {t}
          </span>
        ))}
      </div>
      {!persona.isActive && (
        <button
          onClick={handleActivate}
          disabled={activating}
          className="text-sm text-[#7C5CFC] hover:text-[#6D4AED] font-semibold disabled:opacity-50 transition-colors"
        >
          {activating ? 'Activating...' : 'Activate'}
        </button>
      )}
    </div>
  );
};

// ── Mock Post Preview ────────────────────────────────────────────────────────

const MockPostPreview: FC<{
  name: string;
  role: string;
  tone: string[];
  topics: string[];
  emojiUsage: string;
  sentenceStyle: string;
  hashtagStyle: string;
}> = ({ name, role, tone, topics, emojiUsage, sentenceStyle, hashtagStyle }) => {
  const mockContent = useMemo(() => {
    const greeting =
      emojiUsage === 'Heavy'
        ? '🚀🔥 '
        : emojiUsage === 'Moderate'
        ? '🚀 '
        : emojiUsage === 'Minimal'
        ? ''
        : '';

    const topic = topics.length > 0 ? topics[0] : 'building in public';

    let body: string;
    if (sentenceStyle === 'Short & punchy') {
      body = `${greeting}Just shipped something big. ${topic} is the future. No fluff, just results.`;
    } else if (sentenceStyle === 'Long & detailed') {
      body = `${greeting}After months of deep work on ${topic}, I wanted to share some thoughts on where things are heading and what this means for the industry.`;
    } else {
      body = `${greeting}Been thinking a lot about ${topic} lately. Here's what I've learned so far.`;
    }

    const toneNote =
      tone.includes('Witty')
        ? ' (Yes, I do think about this at 3am.)'
        : tone.includes('Provocative')
        ? ' Hot take? Maybe. But someone had to say it.'
        : '';

    const hashtags =
      hashtagStyle === 'Branded'
        ? `\n\n#${(name || 'brand').replace(/\s+/g, '')} #${(topics[0] || 'tech').replace(/\s+/g, '')}`
        : hashtagStyle === 'Moderate'
        ? `\n\n#${(topics[0] || 'tech').replace(/\s+/g, '')} #buildinpublic`
        : hashtagStyle === 'Minimal'
        ? `\n\n#${(topics[0] || 'tech').replace(/\s+/g, '')}`
        : '';

    return body + toneNote + hashtags;
  }, [name, tone, topics, emojiUsage, sentenceStyle, hashtagStyle]);

  return (
    <div className="bg-white border border-[#E8E6E1] rounded-[16px] p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[#EDE9FE] flex items-center justify-center text-[#7C5CFC] font-bold text-sm">
          {(name || 'P').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">{name || 'Persona'}</p>
          <p className="text-xs text-[#A3A3A3]">{role || 'Role'}</p>
        </div>
      </div>
      <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap leading-relaxed">
        {mockContent}
      </p>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#E8E6E1]">
        <span className="text-xs text-[#A3A3A3]">Preview based on your settings</span>
      </div>
    </div>
  );
};

// ── Wizard Steps ─────────────────────────────────────────────────────────────

const FieldLabel: FC<{ children: React.ReactNode; hint?: string }> = ({
  children,
  hint,
}) => (
  <div className="mb-2">
    <label className="text-sm font-semibold text-[#1A1A1A]">{children}</label>
    {hint && <p className="text-xs text-[#A3A3A3] mt-0.5">{hint}</p>}
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────────

export const PersonaWizard: FC = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  // Wizard state
  const [step, setStep] = useState<WizardStep>('identity');
  const [isCreating, setIsCreating] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [tone, setTone] = useState<string[]>([]);
  const [formality, setFormality] = useState('Balanced');
  const [emojiUsage, setEmojiUsage] = useState('Minimal');
  const [sentenceStyle, setSentenceStyle] = useState('Mixed');
  const [topics, setTopics] = useState<string[]>([]);
  const [preferredWords, setPreferredWords] = useState<string[]>([]);
  const [forbiddenWords, setForbiddenWords] = useState<string[]>(DEFAULT_FORBIDDEN);
  const [hashtagStyle, setHashtagStyle] = useState('Minimal');

  // Load personas
  const loadPersonas = useCallback(async () => {
    const response = await fetch('/personas');
    return (await response.json()) as Persona[];
  }, []);

  const { data, isLoading, mutate } = useSWR('personas-list', loadPersonas, {
    revalidateOnFocus: true,
    fallbackData: [],
  });

  const personas = useMemo(() => data || [], [data]);

  // Show wizard by default if no personas exist
  const wizardVisible = showWizard || personas.length === 0;

  // Activate persona
  const handleActivate = useCallback(
    async (id: string) => {
      try {
        await fetch(`/personas/${id}/activate`, { method: 'POST' });
        await mutate();
        toaster.show('Persona activated', 'success');
      } catch {
        toaster.show('Failed to activate persona', 'warning');
      }
    },
    [fetch, mutate, toaster]
  );

  // Create persona
  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/personas', {
        method: 'POST',
        body: JSON.stringify({
          name,
          role,
          bio,
          tone,
          formality,
          emojiUsage,
          sentenceStyle,
          topics,
          preferredWords,
          forbiddenWords,
          hashtagStyle,
        }),
      });
      const created = await response.json();

      // Auto-activate
      try {
        await fetch(`/personas/${created.id}/activate`, { method: 'POST' });
      } catch {
        // activation is best-effort
      }

      await mutate();
      toaster.show('Persona created and activated', 'success');

      // Reset wizard
      setShowWizard(false);
      setStep('identity');
      setName('');
      setRole('');
      setBio('');
      setTone([]);
      setFormality('Balanced');
      setEmojiUsage('Minimal');
      setSentenceStyle('Mixed');
      setTopics([]);
      setPreferredWords([]);
      setForbiddenWords(DEFAULT_FORBIDDEN);
      setHashtagStyle('Minimal');
    } catch {
      toaster.show('Failed to create persona', 'warning');
    } finally {
      setIsCreating(false);
    }
  }, [
    fetch,
    mutate,
    toaster,
    name,
    role,
    bio,
    tone,
    formality,
    emojiUsage,
    sentenceStyle,
    topics,
    preferredWords,
    forbiddenWords,
    hashtagStyle,
  ]);

  // Navigation
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const canNext = useMemo(() => {
    if (step === 'identity') return name.trim().length > 0;
    if (step === 'voice') return tone.length >= 2;
    return true;
  }, [step, name, tone]);

  const goNext = useCallback(() => {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1].key);
    }
  }, [stepIndex]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1].key);
    }
  }, [stepIndex]);

  if (isLoading && personas.length === 0) {
    return <LoadingComponent />;
  }

  return (
    <div className="flex-1 p-6 overflow-auto" style={{ backgroundColor: '#FAFAF8' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight">Personas</h1>
            <p className="text-sm text-[#6B6B6B] mt-1">
              Define how your brand speaks across platforms.
            </p>
          </div>
          {personas.length > 0 && !wizardVisible && (
            <button
              onClick={() => {
                setShowWizard(true);
                setStep('identity');
              }}
              className="bg-[#7C5CFC] hover:bg-[#6D4AED] text-white text-sm font-semibold px-4 py-2 rounded-[10px] transition-colors shadow-sm"
            >
              New Persona
            </button>
          )}
        </div>

        {/* Existing Personas */}
        {personas.length > 0 && (
          <div className="mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {personas.map((p) => (
                <PersonaCard
                  key={p.id}
                  persona={p}
                  onActivate={handleActivate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Wizard */}
        {wizardVisible && (
          <div className="bg-white border border-[#E8E6E1] rounded-[16px] p-8">
            {personas.length === 0 ? (
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">
                  Create your first persona
                </h2>
                <p className="text-sm text-[#6B6B6B]">
                  A persona defines how your brand sounds. Set up voice, tone, and content rules.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  New Persona
                </h2>
                <button
                  onClick={() => setShowWizard(false)}
                  className="text-[#A3A3A3] hover:text-[#6B6B6B] transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}

            <StepIndicator currentStep={step} />

            {/* Step 1: Identity */}
            {step === 'identity' && (
              <div className="space-y-5 animate-fadeInUp">
                <div>
                  <FieldLabel hint="What should we call this persona?">
                    Name
                  </FieldLabel>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Alex Rivera"
                    className="w-full bg-[#FAFAF8] border border-[#E8E6E1] rounded-[10px] px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#7C5CFC] transition-colors placeholder:text-[#A3A3A3]"
                  />
                </div>
                <div>
                  <FieldLabel hint="What's their title?">Role</FieldLabel>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g., Founder & CEO"
                    className="w-full bg-[#FAFAF8] border border-[#E8E6E1] rounded-[10px] px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#7C5CFC] transition-colors placeholder:text-[#A3A3A3]"
                  />
                </div>
                <div>
                  <FieldLabel hint="One-line description">Bio</FieldLabel>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g., Building the future of autonomous social media management"
                    rows={3}
                    className="w-full bg-[#FAFAF8] border border-[#E8E6E1] rounded-[10px] px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#7C5CFC] transition-colors placeholder:text-[#A3A3A3] resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Voice & Tone */}
            {step === 'voice' && (
              <div className="space-y-6 animate-fadeInUp">
                <div>
                  <FieldLabel hint="How does this persona sound? Pick 2-4.">
                    Tone
                  </FieldLabel>
                  <TonePills selected={tone} onChange={setTone} />
                </div>
                <div>
                  <FieldLabel>Formality</FieldLabel>
                  <SegmentedControl
                    options={FORMALITY_OPTIONS}
                    value={formality}
                    onChange={setFormality}
                  />
                </div>
                <div>
                  <FieldLabel>Emoji Usage</FieldLabel>
                  <SegmentedControl
                    options={EMOJI_OPTIONS}
                    value={emojiUsage}
                    onChange={setEmojiUsage}
                  />
                </div>
                <div>
                  <FieldLabel>Sentence Style</FieldLabel>
                  <SegmentedControl
                    options={SENTENCE_OPTIONS}
                    value={sentenceStyle}
                    onChange={setSentenceStyle}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Content Rules */}
            {step === 'content' && (
              <div className="space-y-6 animate-fadeInUp">
                <div>
                  <FieldLabel hint="What does this persona talk about?">
                    Topics
                  </FieldLabel>
                  <TagInput
                    tags={topics}
                    onChange={setTopics}
                    placeholder="Type a topic and press Enter"
                  />
                </div>
                <div>
                  <FieldLabel hint="Words or phrases to use often">
                    Preferred Words
                  </FieldLabel>
                  <TagInput
                    tags={preferredWords}
                    onChange={setPreferredWords}
                    placeholder="Type a word and press Enter"
                  />
                </div>
                <div>
                  <FieldLabel hint="Words or phrases to never use">
                    Forbidden Words
                  </FieldLabel>
                  <TagInput
                    tags={forbiddenWords}
                    onChange={setForbiddenWords}
                    placeholder="Type a word and press Enter"
                  />
                </div>
                <div>
                  <FieldLabel>Hashtag Style</FieldLabel>
                  <SegmentedControl
                    options={HASHTAG_OPTIONS}
                    value={hashtagStyle}
                    onChange={setHashtagStyle}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 'review' && (
              <div className="space-y-6 animate-fadeInUp">
                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#FAFAF8] border border-[#E8E6E1] rounded-[10px] p-4">
                    <h4 className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">
                      Identity
                    </h4>
                    <p className="text-sm text-[#1A1A1A] font-medium">{name}</p>
                    {role && (
                      <p className="text-sm text-[#6B6B6B]">{role}</p>
                    )}
                    {bio && (
                      <p className="text-xs text-[#A3A3A3] mt-1">{bio}</p>
                    )}
                  </div>
                  <div className="bg-[#FAFAF8] border border-[#E8E6E1] rounded-[10px] p-4">
                    <h4 className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">
                      Voice
                    </h4>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tone.map((t) => (
                        <span
                          key={t}
                          className="text-xs bg-[#EDE9FE] text-[#7C5CFC] font-medium px-2 py-0.5 rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-[#A3A3A3]">
                      {formality} / {emojiUsage} emoji / {sentenceStyle}
                    </p>
                  </div>
                  <div className="bg-[#FAFAF8] border border-[#E8E6E1] rounded-[10px] p-4 sm:col-span-2">
                    <h4 className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">
                      Content Rules
                    </h4>
                    {topics.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-[#A3A3A3]">Topics: </span>
                        <span className="text-xs text-[#1A1A1A]">
                          {topics.join(', ')}
                        </span>
                      </div>
                    )}
                    {preferredWords.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-[#A3A3A3]">
                          Preferred:{' '}
                        </span>
                        <span className="text-xs text-[#1A1A1A]">
                          {preferredWords.join(', ')}
                        </span>
                      </div>
                    )}
                    {forbiddenWords.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-[#A3A3A3]">
                          Forbidden:{' '}
                        </span>
                        <span className="text-xs text-[#DC2626]">
                          {forbiddenWords.join(', ')}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-[#A3A3A3]">
                      Hashtags: {hashtagStyle}
                    </p>
                  </div>
                </div>

                {/* Live Preview */}
                <div>
                  <h4 className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-3">
                    Post Preview
                  </h4>
                  <MockPostPreview
                    name={name}
                    role={role}
                    tone={tone}
                    topics={topics}
                    emojiUsage={emojiUsage}
                    sentenceStyle={sentenceStyle}
                    hashtagStyle={hashtagStyle}
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#E8E6E1]">
              <button
                onClick={goBack}
                className={`text-sm font-medium px-4 py-2 rounded-[10px] transition-colors ${
                  stepIndex === 0
                    ? 'text-[#D0CEC8] cursor-default'
                    : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
                }`}
                disabled={stepIndex === 0}
              >
                Back
              </button>

              {step === 'review' ? (
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="bg-[#7C5CFC] hover:bg-[#6D4AED] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-[10px] transition-colors shadow-sm"
                >
                  {isCreating ? 'Creating...' : 'Create Persona'}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  disabled={!canNext}
                  className="bg-[#7C5CFC] hover:bg-[#6D4AED] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-[10px] transition-colors shadow-sm"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
