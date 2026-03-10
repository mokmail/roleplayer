import React from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { SceneEvent } from '../types';

interface InteractionMapProps {
  events: SceneEvent[];
}

export const InteractionMap: React.FC<InteractionMapProps> = ({ events }) => {
  // Calculate interaction frequency
  const interactions: Record<string, number> = {};
  
  events.forEach(event => {
    if (event.involvedCharacters.length > 1) {
      for (let i = 0; i < event.involvedCharacters.length; i++) {
        for (let j = i + 1; j < event.involvedCharacters.length; j++) {
          const pair = [event.involvedCharacters[i], event.involvedCharacters[j]].sort().join(' <-> ');
          interactions[pair] = (interactions[pair] || 0) + 1;
        }
      }
    }
  });

  const interactionList = Object.entries(interactions).sort((a, b) => b[1] - a[1]);

  if (interactionList.length === 0) {
    return (
      <div className="py-8 text-center opacity-30">
        <p className="text-[10px] uppercase tracking-widest">No interactions recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
        <LinkIcon className="w-3 h-3" /> Interaction Network
      </h4>
      <div className="grid grid-cols-1 gap-2">
        {interactionList.map(([pair, count], idx) => (
          <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between group hover:bg-white/[0.08] transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {pair.split(' <-> ').map((name, nIdx) => (
                  <div 
                    key={nIdx} 
                    className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-400 ring-2 ring-[#0f0f0f]"
                  >
                    {name.charAt(0)}
                  </div>
                ))}
              </div>
              <span className="text-xs text-zinc-300 font-medium">{pair}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-12 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${Math.min(100, count * 20)}%` }} 
                />
              </div>
              <span className="text-[10px] font-bold text-emerald-500">{count}x</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
