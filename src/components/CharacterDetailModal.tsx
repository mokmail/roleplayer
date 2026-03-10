import React from 'react';
import { Character } from '../types';
import { 
  X, 
  User, 
  Shield, 
  MapPin, 
  Sparkles, 
  History, 
  Brain, 
  Zap, 
  Crown, 
  AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CharacterDetailModalProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  character,
  isOpen,
  onClose,
}) => {
  if (!character) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-[#0f0f0f] border border-white/10 rounded-3xl shadow-2xl flex flex-col"
          >
            {/* Header / Banner Area */}
            <div className="h-32 bg-gradient-to-br from-emerald-500/20 via-zinc-900 to-black relative shrink-0">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="absolute -bottom-8 left-8">
                <div className="w-24 h-24 rounded-2xl bg-zinc-900 border-4 border-[#0f0f0f] flex items-center justify-center shadow-xl">
                  <User className="w-12 h-12 text-emerald-500/50" />
                </div>
              </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-12">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">{character.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {character.race && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 text-zinc-400 rounded-lg text-xs font-semibold uppercase tracking-wider border border-white/5">
                        <User className="w-3 h-3" /> {character.race}
                      </span>
                    )}
                    {character.profession && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold uppercase tracking-wider border border-emerald-500/10">
                        <Shield className="w-3 h-3" /> {character.profession}
                      </span>
                    )}
                    {character.alignment && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-xs font-semibold uppercase tracking-wider border border-purple-500/10">
                        <MapPin className="w-3 h-3" /> {character.alignment}
                      </span>
                    )}
                  </div>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-xl border font-bold text-xs uppercase tracking-[0.15em] transition-all",
                  character.isPresent 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                    : "bg-zinc-900 border-white/5 text-zinc-600"
                )}>
                  {character.isPresent ? 'Currently Active' : 'Inactive'}
                </div>
              </div>

              {/* Grid Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personality */}
                <section className="space-y-3">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Brain className="w-4 h-4 text-emerald-500/50" /> Personality & Behavior
                  </h3>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-zinc-300 leading-relaxed min-h-[100px]">
                    {character.personality || "No personality traits defined."}
                  </div>
                </section>

                {/* Backstory */}
                <section className="space-y-3">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-500/50" /> Backstory
                  </h3>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-zinc-400 leading-relaxed min-h-[100px]">
                    {character.backstory || "No backstory available."}
                  </div>
                </section>

                {/* Narrative Attributes (Wizard Data) */}
                <section className="space-y-4 md:col-span-2 mt-4 pt-6 border-t border-white/5">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500/50" /> Narrative Identity
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <AttributeCard icon={<Zap className="w-4 h-4" />} label="Special Powers" value={character.powerSource} color="yellow" />
                    <AttributeCard icon={<Crown className="w-4 h-4" />} label="Social Rank" value={character.socialStanding} color="blue" />
                    <AttributeCard icon={<Sparkles className="w-4 h-4" />} label="Aura/Vibe" value={character.vibe} color="emerald" />
                    <AttributeCard icon={<AlertTriangle className="w-4 h-4" />} label="Paradox" value={character.paradox} color="red" />
                  </div>
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-black/40 border-t border-white/5 shrink-0 flex justify-end">
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-sm font-semibold transition-all border border-white/10"
              >
                Close View
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface AttributeCardProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  color: 'emerald' | 'blue' | 'yellow' | 'red';
}

const AttributeCard: React.FC<AttributeCardProps> = ({ icon, label, value, color }) => {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/5 border-blue-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/5 border-yellow-500/10',
    red: 'text-red-400 bg-red-500/5 border-red-500/10',
  };

  return (
    <div className={cn("p-3 rounded-2xl border flex flex-col gap-2", colorMap[color])}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-tight opacity-60">{label}</span>
      </div>
      <div className="text-xs font-semibold truncate">
        {value || 'None'}
      </div>
    </div>
  );
};
