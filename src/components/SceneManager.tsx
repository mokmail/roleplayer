import React, { useState } from 'react';
import { 
  Activity, 
  History, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Layout,
  MessageSquare
} from 'lucide-react';
import { SceneContext, Message, SceneEvent, AIConfig } from '../types';
import { updateSceneState } from '../services/geminiService';
import { VisualTimeline } from './VisualTimeline';
import { InteractionMap } from './InteractionMap';
import { cn } from '../lib/utils';

interface SceneManagerProps {
  context: SceneContext;
  messages: Message[];
  aiConfig: AIConfig;
  onUpdateContext: (updates: Partial<SceneContext>) => void;
  notify?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const SceneManager: React.FC<SceneManagerProps> = ({
  context,
  messages,
  aiConfig,
  onUpdateContext,
  notify,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'visual'>('visual');

  const handleUpdateState = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const result = await updateSceneState(aiConfig, context, messages);
      
      onUpdateContext({
        summary: result.summary,
        events: result.events,
        structuredEvents: result.structuredEvents
      });
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('Error updating scene state:', error);
      notify?.(`Sync error: ${error.message}`, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          Simulation State
        </h3>
        <button
          onClick={handleUpdateState}
          disabled={isUpdating || messages.length === 0}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
            isUpdating 
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:scale-95"
          )}
        >
          <RefreshCw className={cn("w-3 h-3", isUpdating && "animate-spin")} />
          {isUpdating ? "Syncing..." : "Sync State"}
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Layout className="w-3 h-3" /> Situation Report
          </span>
          {lastUpdate && (
            <span className="text-[9px] text-zinc-600">
              Last: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed italic">
          {context.summary || "No summary available yet. Click 'Sync State' to analyze the situation."}
        </p>
      </div>

      {/* Events Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <History className="w-3 h-3" /> Event Log
          </h4>
          <div className="flex p-0.5 bg-white/5 rounded-lg border border-white/10">
            <button 
              onClick={() => setViewMode('visual')}
              className={cn(
                "px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all",
                viewMode === 'visual' ? "bg-emerald-500 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Visual
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all",
                viewMode === 'list' ? "bg-emerald-500 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              List
            </button>
          </div>
        </div>

        <div className="space-y-3 relative">
          {viewMode === 'visual' ? (
            <VisualTimeline events={context.structuredEvents || []} />
          ) : (
            context.events && context.events.length > 0 ? (
              <>
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />
                {context.events.map((event, idx) => (
                  <div key={idx} className="flex gap-3 relative group">
                    <div className="mt-1.5 w-3.5 h-3.5 rounded-full bg-[#0f0f0f] border-2 border-emerald-500/50 flex-shrink-0 z-10 group-hover:border-emerald-400 transition-colors" />
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5 flex-1 group-hover:bg-white/[0.04] transition-colors">
                      <p className="text-xs text-zinc-400 leading-normal">
                        {event}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 opacity-30">
                <AlertCircle className="w-8 h-8" />
                <p className="text-[10px] uppercase tracking-widest">No events</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Interaction Map */}
      <InteractionMap 
        events={context.structuredEvents || []} 
      />

      {/* Context Status */}
      <div className="pt-4 border-t border-white/5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Status</span>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-xs font-medium">Active</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Turns</span>
            <div className="flex items-center gap-2 text-zinc-300">
              <MessageSquare className="w-3 h-3 text-zinc-500" />
              <span className="text-xs font-medium">{messages.filter(m => !m.isHidden).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
