import React from 'react';
import { SavedSession } from '../types';
import { History, Save, FolderOpen, Download, Upload, Trash2, PlusCircle } from 'lucide-react';

interface SessionsPageProps {
  savedSessions: SavedSession[];
  saveCurrentSession: () => void;
  createNewSession: () => void;
  exportSessions: () => void;
  importSessions: (e: React.ChangeEvent<HTMLInputElement>) => void;
  deleteSession: (id: string) => void;
  loadSession: (session: SavedSession) => void;
}

export const SessionsPage: React.FC<SessionsPageProps> = ({
  savedSessions,
  saveCurrentSession,
  createNewSession,
  exportSessions,
  importSessions,
  deleteSession,
  loadSession,
}) => {
  return (
    <div className="h-full overflow-y-auto px-6 py-5 custom-scrollbar bg-transparent">
      <div className="flex items-center justify-between mb-5 mt-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-emerald-500/50" /> Session Logs
        </label>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={createNewSession}
            className="flex flex-col items-center justify-center gap-1.5 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold transition-all group"
          >
            <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] uppercase tracking-wider">New Start</span>
          </button>
          
          <button 
            onClick={saveCurrentSession}
            className="flex flex-col items-center justify-center gap-1.5 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold transition-all group"
          >
            <Save className="w-5 h-5 group-hover:scale-110 transition-transform text-emerald-500" />
            <span className="text-[10px] uppercase tracking-wider">Save Log</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={exportSessions}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-all border-dashed"
          >
            <Download className="w-3 h-3" /> Export
          </button>
          <label className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-all border-dashed cursor-pointer">
            <Upload className="w-3 h-3" /> Import
            <input type="file" accept=".json" onChange={importSessions} className="hidden" />
          </label>
        </div>
      </div>

      <div className="space-y-3 mt-8">
        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] pl-1">
          History
        </label>
        {savedSessions.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-white/[0.03] rounded-2xl opacity-40">
            <p className="text-[9px] uppercase tracking-widest font-medium text-zinc-500">Archives Empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedSessions.map(session => (
              <div key={session.id} className="p-3 bg-white/5 border border-white/10 rounded-xl group hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-zinc-200 truncate pr-2">{session.name}</h4>
                  <button 
                    onClick={() => deleteSession(session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">
                    {new Date(session.timestamp).toLocaleDateString()} {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button 
                    onClick={() => loadSession(session)}
                    className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1 hover:text-emerald-400"
                  >
                    Load <FolderOpen className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
