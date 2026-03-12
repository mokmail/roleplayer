import React, { useState, useMemo } from 'react';
import { SceneContext, Message, AIConfig, NARRATIVE_THEMES, NarrativeTheme, ConversationMode } from '../types';
import { MapPin, BookOpen, Palette, Zap, Users2, Settings2, ShieldAlert, EyeOff, BadgeAlert, BotMessageSquare, Expand, X, AlertTriangle, Clock, Edit3 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { SceneManager } from '../components/SceneManager';
import { SocialGraph } from '../components/SocialGraph';
import { cn } from '../lib/utils';
import { validateStorySetup, StorySetupValidation } from '../lib/contextTracker';

const RESPONSE_STRATEGIES = [
  { id: 'sequential', label: 'Sequential', desc: 'Natural flow based on relevance' },
  { id: 'random', label: 'Chaotic', desc: 'Random characters react unexpectedly' },
  { id: 'manual', label: 'Reactive', desc: 'Only react when directly addressed' }
] as const;

const STRATEGY_LABELS: Record<string, string> = {
  sequential: 'Sequential',
  random: 'Chaotic',
  manual: 'Reactive'
};

const TIME_OPTIONS = [
  { group: 'Time of Day', options: ['Dawn', 'Morning', 'Midday', 'Afternoon', 'Evening', 'Dusk', 'Night', 'Midnight'] },
  { group: 'Weather/Mood', options: ['A rainy day', 'A stormy night', 'A snowy evening', 'A foggy morning', 'A hot summer day', 'A cold winter night', 'A full moon night', 'A lunar eclipse'] },
  { group: 'Era/Period', options: ['Pre-dawn', 'Golden hour', 'Twilight', 'The witching hour', 'The dead of night'] }
];

const CONVERSATION_MODES = [
  { id: 'presence', label: 'Presence' },
  { id: 'tele', label: 'Telechat' }
] as const;

interface ScenePageProps {
  context: SceneContext;
  setContext: React.Dispatch<React.SetStateAction<SceneContext>>;
  messages: Message[];
  aiConfig: AIConfig;
  onConversationModeChange: (mode: ConversationMode) => void;
  notify?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ScenePage: React.FC<ScenePageProps> = ({
  context,
  setContext,
  messages,
  aiConfig,
  onConversationModeChange,
  notify,
}) => {
  const isPresetTheme = NARRATIVE_THEMES.includes(context.theme as NarrativeTheme);
  const [isSetupAwarenessOpen, setIsSetupAwarenessOpen] = useState(false);

  const setupValidation: StorySetupValidation = useMemo(() => validateStorySetup(context), [context]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-transparent">
      <div className="px-6 py-5 space-y-6">
        <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Scene Studio</p>
              <h2 className="text-lg font-semibold text-zinc-100">Shape the current scene before the cast reacts</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
                Tune the tone, location, safety rules, and turn orchestration from one cleaner control surface.
              </p>
            </div>
            <div className="hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-right md:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Current mode</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">{context.theme || 'Custom scene'}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-6">
            {[
              { label: 'Theme', value: context.theme || 'Not set' },
              { label: 'Location', value: context.location || 'Not set' },
              { label: 'Time', value: context.sceneTime || 'Not set' },
              { label: 'Mode', value: context.conversationMode === 'tele' ? 'Telechat' : (context.conversationMode === 'presence' ? 'Presence' : 'Not set') },
              { label: 'Turns', value: `${context.maxTurnsPerResponse || 3} max` },
              { label: 'Strategy', value: STRATEGY_LABELS[context.autoTurnOrder || 'sequential'] || 'Sequential' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-zinc-200 truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {!setupValidation.isComplete && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-200">
                  Story setup incomplete — missing: {setupValidation.missingComponents.join(', ')}
                </p>
                <ul className="space-y-1">
                  {setupValidation.warnings.map((warning, i) => (
                    <li key={i} className="text-xs text-amber-200/70 flex items-start gap-2">
                      <span className="text-amber-400">•</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Scene Settings */}
          <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <BookOpen className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Scene Settings</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Define tone, place, and narrative</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-3 h-3" /> Roleplay Theme
                </label>
                <select
                  value={isPresetTheme ? context.theme : '__custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom') {
                      setContext(prev => ({ ...prev, theme: undefined }));
                    } else {
                      setContext(prev => ({ ...prev, theme: val as NarrativeTheme }));
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  <option value="" disabled className="text-zinc-400">Select a theme...</option>
                  {NARRATIVE_THEMES.map(t => (
                    <option key={t} value={t} className="bg-[#0f0f0f] text-zinc-200">{t}</option>
                  ))}
                  <option value="__custom" className="bg-[#0f0f0f] text-zinc-200">Other / custom...</option>
                </select>
                {(!context.theme || !isPresetTheme) && (
                  <input
                    type="text"
                    value={context.theme || ''}
                    onChange={(e) => setContext(prev => ({ ...prev, theme: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="Enter custom theme"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Location
                </label>
                <input 
                  type="text"
                  value={context.location}
                  onChange={(e) => setContext(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="Where does the scene take place?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Time
                </label>
                <select
                  value={context.sceneTime || ''}
                  onChange={(e) => setContext(prev => ({ ...prev, sceneTime: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  <option value="" className="text-zinc-400">Select time...</option>
                  {TIME_OPTIONS.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.options.map((time) => (
                        <option key={time} value={time} className="bg-[#0f0f0f] text-zinc-200">{time}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Users2 className="w-3 h-3" /> Conversation Mode
                </label>
                <div className="flex gap-2">
                  {CONVERSATION_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => onConversationModeChange(mode.id)}
                      className={cn(
                        "flex-1 p-3 rounded-xl border text-xs font-medium transition-all",
                        context.conversationMode === mode.id
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-black/20 border-white/5 text-zinc-500 hover:border-white/10"
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-3 h-3" /> Plot Summary
                </label>
                <textarea 
                  value={context.plot}
                  onChange={(e) => setContext(prev => ({ ...prev, plot: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors h-24 resize-none"
                  placeholder="What is happening right now?"
                />
              </div>
            </div>
          </section>

          {/* AI Behavior */}
          <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                <Zap className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">AI Behavior</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Control responses and turn order</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Users2 className="w-3.5 h-3.5" /> Max Turns per Response
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="6" 
                    step="1"
                    value={context.maxTurnsPerResponse || 3}
                    onChange={(e) => setContext(prev => ({ ...prev, maxTurnsPerResponse: parseInt(e.target.value) }))}
                    className="flex-1 accent-violet-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-lg font-black text-violet-400 tabular-nums min-w-[1ch]">
                    {context.maxTurnsPerResponse || 3}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-600 leading-relaxed italic">
                  How many characters react in a single reply.
                </p>
              </div>

              <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" /> Response Strategy
                </label>
                
                <div className="flex flex-col gap-2">
                  {RESPONSE_STRATEGIES.map((strat) => (
                    <button
                      key={strat.id}
                      onClick={() => setContext(prev => ({ ...prev, autoTurnOrder: strat.id }))}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                        (context.autoTurnOrder || 'sequential') === strat.id 
                          ? "bg-violet-500/10 border-violet-500/30 text-violet-400" 
                          : "bg-black/20 border-white/5 text-zinc-500 hover:border-white/10"
                      )}
                    >
                      <div>
                        <div className="text-xs font-bold uppercase tracking-tight">{strat.label}</div>
                        <div className="text-[10px] opacity-60 font-medium">{strat.desc}</div>
                      </div>
                      {(context.autoTurnOrder || 'sequential') === strat.id && (
                        <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {context.storyFlow && (
          <section className="rounded-3xl border border-emerald-500/10 bg-white/[0.03] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <BotMessageSquare className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Setup Awareness</h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">Tracked memory and active context guidance</p>
                </div>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                {context.storyFlow.pendingChanges.length} pending
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="space-y-2">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Open the full setup awareness view to inspect the tracked setup digest, active guidance, and pending changes that the AI is currently following.
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
                  <span>{context.storyFlow.activeGuidance.length} guidance items</span>
                  <span>•</span>
                  <span>{context.storyFlow.pendingChanges.length} pending updates</span>
                </div>
              </div>

              <button
                onClick={() => setIsSetupAwarenessOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              >
                <Expand className="w-4 h-4" /> Open awareness
              </button>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Content Safety</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Moderation and display controls for sensitive scenes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl space-y-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vulgarity Level</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'low', label: 'Low', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400', active: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' },
                  { id: 'medium', label: 'Medium', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', active: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
                  { id: 'high', label: 'High', color: 'bg-orange-500/10 border-orange-500/30 text-orange-400', active: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' },
                  { id: 'extreme', label: 'Extreme', color: 'bg-red-500/10 border-red-500/30 text-red-400', active: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' }
                ].map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setContext(prev => ({
                      ...prev,
                      contentSafety: {
                        ...prev.contentSafety!,
                        vulgarityLevel: level.id as any
                      }
                    }))}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center min-w-[70px]",
                      (context.contentSafety?.vulgarityLevel || 'medium') === level.id
                        ? level.color
                        : "bg-black/20 border-white/5 text-zinc-500 hover:border-white/10"
                    )}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-tight mb-1">{level.label}</div>
                    {(context.contentSafety?.vulgarityLevel || 'medium') === level.id && (
                      <div className={cn("w-1.5 h-1.5 rounded-full", level.active)} />
                    )}
                  </button>
                ))}
              </div>

              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pt-2 block border-t border-white/5">Explicitness Handling</label>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'fade-to-black', label: 'Fade to Black', desc: 'Imply intimacy without graphic sexual detail' },
                  { id: 'allow', label: 'Allow Explicit', desc: 'Permit explicit content and mark it for the UI' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setContext(prev => ({
                      ...prev,
                      contentSafety: {
                        explicitMode: mode.id as 'fade-to-black' | 'allow',
                        vulgarityLevel: prev.contentSafety?.vulgarityLevel ?? 'medium',
                        blurExplicitContent: prev.contentSafety?.blurExplicitContent ?? true,
                        showExplicitBadges: prev.contentSafety?.showExplicitBadges ?? true,
                      }
                    }))}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                      (context.contentSafety?.explicitMode || 'fade-to-black') === mode.id
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-black/20 border-white/5 text-zinc-500 hover:border-white/10"
                    )}
                  >
                    <div>
                      <div className="text-xs font-bold uppercase tracking-tight">{mode.label}</div>
                      <div className="text-[10px] opacity-60 font-medium">{mode.desc}</div>
                    </div>
                    {(context.contentSafety?.explicitMode || 'fade-to-black') === mode.id && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                onClick={() => setContext(prev => ({
                  ...prev,
                  contentSafety: {
                    explicitMode: prev.contentSafety?.explicitMode || 'fade-to-black',
                    vulgarityLevel: prev.contentSafety?.vulgarityLevel ?? 'medium',
                    blurExplicitContent: !(prev.contentSafety?.blurExplicitContent ?? true),
                    showExplicitBadges: prev.contentSafety?.showExplicitBadges ?? true,
                  }
                }))}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all",
                  (context.contentSafety?.blurExplicitContent ?? true)
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-white/[0.03] border-white/5 text-zinc-500"
                )}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <EyeOff className="w-4 h-4" /> Blur Explicit
                </div>
                <p className="mt-2 text-[10px] opacity-70">Visually blur explicit turns until you choose to reveal them.</p>
              </button>

              <button
                onClick={() => setContext(prev => ({
                  ...prev,
                  contentSafety: {
                    explicitMode: prev.contentSafety?.explicitMode || 'fade-to-black',
                    vulgarityLevel: prev.contentSafety?.vulgarityLevel ?? 'medium',
                    blurExplicitContent: prev.contentSafety?.blurExplicitContent ?? true,
                    showExplicitBadges: !(prev.contentSafety?.showExplicitBadges ?? true),
                  }
                }))}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all",
                  (context.contentSafety?.showExplicitBadges ?? true)
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-white/[0.03] border-white/5 text-zinc-500"
                )}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <BadgeAlert className="w-4 h-4" /> Show Indicators
                </div>
                <p className="mt-2 text-[10px] opacity-70">Display an explicit badge when content is marked or detected as explicit.</p>
              </button>
            </div>
          </div>

        </section>

        {/* Cast & Scenes */}
        <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Users2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Cast & Scenes</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Manage characters and scene flow</p>
            </div>
          </div>

          <SocialGraph
            context={context}
            setContext={setContext}
          />

          <div className="pt-2">
            <SceneManager
              context={context}
              messages={messages}
              aiConfig={aiConfig}
              onUpdateContext={(updates) => setContext(prev => ({ ...prev, ...updates }))}
              notify={notify}
            />
          </div>
        </section>

        <AnimatePresence>
          {isSetupAwarenessOpen && context.storyFlow && (
            <>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSetupAwarenessOpen(false)}
                className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                className="fixed inset-x-4 top-6 bottom-6 z-[120] mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#0b0b0b] shadow-2xl overflow-hidden"
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 bg-black/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <BotMessageSquare className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-100 uppercase tracking-wider">Setup Awareness</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">Tracked context memory used by the AI</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsSetupAwarenessOpen(false)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10"
                    >
                      <X className="w-4 h-4" /> Close
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tracked Setup Digest</p>
                      <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line bg-black/20 border border-white/5 rounded-2xl p-4">
                        {context.storyFlow.setupDigest}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Guidance</p>
                        <ul className="space-y-2 text-sm text-zinc-300">
                          {context.storyFlow.activeGuidance.map((entry, index) => (
                            <li key={`${entry}-${index}`} className="leading-relaxed">• {entry}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pending Setup Changes</p>
                        {context.storyFlow.pendingChanges.length > 0 ? (
                          <ul className="space-y-2 text-sm text-amber-200/90">
                            {context.storyFlow.pendingChanges.map((change) => (
                              <li key={change.id} className="leading-relaxed">• {change.summary}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-zinc-500 leading-relaxed">
                            No unapplied setup changes. The next response will already use the tracked settings above.
                          </p>
                        )}
                      </div>
                    </div>

                    {context.storyFlow.qualityAnalysis && (
                      <div className="rounded-3xl border border-violet-500/20 bg-violet-500/5 p-6 space-y-6">
                        <div className="flex items-center gap-3 border-b border-violet-500/10 pb-4">
                          <Zap className="w-5 h-5 text-violet-400" />
                          <h4 className="text-sm font-bold text-violet-300 uppercase tracking-widest">Quality Agent Analysis</h4>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/70 mb-2">Narrative Path</p>
                              <p className="text-sm text-zinc-200 leading-relaxed font-medium capitalize-first">
                                {context.storyFlow.qualityAnalysis.narrativePath}
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/70 mb-2">Conversation Velocity</p>
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                                  <div 
                                    className="h-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-1000" 
                                    style={{ width: `${context.storyFlow.qualityAnalysis.conversationVelocity * 10}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-xl font-black text-violet-400 tabular-nums">
                                {context.storyFlow.qualityAnalysis.conversationVelocity}/10
                              </span>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/70 mb-2">Stalled Topics</p>
                              <div className="flex flex-wrap gap-2">
                                {context.storyFlow.qualityAnalysis.stalledTopics.length > 0 ? (
                                  context.storyFlow.qualityAnalysis.stalledTopics.map((topic, i) => (
                                    <span key={i} className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-bold uppercase tracking-wider">
                                      {topic}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-zinc-500 italic">No stagnant topics detected.</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70 mb-2">Quality Nudges</p>
                              <ul className="space-y-2">
                                {context.storyFlow.qualityAnalysis.recommendedPrompts.map((prompt, i) => (
                                  <li key={i} className="text-xs text-zinc-300 bg-white/5 border border-white/5 rounded-xl p-3 leading-relaxed hover:border-emerald-500/30 transition-colors">
                                    {prompt}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/70 mb-2">Bottleneck Characters</p>
                              <div className="flex flex-wrap gap-2">
                                {context.storyFlow.qualityAnalysis.bottleneckCharacters.length > 0 ? (
                                  context.storyFlow.qualityAnalysis.bottleneckCharacters.map((char, i) => (
                                    <span key={i} className="px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-wider">
                                      {char}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-zinc-500 italic">Screen time is well balanced.</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
