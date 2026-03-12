import React from 'react';
import { 
  MessageSquare, 
  Zap, 
  Star, 
  User,
  ArrowRight
} from 'lucide-react';
import { SceneEvent } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface VisualTimelineProps {
  events: SceneEvent[];
}

export const VisualTimeline: React.FC<VisualTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-30"
      >
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-500 flex items-center justify-center">
          <Star className="w-6 h-6" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em]">No visual data yet</p>
      </motion.div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'dialogue': return <MessageSquare className="w-3.5 h-3.5" />;
      case 'action': return <Zap className="w-3.5 h-3.5" />;
      default: return <Star className="w-3.5 h-3.5" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'dialogue': return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
      case 'action': return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
      default: return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
    }
  };

  return (
    <div className="space-y-8 relative py-4">
      {/* Central Line */}
      <div className="absolute left-[21px] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

      <AnimatePresence mode="popLayout">
        {events.map((event, idx) => {
          const isLatest = idx === events.length - 1;
          const involvedCharacters = Array.isArray(event?.involvedCharacters) ? event.involvedCharacters : [];
          
          return (
            <motion.div 
              key={event.id || idx}
              layout
              initial={{ opacity: 0, x: -30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              transition={{ 
                duration: 0.5, 
                delay: isLatest ? 0 : idx * 0.05,
                type: "spring",
                stiffness: 120,
                damping: 14
              }}
              className="relative pl-12 group"
            >
              {/* Node with Pulse for Latest */}
              <motion.div 
                layoutId={`node-${event.id || idx}`}
                className={cn(
                  "absolute left-0 top-0 w-11 h-11 rounded-2xl border flex items-center justify-center z-10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
                  getEventColor(event.type),
                  isLatest && "ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-[#0f0f0f]"
                )}
              >
                {isLatest && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-2xl bg-emerald-500/20"
                  />
                )}
                {getEventIcon(event.type)}
              </motion.div>

              {/* Content Card */}
              <motion.div 
                layoutId={`card-${event.id || idx}`}
                className={cn(
                  "bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 transition-all duration-300 group-hover:bg-white/[0.08] group-hover:border-white/20",
                  isLatest && "border-emerald-500/20 bg-emerald-500/[0.02]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      getEventColor(event.type)
                    )}>
                      {event.type}
                    </span>
                    {isLatest && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter bg-emerald-500/10 px-1.5 py-0.5 rounded"
                      >
                        New
                      </motion.span>
                    )}
                  </div>
                <div className="flex -space-x-2">
                  {involvedCharacters.map((char, cIdx) => (
                    <motion.div 
                      key={cIdx} 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: (idx * 0.05) + (cIdx * 0.05) }}
                      className="w-6 h-6 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-400 ring-2 ring-[#0f0f0f]"
                      title={char}
                    >
                      {char.charAt(0)}
                    </motion.div>
                  ))}
                </div>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed">
                {event.description}
              </p>

              {/* Involved Characters List */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                {involvedCharacters.map((char, cIdx) => (
                  <div key={cIdx} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md border border-white/5">
                    <User className="w-2.5 h-2.5 text-zinc-500" />
                    <span className="text-[10px] text-zinc-400 font-medium">{char}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Connector to next (visual only) */}
            {idx < events.length - 1 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute left-[21px] top-11 h-8 flex items-center justify-center"
              >
                <ArrowRight className="w-3 h-3 text-white/10 rotate-90" />
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </AnimatePresence>
    </div>
  );
};
