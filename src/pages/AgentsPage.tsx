import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, MapPin, Activity, Check, Lightbulb, GitCommit, Eye, Brain, Workflow, Loader2, ChevronDown, ChevronRight, Zap, Clock, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { SceneContext, Message, AIConfig } from '../types';

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
}

interface AgentsPageProps {
  context: SceneContext;
  messages: Message[];
  aiConfig: AIConfig;
  notify?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onApplyLocation?: (location: string, rationale: string, transitionHook: string, fitsMode: 'tele' | 'presence' | 'both') => void;
  onApplyContextUpdate?: (updates: Partial<SceneContext>) => void;
  onApplySceneUpdate?: (summary: string, events: string[]) => void;
  onGenerateLocationSuggestions?: (context: SceneContext) => Promise<AgentResult[]>;
  onGenerateContextUpdate?: (context: SceneContext, input: string) => Promise<AgentResult[]>;
  onGenerateSceneUpdate?: (context: SceneContext, messages: Message[]) => Promise<AgentResult[]>;
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
  notify,
  onApplyLocation,
  onApplyContextUpdate,
  onApplySceneUpdate,
  onGenerateLocationSuggestions,
  onGenerateContextUpdate,
  onGenerateSceneUpdate,
}) => {
  const [isOrchestratorActive, setIsOrchestratorActive] = useState(true);
  const [orchestratorStatus, setOrchestratorStatus] = useState<'idle' | 'analyzing' | 'orchestrating'>('idle');
  const [changeLog, setChangeLog] = useState<Array<{ timestamp: string; agent: string; change: string }>>([]);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

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

  const computeContextHash = useCallback((ctx: SceneContext, msgCount: number): string => {
    return JSON.stringify({
      location: ctx.location,
      plot: ctx.plot,
      theme: ctx.theme,
      mode: ctx.conversationMode,
      chars: ctx.characters?.map(c => c.id).join(','),
      msgCount,
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
    } catch (e) { return {}; }
    return changes;
  }, []);

  const runOrchestrator = useCallback(async () => {
    if (!isOrchestratorActive) return;
    const orchestrator = agents.find(a => a.id === 'orchestrator');
    if (!orchestrator?.enabled) return;

    setOrchestratorStatus('analyzing');
    const newHash = computeContextHash(context, messages.length);
    const changes = detectChanges(previousContextRef.current, newHash);

    const changeEntries = Object.entries(changes);
    if (changeEntries.length > 0) {
      setChangeLog(prev => [{
        timestamp: new Date().toLocaleTimeString(),
        agent: 'Watcher',
        change: changeEntries.map(([k, v]) => `${k}: ${v}`).join(', '),
      }, ...prev].slice(0, 15));
    }

    previousContextRef.current = newHash;
    previousMessagesLengthRef.current = messages.length;
    setOrchestratorStatus('orchestrating');

    const agentsToRun = ['orchestrator'];
    if (changes.location || changes.plot) agentsToRun.push('location');
    if (changes.theme || changes.conversationMode || changes.characters) agentsToRun.push('context');
    if (messages.length > previousMessagesLengthRef.current) agentsToRun.push('scene', 'watcher');

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
          if (onGenerateLocationSuggestions) {
            results = await onGenerateLocationSuggestions(context);
          } else {
            await new Promise(r => setTimeout(r, 1500));
            results = generateMockResults('location');
          }
          resultSummary = `Generated ${results.length} locations`;
          break;
        case 'context':
          if (onGenerateContextUpdate) {
            results = await onGenerateContextUpdate(context, messages[messages.length - 1]?.content || '');
          } else {
            await new Promise(r => setTimeout(r, 1200));
            results = generateMockResults('context');
          }
          resultSummary = `Analyzed context changes`;
          break;
        case 'scene':
          if (onGenerateSceneUpdate) {
            results = await onGenerateSceneUpdate(context, messages);
          } else {
            await new Promise(r => setTimeout(r, 1800));
            results = generateMockResults('scene');
          }
          resultSummary = `Updated scene state`;
          break;
        case 'watcher':
          results = analyzeMessagesForEvents();
          resultSummary = `Found ${results[0]?.events?.length || 0} events`;
          break;
        case 'orchestrator':
          await new Promise(r => setTimeout(r, 500));
          results = [{ id: '1', summary: 'Orchestration active' }];
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
    const recentMessages = messages.slice(-5);
    const events: string[] = [];
    recentMessages.forEach((msg) => {
      const content = msg.content.toLowerCase();
      if (content.includes('enter') || content.includes('arrives')) events.push('Character arrival');
      if (content.includes('leave') || content.includes('depart')) events.push('Character departure');
      if (content.includes('fight') || content.includes('attack') || content.includes('killed')) events.push('Conflict');
      if (content.includes('agree') || content.includes('promise') || content.includes('deal')) events.push('Agreement');
      if (content.includes('reveal') || content.includes('discover') || content.includes('secret')) events.push('Discovery');
    });
    if (events.length === 0) return [];
    return [{ id: 'watcher-1', events: [...new Set(events)], summary: `Detected ${events.length} event(s)` }];
  };

  const generateMockResults = (id: string): AgentResult[] => {
    const mockData: Record<string, AgentResult[]> = {
      location: [
        { id: '1', location: 'A dimly lit tavern', rationale: 'Natural gathering spot', transitionHook: 'The door creaks open...', fitsMode: 'presence' },
        { id: '2', location: 'Abandoned warehouse', rationale: 'Secret meeting spot', transitionHook: 'Dust motes dance...', fitsMode: 'tele' },
        { id: '3', location: 'Rooftop garden', rationale: 'Elevated viewpoint', transitionHook: 'City spreads below...', fitsMode: 'both' },
      ],
      context: [
        { id: '1', context: { theme: context.theme || 'Noir', plot: 'Tensions rise between factions' } },
        { id: '2', context: { conversationMode: 'presence' } },
      ],
      scene: [
        { id: '1', summary: 'Negotiation reached critical point', events: ['Characters arrived', 'Tensions escalated'] },
        { id: '2', summary: 'A truce has been proposed', events: ['Peace offering', 'Suspicion remains'] },
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
      {/* Orchestrator */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex items-center justify-between">
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
      </div>

      {/* Change Log */}
      {changeLog.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 mb-2">
            <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-medium text-cyan-400">Recent Changes</span>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {changeLog.map((entry, i) => (
              <div key={i} className="text-[10px] text-zinc-400 flex gap-2">
                <span className="text-zinc-600">{entry.timestamp}</span>
                <span className="text-cyan-400">{entry.agent}:</span>
                <span className="text-zinc-300">{entry.change}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div className="px-3 pb-3 pt-0 space-y-3 border-t border-white/5">
                <p className="text-xs text-zinc-500 pt-2">{agent.description}</p>

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

                {agent.results && agent.results.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px] font-medium text-amber-400">Results ({agent.results.length})</span>
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
                        </button>
                      ))}
                    </div>
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
    </div>
  );
};