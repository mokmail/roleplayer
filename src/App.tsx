import React, { useState, useEffect, useRef } from 'react';
import {
  Settings2,
  Send,
  Users,
  Users2,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Layout,
  History,
  Eye,
  EyeOff,
  ShieldAlert,
  BotMessageSquare,
  Loader2,
  WandSparkles,
  FileUp,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Reply,
  Footprints,
  ScanSearch,
  MessagesSquare,
  Save,
  Library,
  Zap,
  Trash2,
  Heart,
  Flame,
  Bomb,
  Search,
  Hand,
  Ear,
  Smile,
  AlertTriangle,
  Volume2,
  UserCheck,
  UserCircle2,
  User,
  Lock,
  Globe,
  Bot,
  Cpu,
  Play,
  Pause,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { Character, CharacterRelationship, ContentSafetySettings, PlayerProfile, SceneContext, Message, SavedSession, SavedStory, AIConfig, AIProvider, ConversationMode } from './types';
import { generateRoleplayResponse, generateStorySetup, updateSceneState, generateContextUpdate, generateLocationSuggestions, generateSceneTransitionPlan } from './services/geminiService';
import { CharacterWizard } from './components/CharacterWizard';
import { cn } from './lib/utils';
import { useNotification } from './lib/notification';
import { sanitizeExplicitMarker, shouldBlurMessage, shouldShowExplicitBadge } from './lib/contentSafety';
import { acknowledgeSceneContextChanges, syncSceneContextTracking } from './lib/contextTracker';
import { STARTER_SCENARIOS } from './lib/starterScenarios';
// page components
import { ScenePage } from './pages/ScenePage';
import { CharactersPage } from './pages/CharactersPage';
import { SessionsPage } from './pages/SessionsPage';
import { StoriesPage } from './pages/StoriesPage';
import { AgentsPage } from './pages/AgentsPage';

type QuickBubbleAction = {
  id: string;
  label: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
};

type RuntimeScene = {
  id: string;
  name: string;
  context: SceneContext;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

type LocationSuggestion = {
  location: string;
  rationale: string;
  transitionHook: string;
  fitsMode: 'tele' | 'presence' | 'both';
};

type SceneBubbleSetupDraft = {
  location: string;
  time: string;
  presentCharacterIds: string[];
};

type SceneTransitionKnowledge = {
  nextContext: SceneContext;
  visibleMessage: string;
  hiddenPrimer?: string;
};

const createInitialContext = (): SceneContext => syncSceneContextTracking({
  location: 'A tense crossroads',
  sceneTime: '',
  theme: 'Noir',
  conversationMode: 'presence',
  plot: 'The cast is assembling before the first decisive move.',
  characters: [],
  relationships: [],
  playerProfile: {
    name: '',
    role: '',
    persona: '',
    objective: '',
  },
  contentSafety: {
    explicitMode: 'fade-to-black',
    vulgarityLevel: 'medium',
    blurExplicitContent: true,
    showExplicitBadges: true,
  },
  maxTurnsPerResponse: 3,
  autoTurnOrder: 'sequential',
});

export default function App() {
  const MIN_RIGHT_SIDEBAR_WIDTH = 380;
  const MAX_RIGHT_SIDEBAR_WIDTH = 960;
  const [context, setContext] = useState<SceneContext>(createInitialContext());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'ollama',
    model: 'ministral-3:14b-cloud',
  });
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'scene' | 'characters' | 'sessions' | 'stories' | 'agents'>('scene');
  const [revealedExplicitMessages, setRevealedExplicitMessages] = useState<Record<string, boolean>>({});
  const [isGeneratingStorySetup, setIsGeneratingStorySetup] = useState(false);
  const [isChangingScene, setIsChangingScene] = useState(false);
  const [newSceneDescription, setNewSceneDescription] = useState('');
  const [newSceneLocation, setNewSceneLocation] = useState('');
  const [sceneBubbleSetupDrafts, setSceneBubbleSetupDrafts] = useState<Record<string, SceneBubbleSetupDraft>>({});
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isGeneratingLocationSuggestions, setIsGeneratingLocationSuggestions] = useState(false);
  const [scenes, setScenes] = useState<RuntimeScene[]>(() => {
    const timestamp = Date.now();
    return [{
      id: `scene-${timestamp}`,
      name: 'Scene 1',
      context: createInitialContext(),
      messages: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }];
  });
  const [activeSceneId, setActiveSceneId] = useState('');
  
  // Character color mapping for bubbles
  const getCharacterColor = (name: string | undefined) => {
    if (!name) return 'bg-emerald-600';
    const char = context.characters.find(c => c.name === name);
    if (!char) return 'bg-emerald-600';
    
    // Deterministic colors based on name if no specific color is set in the character object
    // For now, let's use a palette based on profession/alignment vibes or just deterministic
    const colors = [
      'bg-emerald-600', 'bg-blue-600', 'bg-violet-600', 'bg-rose-600', 
      'bg-amber-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-orange-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const [storyPrompt, setStoryPrompt] = useState(`# persona
- Gina 50
- Amina 45
- Nicole 20
- Sarah 18
- Fatima 17
- Peter 52
- John 45
- Ahmad 49
# relations (relationships)
- Gina is the mother of Sarah
- Gina is the mother of Nicole
- Amina is the mother of Fatima
- Peter is the father of Nicole
- Peter is the father of Sarah
- John is the Boss of Peter
- Gina is friend of Amina
- Gina is Wife of Peter
- Amina is wife of Ahmad
# lifestyles 
- Gina is a housewife
- Amina is a housewife
- Sarah is a student
- Nicole is a student
- Fatima is a puple
- Peter is a employee
- John is a Businessman 
- Ahmad is a worker
# secrtes 
-  Gina has a secret relationship with john
- Amina knows about Gina's secret relationship with John
- Peter doesnt know about Gina's secret relationship with John
- John wants to have a relationship with Amina. sarah, nicole and fatima and try to find a way to do so.

- Peter wants to have a relationship with Amina.
- Sarah wants to have a relationship with John.
- Ahmad is not aware of the Aminas involvement in the secret relationship between Gina and John.
- Amina pretend to live a faithfull and consrvative life style to hide her involvement in the secret relationship between Gina and John.

- Gina is aware of the Aminas involvement in the secret relationship between Gina and John.
- Amina is a muslim and carries a hijab.

- Gina is a Christian and does not carry a hijab.
# story
- dirty talk 
- explicit 
- sexual
- dark erotic 
- dark fantasy romance
- dark fantasy erotic
- dark fantasy sexual
# role of user 
user is playing role of john and is trying to find a way to have a relationship with Amina.`);
  const [isInstructorMode, setIsInstructorMode] = useState(false);
  const [collapsedEvents, setCollapsedEvents] = useState<Record<string, boolean>>({});
  const [openBubbleActionsFor, setOpenBubbleActionsFor] = useState<string | null>(null);
  const [watcherActive, setWatcherActive] = useState(false);
  const presenceSnapshotRef = useRef<Record<string, boolean>>({});
  const [savedStories, setSavedStories] = useState<SavedStory[]>(() => {
    if (typeof window === 'undefined') return [];
    const loaded = localStorage.getItem('rp_stories');
    if (loaded) {
      try {
        return JSON.parse(loaded);
      } catch (e) {
        console.error('Failed to parse stories from localStorage', e);
        return [];
      }
    }
    return [];
  });
  const [lastGeneratedStory, setLastGeneratedStory] = useState<{prompt: string, context: SceneContext} | null>(null);
  const { notify, confirm } = useNotification();
  const suppressPresenceWatcherRef = useRef(true);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return 560;

    const savedWidth = Number(localStorage.getItem('rp_right_sidebar_width'));
    if (Number.isFinite(savedWidth) && savedWidth > 0) {
      return Math.min(Math.max(savedWidth, MIN_RIGHT_SIDEBAR_WIDTH), MAX_RIGHT_SIDEBAR_WIDTH);
    }

    return Math.min(Math.max(window.innerWidth * 0.42, MIN_RIGHT_SIDEBAR_WIDTH), 720);
  });
  const [isResizingRightSidebar, setIsResizingRightSidebar] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('rp_right_sidebar_collapsed');
    return saved === 'true';
  });
  const setTrackedContext: React.Dispatch<React.SetStateAction<SceneContext>> = (value) => {
    setContext((previous) => {
      const nextContext = typeof value === 'function' ? value(previous) : value;
      return syncSceneContextTracking(nextContext, previous);
    });
  };

  const handleEditCharacter = (char: Character) => {
    setEditingCharacter(char);
    setIsWizardOpen(true);
  };
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = localStorage.getItem('rp_sessions');
    if (loaded) {
      try {
        setSavedSessions(JSON.parse(loaded));
      } catch (e) {
        console.error('Failed to load sessions from localStorage', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rp_sessions', JSON.stringify(savedSessions));
    localStorage.setItem('rp_stories', JSON.stringify(savedStories));
  }, [savedSessions, savedStories]);

  useEffect(() => {
    localStorage.setItem('rp_right_sidebar_width', String(rightSidebarWidth));
  }, [rightSidebarWidth]);

  useEffect(() => {
    localStorage.setItem('rp_right_sidebar_collapsed', String(isRightSidebarCollapsed));
  }, [isRightSidebarCollapsed]);

  useEffect(() => {
    if (!isResizingRightSidebar) return;

    const handlePointerMove = (event: MouseEvent) => {
      const nextWidth = window.innerWidth - event.clientX;
      const clampedWidth = Math.min(
        Math.max(nextWidth, MIN_RIGHT_SIDEBAR_WIDTH),
        Math.min(MAX_RIGHT_SIDEBAR_WIDTH, window.innerWidth - 320),
      );
      setRightSidebarWidth(clampedWidth);
    };

    const stopResizing = () => {
      setIsResizingRightSidebar(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', stopResizing);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizingRightSidebar]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!activeSceneId && scenes.length > 0) {
      setActiveSceneId(scenes[0].id);
    }
  }, [activeSceneId, scenes]);

  useEffect(() => {
    if (!activeSceneId) return;

    setScenes((previous) => previous.map((scene) => (
      scene.id === activeSceneId
        ? {
            ...scene,
            context,
            messages,
            updatedAt: Date.now(),
          }
        : scene
    )));
  }, [activeSceneId, context, messages]);

  const capturePresenceSnapshot = (characters: Character[]) => Object.fromEntries(
    characters.map((character) => [character.id, character.isPresent])
  );

  const buildPresenceWatcherEvent = (arrivingCharacters: Character[], sceneContext: SceneContext) => {
    const arrivingNames = arrivingCharacters.map((character) => character.name).join(arrivingCharacters.length > 1 ? ', ' : '');
    const otherPresentNames = sceneContext.characters
      .filter((character) => character.isPresent && !arrivingCharacters.some((arriving) => arriving.id === character.id))
      .map((character) => character.name);

    return `${arrivingNames} ${arrivingCharacters.length > 1 ? 'have' : 'has'} just joined the scene. They should begin interacting right away, and ${otherPresentNames.length > 0 ? `${otherPresentNames.join(', ')} should notice the arrival and react appropriately.` : 'the rest of the scene or chat should acknowledge the arrival.'}`;
  };

  const suppressNextPresenceWatcherCycle = () => {
    suppressPresenceWatcherRef.current = true;
  };

  useEffect(() => {
    const nextSnapshot = capturePresenceSnapshot(context.characters);

    if (suppressPresenceWatcherRef.current) {
      presenceSnapshotRef.current = nextSnapshot;
      suppressPresenceWatcherRef.current = false;
      return;
    }

    const previousSnapshot = presenceSnapshotRef.current;
    presenceSnapshotRef.current = nextSnapshot;

    if (messages.length === 0 || isLoading) {
      return;
    }

    const arrivingCharacters = context.characters.filter((character) => character.isPresent && previousSnapshot[character.id] !== true);
    if (arrivingCharacters.length === 0) {
      return;
    }

    setWatcherActive(true);
    setTimeout(() => setWatcherActive(false), 3000);

    void triggerSystemEvent(buildPresenceWatcherEvent(arrivingCharacters, context), context);
  }, [context.characters, messages.length]);

  const splitCharacterTurns = (text: string) => {
    const turns: { name: string; content: string }[] = [];
    const regex = /\*\*([^*]+):\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      if (turns.length > 0) {
        turns[turns.length - 1].content = text.substring(lastIndex, match.index).trim();
      }
      turns.push({ name: match[1], content: '' });
      lastIndex = regex.lastIndex;
    }

    if (turns.length > 0) {
      turns[turns.length - 1].content = text.substring(lastIndex).trim();
    } else {
      return [{ name: '', content: text.trim() }];
    }

    return turns;
  };

  const buildAssistantMessages = (aiResponse: string) => {
    const timestamp = Date.now();
    const disallowedNames = new Set(['system', 'narrator', 'assistant', 'ai']);

    return splitCharacterTurns(aiResponse)
      .map((turn) => ({
        name: turn.name.trim(),
        content: turn.content.trim(),
      }))
      .filter((turn) => {
        if (!turn.content) return false;

        const normalizedName = turn.name.toLowerCase();
        const looksLikeSystemMeta =
          disallowedNames.has(normalizedName) ||
          /^\[(system|meta|instruction|event|scene)/i.test(turn.content);

        return !looksLikeSystemMeta;
      })
      .map((turn, index) => ({
        id: (timestamp + index + 1).toString(),
        role: 'assistant' as const,
        content: turn.content,
        characterName: turn.name || undefined,
        timestamp,
      }));
  };

  const buildBubbleActions = (msg: Message): QuickBubbleAction[] => {
    const targetName = msg.characterName || 'them';

    if (context.conversationMode === 'tele') {
      return [
        {
          id: 'reply',
          label: `Reply to ${targetName}`,
          prompt: `I reply directly to ${targetName}.`,
          icon: Reply,
        },
        {
          id: 'press',
          label: `Press ${targetName}`,
          prompt: `I message ${targetName} directly and press them for a clear answer.`,
          icon: MessagesSquare,
        },
        {
          id: 'provoke',
          label: `Provoke ${targetName}`,
          prompt: `I send a sharp message to ${targetName} specifically to see how they react.`,
          icon: Bomb,
        },
        {
          id: 'confess',
          label: `Confess feelings`,
          prompt: `I've been holding it back... I send a long, honest message to ${targetName} sharing what I really feel.`,
          icon: Heart,
        },
        {
          id: 'deflect',
          label: `Deflect ${targetName}`,
          prompt: `I try to steer the conversation away from what ${targetName} just said by bringing up something else entirely.`,
          icon: ScanSearch,
        },
        {
          id: 'ghost',
          label: 'Leave on read',
          prompt: 'I read the exchange carefully, but decide not to respond for now.',
          icon: EyeOff,
        },
      ];
    }

    return [
      {
        id: 'reply',
        label: `Respond to ${targetName}`,
        prompt: `I turn to ${targetName} and respond directly.`,
        icon: Reply,
      },
      {
        id: 'confront',
        label: `Confront ${targetName}`,
        prompt: `I move right into ${targetName}'s personal space and confront them about what they just said.`,
        icon: AlertTriangle,
      },
      {
        id: 'seduce',
        label: `Seduce ${targetName}`,
        prompt: `I lower my voice and lean in towards ${targetName}, letting my gaze linger on them as I speak.`,
        icon: Flame,
      },
      {
        id: 'whisper',
        label: `Whisper close`,
        prompt: `I lean in and whisper directly into ${targetName}'s ear, keeping our words private from others.`,
        icon: Ear,
      },
      {
        id: 'look-over',
        label: 'Look ${targetName} over',
        prompt: `I say nothing, but I slowly look ${targetName} over from head to toe, letting them feel my scrutiny.`,
        icon: Search,
      },
      {
        id: 'reassure',
        label: `Reassure ${targetName}`,
        prompt: `I offer ${targetName} a warm smile and a gentle touch on the shoulder to show I'm with them.`,
        icon: Smile,
      },
      {
        id: 'break-tension',
        label: 'Break the silence',
        prompt: `The silence is getting heavy... I make a sudden, loud comment to break the tension ${targetName} just created.`,
        icon: Volume2,
      },
      {
        id: 'get-away',
        label: 'Step back',
        prompt: `I step back and put some distance between myself and ${targetName}.`,
        icon: Footprints,
      },
    ];
  };

  // Attempt to repair common JSON syntax errors from AI responses
  const tryRepairJson = (jsonStr: string): string => {
    let repaired = jsonStr;
    
    // Try to parse first - if it works, return original
    try {
      JSON.parse(repaired);
      return repaired;
    } catch {
      // Continue with repairs
    }
    
    // Fix: remove any markdown code fences that might be inside
    repaired = repaired.replace(/```[a-z]*/gi, '').trim();
    
    // Fix: missing commas between properties - when a string value is followed by a key
    repaired = repaired.replace(/'([^'\n]*)'\s+'([^']+)'\s*:/g, "'$1', '$2':");
    repaired = repaired.replace(/"([^"]+)"\s+"([^"]+)"\s*:\s*/g, '"$1", "$2": ');
    
    // Fix: missing commas after object/array closing when next property starts with quote
    repaired = repaired.replace(/([\]\}])\s+("[a-zA-Z_])/g, '$1, $2');
    
    // Fix: trailing commas before } or ]
    repaired = repaired.replace(/,\s*([\]\}])/g, '$1');
    
    // Fix: single quotes to double quotes (common AI mistake)
    repaired = repaired.replace(/'([^'\n]*)'/g, (match) => match.replace(/'/g, '"'));
    
    // Fix: missing quotes around property names
    repaired = repaired.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // Fix: unquoted string values (simple cases)
    repaired = repaired.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}\]])/g, (match, value, end) => {
      if (value === 'true' || value === 'false' || value === 'null') {
        return `: ${value}${end}`;
      }
      return `: "${value}"${end}`;
    });

    // Fix: missing commas between properties (e.g.  "objective": "..."  "contentSafety": ...)
    repaired = repaired.replace(/("[^"]+"\s*:\s*"[^"]+")\s*(?=\n\s*"[^"]+"\s*:)/g, '$1,');

    // Fix: orphan junk lines inserted between valid properties
    repaired = repaired.replace(/(^\s*"[^"]+"\s*:\s*.*?,\s*$)\n\s*[^\n:{}\[\]]+\s*$\n(?=\s*"[^"]+"\s*:)/gm, '$1\n');
    
    // Try to parse after repairs
    try {
      JSON.parse(repaired);
      return repaired;
    } catch {
      // If still fails, return original to let the error show the actual issue
      return jsonStr;
    }
  };

  const splitTopLevelJsonObjects = (rawText: string) => {
    const chunks: string[] = [];
    let depth = 0;
    let start = -1;
    let inString = false;
    let escaped = false;

    for (let index = 0; index < rawText.length; index += 1) {
      const char = rawText[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        if (depth === 0) {
          start = index;
        }
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          chunks.push(rawText.slice(start, index + 1));
          start = -1;
        }
      }
    }

    return chunks;
  };

  const parseGeneratedJsonPayload = (rawText: string) => {
    const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const chunks = splitTopLevelJsonObjects(cleaned);

    if (chunks.length === 0) {
      throw new Error('The generated setup did not return valid JSON.');
    }

    if (chunks.length === 1) {
      return JSON.parse(tryRepairJson(chunks[0]));
    }

    return chunks.reduce<Record<string, unknown>>((merged, chunk) => {
      const parsedChunk = JSON.parse(tryRepairJson(chunk)) as Record<string, unknown>;
      return { ...merged, ...parsedChunk };
    }, {});
  };

  const extractJsonPayload = (rawText: string) => {
    return JSON.stringify(parseGeneratedJsonPayload(rawText));
  };

  const normalizeGeneratedContext = (rawContext: Partial<SceneContext>): SceneContext => {
    const baseId = Date.now();
    
    // Helper function to generate a simple ID from a character name
    const generateIdFromName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 15)
        || `char${Date.now()}`;
    };
    
    // First pass: create characters with proper IDs
    const characters = (rawContext.characters || []).slice(0, 6).map((character, index) => {
      // Use provided ID or generate one from the name
      const charId = character.id?.trim() 
        ? character.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
        : generateIdFromName(character.name || '');
      
      return {
        id: charId || `${baseId}-${index}`,
        name: character.name?.trim() || `Character ${index + 1}`,
        personality: character.personality?.trim() || 'Distinct and reactive.',
        backstory: character.backstory?.trim() || '',
        isPresent: character.isPresent ?? true,
        race: character.race?.trim() || '',
        profession: character.profession?.trim() || '',
        alignment: character.alignment?.trim() || '',
        background: character.background?.trim() || '',
        age: character.age?.trim() || '',
        gender: character.gender?.trim() || '',
        magicSystem: character.magicSystem?.trim() || '',
        socialStanding: character.socialStanding?.trim() || '',
        powerSource: character.powerSource?.trim() || '',
        vibe: character.vibe?.trim() || '',
        paradox: character.paradox?.trim() || '',
      };
    });
    
    // Create a mapping from character name to ID for fallback matching
    const nameToIdMap = new Map<string, string>();
    characters.forEach(char => {
      const normalizedName = char.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      nameToIdMap.set(normalizedName, char.id);
      // Also map just the first name
      const firstName = char.name.split(/[\s-]/)[0].toLowerCase();
      if (firstName && firstName !== normalizedName) {
        nameToIdMap.set(firstName, char.id);
      }
    });
    
    const validCharacterIds = new Set(characters.map((character) => character.id));

    // Helper to get valid visibility
    const getValidVisibility = (v: string): 'public' | 'private' | 'secret' => {
      if (v === 'secret' || v === 'private' || v === 'public') return v;
      return 'public';
    };

    return {
      location: rawContext.location?.trim() || 'An undefined place',
      sceneTime: typeof rawContext.sceneTime === 'string' ? rawContext.sceneTime.trim() : '',
      plot: rawContext.plot?.trim() || 'A story is about to begin.',
      theme: rawContext.theme?.trim() || 'Fantasy',
      conversationMode: normalizeConversationMode(rawContext.conversationMode, 'presence'),
      characters,
      relationships: (rawContext.relationships || [])
        .map((relationship, index) => {
          // Try to find valid IDs, first from the relationship itself, then by name lookup
          let sourceId = relationship.sourceCharacterId?.trim();
          let targetId = relationship.targetCharacterId?.trim();
          
          // Normalize the IDs from the relationship
          sourceId = sourceId?.toLowerCase().replace(/[^a-z0-9_]/g, '');
          targetId = targetId?.toLowerCase().replace(/[^a-z0-9_]/g, '');
          
          // If IDs don't exist in validCharacterIds, try to find by name
          if (sourceId && !validCharacterIds.has(sourceId)) {
            // Try partial match
            for (const [nameKey, charId] of nameToIdMap) {
              if (sourceId.includes(nameKey) || nameKey.includes(sourceId)) {
                sourceId = charId;
                break;
              }
            }
          }
          if (targetId && !validCharacterIds.has(targetId)) {
            // Try partial match
            for (const [nameKey, charId] of nameToIdMap) {
              if (targetId.includes(nameKey) || nameKey.includes(targetId)) {
                targetId = charId;
                break;
              }
            }
          }
          
          const legacyRelationship = relationship as typeof relationship & {
            label?: string;
            reverseLabel?: string;
          };

          return {
            id: relationship.id?.trim() || `${baseId}-rel-${index}`,
            sourceCharacterId: (sourceId && validCharacterIds.has(sourceId)) ? sourceId : '',
            targetCharacterId: (targetId && validCharacterIds.has(targetId)) ? targetId : '',
            kind: relationship.kind?.trim() || legacyRelationship.label?.trim() || 'relationship',
            reciprocal: relationship.reciprocal ?? false,
            reverseKind: relationship.reciprocal
              ? (relationship.reverseKind?.trim() || legacyRelationship.reverseLabel?.trim() || relationship.kind?.trim() || legacyRelationship.label?.trim() || 'relationship')
              : (relationship.reverseKind?.trim() || legacyRelationship.reverseLabel?.trim() || ''),
            intensity: Math.min(5, Math.max(1, relationship.intensity || 3)),
            visibility: getValidVisibility(relationship.visibility || 'public'),
            notes: relationship.notes?.trim() || '',
          };
        })
        .filter(r => r.sourceCharacterId && r.targetCharacterId), // Only keep relationships with valid IDs
      playerProfile: {
        name: rawContext.playerProfile?.name?.trim() || '',
        role: rawContext.playerProfile?.role?.trim() || '',
        persona: rawContext.playerProfile?.persona?.trim() || '',
        objective: rawContext.playerProfile?.objective?.trim() || '',
      },
      contentSafety: {
        explicitMode: rawContext.contentSafety?.explicitMode === 'allow' ? 'allow' : 'fade-to-black',
        vulgarityLevel: (rawContext.contentSafety?.vulgarityLevel === 'low' || rawContext.contentSafety?.vulgarityLevel === 'medium' || rawContext.contentSafety?.vulgarityLevel === 'high' || rawContext.contentSafety?.vulgarityLevel === 'extreme')
          ? rawContext.contentSafety.vulgarityLevel
          : 'medium',
        blurExplicitContent: rawContext.contentSafety?.blurExplicitContent ?? true,
        showExplicitBadges: rawContext.contentSafety?.showExplicitBadges ?? true,
      },
      summary: rawContext.summary?.trim() || '',
      events: [],
      structuredEvents: [],
      maxTurnsPerResponse: Math.min(6, Math.max(1, rawContext.maxTurnsPerResponse || 3)),
      autoTurnOrder: rawContext.autoTurnOrder === 'random' || rawContext.autoTurnOrder === 'manual' ? rawContext.autoTurnOrder : 'sequential',
    };
  };

  type SceneContextPatch = Partial<SceneContext> & {
    characters?: Array<Partial<Character>>;
    relationships?: Array<Partial<CharacterRelationship>>;
    playerProfile?: Partial<PlayerProfile>;
    contentSafety?: Partial<ContentSafetySettings>;
  };

  const normalizeIdToken = (value?: string) => value?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || '';
  const normalizeNameToken = (value?: string) => value?.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || '';
  const normalizeConversationMode = (value: unknown, fallback: ConversationMode = 'presence'): ConversationMode => {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase().replace(/[^a-z]/g, '');

    if (normalized === 'tele' || normalized === 'telechat' || normalized === 'remote' || normalized === 'messaging' || normalized === 'chat' || normalized === 'dm') {
      return 'tele';
    }

    if (normalized === 'presence' || normalized === 'inperson' || normalized === 'physical' || normalized === 'facetoface') {
      return 'presence';
    }

    return fallback;
  };
  const preferString = (incoming: unknown, fallback = '') => {
    if (typeof incoming !== 'string') return fallback;
    const trimmed = incoming.trim();
    return trimmed ? trimmed : fallback;
  };
  const clampIntensity = (value: unknown, fallback = 3) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
    return Math.min(5, Math.max(1, Math.round(value)));
  };
  const normalizeVisibility = (value: unknown, fallback: 'public' | 'private' | 'secret' = 'public') => {
    return value === 'public' || value === 'private' || value === 'secret' ? value : fallback;
  };
  const generateCharacterId = (name?: string, fallbackSeed?: string) => {
    const byName = normalizeNameToken(name).slice(0, 15);
    if (byName) return byName;
    const bySeed = normalizeIdToken(fallbackSeed).slice(0, 15);
    if (bySeed) return bySeed;
    return `char${Date.now()}`;
  };

  const buildCharacterReferenceMap = (characters: Character[]) => {
    const map = new Map<string, string>();

    characters.forEach((character) => {
      const idToken = normalizeIdToken(character.id);
      const nameToken = normalizeNameToken(character.name);
      const firstNameToken = normalizeNameToken(character.name.split(/[\s-]/)[0]);

      if (idToken) map.set(idToken, character.id);
      if (nameToken) map.set(nameToken, character.id);
      if (firstNameToken) map.set(firstNameToken, character.id);
    });

    return map;
  };

  const mergeCharacters = (currentCharacters: Character[], patches?: Array<Partial<Character>>) => {
    if (!Array.isArray(patches) || patches.length === 0) {
      return currentCharacters;
    }

    const nextCharacters = [...currentCharacters];
    const findCharacterIndex = (patch: Partial<Character>) => {
      const patchId = normalizeIdToken(patch.id);
      if (patchId) {
        const indexById = nextCharacters.findIndex((character) => normalizeIdToken(character.id) === patchId);
        if (indexById >= 0) return indexById;
      }

      const patchName = normalizeNameToken(patch.name);
      if (patchName) {
        return nextCharacters.findIndex((character) => {
          const existingName = normalizeNameToken(character.name);
          const existingFirstName = normalizeNameToken(character.name.split(/[\s-]/)[0]);
          return existingName === patchName || existingFirstName === patchName;
        });
      }

      return -1;
    };

    patches.forEach((patch, index) => {
      const existingIndex = findCharacterIndex(patch);

      if (existingIndex >= 0) {
        const existing = nextCharacters[existingIndex];
        nextCharacters[existingIndex] = {
          ...existing,
          name: preferString(patch.name, existing.name),
          personality: preferString(patch.personality, existing.personality),
          backstory: preferString(patch.backstory, existing.backstory || ''),
          isPresent: patch.isPresent ?? existing.isPresent,
          race: preferString(patch.race, existing.race || ''),
          profession: preferString(patch.profession, existing.profession || ''),
          alignment: preferString(patch.alignment, existing.alignment || ''),
          background: preferString(patch.background, existing.background || ''),
          age: preferString(patch.age, existing.age || ''),
          gender: preferString(patch.gender, existing.gender || ''),
          magicSystem: preferString(patch.magicSystem, existing.magicSystem || ''),
          socialStanding: preferString(patch.socialStanding, existing.socialStanding || ''),
          powerSource: preferString(patch.powerSource, existing.powerSource || ''),
          vibe: preferString(patch.vibe, existing.vibe || ''),
          paradox: preferString(patch.paradox, existing.paradox || ''),
        };
        return;
      }

      nextCharacters.push({
        id: normalizeIdToken(patch.id) || generateCharacterId(patch.name, `char-${index}`),
        name: preferString(patch.name, `Character ${nextCharacters.length + 1}`),
        personality: preferString(patch.personality, 'Distinct and reactive.'),
        backstory: preferString(patch.backstory, ''),
        isPresent: patch.isPresent ?? true,
        race: preferString(patch.race, ''),
        profession: preferString(patch.profession, ''),
        alignment: preferString(patch.alignment, ''),
        background: preferString(patch.background, ''),
        age: preferString(patch.age, ''),
        gender: preferString(patch.gender, ''),
        magicSystem: preferString(patch.magicSystem, ''),
        socialStanding: preferString(patch.socialStanding, ''),
        powerSource: preferString(patch.powerSource, ''),
        vibe: preferString(patch.vibe, ''),
        paradox: preferString(patch.paradox, ''),
      });
    });

    return nextCharacters;
  };

  const mergeRelationships = (
    currentRelationships: CharacterRelationship[],
    patches: Array<Partial<CharacterRelationship>> | undefined,
    characters: Character[]
  ) => {
    if (!Array.isArray(patches) || patches.length === 0) {
      return currentRelationships;
    }

    const nextRelationships = [...currentRelationships];
    const characterRefs = buildCharacterReferenceMap(characters);
    const resolveCharacterRef = (value?: string) => {
      const normalized = normalizeIdToken(value);
      if (!normalized) return '';
      return characterRefs.get(normalized) || '';
    };

    patches.forEach((patch, index) => {
      const resolvedSource = resolveCharacterRef(patch.sourceCharacterId);
      const resolvedTarget = resolveCharacterRef(patch.targetCharacterId);

      if (!resolvedSource || !resolvedTarget) {
        return;
      }

      const patchId = normalizeIdToken(patch.id);
      const existingIndex = nextRelationships.findIndex((relationship) => {
        if (patchId && normalizeIdToken(relationship.id) === patchId) {
          return true;
        }

        return relationship.sourceCharacterId === resolvedSource && relationship.targetCharacterId === resolvedTarget;
      });

      if (existingIndex >= 0) {
        const existing = nextRelationships[existingIndex];
        const reciprocal = patch.reciprocal ?? existing.reciprocal ?? false;
        const nextKind = preferString(patch.kind, existing.kind);

        nextRelationships[existingIndex] = {
          ...existing,
          sourceCharacterId: resolvedSource,
          targetCharacterId: resolvedTarget,
          kind: nextKind,
          reciprocal,
          reverseKind: reciprocal
            ? preferString(patch.reverseKind, existing.reverseKind || nextKind)
            : preferString(patch.reverseKind, existing.reverseKind || ''),
          intensity: clampIntensity(patch.intensity, existing.intensity),
          visibility: normalizeVisibility(patch.visibility, existing.visibility),
          notes: preferString(patch.notes, existing.notes || ''),
        };
        return;
      }

      const reciprocal = patch.reciprocal ?? false;
      const nextKind = preferString(patch.kind, 'relationship');
      nextRelationships.push({
        id: patchId || `${Date.now()}-rel-${index}`,
        sourceCharacterId: resolvedSource,
        targetCharacterId: resolvedTarget,
        kind: nextKind,
        reciprocal,
        reverseKind: reciprocal ? preferString(patch.reverseKind, nextKind) : preferString(patch.reverseKind, ''),
        intensity: clampIntensity(patch.intensity, 3),
        visibility: normalizeVisibility(patch.visibility, 'public'),
        notes: preferString(patch.notes, ''),
      });
    });

    return nextRelationships;
  };

  const applySceneContextPatch = (currentContext: SceneContext, patch: SceneContextPatch): SceneContext => {
    const mergedCharacters = mergeCharacters(currentContext.characters, patch.characters);
    const mergedRelationships = mergeRelationships(currentContext.relationships || [], patch.relationships, mergedCharacters);

    return syncSceneContextTracking({
      ...currentContext,
      location: preferString(patch.location, currentContext.location),
      sceneTime: preferString((patch as any).sceneTime, currentContext.sceneTime || ''),
      plot: preferString(patch.plot, currentContext.plot),
      theme: preferString(patch.theme, currentContext.theme || ''),
      conversationMode: normalizeConversationMode(
        patch.conversationMode,
        currentContext.conversationMode || 'presence'
      ),
      characters: mergedCharacters,
      relationships: mergedRelationships,
      playerProfile: {
        ...(currentContext.playerProfile || { name: '', role: '', persona: '', objective: '' }),
        name: preferString(patch.playerProfile?.name, currentContext.playerProfile?.name || ''),
        role: preferString(patch.playerProfile?.role, currentContext.playerProfile?.role || ''),
        persona: preferString(patch.playerProfile?.persona, currentContext.playerProfile?.persona || ''),
        objective: preferString(patch.playerProfile?.objective, currentContext.playerProfile?.objective || ''),
      },
      contentSafety: {
        ...(currentContext.contentSafety || { explicitMode: 'fade-to-black', vulgarityLevel: 'medium' as const, blurExplicitContent: true, showExplicitBadges: true }),
        explicitMode: patch.contentSafety?.explicitMode === 'allow' || patch.contentSafety?.explicitMode === 'fade-to-black'
          ? patch.contentSafety.explicitMode
          : (currentContext.contentSafety?.explicitMode || 'fade-to-black'),
        vulgarityLevel: (patch.contentSafety?.vulgarityLevel === 'low' || patch.contentSafety?.vulgarityLevel === 'medium' || patch.contentSafety?.vulgarityLevel === 'high' || patch.contentSafety?.vulgarityLevel === 'extreme')
          ? patch.contentSafety.vulgarityLevel
          : (currentContext.contentSafety?.vulgarityLevel || 'medium'),
        blurExplicitContent: patch.contentSafety?.blurExplicitContent ?? (currentContext.contentSafety?.blurExplicitContent ?? true),
        showExplicitBadges: patch.contentSafety?.showExplicitBadges ?? (currentContext.contentSafety?.showExplicitBadges ?? true),
      },
      summary: typeof patch.summary === 'string' ? patch.summary : currentContext.summary,
      events: Array.isArray(patch.events) && patch.events.length > 0 ? patch.events : currentContext.events,
      structuredEvents: Array.isArray(patch.structuredEvents) && patch.structuredEvents.length > 0 ? patch.structuredEvents : currentContext.structuredEvents,
      maxTurnsPerResponse: typeof patch.maxTurnsPerResponse === 'number'
        ? Math.min(6, Math.max(1, patch.maxTurnsPerResponse))
        : currentContext.maxTurnsPerResponse,
      autoTurnOrder: patch.autoTurnOrder === 'random' || patch.autoTurnOrder === 'manual' || patch.autoTurnOrder === 'sequential'
        ? patch.autoTurnOrder
        : currentContext.autoTurnOrder,
    }, currentContext);
  };

  const syncSceneState = async (sceneContext: SceneContext, history: Message[]) => {
    try {
      const newState = await updateSceneState(aiConfig, sceneContext, history);
      setTrackedContext(prev => ({
        ...prev,
        summary: newState.summary,
        events: newState.events,
        structuredEvents: newState.structuredEvents,
        storyFlow: prev.storyFlow ? {
          ...prev.storyFlow,
          qualityAnalysis: newState.qualityAnalysis
        } : undefined
      }));
    } catch (e) {
      console.warn('Scene update failed:', e);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    if (isInstructorMode) {
      setIsLoading(true);
      try {
        const result: any = await generateContextUpdate(aiConfig, context, inputValue);
        // if the server forwarded text because parsing failed, show it to user
        if (result && typeof result === 'object' && 'text' in result) {
          console.warn('Context update response was not JSON, attempting client-side parsing:', result.text);
          try {
            const repairedUpdates = parseGeneratedJsonPayload(result.text) as Partial<SceneContext>;
            const merged = applySceneContextPatch(context, repairedUpdates as SceneContextPatch);
            setContext(merged);
            setMessages(prev => [
              ...prev,
              { id: Date.now().toString(), role: 'assistant', content: `(Context updated from repaired JSON)`, timestamp: Date.now() }
            ]);
          } catch (repairError: any) {
            console.warn('Could not parse context update text as JSON, showing raw message', repairError);
            notify(`Context update failed to parse. Model output:\n${result.text}`, 'error');
          }
        } else {
          const updates = result as SceneContextPatch;
          const merged = applySceneContextPatch(context, updates);
          setContext(merged);
          setMessages(prev => [
            ...prev,
            { id: Date.now().toString(), role: 'assistant', content: `(Context updated)`, timestamp: Date.now() }
          ]);
        }
      } catch (error: any) {
        console.error('Context update failed:', error);
        notify(`Context update failed: ${error.message || 'Unknown error'}`, 'error');
      } finally {
        setIsLoading(false);
        setInputValue('');
      }
      return;
    }

    await submitPlayerTurn(inputValue);
  };

  const submitPlayerTurn = async (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isLoading) return;

    const playingAsChar = context.characters.find(c => c.id === context.playerProfile?.playingAsCharacterId);
    
    // In game mode, if a persona is selected, always prefix the name to ensure the AI knows WHO is acting.
    // Also, if not in Instructor mode, ensure the message is strictly attributed to the persona.
    const formattedContent = playingAsChar 
      ? trimmedContent.startsWith(`**${playingAsChar.name}:**`) 
        ? trimmedContent 
        : `**${playingAsChar.name}:** ${trimmedContent}`
      : trimmedContent;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: formattedContent,
      characterName: playingAsChar?.name || (isInstructorMode ? 'Instructor' : 'Player'),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setOpenBubbleActionsFor(null);
    setIsLoading(true);

    try {
      const conversation = [...messages, userMessage];
      const aiResponse = await generateRoleplayResponse(aiConfig, context, conversation);
      
      if (aiResponse) {
        const newMessages = buildAssistantMessages(aiResponse);
        
        setMessages(prev => [...prev, ...newMessages]);
        await syncSceneState(context, [...conversation, ...newMessages]);
        setContext(prev => acknowledgeSceneContextChanges(prev));
      }
    } catch (error: any) {
      console.error('Error generating response:', error);
      notify(`Error communicating with AI: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBubbleAction = async (prompt: string) => {
    if (isLoading) return;
    await submitPlayerTurn(prompt);
  };

  const addCharacter = async () => {
    const newChar: Character = {
      id: Date.now().toString(),
      name: 'New Character',
      personality: 'Personality, appearance, motivation...',
      backstory: 'Backstory, important events...',
      isPresent: true,
    };
    const updatedCharacters = [...context.characters, newChar];
    const trackedNextContext = syncSceneContextTracking({ ...context, characters: updatedCharacters }, context);
    setTrackedContext(prev => ({
      ...prev,
      characters: updatedCharacters,
    }));
  };

  const updateCharacter = async (id: string, updates: Partial<Character>) => {
    const updatedCharacters = context.characters.map(c => c.id === id ? { ...c, ...updates } : c);

    setTrackedContext(prev => ({
      ...prev,
      characters: updatedCharacters,
    }));
  };

  const triggerSystemEvent = async (eventDescription: string, currentContext: SceneContext) => {
    setIsLoading(true);
    try {
      const modeAwareEventDescription = currentContext.conversationMode === 'tele'
        ? `${eventDescription} Treat this as a remote chat exchange, not a shared physical room. Any reaction should be expressed through messages, calls, typing pauses, seen indicators, attachments, or other remote communication cues.`
        : `${eventDescription} Treat this as an in-person shared scene. Reactions may use physical presence, movement, posture, gestures, entrances, exits, and environmental interaction.`;

      // We send a hidden system message to trigger the reaction
      const systemTriggerMessage: Message = {
        id: 'system-' + Date.now(),
        role: 'user',
        content: `[SYSTEM-EVENT: ${modeAwareEventDescription}]`,
        timestamp: Date.now(),
        isHidden: true,
      };

      const aiResponse = await generateRoleplayResponse(aiConfig, currentContext, [...messages, systemTriggerMessage]);
      
      if (aiResponse) {
        const newMessages = buildAssistantMessages(aiResponse);
        
        setMessages(prev => [...prev, systemTriggerMessage, ...newMessages]);
        await syncSceneState(currentContext, [...messages, systemTriggerMessage, ...newMessages]);
        setContext(prev => acknowledgeSceneContextChanges(prev));
      }
    } catch (error) {
      console.error('Error triggering system event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeCharacter = (id: string) => {
    setTrackedContext(prev => ({
      ...prev,
      characters: prev.characters.filter(c => c.id !== id),
      relationships: (prev.relationships || []).filter((relationship) => relationship.sourceCharacterId !== id && relationship.targetCharacterId !== id),
    }));
  };

  const getConversationModeLabel = (mode: ConversationMode) => mode === 'tele' ? 'Telechat' : 'In-person';

  const getDefaultSceneBubbleSetupDraft = (): SceneBubbleSetupDraft => ({
    location: context.location || '',
    time: context.sceneTime || '',
    presentCharacterIds: context.characters.filter((character) => character.isPresent).map((character) => character.id),
  });

  const updateSceneBubbleSetupDraft = (messageId: string, updates: Partial<SceneBubbleSetupDraft>) => {
    setSceneBubbleSetupDrafts((previous) => {
      const base = previous[messageId] || getDefaultSceneBubbleSetupDraft();
      return {
        ...previous,
        [messageId]: {
          ...base,
          ...updates,
        },
      };
    });
  };

  const applySceneBubbleSetup = (messageId: string) => {
    const draft = sceneBubbleSetupDrafts[messageId] || getDefaultSceneBubbleSetupDraft();
    const nextLocation = draft.location.trim() || context.location;
    const nextSceneTime = draft.time.trim();
    const presentIdSet = new Set(draft.presentCharacterIds);

    setTrackedContext((previous) => ({
      ...previous,
      location: nextLocation,
      sceneTime: nextSceneTime,
      characters: previous.characters.map((character) => ({
        ...character,
        isPresent: presentIdSet.has(character.id),
      })),
    }));

    const timestamp = Date.now();
    setMessages((previous) => ([
      ...previous,
      {
        id: `scene-setup-applied-${timestamp}`,
        role: 'assistant',
        characterName: 'Scene',
        content: `🧭 **Scene Setup Applied**\n📍 Location: **${nextLocation}**${nextSceneTime ? `\n🕒 Time: **${nextSceneTime}**` : ''}\n👥 Present: **${context.characters.filter((character) => presentIdSet.has(character.id)).map((character) => character.name).join(', ') || 'No one selected'}**`,
        timestamp,
      },
    ]));
  };

  const initializeScene = ({
    name,
    nextContext,
    initialMessage,
    hiddenPrimer,
  }: {
    name: string;
    nextContext: SceneContext;
    initialMessage: string;
    hiddenPrimer?: string;
  }) => {
    if (isLoading) return;

    const timestamp = Date.now();
    const nextSceneId = `scene-${timestamp}`;
    const nextMessages: Message[] = [
      {
        id: `scene-init-${timestamp}`,
        role: 'assistant',
        characterName: 'Scene',
        content: initialMessage,
        timestamp,
      },
    ];

    if (hiddenPrimer?.trim()) {
      nextMessages.push({
        id: `scene-primer-${timestamp}`,
        role: 'user',
        content: hiddenPrimer.trim(),
        timestamp,
        isHidden: true,
      });
    }

    suppressNextPresenceWatcherCycle();
    setOpenBubbleActionsFor(null);
    setRevealedExplicitMessages({});
    setInputValue('');

    setScenes((previous) => {
      const withActiveSnapshot = previous.map((scene) => (
        activeSceneId && scene.id === activeSceneId
          ? {
              ...scene,
              context,
              messages,
              updatedAt: timestamp,
            }
          : scene
      ));

      return [
        ...withActiveSnapshot,
        {
          id: nextSceneId,
          name,
          context: nextContext,
          messages: nextMessages,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ];
    });

    setActiveSceneId(nextSceneId);
    setContext(nextContext);
    setMessages(nextMessages);
  };

  const switchToScene = (sceneId: string) => {
    if (!sceneId || sceneId === activeSceneId || isLoading) return;

    const targetScene = scenes.find((scene) => scene.id === sceneId);
    if (!targetScene) return;

    const timestamp = Date.now();

    setScenes((previous) => previous.map((scene) => (
      scene.id === activeSceneId
        ? {
            ...scene,
            context,
            messages,
            updatedAt: timestamp,
          }
        : scene
    )));

    suppressNextPresenceWatcherCycle();
    setOpenBubbleActionsFor(null);
    setRevealedExplicitMessages({});
    setInputValue('');

    setActiveSceneId(sceneId);
    setContext(targetScene.context);
    setMessages(targetScene.messages);
  };

  const buildSceneTransitionKnowledge = async ({
    nextContext,
    reason,
    fallbackNarration,
  }: {
    nextContext: SceneContext;
    reason: string;
    fallbackNarration: string;
  }): Promise<SceneTransitionKnowledge> => {
    setIsLoading(true);
    try {
      const result = await generateSceneTransitionPlan(aiConfig, {
        fromContext: context,
        toContext: nextContext,
        fromMessages: messages.filter((message) => !message.isHidden).slice(-20),
        reason,
        scenes: scenes.map((scene) => ({
          id: scene.id,
          name: scene.name,
          createdAt: scene.createdAt,
          updatedAt: scene.updatedAt,
        })),
      });

      const transitionNarration = typeof result?.transitionNarration === 'string' && result.transitionNarration.trim()
        ? result.transitionNarration.trim()
        : fallbackNarration;
      const carryover = Array.isArray(result?.knowledgeCarryover)
        ? result.knowledgeCarryover.filter((item: unknown) => typeof item === 'string').slice(0, 7)
        : [];
      const followUpBeats = Array.isArray(result?.followUpBeats)
        ? result.followUpBeats.filter((item: unknown) => typeof item === 'string').slice(0, 5)
        : [];
      const updatedPlot = typeof result?.updatedPlot === 'string' ? result.updatedPlot.trim() : '';

      const patchedContext = updatedPlot
        ? syncSceneContextTracking({ ...nextContext, plot: updatedPlot }, context)
        : nextContext;

      const visibleMessageParts = [
        '🎬 **New Scene Initialized**',
        transitionNarration,
      ];

      if (carryover.length > 0) {
        visibleMessageParts.push(`🧠 **Carryover**\n${carryover.map((item: string) => `- ${item}`).join('\n')}`);
      }

      if (followUpBeats.length > 0) {
        visibleMessageParts.push(`➡️ **Follow-up Beats**\n${followUpBeats.map((item: string) => `- ${item}`).join('\n')}`);
      }

      const hiddenPrimer = [
        '[SCENE-KNOWLEDGE-HANDOFF]',
        `Transition reason: ${reason}`,
        carryover.length > 0 ? `Carryover knowledge:\n${carryover.map((item: string) => `- ${item}`).join('\n')}` : 'Carryover knowledge: none',
        followUpBeats.length > 0 ? `Immediate follow-up beats:\n${followUpBeats.map((item: string) => `- ${item}`).join('\n')}` : 'Immediate follow-up beats: none',
        'Use these continuity anchors naturally in upcoming responses without sounding meta.',
      ].join('\n\n');

      return {
        nextContext: patchedContext,
        visibleMessage: visibleMessageParts.join('\n\n'),
        hiddenPrimer,
      };
    } catch (error) {
      console.error('Scene transition knowledge flow failed:', error);
      return {
        nextContext,
        visibleMessage: `🎬 **New Scene Initialized**\n${fallbackNarration}`,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSceneForModeChange = async (nextMode: ConversationMode) => {
    const previousMode = context.conversationMode || 'presence';
    if (previousMode === nextMode) return;

    const nextContext = syncSceneContextTracking({
      ...context,
      conversationMode: nextMode,
      summary: '',
      events: [],
      structuredEvents: [],
    }, context);

    const knowledge = await buildSceneTransitionKnowledge({
      nextContext,
      reason: `Conversation mode switched from ${getConversationModeLabel(previousMode)} to ${getConversationModeLabel(nextMode)}.`,
      fallbackNarration: `Mode switched from **${getConversationModeLabel(previousMode)}** to **${getConversationModeLabel(nextMode)}**. The scene continues with natural continuity in the new interaction style.`,
    });

    initializeScene({
      name: `Scene ${scenes.length + 1} · ${getConversationModeLabel(nextMode)}`,
      nextContext: knowledge.nextContext,
      initialMessage: knowledge.visibleMessage,
      hiddenPrimer: knowledge.hiddenPrimer,
    });
  };

  const resetChat = async () => {
    if (await confirm('Reset Chat', 'Do you really want to reset the chat?')) {
      setMessages([]);
      setRevealedExplicitMessages({});
    }
  };

  const handleStartNewScene = async () => {
    if (!newSceneDescription.trim()) return;

    const trimmedLocation = newSceneLocation.trim();
    const nextContext = syncSceneContextTracking({
      ...context,
      location: trimmedLocation || context.location,
      sceneTime: context.sceneTime || '',
      summary: '',
      events: [],
      structuredEvents: [],
    }, context);
    
    setIsChangingScene(false);
    const nextSceneName = `Scene ${scenes.length + 1}`;
    const fallbackNarration = `${newSceneDescription.trim()}${trimmedLocation ? `\n📍 **Location:** ${trimmedLocation}` : ''}`;
    const knowledge = await buildSceneTransitionKnowledge({
      nextContext,
      reason: `User triggered scene transition. ${newSceneDescription.trim()}${trimmedLocation ? ` New location: ${trimmedLocation}.` : ''}`,
      fallbackNarration,
    });

    setNewSceneDescription('');
    setNewSceneLocation('');

    initializeScene({
      name: nextSceneName,
      nextContext: knowledge.nextContext,
      initialMessage: knowledge.visibleMessage,
      hiddenPrimer: knowledge.hiddenPrimer,
    });
  };

  const handleGenerateLocationSuggestions = async () => {
    if (isGeneratingLocationSuggestions || isLoading) return;

    setIsGeneratingLocationSuggestions(true);
    try {
      const result = await generateLocationSuggestions(
        aiConfig,
        context,
        scenes.map((scene) => ({
          id: scene.id,
          name: scene.name,
          context: scene.context,
          createdAt: scene.createdAt,
          updatedAt: scene.updatedAt,
        }))
      );

      const suggestions = Array.isArray(result?.suggestions) ? result.suggestions : [];
      const normalized = suggestions
        .map((suggestion: any) => ({
          location: typeof suggestion?.location === 'string' ? suggestion.location.trim() : '',
          rationale: typeof suggestion?.rationale === 'string' ? suggestion.rationale.trim() : '',
          transitionHook: typeof suggestion?.transitionHook === 'string' ? suggestion.transitionHook.trim() : '',
          fitsMode: suggestion?.fitsMode === 'tele' || suggestion?.fitsMode === 'presence' || suggestion?.fitsMode === 'both'
            ? suggestion.fitsMode
            : 'both',
        }))
        .filter((suggestion: LocationSuggestion) => suggestion.location);

      if (normalized.length === 0) {
        notify('Location agent could not produce suggestions right now. Try again.', 'warning');
        return;
      }

      setLocationSuggestions(normalized);
    } catch (error: any) {
      console.error('Location suggestion generation failed:', error);
      notify(`Location suggestions failed: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsGeneratingLocationSuggestions(false);
    }
  };

  const createNewSession = async () => {
    if (await confirm('New Session', 'Start a new session? This will reset the chat and clear current scene settings. Please save your current session first if needed.')) {
      setMessages([]);
      setRevealedExplicitMessages({});
      suppressNextPresenceWatcherCycle();
      setContext(createInitialContext());
      setActiveRightTab('scene');
    }
  };

  const applyStarterScenario = (scenarioId: string) => {
    const scenario = STARTER_SCENARIOS.find((entry) => entry.id === scenarioId);
    if (!scenario) return;

    setMessages([]);
    setRevealedExplicitMessages({});
    suppressNextPresenceWatcherCycle();
    setContext(syncSceneContextTracking({
      ...scenario.context,
      characters: scenario.context.characters.map((character) => ({ ...character })),
      relationships: scenario.context.relationships?.map((relationship) => ({ ...relationship })) || [],
      playerProfile: scenario.context.playerProfile ? { ...scenario.context.playerProfile } : undefined,
      contentSafety: scenario.context.contentSafety
        ? { ...scenario.context.contentSafety }
        : {
            explicitMode: 'fade-to-black',
            blurExplicitContent: true,
            showExplicitBadges: true,
          },
      events: [...(scenario.context.events || [])],
      structuredEvents: [...(scenario.context.structuredEvents || [])],
    }));
    setActiveRightTab('scene');
  };

  const handleGenerateStorySetup = async (prompt: string) => {
    if (!prompt.trim() || isGeneratingStorySetup) return;

    setIsGeneratingStorySetup(true);
    try {
      const result = await generateStorySetup(aiConfig, prompt);

      // the response may either be a full context object or a `{ text: string }`
      // wrapper when the server couldn't parse the model output.  If we get
      // raw text, run it through the extractor/repair code defined above.
      let parsed: Partial<SceneContext>;
      if (result && typeof result === 'object' && 'text' in result) {
        const raw = result.text as string;
        console.warn('Story setup received raw text from server, attempting client-side parsing', raw);
        try {
          parsed = JSON.parse(extractJsonPayload(raw));
        } catch (e:any) {
          // if extraction/parsing fails, assume the text is a refusal or human
          // explanation from the model.  Notify the user and abort the flow.
          console.warn('Could not parse story setup text as JSON, showing raw message', e);
          notify(`Story generation response:\n${raw}`, 'info');
          return;
        }
      } else {
        parsed = result as Partial<SceneContext>;
      }

      const nextContext = syncSceneContextTracking(normalizeGeneratedContext(parsed));

      setLastGeneratedStory({ prompt, context: nextContext });
      setMessages([]);
      setRevealedExplicitMessages({});
      suppressNextPresenceWatcherCycle();
      setContext(nextContext);
      setActiveRightTab('scene');
    } catch (error: any) {
      console.error('Story setup generation failed:', error);
      let message = error.message || 'Unknown error';

      // Provide more context for JSON parsing errors
      if (message.includes('JSON') || message.includes('Unexpected')) {
        message = `The AI returned invalid JSON. Please try again with a simpler prompt, or try a different model. Details: ${message}`;
      }

      notify(`Quick story generation failed: ${message}`, 'error');
    } finally {
      setIsGeneratingStorySetup(false);
    }
  };

  const handleQuickStoryGeneration = async () => {
    if (!storyPrompt.trim() || isGeneratingStorySetup) return;
    await handleGenerateStorySetup(storyPrompt);
  };

  const saveLastStory = () => {
    if (!lastGeneratedStory) {
      notify('No story to save yet', 'warning');
      return;
    }
    const name = prompt('Name for this story:', `Story ${new Date().toLocaleString()}`);
    if (!name) return;
    const newStory: SavedStory = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      prompt: lastGeneratedStory.prompt,
      context: lastGeneratedStory.context,
    };
    setSavedStories(prev => [newStory, ...prev]);
  };

  const saveCurrentSession = () => {
    const name = prompt('Name for this session:', `Session ${new Date().toLocaleString()}`);
    if (!name) return;

    const newSession: SavedSession = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      context,
      messages,
      aiConfig
    };

    setSavedSessions(prev => [newSession, ...prev]);
  };

  const loadSession = async (session: SavedSession) => {
    if (await confirm('Load Session', `Do you want to load the session "${session.name}"? Unsaved changes will be lost.`)) {
      suppressNextPresenceWatcherCycle();
      setContext(syncSceneContextTracking(session.context));
      setMessages(session.messages);
      if (session.aiConfig) {
        setAiConfig(session.aiConfig);
      }
      setShowSettings(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (await confirm('Delete Session', 'Really delete session?')) {
      setSavedSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const exportSessions = () => {
    const dataStr = JSON.stringify(savedSessions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'roleplay_sessions.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importSessions = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setSavedSessions(prev => [...imported, ...prev]);
        }
      } catch (err) {
        notify('Error importing file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const fetchOllamaModels = async () => {
    setIsFetchingModels(true);
    try {
      const url = aiConfig.baseUrl || "http://localhost:11434";
      const response = await fetch(`${url}/api/tags`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      const models = data.models.map((m: any) => m.name);
      setOllamaModels(models);
      if (models.length > 0 && !aiConfig.model) {
        setAiConfig(prev => ({ ...prev, model: models[0] || 'ministral-3:14b-cloud' }));
      }
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      notify('Could not connect to Ollama. Make sure it is running and CORS is allowed.', 'error');
    } finally {
      setIsFetchingModels(false);
    }
  };

  useEffect(() => {
    if (aiConfig.provider === 'ollama' && ollamaModels.length === 0) {
      fetchOllamaModels();
    }
  }, [aiConfig.provider]);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar - Scene Settings */}
      <motion.aside 
        initial={false}
        animate={{ width: showSettings ? '380px' : '0px', opacity: showSettings ? 1 : 0 }}
        className="border-r border-white/10 bg-[#0f0f0f] flex flex-col overflow-hidden"
      >
        <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-emerald-400" />
              Settings
            </h2>
          </div>

          {/* AI configuration block – removed previous tabs and pages */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Provider</label>
              <div className="grid grid-cols-3 gap-2">
                {(['gemini', 'openai', 'anthropic', 'mistral', 'groq', 'ollama'] as AIProvider[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setAiConfig(prev => ({ 
                      ...prev, 
                      provider: p,
                      model: p === 'gemini' ? 'gemini-3.1-pro-preview' : 
                             p === 'openai' ? 'gpt-4o' : 
                             p === 'anthropic' ? 'claude-3-5-sonnet-latest' :
                             p === 'mistral' ? 'mistral-large-latest' :
                         p === 'groq' ? 'llama-3.3-70b-versatile' : 'ministral-3:14b-cloud',
                      baseUrl: p === 'ollama' ? 'http://localhost:11434' : undefined
                    }))}
                    className={cn(
                      "py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all",
                      aiConfig.provider === p 
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20" 
                        : "bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300 hover:bg-white/10"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
              <div className="flex gap-2">
                {aiConfig.provider === 'ollama' && ollamaModels.length > 0 ? (
                  <select
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-all"
                  >
                    {ollamaModels.map(m => (
                      <option key={m} value={m} className="bg-[#0f0f0f] text-zinc-200">{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">API Key</label>
              <input
                type="password"
                value={aiConfig.apiKey || ''}
                onChange={(e) => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
              {aiConfig.provider === 'ollama' && (
                <p className="text-[10px] text-zinc-500 mt-1">The Ollama plugin runs locally and does not require an API key.</p>
              )}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col relative bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
          {/* Header */}
          <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  showSettings ? "bg-emerald-500/10 text-emerald-400" : "hover:bg-white/5 text-zinc-400"
                )}
              >
                <Settings2 className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-semibold text-zinc-100 flex items-center gap-2">
                  Roleplay Orchestrator
                  {watcherActive && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <Zap className="w-3 h-3 animate-pulse" />
                      watcher
                    </span>
                  )}
                </h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-500" /> Multi-Character Engine Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={activeSceneId}
                onChange={(event) => switchToScene(event.target.value)}
                className="max-w-[13rem] rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                title="Switch scene"
              >
                {scenes.map((scene) => (
                  <option key={scene.id} value={scene.id} className="bg-[#0f0f0f] text-zinc-200">
                    {scene.name}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => {
                  setNewSceneLocation(context.location || '');
                  setLocationSuggestions([]);
                  setIsChangingScene(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-lg transition-all border border-violet-500/20 text-[10px] font-bold uppercase tracking-wider"
                title="New Scene Event"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Next Scene</span>
              </button>
              <button 
                onClick={resetChat}
                className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 transition-colors"
                title="Reset Chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Active characters indicator */}
          <div className="px-6 py-2 border-b border-white/10 bg-[#0a0a0a]/80">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Present (Click to Toggle Persona):</span>
            <div className="inline-flex flex-wrap gap-2 ml-2">
              {(() => {
                const presentChars = context.characters.filter(c => c.isPresent);
                const isPrivate = presentChars.length === 2;
                const isGroup = presentChars.length > 2;

                return (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                      {context.characters.map(c => {
                        const isPlayingAs = context.playerProfile?.playingAsCharacterId === c.id;
                        return (
                          <div
                            key={c.id}
                            className={cn(
                              "inline-flex items-center rounded-full transition-all border overflow-hidden",
                              c.isPresent
                                ? "bg-emerald-500/10 border-emerald-500/20"
                                : "bg-zinc-700/10 border-white/5 opacity-60 grayscale hover:opacity-100"
                            )}
                          >
                            <button
                              onClick={() => {
                                setTrackedContext(prev => ({
                                  ...prev,
                                  characters: prev.characters.map(ch =>
                                    ch.id === c.id ? { ...ch, isPresent: !ch.isPresent } : ch
                                  )
                                }));
                              }}
                              className={cn(
                                "px-2 py-0.5 text-xs transition-colors hover:bg-white/5",
                                c.isPresent ? "text-emerald-400" : "text-zinc-500"
                              )}
                              title={c.isPresent ? "Present (Click to mark absent)" : "Absent (Click to mark present)"}
                            >
                              {c.name}
                            </button>
                            <button
                              onClick={() => {
                                setTrackedContext(prev => ({
                                  ...prev,
                                  playerProfile: {
                                    ...prev.playerProfile,
                                    playingAsCharacterId: isPlayingAs ? undefined : c.id,
                                  },
                                  characters: !isPlayingAs && !c.isPresent 
                                    ? prev.characters.map(ch => ch.id === c.id ? { ...ch, isPresent: true } : ch)
                                    : prev.characters
                                }));
                              }}
                              className={cn(
                                "px-1.5 py-1 border-l border-white/10 transition-all",
                                isPlayingAs 
                                  ? "bg-emerald-500 text-white" 
                                  : "text-zinc-500 hover:text-emerald-400 hover:bg-white/5"
                              )}
                              title={isPlayingAs ? "Stop playing as this character" : `Play as ${c.name}`}
                            >
                              {isPlayingAs ? <UserCheck className="w-3 h-3" /> : <UserCircle2 className="w-3 h-3" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {(isPrivate || isGroup) && (
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all animate-in fade-in slide-in-from-left-2",
                        isPrivate 
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-400" 
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      )}>
                        {isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                        {isPrivate ? 'Private' : 'Public/Group'}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            {context.characters.length > 0 && context.characters.every(c => !c.isPresent) && (
              <span className="mt-2 block text-xs text-zinc-500">No one is currently present</span>
            )}

            {(context.playerProfile?.name || context.playerProfile?.role || context.playerProfile?.playingAsCharacterId) && (
              <div className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500">
                You are:
                <span className="ml-2 text-emerald-400 font-bold normal-case tracking-normal text-xs">
                  {context.playerProfile?.playingAsCharacterId 
                    ? `Playing as ${context.characters.find(c => c.id === context.playerProfile?.playingAsCharacterId)?.name}`
                    : (context.playerProfile?.name || 'Unnamed Player') + (context.playerProfile?.role ? ` — ${context.playerProfile.role}` : '')
                  }
                </span>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                <ShieldAlert className="w-3 h-3 text-emerald-500" />
                {(context.contentSafety?.explicitMode || 'fade-to-black') === 'fade-to-black' ? 'Fade to black' : 'Explicit allowed'}
              </span>
              {(context.contentSafety?.blurExplicitContent ?? true) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                  <EyeOff className="w-3 h-3 text-emerald-500" /> Blur explicit
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="space-y-4 p-4 bg-white/[0.03] border border-emerald-500/10 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                    <BotMessageSquare className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Quick Story Generation</h3>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  Describe the exact story you want. The engine will generate the full context, player role, cast, tone, and scene settings in one step.
                </p>

                <div className="relative">
                  <textarea
                    value={storyPrompt}
                    onChange={(e) => setStoryPrompt(e.target.value)}
                    className="w-full h-36 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none pr-24"
                    placeholder="Describe genre, tone, setting, your role, desired cast dynamics, pacing, content boundaries, and any important hooks..."
                  />
                  <label className="absolute right-3 top-3 cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 hover:bg-white/10 hover:text-zinc-300 transition-colors">
                    <FileUp className="w-3.5 h-3.5" />
                    Upload
                    <input
                      type="file"
                      accept=".txt,.md,.markdown"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const text = await file.text();
                          setStoryPrompt(prev => prev ? `${prev}\n\n${text}` : text);
                        } catch (err) {
                          console.error('Failed to read file:', err);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleQuickStoryGeneration}
                    disabled={!storyPrompt.trim() || isGeneratingStorySetup}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isGeneratingStorySetup ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                    {isGeneratingStorySetup ? 'Generating...' : 'Generate Full Story Setup'}
                  </button>
                  <button
                    type="button"
                    onClick={saveLastStory}
                    disabled={!lastGeneratedStory}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Save Story
                  </button>
                  {storyPrompt && (
                    <button
                      onClick={() => setStoryPrompt('')}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {(() => {
                  const items: (Message | { type: 'event', event: any, id: string, timestamp: number })[] = [
                    ...messages.filter(m => !m.isHidden),
                    ...(context.structuredEvents || []).map((e: any, i: number) => ({
                      type: 'event' as const,
                      event: e,
                      id: `event-${i}`,
                      timestamp: messages[0]?.timestamp || Date.now() // Events don't have timestamps, use fallback
                    }))
                  ].sort((a, b) => a.timestamp - b.timestamp);

                  return items.map((item) => {
                    if ('type' in item && item.type === 'event') {
                      const event = item.event;
                      const isCollapsed = collapsedEvents[item.id];
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="my-3 flex flex-col items-center justify-center relative group"
                        >
                          <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent group-hover:via-emerald-500/30 transition-all" />
                          <button
                            onClick={() => setCollapsedEvents(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="relative z-10 px-4 py-1.5 rounded-2xl bg-[#0a0a0a] border border-emerald-500/10 hover:border-emerald-500/40 shadow-sm flex items-center gap-3 transition-all max-w-[80%]"
                          >
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                                {event.type || 'Scene Event'}
                              </span>
                            </div>
                            
                            {!isCollapsed ? (
                              <span className="text-[11px] text-zinc-300 font-medium truncate">
                                {event.description}
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 italic">Event details collapsed...</span>
                            )}
                            
                            <ChevronDown className={cn("w-3 h-3 text-zinc-600 transition-transform flex-shrink-0", isCollapsed && "-rotate-90")} />
                          </button>
                        </motion.div>
                      );
                    }

                    const msg = item as Message;
                    const playingAsChar = context.playerProfile?.playingAsCharacterId 
                      ? context.characters.find(c => c.id === context.playerProfile?.playingAsCharacterId)
                      : null;
                    
                    const isPersonaUser = msg.role === 'user' || (playingAsChar && msg.characterName === playingAsChar.name);
                    const isSceneBubble = msg.role === 'assistant' && msg.characterName === 'Scene';
                    const sceneSetupDraft = sceneBubbleSetupDrafts[msg.id] || getDefaultSceneBubbleSetupDraft();
                    
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex flex-col gap-1.5",
                          isPersonaUser ? "items-end text-right" : "items-start"
                        )}
                      >
                        <div className={cn(
                          "flex items-center gap-2 px-1",
                          isPersonaUser && "flex-row-reverse"
                        )}>
                          {(msg.characterName || (isPersonaUser && !playingAsChar)) && (
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                              isPersonaUser ? "text-emerald-400" : "text-zinc-500"
                            )}>
                              {isPersonaUser && <User className="w-2.5 h-2.5 opacity-60" />}
                              {msg.characterName || 'You'}
                            </span>
                          )}
                          {shouldShowExplicitBadge(msg, context) && (
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-300">
                              Explicit
                            </span>
                          )}
                        </div>
                        <div className={cn(
                          "max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-lg relative overflow-hidden",
                          isPersonaUser 
                            ? `${getCharacterColor(msg.characterName)} text-white rounded-tr-none shadow-emerald-900/10` 
                            : "bg-zinc-800 border border-white/10 text-zinc-200 rounded-tl-none"
                        )}>
                          <div className={cn(
                            "markdown-body prose prose-invert prose-sm max-w-none transition-all",
                            shouldBlurMessage(msg, context) && !revealedExplicitMessages[msg.id] && "blur-md select-none"
                          )}>
                            <Markdown>{sanitizeExplicitMarker(msg.content)}</Markdown>
                          </div>
                          {shouldBlurMessage(msg, context) && !revealedExplicitMessages[msg.id] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                              <button
                                onClick={() => setRevealedExplicitMessages(prev => ({ ...prev, [msg.id]: true }))}
                                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-black/60 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-300 transition-all hover:bg-black/80"
                              >
                                <Eye className="w-3 h-3" /> Reveal explicit content
                              </button>
                            </div>
                          )}
                        </div>
                        {isSceneBubble && (
                          <div className="flex max-w-[85%] flex-col gap-2 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Scene Setup</p>
                            <input
                              type="text"
                              value={sceneSetupDraft.location}
                              onChange={(event) => updateSceneBubbleSetupDraft(msg.id, { location: event.target.value })}
                              placeholder="Set location"
                              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50"
                            />
                            <input
                              type="text"
                              value={sceneSetupDraft.time}
                              onChange={(event) => updateSceneBubbleSetupDraft(msg.id, { time: event.target.value })}
                              placeholder="Set time (e.g. 11:30 PM, Dawn, Winter 1892)"
                              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50"
                            />
                            <div className="flex flex-wrap gap-2">
                              {context.characters.map((character) => {
                                const isSelected = sceneSetupDraft.presentCharacterIds.includes(character.id);
                                return (
                                  <button
                                    key={`${msg.id}-${character.id}`}
                                    type="button"
                                    onClick={() => {
                                      const nextIds = isSelected
                                        ? sceneSetupDraft.presentCharacterIds.filter((id) => id !== character.id)
                                        : [...sceneSetupDraft.presentCharacterIds, character.id];
                                      updateSceneBubbleSetupDraft(msg.id, { presentCharacterIds: nextIds });
                                    }}
                                    className={cn(
                                      "rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-all",
                                      isSelected
                                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                        : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                                    )}
                                  >
                                    {character.name}
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => applySceneBubbleSetup(msg.id)}
                              className="inline-flex items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/15 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-violet-200 transition-all hover:bg-violet-500/25"
                            >
                              Apply Scene Setup
                            </button>
                          </div>
                        )}

                        {!isPersonaUser && msg.role === 'assistant' && !isSceneBubble && (
                          <div className="flex max-w-[85%] flex-col items-start gap-2 px-1">
                            <button
                              type="button"
                              onClick={() => setOpenBubbleActionsFor((current) => current === msg.id ? null : msg.id)}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all",
                                openBubbleActionsFor === msg.id
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                              )}
                            >
                              <Sparkles className="w-3 h-3" />
                              Actions
                              <ChevronDown className={cn("w-3 h-3 transition-transform", openBubbleActionsFor === msg.id && "rotate-180")} />
                            </button>

                            {openBubbleActionsFor === msg.id && (
                              <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
                                {buildBubbleActions(msg).map((action) => {
                                  const ActionIcon = action.icon;
                                  return (
                                    <button
                                      key={action.id}
                                      type="button"
                                      onClick={() => handleBubbleAction(action.prompt)}
                                      disabled={isLoading}
                                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-200 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                                      title={action.prompt}
                                    >
                                      <ActionIcon className="w-3 h-3" />
                                      {action.label}
                                    </button>
                                  );
                                })}
                                <div className="w-px h-6 bg-white/10 mx-1 self-center" />
                                <button
                                  type="button"
                                  onClick={() => removeMessage(msg.id)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20 shadow-lg shadow-red-500/5 group/reject"
                                  title="Delete this message (Reject response)"
                                >
                                  <Trash2 className="w-3 h-3 group-hover/reject:scale-110 transition-transform" />
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <span className="text-[10px] text-zinc-600 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </motion.div>
                    );
                  });
                })()}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 text-zinc-500 text-xs italic"
                >
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
                  </div>
                  The engine is writing...
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-6 bg-gradient-to-t from-[#0a0a0a] to-transparent">
            {/* conversation mode & instructor switch */}
            <div className="max-w-3xl mx-auto mb-3 flex justify-center gap-2">
              {(['presence','tele'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => initializeSceneForModeChange(mode)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition",
                    context.conversationMode === mode
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-black/20 text-zinc-500 hover:bg-black/25"
                  )}
                >
                  {mode === 'tele' ? 'Telechat' : 'In person'}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsInstructorMode(prev => !prev)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition",
                  isInstructorMode
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-black/20 text-zinc-500 hover:bg-black/25"
                )}
              >
                {isInstructorMode ? 'Instructor' : 'Player'}
              </button>
            </div>
            <form 
              onSubmit={handleSendMessage}
              className="max-w-3xl mx-auto relative group"
            >
              <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="What do you do or say?"
                className="w-full bg-zinc-700 border border-white/20 rounded-2xl pl-6 pr-14 py-4 focus:outline-none focus:border-emerald-400 transition-all text-zinc-200 placeholder:text-zinc-500 shadow-2xl"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-all shadow-lg"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </main>

        {/* Right Sidebar - Tabs for Scene, Characters, Sessions */}
        {!isRightSidebarCollapsed && (
        <div className="group relative w-3 flex-shrink-0 cursor-col-resize bg-transparent" onMouseDown={() => setIsResizingRightSidebar(true)} onDoubleClick={() => setRightSidebarWidth(560)}>
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10 transition-colors group-hover:bg-emerald-500/70" />
          <div className="absolute left-1/2 top-1/2 h-16 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 transition-all group-hover:h-24 group-hover:bg-emerald-500/70" />
        </div>
        )}

        {!isRightSidebarCollapsed ? (
        <aside
          className="min-w-[24rem] max-w-[60rem] flex-shrink-0 border-l border-white/10 bg-gradient-to-b from-[#111111] via-[#0d0d0d] to-[#090909] flex flex-col overflow-hidden shadow-[-24px_0_60px_rgba(0,0,0,0.28)]"
          style={{ width: rightSidebarWidth }}
        >
          <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl px-4 py-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Workspace Panel</p>
                <h2 className="mt-1 text-sm font-semibold uppercase tracking-wider text-zinc-100">Story controls and cast tools</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-right lg:block">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300">Active tab</p>
                  <p className="mt-1 text-xs font-semibold text-zinc-100">{activeRightTab}</p>
                </div>
                <button
                  onClick={() => setIsRightSidebarCollapsed(true)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
                  title="Collapse sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 uppercase tracking-widest text-zinc-500">
            {[
              { id: 'scene', icon: Layout, label: 'Scene' },
              { id: 'characters', icon: Users, label: 'Chars' },
              { id: 'sessions', icon: History, label: 'Logs' },
              { id: 'stories', icon: Library, label: 'Stories' },
              { id: 'agents', icon: Bot, label: 'Agents' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveRightTab(tab.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold transition-all",
                  activeRightTab === tab.id 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
            {activeRightTab === 'scene' && (
              <ScenePage
                context={context}
                setContext={setTrackedContext}
                messages={messages}
                aiConfig={aiConfig}
                onConversationModeChange={initializeSceneForModeChange}
              />
            )}
            {activeRightTab === 'characters' && (
              <CharactersPage
                context={context}
                setContext={setTrackedContext}
                addCharacter={addCharacter}
                updateCharacter={updateCharacter}
                removeCharacter={removeCharacter}
                setIsWizardOpen={setIsWizardOpen}
                onEditCharacter={handleEditCharacter}
              />
            )}
            {activeRightTab === 'sessions' && (
              <SessionsPage
                savedSessions={savedSessions}
                saveCurrentSession={saveCurrentSession}
                createNewSession={createNewSession}
                exportSessions={exportSessions} 
                importSessions={importSessions} 
                deleteSession={deleteSession}
                loadSession={loadSession}
              />
            )}
            {activeRightTab === 'stories' && (
              <StoriesPage
                savedStories={savedStories}
                loadStory={async (story) => {
                  if (await confirm('Load Story', `Load story "${story.name}"? This will reset the chat.`)) {
                    setMessages([]);
                    setRevealedExplicitMessages({});
                    setContext(syncSceneContextTracking(story.context));
                    notify(`Loaded story: ${story.name}`, 'success');
                  }
                }}
                deleteStory={(id) => setSavedStories(prev => prev.filter(s => s.id !== id))}
                applyStarterScenario={applyStarterScenario}
                activeContext={context}
              />
            )}
            {activeRightTab === 'agents' && (
              <AgentsPage
                context={context}
                messages={messages}
                aiConfig={aiConfig}
                notify={notify}
                onApplyLocation={async (location, rationale, transitionHook, fitsMode) => {
                  const newContext = { ...context, location, plot: rationale || context.plot };
                  setContext(newContext);
                  notify?.(`Location changed to: ${location}`, 'success');
                  // Trigger system event to reflect change in story
                  if (transitionHook) {
                    try {
                      await triggerSystemEvent(`*The scene shifts to ${location}*. ${transitionHook}`, newContext);
                    } catch (e) {
                      console.error('Failed to trigger location change event:', e);
                    }
                  }
                }}
                onApplyContextUpdate={async (updates) => {
                  const hadChanges = Object.keys(updates).length > 0;
                  const newContext = { ...context, ...updates };
                  setContext(newContext);
                  if (hadChanges) {
                    const changes = Object.entries(updates).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join(', ');
                    notify?.(`Context updated - ${changes}`, 'success');
                    try {
                      await triggerSystemEvent(`*Story context updated*: ${changes}`, newContext);
                    } catch (e) {
                      console.error('Failed to trigger context update event:', e);
                    }
                  }
                }}
                onApplySceneUpdate={async (summary, events) => {
                  const newEvents = [...(context.events || []), ...events];
                  const newContext = { ...context, summary, events: newEvents };
                  setContext(newContext);
                  notify?.(`Scene updated - ${events?.length || 0} new events tracked`, 'success');
                  try {
                    await triggerSystemEvent(`*Scene state synchronized*: ${summary}${events?.length ? `. Recent events: ${events.join(', ')}` : ''}`, newContext);
                  } catch (e) {
                    console.error('Failed to trigger scene update event:', e);
                  }
                }}
              />
            )}
          </div>
        </aside>
        ) : (
          <div className="flex-shrink-0 border-l border-white/10 bg-[#0d0d0d]">
            <button
              onClick={() => setIsRightSidebarCollapsed(false)}
              className="m-2 rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
              title="Expand sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .markdown-body p {
          margin-bottom: 0.75rem;
        }
        .markdown-body p:last-child {
          margin-bottom: 0;
        }
        /* Spoken Word Styling */
        .markdown-body {
          color: rgba(255, 255, 255, 0.95);
          font-weight: 400;
        }
        /* Narrative/Behavior Styling (Italics) */
        .markdown-body em {
          color: rgba(255, 255, 255, 0.5);
          font-style: italic;
          font-weight: 300;
        }
        /* Character Names in Markdown */
        .markdown-body strong {
          color: #10b981;
          font-weight: 700;
          letter-spacing: 0.025em;
        }
      `}</style>
      <CharacterWizard 
        isOpen={isWizardOpen} 
        onClose={() => {
          setIsWizardOpen(false);
          setEditingCharacter(null);
        }} 
        sceneTheme={context.theme || 'Fantasy'}
        onSave={async (savedChar) => {
          if (editingCharacter) {
            const previousCharacter = context.characters.find(c => c.id === savedChar.id);
            const updatedCharacters = context.characters.map(c => c.id === savedChar.id ? savedChar : c);
            setContext(prev => ({ ...prev, characters: updatedCharacters }));
            if (messages.length > 0 && !(savedChar.isPresent && !previousCharacter?.isPresent)) {
              await triggerSystemEvent(`${savedChar.name} has been updated.`, { ...context, characters: updatedCharacters });
            }
          } else {
            const updatedCharacters = [...context.characters, savedChar];
            setContext(prev => ({
              ...prev,
              characters: updatedCharacters,
            }));
          }
        }}
        aiConfig={aiConfig}
        initialCharacter={editingCharacter}
      />

      <AnimatePresence>
        {isChangingScene && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-black/60">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-[#121212] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-8 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                  <Zap className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">Transition to Next Scene</h2>
                  <p className="text-sm text-zinc-500">Advance the story, change locations, or jump forward in time.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">New Location (Optional)</label>
                  <input
                    type="text"
                    value={newSceneLocation}
                    onChange={(e) => setNewSceneLocation(e.target.value)}
                    placeholder="e.g. Downtown rooftop, 2:00 AM"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGenerateLocationSuggestions}
                    disabled={isGeneratingLocationSuggestions || isLoading}
                    className="w-full rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-violet-300 transition-all hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGeneratingLocationSuggestions ? 'Analyzing Setup...' : 'Suggest Locations (Agent)'}
                  </button>

                  {locationSuggestions.length > 0 && (
                    <div className="max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-2">
                      {locationSuggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.location}-${index}`}
                          type="button"
                          onClick={() => {
                            setNewSceneLocation(suggestion.location);
                            if (!newSceneDescription.trim() && suggestion.transitionHook) {
                              setNewSceneDescription(suggestion.transitionHook);
                            }
                          }}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition-all hover:border-violet-500/30 hover:bg-violet-500/10"
                        >
                          <p className="text-xs font-bold text-zinc-100">{suggestion.location}</p>
                          <p className="mt-1 text-[11px] text-zinc-400">{suggestion.rationale}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-violet-300">Best for: {suggestion.fitsMode}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Scene Change Details</label>
                <textarea
                  value={newSceneDescription}
                  onChange={(e) => setNewSceneDescription(e.target.value)}
                  placeholder="e.g. Several hours later at the docks... Early the next morning in the castle... A sudden transition to the hidden lab..."
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 transition-all resize-none placeholder:text-zinc-600"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsChangingScene(false);
                    setNewSceneDescription('');
                    setNewSceneLocation('');
                    setLocationSuggestions([]);
                  }}
                  className="flex-1 py-3 text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartNewScene}
                  disabled={!newSceneDescription.trim() || isLoading}
                  className="flex-[2] py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-2xl font-bold uppercase tracking-wider transition-all shadow-lg active:scale-[0.98]"
                >
                  {isLoading ? 'Triggering...' : 'Transition Scene'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
