import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings2, 
  Send, 
  Users, 
  MessageSquare,
  Sparkles,
  RefreshCw,
  Layout,
  History,
  Eye,
  EyeOff,
  ShieldAlert,
  BotMessageSquare,
  Loader2,
  WandSparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { Character, SceneContext, Message, SavedSession, AIConfig, AIProvider } from './types';
import { generateRoleplayResponse, generateStorySetup, updateSceneState } from './services/geminiService';
import { CharacterWizard } from './components/CharacterWizard';
import { cn } from './lib/utils';
import { sanitizeExplicitMarker, shouldBlurMessage, shouldShowExplicitBadge } from './lib/contentSafety';
import { acknowledgeSceneContextChanges, syncSceneContextTracking } from './lib/contextTracker';
import { STARTER_SCENARIOS } from './lib/starterScenarios';
// page components
import { ScenePage } from './pages/ScenePage';
import { CharactersPage } from './pages/CharactersPage';
import { SessionsPage } from './pages/SessionsPage';

const createInitialContext = (): SceneContext => syncSceneContextTracking({
  location: 'A tense crossroads',
  theme: 'Noir',
  plot: 'The cast is assembling before the first decisive move.',
  characters: [],
  relationships: [],
  playerProfile: {
    name: '',
    role: '',
    persona: '',
    objective: '',
  },
  contentSafety: {
    explicitMode: 'fade-to-black',
    blurExplicitContent: true,
    showExplicitBadges: true,
  },
  maxTurnsPerResponse: 3,
  autoTurnOrder: 'sequential',
});

