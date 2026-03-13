import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, MapPin, Activity, Check, Lightbulb, Eye, Brain, Workflow, Loader2, ChevronDown, ChevronRight, Zap, Clock, Sparkles, BookOpen, Target, TrendingUp, MessageSquare, AlertCircle, Users, Lock, Heart, Eye as EyeIcon, MemoryStick } from 'lucide-react';
import { cn } from '../lib/utils';
import { SceneContext, Message, AIConfig, StoryMemoryEntry, MemoryEntryType, CharacterAgent } from '../types';
import { createMemoryEntry, getActiveMemoryEntries, addMemoryEntry } from '../lib/memory';
import { generateLocationSuggestions, generateContextUpdate, updateSceneState } from '../services/geminiService';
import { buildCharacterAgentDigest, getAgentSummary, getEmotionalTrend, syncAllAgentsFromStory, createAgentState } from '../lib/characterAgent';

// Agent result types
export interface AgentResult {
  id: string;
  location?: string;
  rationale?: string;
  transitionHook?: string;
  fitsMode?: 'tele' | 'presence' | 'both';
  summary?: string;
  events?: string[];
  context?: Partial<SceneContext>;
  memoryEntry?: {
    type: MemoryEntryType;
    content: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    characterIds?: string[];
  };
  narrativeAnalysis?: {
    tension: number;
    characterFocus: string[];
    plotProgression: string;
    suggestedActions: string[];
  };
}

// Agent configuration
export type AgentStatus = 'idle' | 'running' | 'error';

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  status: AgentStatus;
  currentJob?: string;
  progress?: number;
  lastRun?: string;
  results?: AgentResult[];
  runCount: number;
  lastContextSnapshot?: string;
  runHistory?: Array<{ timestamp: string; job: string; result: string }>;
}

// Change tracking
interface ChangeTracker {
  location?: string;
  plot?: string;
  theme?: string;
  conversationMode?: string;
  characters?: string;
  events?: string[];
  summary?: string;
  memory?: string;
  lastMessage?: string;
}

interface AgentsPageProps {
  context: SceneContext;
  messages: Message[];
  aiConfig: AIConfig;
  scenes?: Array<{ id: string; name: string; context: SceneContext; createdAt: number; updatedAt: number }>;
  notify?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onApplyLocation?: (location: string, rationale: string, transitionHook: string, fitsMode: 'tele' | 'presence' | 'both') => void;
  onApplyContextUpdate?: (updates: Partial<SceneContext>) => void;
  onApplySceneUpdate?: (summary: string, events: string[]) => void;
  onApplyMemory?: (entry: StoryMemoryEntry) => void;
  onUpdateCharacterAgents?: (agents: CharacterAgent[]) => void;
}

// Job descriptions for each agent
const AGENT_JOBS: Record<string, string> = {
  orchestrator: 'Analyzing story state and coordinating agents',
  location: 'Generating location suggestions based on context',
  context: 'Processing conversation for context updates',
  scene: 'Updating scene state and tracking events',
  watcher: 'Scanning messages for significant events',
};

