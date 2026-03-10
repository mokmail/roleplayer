import React, { useState } from 'react';
import { SceneContext, Character } from '../types';
import { Users, Sparkles, UserPlus, Trash2, Edit3, Circle, CheckCircle2, Eye, UserCircle2, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import { CharacterDetailModal } from '../components/CharacterDetailModal';

interface CharactersPageProps {
  context: SceneContext;
  setContext: React.Dispatch<React.SetStateAction<SceneContext>>;
  addCharacter: () => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  setIsWizardOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onEditCharacter: (char: Character) => void;
}

export const CharactersPage: React.FC<CharactersPageProps> = ({
  context,
  setContext,
  addCharacter,
  updateCharacter,
  removeCharacter,
  setIsWizardOpen,
  onEditCharacter,
}) => {
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);

  return (
    <div className="h-full flex flex-col bg-transparent">
      <CharacterDetailModal 
        isOpen={!!viewingCharacter} 
        character={viewingCharacter} 
        onClose={() => setViewingCharacter(null)} 
      />
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-black/10 backdrop-blur-sm sticky top-0 z-10">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-emerald-500/50" /> Characters
        </label>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-md transition-all border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider"
            title="Character Wizard"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Wizard</span>
          </button>
          <button 
            onClick={addCharacter}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-zinc-400"
            title="Quick Add"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-4">
        <div className="space-y-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2">
            <UserCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Your Role In The Story</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Your Name</label>
              <input
                type="text"
                value={context.playerProfile?.name || ''}
                onChange={(e) => setContext(prev => ({
                  ...prev,
                  playerProfile: {
                    name: e.target.value,
                    role: prev.playerProfile?.role || '',
                    persona: prev.playerProfile?.persona || '',
                    objective: prev.playerProfile?.objective || ''
                  }
                }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="e.g. Rowan Vale"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Your Role / Archetype</label>
              <input
                type="text"
                value={context.playerProfile?.role || ''}
                onChange={(e) => setContext(prev => ({
                  ...prev,
                  playerProfile: {
                    name: prev.playerProfile?.name || '',
                    role: e.target.value,
                    persona: prev.playerProfile?.persona || '',
                    objective: prev.playerProfile?.objective || ''
                  }
                }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="e.g. disgraced knight, rookie detective, hidden heir"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Your Persona</label>
              <textarea
                value={context.playerProfile?.persona || ''}
                onChange={(e) => setContext(prev => ({
                  ...prev,
                  playerProfile: {
                    name: prev.playerProfile?.name || '',
                    role: prev.playerProfile?.role || '',
                    persona: e.target.value,
                    objective: prev.playerProfile?.objective || ''
                  }
                }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 h-20 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="How should the cast perceive you? Temperament, reputation, weakness, style..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-3 h-3" /> Personal Objective
              </label>
              <textarea
                value={context.playerProfile?.objective || ''}
                onChange={(e) => setContext(prev => ({
                  ...prev,
                  playerProfile: {
                    name: prev.playerProfile?.name || '',
                    role: prev.playerProfile?.role || '',
                    persona: prev.playerProfile?.persona || '',
                    objective: e.target.value
                  }
                }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 h-20 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="What are you trying to achieve in this story?"
              />
            </div>
          </div>
        </div>

        {context.characters.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center space-y-2 border-2 border-dashed border-white/5 rounded-2xl">
            <Users className="w-8 h-8 text-zinc-700" />
            <p className="text-xs text-zinc-500 font-medium">No characters in this scene</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {context.characters.map((char) => (
              <div 
                key={char.id} 
                onClick={() => setViewingCharacter(char)}
                className={cn(
                  "group relative bg-[#121212] border border-white/5 rounded-xl transition-all duration-300 cursor-pointer hover:bg-white/[0.07]",
                  char.isPresent ? "border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]" : "opacity-60 grayscale-[0.5]"
                )}
              >
                {/* Status Indicator Bar */}
                <div className={cn(
                  "absolute left-0 top-3 bottom-3 w-0.5 rounded-full transition-colors",
                  char.isPresent ? "bg-emerald-500" : "bg-zinc-700"
                )} />

                <div className="p-3 pl-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200 truncate text-sm">
                          {char.name}
                        </span>
                        <Eye className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {char.race && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-white/5 text-zinc-400 rounded uppercase tracking-tighter border border-white/5">
                            {char.race}
                          </span>
                        )}
                        {char.profession && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/5 text-emerald-400/70 rounded uppercase tracking-tighter border border-emerald-500/10">
                            {char.profession}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEditCharacter(char); }}
                        className="p-1.5 text-zinc-500 hover:text-emerald-400 transition-colors bg-white/5 rounded-md"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeCharacter(char.id); }}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors bg-white/5 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Toggle & Summary */}
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); updateCharacter(char.id, { isPresent: !char.isPresent }); }}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-[10px] uppercase font-bold tracking-wider",
                        char.isPresent 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-white/5 text-zinc-500 border border-white/5 hover:bg-white/10"
                      )}
                    >
                      {char.isPresent ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                      {char.isPresent ? 'Present' : 'Absent'}
                    </button>
                    
                    <div className="flex-1 text-[10px] text-zinc-500 italic truncate text-right pr-1">
                      {char.personality || 'No personality notes...'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