export default function App() {
  const MIN_RIGHT_SIDEBAR_WIDTH = 380;
  const MAX_RIGHT_SIDEBAR_WIDTH = 960;
  const [context, setContext] = useState<SceneContext>(createInitialContext());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'ollama',
    model: 'minimax-m2.5:cloud',
  });
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'scene' | 'characters' | 'sessions'>('scene');
  const [revealedExplicitMessages, setRevealedExplicitMessages] = useState<Record<string, boolean>>({});
  const [isGeneratingStorySetup, setIsGeneratingStorySetup] = useState(false);
  const [storyPrompt, setStoryPrompt] = useState('A slow-burn gothic mystery set in an isolated coastal manor during a storm. I want a clever but emotionally wounded player character, a volatile heir, a loyal housekeeper hiding the truth, and a doctor who knows more than he admits. Keep it tense, elegant, and dialogue-rich.');
  const [rightSidebarWidth, setRightSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return 560;

    const savedWidth = Number(localStorage.getItem('rp_right_sidebar_width'));
    if (Number.isFinite(savedWidth) && savedWidth > 0) {
      return Math.min(Math.max(savedWidth, MIN_RIGHT_SIDEBAR_WIDTH), MAX_RIGHT_SIDEBAR_WIDTH);
    }

    return Math.min(Math.max(window.innerWidth * 0.42, MIN_RIGHT_SIDEBAR_WIDTH), 720);
  });
  const [isResizingRightSidebar, setIsResizingRightSidebar] = useState(false);
  const setTrackedContext: React.Dispatch<React.SetStateAction<SceneContext>> = (value) => {
    setContext((previous) => {
      const nextContext = typeof value === 'function' ? value(previous) : value;
      return syncSceneContextTracking(nextContext, previous);
    });
  };

  const handleEditCharacter = (char: Character) => {
    setEditingCharacter(char);
    setIsWizardOpen(true);
  };
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = localStorage.getItem('rp_sessions');
    if (loaded) {
      try {
        setSavedSessions(JSON.parse(loaded));
      } catch (e) {
        console.error('Failed to load sessions from localStorage', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rp_sessions', JSON.stringify(savedSessions));
  }, [savedSessions]);

  useEffect(() => {
    localStorage.setItem('rp_right_sidebar_width', String(rightSidebarWidth));
  }, [rightSidebarWidth]);

  useEffect(() => {
    if (!isResizingRightSidebar) return;

    const handlePointerMove = (event: MouseEvent) => {
      const nextWidth = window.innerWidth - event.clientX;
      const clampedWidth = Math.min(
        Math.max(nextWidth, MIN_RIGHT_SIDEBAR_WIDTH),
        Math.min(MAX_RIGHT_SIDEBAR_WIDTH, window.innerWidth - 320),
      );
      setRightSidebarWidth(clampedWidth);
    };

    const stopResizing = () => {
      setIsResizingRightSidebar(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', stopResizing);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizingRightSidebar]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const splitCharacterTurns = (text: string) => {
    const turns: { name: string; content: string }[] = [];
    const regex = /\*\*([^*]+):\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      if (turns.length > 0) {
        turns[turns.length - 1].content = text.substring(lastIndex, match.index).trim();
      }
      turns.push({ name: match[1], content: '' });
      lastIndex = regex.lastIndex;
    }

    if (turns.length > 0) {
      turns[turns.length - 1].content = text.substring(lastIndex).trim();
    } else {
      return [{ name: 'System', content: text }];
    }

    return turns;
  };

  const buildAssistantMessages = (aiResponse: string) => {
    const timestamp = Date.now();
    return splitCharacterTurns(aiResponse).map((turn, index) => ({
      id: (timestamp + index + 1).toString(),
      role: 'assistant' as const,
      content: turn.content,
      characterName: turn.name,
      timestamp,
    }));
  };

  const extractJsonPayload = (rawText: string) => {
    const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('The generated setup did not return valid JSON.');
    }

    return cleaned.slice(firstBrace, lastBrace + 1);
  };

  const normalizeGeneratedContext = (rawContext: Partial<SceneContext>): SceneContext => {
    const baseId = Date.now();
    const characters = (rawContext.characters || []).slice(0, 6).map((character, index) => ({
      id: character.id?.trim() || `${baseId}-${index}`,
      name: character.name?.trim() || `Character ${index + 1}`,
      personality: character.personality?.trim() || 'Distinct and reactive.',
      backstory: character.backstory?.trim() || '',
      isPresent: character.isPresent ?? true,
      race: character.race?.trim() || '',
      profession: character.profession?.trim() || '',
      alignment: character.alignment?.trim() || '',
      background: character.background?.trim() || '',
      age: character.age?.trim() || '',
      gender: character.gender?.trim() || '',
      magicSystem: character.magicSystem?.trim() || '',
      socialStanding: character.socialStanding?.trim() || '',
      powerSource: character.powerSource?.trim() || '',
      vibe: character.vibe?.trim() || '',
      paradox: character.paradox?.trim() || '',
    }));
    const validCharacterIds = new Set(characters.map((character) => character.id));

    return {
      location: rawContext.location?.trim() || 'An undefined place',
      plot: rawContext.plot?.trim() || 'A story is about to begin.',
      theme: rawContext.theme?.trim() || 'Fantasy',
      characters,
      relationships: (rawContext.relationships || [])
        .filter((relationship) => validCharacterIds.has(relationship.sourceCharacterId) && validCharacterIds.has(relationship.targetCharacterId))
        .map((relationship, index) => {
          const legacyRelationship = relationship as typeof relationship & {
            label?: string;
            reverseLabel?: string;
          };

          return {
            id: relationship.id?.trim() || `${baseId}-rel-${index}`,
            sourceCharacterId: relationship.sourceCharacterId,
            targetCharacterId: relationship.targetCharacterId,
            kind: relationship.kind?.trim() || legacyRelationship.label?.trim() || 'relationship',
            reciprocal: relationship.reciprocal ?? false,
            reverseKind: relationship.reciprocal
              ? (relationship.reverseKind?.trim() || legacyRelationship.reverseLabel?.trim() || relationship.kind?.trim() || legacyRelationship.label?.trim() || 'relationship')
              : (relationship.reverseKind?.trim() || legacyRelationship.reverseLabel?.trim() || ''),
            intensity: Math.min(5, Math.max(1, relationship.intensity || 3)),
            visibility: relationship.visibility === 'secret' || relationship.visibility === 'private' ? relationship.visibility : 'public',
            notes: relationship.notes?.trim() || '',
          };
        }),
      playerProfile: {
        name: rawContext.playerProfile?.name?.trim() || '',
        role: rawContext.playerProfile?.role?.trim() || '',
        persona: rawContext.playerProfile?.persona?.trim() || '',
        objective: rawContext.playerProfile?.objective?.trim() || '',
      },
      contentSafety: {
        explicitMode: rawContext.contentSafety?.explicitMode === 'allow' ? 'allow' : 'fade-to-black',
        blurExplicitContent: rawContext.contentSafety?.blurExplicitContent ?? true,
        showExplicitBadges: rawContext.contentSafety?.showExplicitBadges ?? true,
      },
      summary: rawContext.summary?.trim() || '',
      events: [],
      structuredEvents: [],
      maxTurnsPerResponse: Math.min(6, Math.max(1, rawContext.maxTurnsPerResponse || 3)),
      autoTurnOrder: rawContext.autoTurnOrder === 'random' || rawContext.autoTurnOrder === 'manual' ? rawContext.autoTurnOrder : 'sequential',
    };
  };

  const syncSceneState = async (sceneContext: SceneContext, history: Message[]) => {
    try {
      const newState = await updateSceneState(aiConfig, sceneContext, history);
      setTrackedContext(prev => ({
        ...prev,
        summary: newState.summary,
        events: newState.events,
        structuredEvents: newState.structuredEvents
      }));
    } catch (e) {
      console.warn('Scene update failed:', e);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const conversation = [...messages, userMessage];
      const aiResponse = await generateRoleplayResponse(aiConfig, context, conversation);
      
      if (aiResponse) {
        const newMessages = buildAssistantMessages(aiResponse);
        
        setMessages(prev => [...prev, ...newMessages]);
        await syncSceneState(context, [...conversation, ...newMessages]);
        setContext(prev => acknowledgeSceneContextChanges(prev));
      }
    } catch (error: any) {
      console.error('Error generating response:', error);
      alert(`Error communicating with AI: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addCharacter = async () => {
    const newChar: Character = {
      id: Date.now().toString(),
      name: 'New Character',
      personality: 'Personality, appearance, motivation...',
      backstory: 'Backstory, important events...',
      isPresent: true,
    };
    const updatedCharacters = [...context.characters, newChar];
    const trackedNextContext = syncSceneContextTracking({ ...context, characters: updatedCharacters }, context);
    setTrackedContext(prev => ({
      ...prev,
      characters: updatedCharacters,
    }));

    // Only trigger intro response if conversation has already started
    if (messages.length > 0) {
      await triggerSystemEvent(`A new character named ${newChar.name} has been added to the scene. They should briefly introduce themselves or react to the situation.`, trackedNextContext);
    }
  };

  const updateCharacter = async (id: string, updates: Partial<Character>) => {
    const charToUpdate = context.characters.find(c => c.id === id);
    const isActivating = updates.isPresent === true && charToUpdate?.isPresent === false;

    const updatedCharacters = context.characters.map(c => c.id === id ? { ...c, ...updates } : c);
    const updatedChar = updatedCharacters.find(c => c.id === id);
    const trackedNextContext = syncSceneContextTracking({ ...context, characters: updatedCharacters }, context);

    setTrackedContext(prev => ({
      ...prev,
      characters: updatedCharacters,
    }));

    if (isActivating && updatedChar && messages.length > 0) {
      await triggerSystemEvent(`${updatedChar.name} is now present in the scene. They should react to the current situation or make their presence known.`, trackedNextContext);
    }
  };

  const triggerSystemEvent = async (eventDescription: string, currentContext: SceneContext) => {
    setIsLoading(true);
    try {
      // We send a hidden system message to trigger the reaction
      const systemTriggerMessage: Message = {
        id: 'system-' + Date.now(),
        role: 'user',
        content: `[SYSTEM-EVENT: ${eventDescription}]`,
        timestamp: Date.now(),
        isHidden: true,
      };

      const aiResponse = await generateRoleplayResponse(aiConfig, currentContext, [...messages, systemTriggerMessage]);
      
      if (aiResponse) {
        const newMessages = buildAssistantMessages(aiResponse);
        
        setMessages(prev => [...prev, systemTriggerMessage, ...newMessages]);
        await syncSceneState(currentContext, [...messages, systemTriggerMessage, ...newMessages]);
        setContext(prev => acknowledgeSceneContextChanges(prev));
      }
    } catch (error) {
      console.error('Error triggering system event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeCharacter = (id: string) => {
    setTrackedContext(prev => ({
      ...prev,
      characters: prev.characters.filter(c => c.id !== id),
      relationships: (prev.relationships || []).filter((relationship) => relationship.sourceCharacterId !== id && relationship.targetCharacterId !== id),
    }));
  };

  const resetChat = () => {
    if (confirm('Do you really want to reset the chat?')) {
      setMessages([]);
      setRevealedExplicitMessages({});
    }
  };

  const createNewSession = () => {
    if (confirm('Start a new session? This will reset the chat and clear current scene settings. Please save your current session first if needed.')) {
      setMessages([]);
      setRevealedExplicitMessages({});
      setContext(createInitialContext());
      setActiveRightTab('scene');
    }
  };

  const applyStarterScenario = (scenarioId: string) => {
    const scenario = STARTER_SCENARIOS.find((entry) => entry.id === scenarioId);
    if (!scenario) return;

    setMessages([]);
    setRevealedExplicitMessages({});
    setContext(syncSceneContextTracking({
      ...scenario.context,
      characters: scenario.context.characters.map((character) => ({ ...character })),
      relationships: scenario.context.relationships?.map((relationship) => ({ ...relationship })) || [],
      playerProfile: scenario.context.playerProfile ? { ...scenario.context.playerProfile } : undefined,
      contentSafety: scenario.context.contentSafety
        ? { ...scenario.context.contentSafety }
        : {
            explicitMode: 'fade-to-black',
            blurExplicitContent: true,
            showExplicitBadges: true,
          },
      events: [...(scenario.context.events || [])],
      structuredEvents: [...(scenario.context.structuredEvents || [])],
    }));
    setActiveRightTab('scene');
  };

  const handleGenerateStorySetup = async (prompt: string) => {
    if (!prompt.trim() || isGeneratingStorySetup) return;

    setIsGeneratingStorySetup(true);
    try {
      const rawText = await generateStorySetup(aiConfig, prompt);
      const parsed = JSON.parse(extractJsonPayload(rawText));
      const nextContext = syncSceneContextTracking(normalizeGeneratedContext(parsed));

      setMessages([]);
      setRevealedExplicitMessages({});
      setContext(nextContext);
      setActiveRightTab('scene');
    } catch (error: any) {
      console.error('Story setup generation failed:', error);
      alert(`Quick story generation failed: ${error.message}`);
    } finally {
      setIsGeneratingStorySetup(false);
    }
  };

  const handleQuickStoryGeneration = async () => {
    if (!storyPrompt.trim() || isGeneratingStorySetup) return;
    await handleGenerateStorySetup(storyPrompt);
  };

  const saveCurrentSession = () => {
    const name = prompt('Name for this session:', `Session ${new Date().toLocaleString()}`);
    if (!name) return;

    const newSession: SavedSession = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      context,
      messages,
      aiConfig
    };

    setSavedSessions(prev => [newSession, ...prev]);
  };

  const loadSession = (session: SavedSession) => {
    if (confirm(`Do you want to load the session "${session.name}"? Unsaved changes will be lost.`)) {
      setContext(syncSceneContextTracking(session.context));
      setMessages(session.messages);
      if (session.aiConfig) {
        setAiConfig(session.aiConfig);
      }
      setShowSettings(false);
    }
  };

  const deleteSession = (id: string) => {
    if (confirm('Really delete session?')) {
      setSavedSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  const exportSessions = () => {
    const dataStr = JSON.stringify(savedSessions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'roleplay_sessions.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importSessions = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setSavedSessions(prev => [...imported, ...prev]);
        }
      } catch (err) {
        alert('Error importing file.');
      }
    };
    reader.readAsText(file);
  };

  const fetchOllamaModels = async () => {
    setIsFetchingModels(true);
    try {
      const url = aiConfig.baseUrl || "http://localhost:11434";
      const response = await fetch(`${url}/api/tags`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      const models = data.models.map((m: any) => m.name);
      setOllamaModels(models);
      if (models.length > 0 && !aiConfig.model) {
        setAiConfig(prev => ({ ...prev, model: models[0] || 'minimax-m2.5:cloud' }));
      }
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      alert('Could not connect to Ollama. Make sure it is running and CORS is allowed.');
    } finally {
      setIsFetchingModels(false);
    }
  };

  useEffect(() => {
    if (aiConfig.provider === 'ollama' && ollamaModels.length === 0) {
      fetchOllamaModels();
    }
  }, [aiConfig.provider]);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar - Scene Settings */}
      <motion.aside 
        initial={false}
        animate={{ width: showSettings ? '380px' : '0px', opacity: showSettings ? 1 : 0 }}
        className="border-r border-white/10 bg-[#0f0f0f] flex flex-col overflow-hidden"
      >
        <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-emerald-400" />
              Settings
            </h2>
          </div>

          {/* AI configuration block – removed previous tabs and pages */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Provider</label>
              <div className="grid grid-cols-3 gap-2">
                {(['gemini', 'openai', 'anthropic', 'mistral', 'groq', 'ollama'] as AIProvider[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setAiConfig(prev => ({ 
                      ...prev, 
                      provider: p,
                      model: p === 'gemini' ? 'gemini-3.1-pro-preview' : 
                             p === 'openai' ? 'gpt-4o' : 
                             p === 'anthropic' ? 'claude-3-5-sonnet-latest' :
                             p === 'mistral' ? 'mistral-large-latest' :
                         p === 'groq' ? 'llama-3.3-70b-versatile' : 'minimax-m2.5:cloud',
                      baseUrl: p === 'ollama' ? 'http://localhost:11434' : undefined
                    }))}
                    className={cn(
                      "py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all",
                      aiConfig.provider === p 
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20" 
                        : "bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300 hover:bg-white/10"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
              <div className="flex gap-2">
                {aiConfig.provider === 'ollama' && ollamaModels.length > 0 ? (
                  <select
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-all"
                  >
                    {ollamaModels.map(m => (
                      <option key={m} value={m} className="bg-[#0f0f0f] text-zinc-200">{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">API Key</label>
              <input
                type="password"
                value={aiConfig.apiKey || ''}
                onChange={(e) => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
              {aiConfig.provider === 'ollama' && (
                <p className="text-[10px] text-zinc-500 mt-1">The Ollama plugin runs locally and does not require an API key.</p>
              )}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col relative bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
          {/* Header */}
          <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  showSettings ? "bg-emerald-500/10 text-emerald-400" : "hover:bg-white/5 text-zinc-400"
                )}
              >
                <Settings2 className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-semibold text-zinc-100">Roleplay Orchestrator</h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-500" /> Multi-Character Engine Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={resetChat}
                className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 transition-colors"
                title="Reset Chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Active characters indicator */}
          <div className="px-6 py-2 border-b border-white/10 bg-[#0a0a0a]/80">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Present:</span>
            <div className="inline-flex flex-wrap gap-2 ml-2">
              {context.characters.filter(c => c.isPresent).map(c => (
                <span key={c.id} className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400">{c.name}</span>
              ))}
              {context.characters.every(c => !c.isPresent) && (
                <span className="text-xs text-zinc-500">None</span>
              )}
            </div>
            {(context.playerProfile?.name || context.playerProfile?.role) && (
              <div className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500">
                You are:
                <span className="ml-2 text-emerald-400 font-bold normal-case tracking-normal text-xs">
                  {context.playerProfile?.name || 'Unnamed Player'}
                  {context.playerProfile?.role ? ` — ${context.playerProfile.role}` : ''}
                </span>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                <ShieldAlert className="w-3 h-3 text-emerald-500" />
                {(context.contentSafety?.explicitMode || 'fade-to-black') === 'fade-to-black' ? 'Fade to black' : 'Explicit allowed'}
              </span>
              {(context.contentSafety?.blurExplicitContent ?? true) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                  <EyeOff className="w-3 h-3 text-emerald-500" /> Blur explicit
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="space-y-4 p-4 bg-white/[0.03] border border-emerald-500/10 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                    <BotMessageSquare className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Quick Story Generation</h3>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  Describe the exact story you want. The engine will generate the full context, player role, cast, tone, and scene settings in one step.
                </p>

                <textarea
                  value={storyPrompt}
                  onChange={(e) => setStoryPrompt(e.target.value)}
                  className="w-full h-36 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                  placeholder="Describe genre, tone, setting, your role, desired cast dynamics, pacing, content boundaries, and any important hooks..."
                />

                <button
                  onClick={handleQuickStoryGeneration}
                  disabled={!storyPrompt.trim() || isGeneratingStorySetup}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isGeneratingStorySetup ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                  {isGeneratingStorySetup ? 'Generating...' : 'Generate Full Story Setup'}
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                    <WandSparkles className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Quick Start Kits</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {STARTER_SCENARIOS.map((scenario) => {
                    const isActive =
                      context.location === scenario.context.location &&
                      context.plot === scenario.context.plot &&
                      context.theme === scenario.context.theme;

                    return (
                      <div
                        key={scenario.id}
                        className={cn(
                          "rounded-2xl border p-4 space-y-3 transition-all",
                          isActive
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-white/[0.03] border-white/5 hover:border-white/10"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">{scenario.title}</div>
                            <p className="text-xs text-zinc-400 mt-1">{scenario.tagline}</p>
                          </div>
                          <button
                            onClick={() => applyStarterScenario(scenario.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                              isActive
                                ? "bg-emerald-500 text-white"
                                : "bg-white/5 text-zinc-300 hover:bg-white/10"
                            )}
                          >
                            {isActive ? 'Loaded' : 'Use'}
                          </button>
                        </div>

                        <p className="text-xs text-zinc-500 leading-relaxed">{scenario.description}</p>

                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-1 rounded-full bg-black/20 border border-white/5 text-[10px] text-zinc-400 uppercase tracking-wider">
                            {scenario.context.theme}
                          </span>
                          <span className="px-2 py-1 rounded-full bg-black/20 border border-white/5 text-[10px] text-zinc-400 uppercase tracking-wider">
                            {scenario.context.characters.length} characters
                          </span>
                          <span className="px-2 py-1 rounded-full bg-black/20 border border-white/5 text-[10px] text-zinc-400 uppercase tracking-wider">
                            {scenario.context.autoTurnOrder}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {scenario.context.characters.map((character) => (
                            <span
                              key={character.id}
                              className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-zinc-300"
                            >
                              {character.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 pt-20">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-medium text-zinc-200">Ready for the adventure?</h3>
                    <p className="text-zinc-500 max-w-sm">
                      Set the context in the right sidebar and start the conversation. The engine takes over all characters.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                    {STARTER_SCENARIOS.slice(0, 4).map((scenario) => (
                      <button
                        key={scenario.id}
                        onClick={() => applyStarterScenario(scenario.id)}
                        className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-300 transition-all"
                      >
                        <span className="font-semibold text-emerald-400">{scenario.title}</span>
                        <span className="block text-[10px] text-zinc-500 mt-0.5">{scenario.context.characters.length} cast members</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.filter(m => !m.isHidden).map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col gap-1.5",
                      msg.role === 'user' ? "items-end" : "items-start"
                    )}
                  >
                    <div className="flex items-center gap-2 px-1">
                      {msg.characterName && (
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                          {msg.characterName}
                        </span>
                      )}
                      {shouldShowExplicitBadge(msg, context) && (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-300">
                          Explicit
                        </span>
                      )}
                    </div>
                    <div className={cn(
                      "max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-lg relative overflow-hidden",
                      msg.role === 'user' 
                        ? "bg-emerald-600 text-white rounded-tr-none" 
                        : "bg-zinc-700 border border-white/20 text-zinc-200 rounded-tl-none"
                    )}>
                      <div className={cn(
                        "markdown-body prose prose-invert prose-sm max-w-none transition-all",
                        shouldBlurMessage(msg, context) && !revealedExplicitMessages[msg.id] && "blur-md select-none"
                      )}>
                        <Markdown>{sanitizeExplicitMarker(msg.content)}</Markdown>
                      </div>
                      {shouldBlurMessage(msg, context) && !revealedExplicitMessages[msg.id] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                          <button
                            onClick={() => setRevealedExplicitMessages(prev => ({ ...prev, [msg.id]: true }))}
                            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-black/60 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-300 transition-all hover:bg-black/80"
                          >
                            <Eye className="w-3 h-3" /> Reveal explicit content
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-600 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 text-zinc-500 text-xs italic"
                >
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
                  </div>
                  The engine is writing...
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-6 bg-gradient-to-t from-[#0a0a0a] to-transparent">
            <form 
              onSubmit={handleSendMessage}
              className="max-w-3xl mx-auto relative group"
            >
              <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="What do you do or say?"
                className="w-full bg-zinc-700 border border-white/20 rounded-2xl pl-6 pr-14 py-4 focus:outline-none focus:border-emerald-400 transition-all text-zinc-200 placeholder:text-zinc-500 shadow-2xl"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-all shadow-lg"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </main>

        {/* Right Sidebar - Tabs for Scene, Characters, Sessions */}
        <div className="group relative w-3 flex-shrink-0 cursor-col-resize bg-transparent" onMouseDown={() => setIsResizingRightSidebar(true)} onDoubleClick={() => setRightSidebarWidth(560)}>
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10 transition-colors group-hover:bg-emerald-500/70" />
          <div className="absolute left-1/2 top-1/2 h-16 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 transition-all group-hover:h-24 group-hover:bg-emerald-500/70" />
        </div>

        <aside
          className="min-w-[24rem] max-w-[60rem] flex-shrink-0 border-l border-white/10 bg-gradient-to-b from-[#111111] via-[#0d0d0d] to-[#090909] flex flex-col overflow-hidden shadow-[-24px_0_60px_rgba(0,0,0,0.28)]"
          style={{ width: rightSidebarWidth }}
        >
          <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl px-4 py-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Workspace Panel</p>
                <h2 className="mt-1 text-sm font-semibold uppercase tracking-wider text-zinc-100">Story controls and cast tools</h2>
              </div>
              <div className="hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-right lg:block">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300">Active tab</p>
                <p className="mt-1 text-xs font-semibold text-zinc-100">{activeRightTab}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 uppercase tracking-widest text-zinc-500">
            {[
              { id: 'scene', icon: Layout, label: 'Scene' },
              { id: 'characters', icon: Users, label: 'Chars' },
              { id: 'sessions', icon: History, label: 'Logs' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveRightTab(tab.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold transition-all",
                  activeRightTab === tab.id 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
            {activeRightTab === 'scene' && (
              <ScenePage
                context={context}
                setContext={setTrackedContext}
                messages={messages}
                aiConfig={aiConfig}
              />
            )}
            {activeRightTab === 'characters' && (
              <CharactersPage
                context={context}
                setContext={setTrackedContext}
                addCharacter={addCharacter}
                updateCharacter={updateCharacter}
                removeCharacter={removeCharacter}
                setIsWizardOpen={setIsWizardOpen}
                onEditCharacter={handleEditCharacter}
              />
            )}
            {activeRightTab === 'sessions' && (
              <SessionsPage
                savedSessions={savedSessions}
                saveCurrentSession={saveCurrentSession}
                createNewSession={createNewSession}
                exportSessions={exportSessions} 
                importSessions={importSessions} 
                deleteSession={deleteSession}
                loadSession={loadSession}
              />
            )}
          </div>
        </aside>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .markdown-body p {
          margin-bottom: 0.75rem;
        }
        .markdown-body p:last-child {
          margin-bottom: 0;
        }
        .markdown-body strong {
          color: #10b981;
          font-weight: 600;
        }
        .markdown-body em {
          color: #71717a;
          font-style: italic;
        }
      `}</style>
      <CharacterWizard 
        isOpen={isWizardOpen} 
        onClose={() => {
          setIsWizardOpen(false);
          setEditingCharacter(null);
        }} 
        sceneTheme={context.theme || 'Fantasy'}
        onSave={async (savedChar) => {
          if (editingCharacter) {
            const updatedCharacters = context.characters.map(c => c.id === savedChar.id ? savedChar : c);
            setContext(prev => ({ ...prev, characters: updatedCharacters }));
            if (messages.length > 0) {
              await triggerSystemEvent(`${savedChar.name} has been updated.`, { ...context, characters: updatedCharacters });
            }
          } else {
            const updatedCharacters = [...context.characters, savedChar];
            setContext(prev => ({
              ...prev,
              characters: updatedCharacters,
            }));
            if (messages.length > 0) {
              await triggerSystemEvent(`A new character named ${savedChar.name} has been added to the scene. They should briefly introduce themselves or react to the situation.`, { ...context, characters: updatedCharacters });
            }
          }
        }}
        aiConfig={aiConfig}
        initialCharacter={editingCharacter}
      />
    </div>
  );
}