export const AgentsPage: React.FC<AgentsPageProps> = ({
  context,
  messages,
  aiConfig,
  scenes,
  notify,
  onApplyLocation,
  onApplyContextUpdate,
  onApplySceneUpdate,
  onApplyMemory,
  onUpdateCharacterAgents,
}) => {
  const [isOrchestratorActive, setIsOrchestratorActive] = useState(true);
  const [orchestratorStatus, setOrchestratorStatus] = useState<'idle' | 'analyzing' | 'orchestrating'>('idle');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [selectedCharacterAgent, setSelectedCharacterAgent] = useState<string | null>(null);

  const [characterAgents, setCharacterAgents] = useState<Record<string, CharacterAgent>>(() => 
    context.characterAgents?.reduce((acc, agent) => ({ ...acc, [agent.characterId]: agent }), {}) || {}
  );

  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'orchestrator',
      name: 'Story Orchestrator',
      description: 'Coordinates all agents and tracks story changes',
      icon: <Workflow className="w-5 h-5" />,
      enabled: true,
      status: 'idle',
      currentJob: AGENT_JOBS.orchestrator,
      runCount: 0,
      runHistory: [],
    },
    {
      id: 'location',
      name: 'Location Agent',
      description: 'Suggests locations based on story progression',
      icon: <MapPin className="w-5 h-5" />,
      enabled: true,
      status: 'idle',
      currentJob: AGENT_JOBS.location,
      runCount: 0,
      runHistory: [],
    },
    {
      id: 'context',
      name: 'Context Agent',
      description: 'Monitors context and suggests updates',
      icon: <Brain className="w-5 h-5" />,
      enabled: true,
      status: 'idle',
      currentJob: AGENT_JOBS.context,
      runCount: 0,
      runHistory: [],
    },
    {
      id: 'scene',
      name: 'Scene State Agent',
      description: 'Tracks events and maintains narrative state',
      icon: <Activity className="w-5 h-5" />,
      enabled: true,
      status: 'idle',
      currentJob: AGENT_JOBS.scene,
      runCount: 0,
      runHistory: [],
    },
    {
      id: 'watcher',
      name: 'Change Watcher',
      description: 'Monitors messages for significant story events',
      icon: <Eye className="w-5 h-5" />,
      enabled: true,
      status: 'idle',
      currentJob: AGENT_JOBS.watcher,
      runCount: 0,
      runHistory: [],
    },
  ]);

  const [selectedResults, setSelectedResults] = useState<Record<string, string>>({});
  const previousContextRef = useRef<string>('');
  const previousMessagesLengthRef = useRef<number>(0);

  const computeContextHash = useCallback((ctx: SceneContext, msgCount: number, lastMsg?: string): string => {
    const memoryCount = ctx.storyMemory?.entries?.length || 0;
    return JSON.stringify({
      location: ctx.location,
      plot: ctx.plot,
      theme: ctx.theme,
      mode: ctx.conversationMode,
      chars: ctx.characters?.map(c => c.id).join(','),
      msgCount,
      memoryCount,
      lastMessage: lastMsg?.slice(-50),
    });
  }, []);

  const detectChanges = useCallback((oldHash: string, newHash: string): ChangeTracker => {
    const changes: ChangeTracker = {};
    try {
      const oldCtx = JSON.parse(oldHash);
      const newCtx = JSON.parse(newHash);
      if (oldCtx.location !== newCtx.location) changes.location = newCtx.location;
      if (oldCtx.plot !== newCtx.plot) changes.plot = newCtx.plot;
      if (oldCtx.theme !== newCtx.theme) changes.theme = newCtx.theme;
      if (oldCtx.mode !== newCtx.mode) changes.conversationMode = newCtx.mode;
      if (oldCtx.memoryCount !== newCtx.memoryCount) changes.memory = 'updated';
      if (oldCtx.lastMessage !== newCtx.lastMessage) changes.lastMessage = newCtx.lastMessage;
    } catch (e) { return {}; }
    return changes;
  }, []);

  const analyzeEmotionalState = (msgs: Message[]): { dominant: string; shifts: string[] } => {
    const recentMsgs = msgs.slice(-5);
    const emotionalKeywords: Record<string, string[]> = {
      happy: ['happy', 'joy', 'laugh', 'smile', 'excited', 'great', 'wonderful', 'love', '😊', '😂'],
      angry: ['angry', 'furious', 'hate', 'rage', 'kill', 'stupid', 'damn', '😠', '🔥'],
      sad: ['sad', 'cry', 'tears', 'miss', 'sorry', 'unfortunately', '😢', '💔'],
      tense: ['nervous', 'worried', 'fear', 'careful', 'suspicious', 'watching', '😰', '⚠️'],
      romantic: ['kiss', 'love', 'heart', 'dear', 'baby', 'romantic', '💕', '❤️'],
    };
    
    const counts: Record<string, number> = { happy: 0, angry: 0, sad: 0, tense: 0, romantic: 0, neutral: 0 };
    recentMsgs.forEach(msg => {
      const content = msg.content.toLowerCase();
      for (const [emotion, keywords] of Object.entries(emotionalKeywords)) {
        if (keywords.some(k => content.includes(k))) counts[emotion]++;
      }
    });
    
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    const shifts: string[] = [];
    if (recentMsgs.length >= 2) {
      const first = recentMsgs[0].content.toLowerCase();
      const last = recentMsgs[recentMsgs.length - 1].content.toLowerCase();
      for (const [emotion, keywords] of Object.entries(emotionalKeywords)) {
        const firstMatch = keywords.some(k => first.includes(k));
        const lastMatch = keywords.some(k => last.includes(k));
        if (firstMatch !== lastMatch && lastMatch) shifts.push(emotion);
      }
    }
    return { dominant, shifts };
  };

  const runOrchestrator = useCallback(async () => {
    if (!isOrchestratorActive) return;
    const orchestrator = agents.find(a => a.id === 'orchestrator');
    if (!orchestrator?.enabled) return;

    setOrchestratorStatus('analyzing');
    const lastMsg = messages.length > 0 ? messages[messages.length - 1].content : undefined;
    const newHash = computeContextHash(context, messages.length, lastMsg);
    const changes = detectChanges(previousContextRef.current, newHash);
    const emotionalState = analyzeEmotionalState(messages);

    previousContextRef.current = newHash;
    previousMessagesLengthRef.current = messages.length;
    setOrchestratorStatus('orchestrating');

    const agentsToRun = ['orchestrator'];
    if (changes.location || changes.plot) agentsToRun.push('location');
    if (changes.theme || changes.conversationMode || changes.characters) agentsToRun.push('context');
    if (messages.length > previousMessagesLengthRef.current) agentsToRun.push('scene', 'watcher');
    if (emotionalState.shifts.length > 0) agentsToRun.push('watcher');

    for (const agentId of agentsToRun) {
      const agent = agents.find(a => a.id === agentId);
      if (agent?.enabled && agent.status !== 'running') {
        await runSingleAgent(agentId);
      }
    }

    setOrchestratorStatus('idle');
    notify?.('Story sync complete', 'success');
  }, [isOrchestratorActive, context, messages.length, agents, computeContextHash, detectChanges, notify]);

  const runSingleAgent = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.enabled) return;

    const jobDescription = AGENT_JOBS[agentId] || 'Processing...';

    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, status: 'running' as AgentStatus, currentJob: jobDescription, progress: 0 } : a
    ));

    // Simulate progress
    const progressInterval = setInterval(() => {
      setAgents(prev => prev.map(a =>
        a.id === agentId && a.progress !== undefined && a.progress < 90
          ? { ...a, progress: Math.min((a.progress || 0) + Math.random() * 30, 85) }
          : a
      ));
    }, 300);

    try {
      let results: AgentResult[] = [];
      let resultSummary = 'Completed';

      switch (agentId) {
        case 'location':
          try {
            const sceneData = scenes?.map(s => ({
              id: s.id,
              name: s.name,
              context: s.context,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt,
            })) || [];
            const aiResult: any = await generateLocationSuggestions(aiConfig, context, sceneData);
            const suggestions = aiResult?.suggestions || [];
            results = suggestions.map((s: any, i: number) => ({
              id: String(i + 1),
              location: s.location,
              rationale: s.rationale,
              transitionHook: s.transitionHook,
              fitsMode: s.fitsMode || 'both',
              memoryEntry: aiResult?.memoryEntry ? {
                type: aiResult.memoryEntry.type,
                content: aiResult.memoryEntry.content,
                importance: aiResult.memoryEntry.importance,
              } : undefined,
            }));
            resultSummary = `Generated ${results.length} locations`;
          } catch (err: any) {
            notify?.(`Location AI failed: ${err.message}`, 'error');
            results = generateMockResults('location');
            resultSummary = 'Using fallback locations';
          }
          break;
        case 'context':
          try {
            const instruction = messages[messages.length - 1]?.content || 'Review and suggest context improvements';
            const aiResult: any = await generateContextUpdate(aiConfig, context, instruction);
            if (aiResult?.contextUpdates) {
              results = [{
                id: '1',
                context: aiResult.contextUpdates,
                memoryEntry: aiResult.memoryEntries?.[0] ? {
                  type: aiResult.memoryEntries[0].type,
                  content: aiResult.memoryEntries[0].content,
                  importance: aiResult.memoryEntries[0].importance,
                } : undefined,
              }];
            }
            resultSummary = `Analyzed context (${aiResult?.reasoning?.slice(0, 50) || 'completed'})`;
          } catch (err: any) {
            notify?.(`Context AI failed: ${err.message}`, 'error');
            results = generateMockResults('context');
            resultSummary = 'Using fallback analysis';
          }
          break;
        case 'scene':
          try {
            const aiResult: any = await updateSceneState(aiConfig, context, messages);
            results = [{
              id: '1',
              summary: aiResult?.summary || 'Scene updated',
              events: aiResult?.events || [],
              memoryEntry: aiResult?.newMemories?.[0] ? {
                type: aiResult.newMemories[0].type,
                content: aiResult.newMemories[0].content,
                importance: aiResult.newMemories[0].importance,
              } : undefined,
              narrativeAnalysis: aiResult?.qualityAnalysis ? {
                tension: aiResult.qualityAnalysis.conversationVelocity || 5,
                characterFocus: aiResult.qualityAnalysis.bottleneckCharacters || [],
                plotProgression: aiResult.qualityAnalysis.narrativePath || 'Continuing',
                suggestedActions: aiResult.qualityAnalysis.recommendedPrompts || [],
              } : undefined,
            }];
            resultSummary = aiResult?.reasoning?.slice(0, 60) || 'Scene analyzed';
          } catch (err: any) {
            notify?.(`Scene AI failed: ${err.message}`, 'error');
            results = generateMockResults('scene');
            resultSummary = 'Using fallback analysis';
          }
          break;
        case 'watcher':
          results = analyzeMessagesForEvents();
          resultSummary = `Found ${results[0]?.events?.length || 0} events`;
          break;
        case 'orchestrator':
          await new Promise(r => setTimeout(r, 500));
          const activeMemories = getActiveMemoryEntries(context.storyMemory || { entries: [] });
          results = [{ id: '1', summary: `Orchestration active - ${activeMemories.length} memories tracked` }];
          resultSummary = 'All systems coordinated';
          break;
      }

      clearInterval(progressInterval);

      setAgents(prev => prev.map(a => {
        if (a.id !== agentId) return a;
        const timestamp = new Date().toLocaleTimeString();
        return {
          ...a,
          status: 'idle' as AgentStatus,
          results,
          progress: 100,
          lastRun: 'Just now',
          runCount: a.runCount + 1,
          currentJob: 'Idle - awaiting next task',
          runHistory: [{ timestamp, job: jobDescription, result: resultSummary }, ...(a.runHistory || [])].slice(0, 5),
        };
      }));

      if (results.length > 0 && agentId !== 'orchestrator') {
        setSelectedResults(prev => ({ ...prev, [agentId]: results[0].id }));
      }

      setTimeout(() => {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, progress: undefined } : a));
      }, 500);

    } catch (error: any) {
      clearInterval(progressInterval);
      setAgents(prev => prev.map(a =>
        a.id === agentId ? { ...a, status: 'error' as AgentStatus, currentJob: `Error: ${error.message}`, progress: undefined } : a
      ));
    }
  };

  const analyzeMessagesForEvents = (): AgentResult[] => {
    const recentMessages = messages.slice(-8);
    const events: string[] = [];
    let memoryEntry: AgentResult['memoryEntry'] | undefined;

    recentMessages.forEach((msg) => {
      const content = msg.content.toLowerCase();
      const charName = msg.characterName;
      const charIds = context.characters.filter(c => c.name === charName).map(c => c.id);

      if (content.includes('enter') || content.includes('arrives')) {
        events.push('Character arrival');
        memoryEntry = { type: 'event', content: `${charName || 'A character'} arrived at the location`, importance: 'medium', characterIds: charIds };
      }
      if (content.includes('leave') || content.includes('depart') || content.includes('exits')) {
        events.push('Character departure');
        memoryEntry = { type: 'event', content: `${charName || 'A character'} left the scene`, importance: 'medium', characterIds: charIds };
      }
      if (content.includes('fight') || content.includes('attack') || content.includes('killed') || content.includes('murder')) {
        events.push('Conflict');
        memoryEntry = { type: 'event', content: `Violent conflict occurred: ${msg.content.slice(0, 150)}`, importance: 'critical', characterIds: charIds };
      }
      if (content.includes('agree') || content.includes('promise') || content.includes('deal') || content.includes('sworn')) {
        events.push('Agreement');
        memoryEntry = { type: 'relationship_change', content: `A pact or agreement was formed: ${msg.content.slice(0, 150)}`, importance: 'high', characterIds: charIds };
      }
      if (content.includes('reveal') || content.includes('discover') || content.includes('secret') || content.includes('truth')) {
        events.push('Discovery');
        memoryEntry = { type: 'important_detail', content: `A secret was revealed: ${msg.content.slice(0, 150)}`, importance: 'critical', characterIds: charIds };
      }
      if (content.includes('fall in love') || content.includes('kissed') || content.includes('romance')) {
        events.push('Romantic moment');
        memoryEntry = { type: 'character_development', content: `Romantic development: ${msg.content.slice(0, 150)}`, importance: 'high', characterIds: charIds };
      }
      if (content.includes('betray') || content.includes('lie') || content.includes('deceive')) {
        events.push('Betrayal');
        memoryEntry = { type: 'relationship_change', content: `A betrayal occurred: ${msg.content.slice(0, 150)}`, importance: 'critical', characterIds: charIds };
      }
    });

    if (events.length === 0) return [];

    const activeMemory = getActiveMemoryEntries(context.storyMemory || { entries: [] });
    const narrativeAnalysis: AgentResult['narrativeAnalysis'] = {
      tension: Math.min(10, Math.floor(events.length * 1.5) + (activeMemory.length > 3 ? 3 : 0)),
      characterFocus: recentMessages.map(m => m.characterName).filter(Boolean) as string[],
      plotProgression: activeMemory.length > 0 ? 'Building on previous events' : 'Initial setup phase',
      suggestedActions: events.length > 2 ? ['Consider a plot twist', 'Introduce a new character'] : ['Continue building tension'],
    };

    return [{
      id: 'watcher-1',
      events: [...new Set(events)],
      summary: `Detected ${events.length} event(s) - ${memoryEntry ? 'Memory will be recorded' : 'No significant memories to record'}`,
      memoryEntry,
      narrativeAnalysis,
    }];
  };

  const generateMockResults = (id: string): AgentResult[] => {
    const activeMemory = getActiveMemoryEntries(context.storyMemory || { entries: [] });
    const memoryContext = activeMemory.length > 0
      ? ` (${activeMemory.length} memories active: ${activeMemory.slice(0, 2).map(m => m.content.slice(0, 30)).join(', ')}...)`
      : '';

    const theme = context.theme?.toLowerCase() || '';
    const plot = context.plot?.toLowerCase() || '';
    const mode = context.conversationMode || 'presence';

    const locationTemplates: Record<string, { location: string; rationale: string; hook: string }[]> = {
      default: [
        { location: 'A dimly lit tavern', rationale: 'Natural gathering spot', hook: 'The door creaks open...' },
        { location: 'Abandoned warehouse', rationale: 'Secret meeting spot near old docks', hook: 'Dust motes dance in the shafts of light...' },
        { location: 'Rooftop garden', rationale: 'Elevated viewpoint overlooking the city', hook: 'The city spreads out below like a circuit board...' },
      ],
      romance: [
        { location: 'Moonlit balcony', rationale: 'Perfect for intimate conversations', hook: 'Candles flicker in the gentle breeze...' },
        { location: 'Secluded café', rationale: 'Cozy corner for two', hook: 'The aroma of coffee fills the air...' },
        { location: 'Botanical garden', rationale: 'Among flowers and fountains', hook: 'Butterflies dance between rose bushes...' },
      ],
      mystery: [
        { location: 'Crime scene alley', rationale: 'Where secrets were buried', hook: 'Police tape flutters in the wind...' },
        { location: 'Detective\'s office', rationale: 'Cluttered with clues and mysteries', hook: 'Newspapers cover every surface...' },
        { location: 'Foggy dockyard', rationale: 'Where evidence washes ashore', hook: 'The fog obscures all but shapes in the distance...' },
      ],
      fantasy: [
        { location: 'Enchanted forest', rationale: 'Where magic lingers in the air', hook: 'Fireflies illuminate the ancient trees...' },
        { location: 'Wizard\'s tower', rationale: 'Filled with arcane artifacts', hook: 'Books float mid-air, their pages turning themselves...' },
        { location: 'Dragon\'s cave', rationale: 'Treasure beyond imagination', hook: 'Gold coins scatter like pebbles...' },
      ],
      horror: [
        { location: 'Abandoned asylum', rationale: 'Where the screams never stopped', hook: 'Wheelchairs rust in the hallway...' },
        { location: 'Graveyard at midnight', rationale: 'The dead watch from below', hook: 'Fog creeps across the tombstones...' },
        { location: 'Basement laboratory', rationale: 'Experiments best left forgotten', hook: 'Stained tables hold ancient equipment...' },
      ],
      scifi: [
        { location: 'Space station observation deck', rationale: 'Stars stretch to infinity', hook: 'Planets revolve slowly in the viewport...' },
        { location: 'Cyberpunk noodle bar', rationale: 'Neon lights and augmented patrons', hook: 'Holograms advertise everything imaginable...' },
        { location: 'Alien ruins', rationale: 'Technology beyond comprehension', hook: 'Symbols pulse with unknown energy...' },
      ],
      adventure: [
        { location: 'Desert oasis', rationale: 'A mirage or reality?', hook: 'Palm trees sway in the hot wind...' },
        { location: 'Mountain pass', rationale: 'The only way through', hook: 'Eagles circle overhead...' },
        { location: 'Pirate ship deck', rationale: 'Plunder awaits', hook: 'The Jolly Roger flaps in the sea breeze...' },
      ],
    };

    let selectedLocations = locationTemplates.default;
    for (const [key, locations] of Object.entries(locationTemplates)) {
      if (theme.includes(key) || plot.includes(key)) {
        selectedLocations = locations;
        break;
      }
    }

    const generateVariations = (base: { location: string; rationale: string; hook: string }, index: number): AgentResult => {
      const variations = [
        { suffix: '', desc: 'Primary location' },
        { suffix: ' (back entrance)', desc: 'Alternate access' },
        { suffix: ' - 2nd floor', desc: 'Different level' },
      ];
      const v = variations[index % variations.length];
      return {
        id: `${index + 1}`,
        location: base.location + v.suffix,
        rationale: `${base.rationale}${memoryContext}`,
        transitionHook: base.hook,
        fitsMode: index % 3 === 1 ? 'tele' : (index % 3 === 2 ? 'both' : mode),
      };
    };

    const generatedLocations = selectedLocations.map((loc, i) => generateVariations(loc, i));

    const mockData: Record<string, AgentResult[]> = {
      location: generatedLocations,
      context: [
        { id: '1', context: { theme: context.theme || 'Noir', plot: `Tensions rise between factions${memoryContext}` } },
        { id: '2', context: { conversationMode: 'presence' }, memoryEntry: { type: 'plot_point', content: 'Mode changed to in-person interaction', importance: 'low' } },
      ],
      scene: [
        { id: '1', summary: `Negotiation reached critical point${memoryContext}`, events: ['Characters arrived', 'Tensions escalated'], memoryEntry: { type: 'event', content: 'Key negotiation in progress', importance: 'high' } },
        { id: '2', summary: `A truce has been proposed${memoryContext}`, events: ['Peace offering', 'Suspicion remains'], memoryEntry: { type: 'relationship_change', content: 'New alliance potentially forming', importance: 'high' } },
      ],
    };
    return mockData[id] || [];
  };

  const toggleOrchestrator = () => {
    setIsOrchestratorActive(!isOrchestratorActive);
    notify?.(`Story orchestration ${!isOrchestratorActive ? 'disabled' : 'enabled'}`, 'info');
  };

  const runAgent = async (id: string) => {
    if (id === 'orchestrator') {
      await runOrchestrator();
    } else {
      await runSingleAgent(id);
    }
  };

  const applyResult = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    const selectedId = selectedResults[agentId];
    const result = agent?.results?.find(r => r.id === selectedId);
    if (!result) return notify?.('Select a result first', 'warning');

    if (agentId === 'location' && result.location) {
      onApplyLocation?.(result.location, result.rationale || '', result.transitionHook || '', result.fitsMode || 'both');
      notify?.(`Applied: ${result.location}`, 'success');
    } else if (agentId === 'context' && result.context) {
      onApplyContextUpdate?.(result.context);
      notify?.('Context updated', 'success');
    } else if ((agentId === 'scene' || agentId === 'watcher') && result.summary) {
      onApplySceneUpdate?.(result.summary, result.events || []);
      notify?.('Scene updated', 'success');
    }

    if (result.memoryEntry) {
      const newEntry = createMemoryEntry(
        result.memoryEntry.type,
        result.memoryEntry.content,
        result.memoryEntry.characterIds,
        result.memoryEntry.importance
      );
      onApplyMemory?.(newEntry);
      notify?.(`Memory recorded: ${result.memoryEntry.type.replace('_', ' ')}`, 'info');
    }
  };

  const toggleAgent = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
    const agent = agents.find(a => a.id === id);
    notify?.(`${agent?.name} ${agent?.enabled ? 'disabled' : 'enabled'}`, 'info');
  };

  useEffect(() => {
    const hash = computeContextHash(context, messages.length);
    if (previousContextRef.current && hash !== previousContextRef.current && isOrchestratorActive) {
      runOrchestrator();
    }
  }, [context, messages.length, isOrchestratorActive, computeContextHash, runOrchestrator]);

  const getStatusColor = (status: AgentStatus) => {
    const colors = { idle: 'bg-zinc-500/20 text-zinc-400', running: 'bg-amber-500/20 text-amber-400', error: 'bg-red-500/20 text-red-400' };
    return colors[status];
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-4">
      {/* Orchestrator Status Panel */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", isOrchestratorActive ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-500/20")}>
              {orchestratorStatus !== 'idle' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Workflow className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-medium text-zinc-200">Story Orchestrator</h4>
              <p className="text-xs text-zinc-500">
                {orchestratorStatus === 'idle' ? 'Watching for changes...' :
                 orchestratorStatus === 'analyzing' ? 'Analyzing context changes...' : 'Coordinating agents...'}
              </p>
            </div>
          </div>
          <button onClick={toggleOrchestrator} className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium",
            isOrchestratorActive ? "bg-red-500/20 text-red-400" : "bg-cyan-500/20 text-cyan-400"
          )}>
            {isOrchestratorActive ? 'Disable' : 'Enable'}
          </button>
        </div>
        
        {/* Active Agents Grid */}
        <div className="grid grid-cols-5 gap-2">
          {agents.map(agent => (
            <div key={agent.id} className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg border",
              agent.enabled && agent.status === 'idle' ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5 bg-white/5"
            )}>
              <div className={cn("p-1.5 rounded-full", getStatusColor(agent.status))}>
                {agent.status === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                  agent.id === 'orchestrator' ? <Workflow className="w-3 h-3" /> :
                  agent.id === 'location' ? <MapPin className="w-3 h-3" /> :
                  agent.id === 'context' ? <Brain className="w-3 h-3" /> :
                  agent.id === 'scene' ? <Activity className="w-3 h-3" /> :
                  <Eye className="w-3 h-3" />}
              </div>
              <span className="text-[9px] text-zinc-400 truncate w-full text-center">{agent.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
        Agents ({agents.filter(a => a.enabled).length}/{agents.length})
      </div>

      <div className="space-y-2">
        {agents.map((agent) => (
          <div key={agent.id} className={cn(
            "rounded-xl border overflow-hidden transition-all",
            agent.enabled ? "border-white/10 bg-white/[0.02]" : "border-white/5 bg-white/[0.01] opacity-50"
          )}>
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.02]"
              onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
            >
              <div className={cn(
                "p-2 rounded-lg flex-shrink-0",
                agent.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-500"
              )}>
                {agent.status === 'running' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : agent.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-zinc-200">{agent.name}</h4>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", getStatusColor(agent.status))}>
                    {agent.status}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 truncate">{agent.currentJob}</p>
              </div>

              {agent.status === 'running' && agent.progress !== undefined && (
                <div className="w-10 h-10 relative flex-shrink-0">
                  <svg className="w-10 h-10 -rotate-90">
                    <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none" className="text-zinc-700" />
                    <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none"
                      strokeDasharray={100.5} strokeDashoffset={100.5 - (100.5 * agent.progress / 100)}
                      className="text-amber-500 transition-all" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-amber-400">
                    {Math.round(agent.progress)}%
                  </span>
                </div>
              )}

              {expandedAgent === agent.id ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
            </div>

            {expandedAgent === agent.id && (
              <div className="px-3 pb-3 pt-2 space-y-3 border-t border-white/5">
                {/* Agent Info */}
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">{agent.description}</p>
                  <div className="flex items-center gap-4 text-[10px] text-zinc-600">
                    <span>Run count: {agent.runCount}</span>
                    {agent.lastRun && <span>Last: {agent.lastRun}</span>}
                  </div>
                </div>

                {/* Options / What this agent does */}
                <div className="p-2 rounded-lg border border-white/10 bg-white/[0.02]">
                  <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-400 mb-2">
                    <Target className="w-3 h-3" /> What it does
                  </div>
                  <div className="space-y-1 text-[10px] text-zinc-500">
                    {agent.id === 'orchestrator' && <span>Monitors context changes and coordinates all agents</span>}
                    {agent.id === 'location' && <span>Suggests scene locations based on story progression and memory</span>}
                    {agent.id === 'context' && <span>Analyzes conversation for theme, plot, and mode updates</span>}
                    {agent.id === 'scene' && <span>Tracks events and maintains narrative state</span>}
                    {agent.id === 'watcher' && <span>Scans messages for significant story events and creates memories</span>}
                  </div>
                </div>

                {/* Run History */}
                {agent.runHistory && agent.runHistory.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <Zap className="w-3 h-3" /> Recent Jobs
                    </div>
                    {agent.runHistory.map((h, i) => (
                      <div key={i} className="text-[10px] text-zinc-400 flex justify-between">
                        <span className="text-zinc-600">{h.timestamp}</span>
                        <span>{h.result}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Results */}
                {agent.results && agent.results.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px] font-medium text-amber-400">Results ({agent.results.length})</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {agent.results.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => setSelectedResults(prev => ({ ...prev, [agent.id]: result.id }))}
                          className={cn(
                            "w-full text-left p-2 rounded-lg border text-xs",
                            selectedResults[agent.id] === result.id ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-3 h-3 rounded-full border flex items-center",
                              selectedResults[agent.id] === result.id ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"
                            )}>
                              {selectedResults[agent.id] === result.id && <Check className="w-2 h-2 text-white" />}
                            </div>
                            <span className="text-zinc-300 truncate">
                              {result.location || result.summary || result.context?.theme || 'Result'}
                            </span>
                          </div>
                          {result.memoryEntry && (
                            <div className="mt-1 flex items-center gap-1 text-[9px] text-cyan-400">
                              <Brain className="w-2.5 h-2.5" />
                              <span>Memory: {result.memoryEntry.type.replace('_', ' ')}</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Narrative Analysis for watcher/scene */}
                    {(agent.id === 'watcher' || agent.id === 'scene') && agent.results[0]?.narrativeAnalysis && (
                      <div className="p-2 rounded-lg border border-violet-500/20 bg-violet-500/5 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-violet-400">
                          <TrendingUp className="w-3 h-3" /> Narrative Analysis
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="flex items-center justify-between p-1.5 rounded bg-black/20">
                            <span className="text-zinc-500">Tension:</span>
                            <span className="text-amber-400 font-medium">{agent.results[0].narrativeAnalysis?.tension || 0}/10</span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded bg-black/20">
                            <span className="text-zinc-500">Plot:</span>
                            <span className="text-zinc-300 text-[9px] truncate">{agent.results[0].narrativeAnalysis?.plotProgression || 'N/A'}</span>
                          </div>
                        </div>
                        {agent.results[0].narrativeAnalysis?.characterFocus && agent.results[0].narrativeAnalysis.characterFocus.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[9px] text-zinc-500">Active:</span>
                            {agent.results[0].narrativeAnalysis?.characterFocus.slice(0, 3).map((char, i) => (
                              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{char}</span>
                            ))}
                          </div>
                        )}
                        {agent.results[0].narrativeAnalysis?.suggestedActions && (
                          <div>
                            <span className="text-[9px] text-zinc-500">Suggestions:</span>
                            <ul className="mt-0.5 space-y-0.5">
                              {agent.results[0].narrativeAnalysis?.suggestedActions.map((action, i) => (
                                <li key={i} className="text-cyan-300 text-[9px]">• {action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => applyResult(agent.id)}
                      disabled={!selectedResults[agent.id]}
                      className={cn(
                        "w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium",
                        selectedResults[agent.id] ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/10 text-zinc-500"
                      )}
                    >
                      <Check className="w-3 h-3" /> Apply Selected
                    </button>
                  </div>
                )}

                {/* Control Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button onClick={() => toggleAgent(agent.id)} className={cn(
                    "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium",
                    agent.enabled ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                  )}>
                    {agent.enabled ? <><Pause className="w-3 h-3" /> Disable</> : <><Play className="w-3 h-3" /> Enable</>}
                  </button>
                  <button
                    onClick={() => runAgent(agent.id)}
                    disabled={!agent.enabled || agent.status === 'running'}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium",
                      agent.enabled && agent.status !== 'running' ? "bg-blue-500/10 text-blue-400" : "bg-zinc-500/10 text-zinc-500"
                    )}
                  >
                    <RotateCcw className={cn("w-3 h-3", agent.status === 'running' && "animate-spin")} />
                    {agent.status === 'running' ? 'Running' : 'Run'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Character Agents Section */}
      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-6">
        Character Knowledge Agents ({context.characters?.length || 0})
      </div>

      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-zinc-200">Character Agents</span>
          </div>
          <button
            onClick={() => {
              const updated = syncAllAgentsFromStory(
                characterAgents,
                context.characters || [],
                context.storyMemory || { entries: [] },
                context.storyRevelations || { beats: [], characterKnowledge: [] },
                context.relationships || []
              );
              setCharacterAgents(updated);
              onUpdateCharacterAgents?.(Object.values(updated));
              notify?.('Character agents synced with story memory', 'success');
            }}
            className="px-2 py-1 rounded-lg text-[10px] font-medium bg-violet-500/20 text-violet-400"
          >
            Sync
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {context.characters?.map((char) => {
            const agent = characterAgents[char.id];
            const hasKnowledge = agent && (
              agent.knownFacts.length > 0 || 
              agent.secretsKnown.length > 0 || 
              agent.relationships.length > 0
            );
            
            return (
              <div
                key={char.id}
                className={cn(
                  "rounded-lg border p-2 cursor-pointer transition-all",
                  selectedCharacterAgent === char.id 
                    ? "border-violet-500/50 bg-violet-500/10" 
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                )}
                onClick={() => setSelectedCharacterAgent(selectedCharacterAgent === char.id ? null : char.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-[10px] font-bold text-violet-300">
                      {char.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="text-xs text-zinc-200">{char.name}</div>
                      {agent && (
                        <div className="text-[9px] text-zinc-500">
                          Knowledge: {agent.knowledgeLevel.knowledgeScore} | Secrets: {agent.secretsKnown.length} | Rels: {agent.relationships.length}
                        </div>
                      )}
                    </div>
                  </div>
                  {!hasKnowledge && <span className="text-[9px] text-zinc-600">No data</span>}
                  {hasKnowledge && (
                    <div className="flex items-center gap-1">
                      {agent.secretsKnown.length > 0 && <Lock className="w-3 h-3 text-amber-400" />}
                      {agent.relationships.length > 0 && <Users className="w-3 h-3 text-blue-400" />}
                      {agent.emotionalMemory.length > 0 && <Heart className="w-3 h-3 text-rose-400" />}
                    </div>
                  )}
                </div>

                {selectedCharacterAgent === char.id && agent && (
                  <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                    {agent.knownFacts.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-[9px] text-zinc-500 mb-1">
                          <Brain className="w-3 h-3" /> Known Facts ({agent.knownFacts.length})
                        </div>
                        <div className="text-[9px] text-zinc-400 space-y-0.5">
                          {agent.knownFacts.slice(-3).map((fact, i) => (
                            <div key={i} className="truncate">• {fact.slice(0, 60)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {agent.secretsKnown.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-[9px] text-amber-500 mb-1">
                          <Lock className="w-3 h-3" /> Secrets Known ({agent.secretsKnown.length})
                        </div>
                        <div className="text-[9px] text-zinc-400 space-y-0.5">
                          {agent.secretsKnown.slice(-2).map((secret, i) => (
                            <div key={i} className="truncate">• {secret.content.slice(0, 50)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {agent.relationships.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-[9px] text-blue-500 mb-1">
                          <Users className="w-3 h-3" /> Observed Relationships ({agent.relationships.length})
                        </div>
                        <div className="text-[9px] text-zinc-400 space-y-0.5">
                          {agent.relationships.slice(-3).map((rel, i) => {
                            const targetChar = context.characters?.find(c => c.id === rel.targetCharacterId);
                            return (
                              <div key={i} className="truncate">
                                • {targetChar?.name || 'Unknown'}: {rel.kind} {rel.isDirectlyObserved ? '(direct)' : '(observed)'}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {agent.emotionalMemory.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-[9px] text-rose-500 mb-1">
                          <Heart className="w-3 h-3" /> Emotional Memory
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-zinc-400">
                          {getEmotionalTrend(agent).map((emotion, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">{emotion}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-[8px] text-zinc-600">
                      Last sync: {new Date(agent.lastSyncTimestamp).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};