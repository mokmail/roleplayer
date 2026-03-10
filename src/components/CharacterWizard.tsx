import React, { useState } from 'react';
import { characterPresets } from '../lib/characterPresets';
import { NarrativeTheme } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, User, Brain, ScrollText, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { Character, AIConfig } from '../types';
import { generateCharacterDetails } from '../services/geminiService';

interface CharacterWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: Character) => void;
  aiConfig: AIConfig;
  sceneTheme: string;
  // if provided, wizard will preload and update this character instead of creating a new one
  initialCharacter?: Character | null;
}

type WizardStep = 'basic' | 'narrative' | 'personality' | 'backstory' | 'review';

export const CharacterWizard: React.FC<CharacterWizardProps> = ({ isOpen, onClose, onSave, aiConfig, sceneTheme, initialCharacter }) => {
  const [step, setStep] = useState<WizardStep>('basic');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [character, setCharacter] = useState<Partial<Character>>({
    name: '',
    personality: '',
    backstory: '',
    isPresent: true,
    race: '',
    profession: '',
    alignment: '',
    background: '',
  });

  // narrative design specific fields
  const [magicSystem, setMagicSystem] = useState('');
  const [socialStanding, setSocialStanding] = useState('');
  const [powerSource, setPowerSource] = useState('');
  const [vibe, setVibe] = useState('');
  const [paradox, setParadox] = useState('');
  const [generatedProfile, setGeneratedProfile] = useState<{
    motivation?: string;
    magicalSignature?: string;
    fatalFlaw?: string;
    originStory?: string;
  }>({});

  // Get presets based on the SCENE theme
  const presets = characterPresets[sceneTheme as NarrativeTheme] || characterPresets.Fantasy;

  // when the wizard opens or initialCharacter changes, populate form
  React.useEffect(() => {
    if (isOpen && initialCharacter) {
      setCharacter({
        ...initialCharacter,
      });
      setMagicSystem(initialCharacter.magicSystem || '');
      setSocialStanding(initialCharacter.socialStanding || '');
      setPowerSource(initialCharacter.powerSource || '');
      setVibe(initialCharacter.vibe || '');
      setParadox(initialCharacter.paradox || '');
      setGeneratedProfile({});
      setStep('basic');
    } else if (isOpen) {
      // Reset for new character
      setCharacter({
        name: '',
        personality: '',
        backstory: '',
        isPresent: true,
        race: '',
        profession: '',
        alignment: '',
        background: '',
      });
      setMagicSystem('');
      setSocialStanding('');
      setPowerSource('');
      setVibe('');
      setParadox('');
      setGeneratedProfile({});
      setStep('basic');
    }
  }, [isOpen, initialCharacter]);

  const steps: WizardStep[] = ['basic', 'narrative', 'personality', 'backstory', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const handleNext = () => {
    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) setStep(nextStep);
  };

  const handleBack = () => {
    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) setStep(prevStep);
  };

  const handleGenerate = async (field: 'personality' | 'backstory' | 'name' | 'narrative') => {
    setIsGenerating(field);
    try {
      let prompt = '';
      if (field === 'name') {
        prompt = "Suggest 3 unique and interesting character names for a roleplay. Return ONLY the names, separated by commas.";
      } else if (field === 'personality') {
        prompt = `Act as a master character psychologist. Based on these existing details, generate a deep and consistent personality for "${character.name || 'this character'}":
Theme: ${sceneTheme}
Race: ${character.race || 'Unknown'}
Profession: ${character.profession || 'Unknown'}
Alignment: ${character.alignment || 'Unknown'}
Magic System: ${magicSystem || 'None'}
Social Standing: ${socialStanding || 'Unknown'}
Power Source: ${powerSource || 'Unknown'}
Vibe: ${vibe || 'Unknown'}
Paradox: ${paradox || 'Unknown'}

Provide a single paragraph (under 100 words) describing their behavioral patterns, emotional core, and how they interact with the world. Focus on coherence with the theme and paradox.`;
      } else if (field === 'backstory') {
        prompt = `Generate a compelling backstory for the character "${character.name || 'Unknown'}" with these traits:
Personality: "${character.personality || 'Unknown'}"
Current Role: ${character.profession || 'Unknown'}
Theme: ${sceneTheme}
Background Detail: ${character.background || 'Unknown'}
Paradox: ${paradox || 'Unknown'}

Include one pivotal moment that defines their current path and a hidden motivation. Return a single paragraph under 150 words.`;
      } else if (field === 'narrative') {
        prompt = `Act as a professional Narrative Designer and Character Architect. Based on the provided attributes produce a deep character profile containing Motivation, a Unique Magical Signature (how their magic looks/feels), a Fatal Flaw, and a Brief Origin Story. Answer in JSON with keys \"motivation\", \"magicalSignature\", \"fatalFlaw\", and \"originStory\".
Attributes:
- Magic System Type: ${magicSystem}
- Social Standing: ${socialStanding}
- Power Source: ${powerSource}
- Vibe/Aesthetic: ${vibe}
- Paradox: ${paradox}`;
      }

      let result = await generateCharacterDetails(aiConfig, prompt);
      
      // Clean up common AI markdown artifacts
      result = result.replace(/^["']|["']$/g, '').trim();

      if (field === 'name') {
        const names = result.split(',').map(n => n.trim());
        setCharacter(prev => ({ ...prev, name: names[0] }));
      } else if (field === 'narrative') {
        try {
          const parsed = JSON.parse(result);
          setGeneratedProfile(parsed);
          // optionally seed personality/backstory
          setCharacter(prev => ({
            ...prev,
            personality: prev.personality || parsed.motivation || '',
            backstory: prev.backstory || parsed.originStory || ''
          }));
        } catch {
          setGeneratedProfile({ motivation: result });
        }
      } else {
        setCharacter(prev => ({ ...prev, [field]: result }));
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleSave = () => {
    if (character.name && character.personality) {
      const saved: Character = {
        id: initialCharacter?.id || Date.now().toString(),
        name: character.name!,
        personality: character.personality!,
        backstory: character.backstory || '',
        isPresent: character.isPresent ?? true,
        theme: character.theme,
        race: character.race,
        profession: character.profession,
        alignment: character.alignment,
        background: character.background,
        age: character.age,
        gender: character.gender,
        magicSystem,
        socialStanding,
        powerSource,
        vibe,
        paradox,
      };
      onSave(saved);
      onClose();
      // reset state
      setStep('basic');
      setCharacter({ name: '', personality: '', backstory: '', isPresent: true });
      // reset narrative fields as well
      setMagicSystem('');
      setSocialStanding('');
      setPowerSource('');
      setVibe('');
      setParadox('');
      setGeneratedProfile({});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-zinc-800 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/20 flex items-center justify-between bg-zinc-700/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{initialCharacter ? 'Edit Character' : 'Character Wizard'}</h2>
              <p className="text-xs text-zinc-400">{initialCharacter ? 'Updating existing profile' : `Step ${currentStepIndex + 1} of ${steps.length}: ${step.charAt(0).toUpperCase() + step.slice(1)}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-white/10">
          <motion.div 
            className="h-full bg-emerald-400 shadow-lg"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 text-zinc-100">
          <AnimatePresence mode="wait">
            {step === 'basic' && (
              <motion.div
                key="basic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <User className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Identity</span>
                  </div>
                  <div className="space-y-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-200">Character Name</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={character.name}
                          onChange={e => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                          className="flex-1 bg-zinc-700 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-400 transition-all"
                          placeholder="e.g. Elara Shadowstep"
                        />
                        <button
                          onClick={() => handleGenerate('name')}
                          disabled={!!isGenerating}
                          className="px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-emerald-400 disabled:opacity-50"
                        >
                          {isGenerating === 'name' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-200">System Theme</label>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-black/20 p-3 rounded-xl border border-white/5 flex items-center h-[50px]">
                        Active: <span className="ml-2 text-emerald-400 font-black">{sceneTheme}</span>
                      </div>
                    </div>
                  </div>
                  {/* additional selects depending on theme */}
                  <div className="space-y-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-200">Age / Timeframe</label>
                      <input
                        type="text"
                        value={character.age || ''}
                        onChange={e => setCharacter(prev => ({ ...prev, age: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                        placeholder="e.g. 27, adolescent, ancient"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-200">Gender / Identity</label>
                      <input
                        type="text"
                        value={character.gender || ''}
                        onChange={e => setCharacter(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                        placeholder="e.g. male, female, nonbinary"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-200">Race / Heritage</label>
                      <select
                        value={character.race || ''}
                        onChange={e => setCharacter(prev => ({ ...prev, race: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-all"
                      >
                        <option value="" className="text-zinc-400">Select...</option>
                        {presets.races.map(r => (
                          <option key={r} value={r} className="bg-[#0f0f0f] text-zinc-200">{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-200">Occupation / Role</label>
                      <select
                        value={character.profession || ''}
                        onChange={e => setCharacter(prev => ({ ...prev, profession: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-all"
                      >
                        <option value="" className="text-zinc-400">Select...</option>
                        {presets.professions.map(p => (
                          <option key={p} value={p} className="bg-[#0f0f0f] text-zinc-200">{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-200">Stance / Alignment</label>
                      <select
                        value={character.alignment || ''}
                        onChange={e => setCharacter(prev => ({ ...prev, alignment: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-all"
                      >
                        <option value="" className="text-zinc-400">Select...</option>
                        {presets.alignments.map(a => (
                          <option key={a} value={a} className="bg-[#0f0f0f] text-zinc-200">{a}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-200">Social Standing</label>
                      <select
                        value={socialStanding}
                        onChange={e => setSocialStanding(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-all"
                      >
                        <option value="" className="text-zinc-400">Select...</option>
                        {presets.socialStandings.map(s => (
                          <option key={s} value={s} className="bg-[#0f0f0f] text-zinc-200">{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'narrative' && (
              <motion.div
                key="narrative"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-purple-400">
                      <ScrollText className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Narrative Design</span>
                    </div>
                    <button
                      onClick={() => handleGenerate('narrative')}
                      disabled={!!isGenerating}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                    >
                      {isGenerating === 'narrative' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generate Profile
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-200">Magic System Type</label>
                      <select
                        value={magicSystem}
                        onChange={e => setMagicSystem(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400 transition-all"
                      >
                        <option value="">Choose logic...</option>
                        {presets.magicSystems.map(m => <option key={m} value={m} className="bg-[#0f0f0f] text-zinc-200">{m}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-200">Power Source</label>
                      <select
                        value={powerSource}
                        onChange={e => setPowerSource(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400 transition-all"
                      >
                        <option value="">Choose source...</option>
                        {presets.powerSources.map(p => <option key={p} value={p} className="bg-[#0f0f0f] text-zinc-200">{p}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-200">Vibe / Aesthetic</label>
                      <select
                        value={vibe}
                        onChange={e => setVibe(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400 transition-all"
                      >
                        <option value="">Select aura...</option>
                        {presets.vibes.map(v => <option key={v} value={v} className="bg-[#0f0f0f] text-zinc-200">{v}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-200">The Paradox (Fatal Flaw)</label>
                      <select
                        value={paradox}
                        onChange={e => setParadox(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400 transition-all"
                      >
                        <option value="">Select conflict...</option>
                        {presets.paradoxes.map(p => <option key={p} value={p} className="bg-[#0f0f0f] text-zinc-200">{p}</option>)}
                      </select>
                    </div>
                  </div>

                  {generatedProfile.motivation && (
                    <div className="space-y-2 p-4 bg-zinc-900/60 border border-emerald-500/10 rounded-xl text-zinc-200">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400">Generated Profile</h4>
                      <p><strong>Motivation:</strong> {generatedProfile.motivation}</p>
                      <p><strong>Magical Signature:</strong> {generatedProfile.magicalSignature}</p>
                      <p><strong>Fatal Flaw:</strong> {generatedProfile.fatalFlaw}</p>
                      <p><strong>Origin Story:</strong> {generatedProfile.originStory}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {step === 'personality' && (
              <motion.div
                key="personality"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Brain className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Personality & Traits</span>
                    </div>
                    <button
                      onClick={() => handleGenerate('personality')}
                      disabled={!!isGenerating}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                    >
                      {isGenerating === 'personality' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI Generate
                    </button>
                  </div>
                  <textarea
                    value={character.personality}
                    onChange={e => setCharacter(prev => ({ ...prev, personality: e.target.value }))}
                    className="w-full h-48 bg-zinc-700 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400 transition-all resize-none"
                    placeholder="Describe how they act, their quirks, and what drives them..."
                  />
                </div>
              </motion.div>
            )}

            {step === 'backstory' && (
              <motion.div
                key="backstory"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <ScrollText className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">History & Backstory</span>
                    </div>
                    <button
                      onClick={() => handleGenerate('backstory')}
                      disabled={!!isGenerating}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                    >
                      {isGenerating === 'backstory' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI Generate
                    </button>
                  </div>
                  <textarea
                    value={character.backstory}
                    onChange={e => setCharacter(prev => ({ ...prev, backstory: e.target.value }))}
                    className="w-full h-48 bg-zinc-700 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400 transition-all resize-none"
                    placeholder="Where did they come from? What shaped them into who they are today?"
                  />
                </div>
              </motion.div>
            )}

            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-6 bg-zinc-700/80 border border-white/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-2xl font-bold text-emerald-400">
                      {character.name?.[0] || '?'}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{character.name || 'Unnamed Character'}</h3>
                      <p className="text-sm text-zinc-300">Ready to join the scene</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 pt-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Personality</span>
                      <p className="text-sm text-zinc-300 line-clamp-3 italic">"{character.personality || 'No personality defined.'}"</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Backstory</span>
                      <p className="text-sm text-zinc-300 line-clamp-3">"{character.backstory || 'No backstory defined.'}"</p>
                    </div>
                    {(magicSystem || socialStanding || powerSource || vibe || paradox) && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Narrative Attributes</span>
                        <p className="text-sm text-zinc-300">{magicSystem && `Magic: ${magicSystem}`}</p>
                        <p className="text-sm text-zinc-300">{socialStanding && `Standing: ${socialStanding}`}</p>
                        <p className="text-sm text-zinc-300">{powerSource && `Source: ${powerSource}`}</p>
                        <p className="text-sm text-zinc-300">{vibe && `Vibe: ${vibe}`}</p>
                        <p className="text-sm text-zinc-300">{paradox && `Paradox: ${paradox}`}</p>
                      </div>
                    )}
                    {generatedProfile.motivation && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Generated Profile</span>
                        <p className="text-sm text-zinc-300">{generatedProfile.motivation}</p>
                        <p className="text-sm text-zinc-300">{generatedProfile.magicalSignature}</p>
                        <p className="text-sm text-zinc-300">{generatedProfile.fatalFlaw}</p>
                        <p className="text-sm text-zinc-300">{generatedProfile.originStory}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-emerald-400/60 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                  <Check className="w-4 h-4" />
                  <p className="text-xs">This character will be added to your current scene context.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-zinc-900/50 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-0"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step === 'review' ? (
            <button
              onClick={handleSave}
              disabled={!character.name || !character.personality}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finish & Create
              <Check className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={(step === 'basic' && !character.name) ||
                        (step === 'narrative' && !magicSystem && !socialStanding && !powerSource && !vibe && !paradox)}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-500 text-white hover:bg-emerald-400 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
