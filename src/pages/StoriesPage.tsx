import React from 'react';
import { SceneContext, SavedSession, SavedStory } from '../types';
import { RefreshCw, Trash2, Play, Plus, WandSparkles, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { STARTER_SCENARIOS } from '../lib/starterScenarios';

interface StoriesPageProps {
  savedStories: SavedStory[];
  loadStory: (story: SavedStory | any) => void;
  deleteStory: (id: string) => void;
  applyStarterScenario: (id: string) => void;
  activeContext: SceneContext;
}

export const StoriesPage: React.FC<StoriesPageProps> = ({
  savedStories,
  loadStory,
  deleteStory,
  applyStarterScenario,
  activeContext
}) => {
  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-black/10 backdrop-blur-sm sticky top-0 z-10">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <Star className="w-3.5 h-3.5 text-emerald-500/50" /> Story Library
        </label>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-8">
        {/* Quick Start Kits Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
              <WandSparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Quick Start Kits</h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {STARTER_SCENARIOS.map((scenario) => {
              const isActive =
                activeContext.location === scenario.context.location &&
                activeContext.plot === scenario.context.plot &&
                activeContext.theme === scenario.context.theme;

              return (
                <div
                  key={scenario.id}
                  className={cn(
                    "group relative bg-[#121212] border rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/[0.07]",
                    isActive ? "border-emerald-500/30 ring-1 ring-emerald-500/20" : "border-white/5"
                  )}
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">{scenario.title}</div>
                        <p className="text-[10px] text-zinc-500 italic line-clamp-1">{scenario.tagline}</p>
                      </div>
                      <button
                        onClick={() => applyStarterScenario(scenario.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                          isActive
                            ? "bg-emerald-500 text-white"
                            : "bg-white/5 text-zinc-300 hover:bg-white/10"
                        )}
                      >
                        {isActive ? 'Active' : 'Deploy'}
                      </button>
                    </div>
                    
                    <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2 mb-2">
                      {scenario.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-black/20 border border-white/5 text-[9px] text-zinc-500">
                        {scenario.context.characters.length} chars
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/20 border border-white/5 text-[9px] text-zinc-500">
                        {scenario.context.theme}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Saved Stories Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <Star className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Your Collection</h3>
          </div>

          {savedStories.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-center space-y-2 border-2 border-dashed border-white/5 rounded-2xl">
              <Plus className="w-6 h-6 text-zinc-700" />
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Empty collection</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {savedStories.map((story) => (
                <div
                  key={story.id}
                  className="group relative bg-[#121212] border border-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/[0.07]"
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-semibold text-zinc-200 truncate text-sm">{story.name}</span>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => loadStory(story)}
                          className="p-1.5 text-zinc-500 hover:text-emerald-400 transition-colors bg-white/5 rounded-md"
                          title="Load story"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteStory(story.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors bg-white/5 rounded-md"
                          title="Delete story"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 italic line-clamp-2">
                      {story.prompt}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[9px] text-zinc-600 font-mono">
                        {new Date(story.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-[9px] text-zinc-600">
                        {story.context.characters.length} characters
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
