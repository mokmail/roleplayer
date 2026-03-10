import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  NodeTypes,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Character, CharacterRelationship, RelationshipKind, RelationshipVisibility, SceneContext, THEME_RELATIONSHIP_KINDS, NarrativeTheme, PREDEFINED_RELATIONSHIP_TYPES } from '../types';
import { 
  BotMessageSquare, Expand, GitBranchPlus, Network, Pencil, Plus, Trash2, X,
  Settings2, Users, Search, Filter, Download, Upload, BarChart3, Eye, EyeOff,
  Layers, Zap, Clock, TrendingUp, AlertTriangle, CheckCircle, ArrowUpDown
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SocialGraphProps {
  context: SceneContext;
  setContext: React.Dispatch<React.SetStateAction<SceneContext>>;
}

const VISIBILITY_OPTIONS: Array<{ value: RelationshipVisibility; label: string }> = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'secret', label: 'Secret' },
];

interface DraftRelationship {
  id?: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  kind: RelationshipKind;
  reciprocal: boolean;
  reverseKind: RelationshipKind;
  intensity: number;
  visibility: RelationshipVisibility;
  notes: string;
}

const RELATIONSHIP_CATEGORIES = [
  { id: 'all', label: 'All', icon: '🌐' },
  { id: 'family', label: 'Family', icon: '🏠', color: 'blue' },
  { id: 'romance', label: 'Romance', icon: '💕', color: 'rose' },
  { id: 'friendship', label: 'Friendship', icon: '🤝', color: 'lime' },
  { id: 'rivalry', label: 'Rivalry', icon: '⚔️', color: 'red' },
  { id: 'professional', label: 'Professional', icon: '💼', color: 'violet' },
  { id: 'mentorship', label: 'Mentorship', icon: '🎓', color: 'emerald' },
  { id: 'supernatural', label: 'Supernatural', icon: '🔮', color: 'amber' },
  { id: 'criminal', label: 'Criminal', icon: '🗡️', color: 'orange' },
] as const;

type RelationshipCategoryId = typeof RELATIONSHIP_CATEGORIES[number]['id'];

type LayoutAlgorithm = 'force' | 'circular' | 'hierarchical' | 'grid' | 'cluster';
type ViewMode = 'all' | 'active' | 'public' | 'private' | 'secret';

interface GraphAnalytics {
  totalRelationships: number;
  publicRelationships: number;
  privateRelationships: number;
  secretRelationships: number;
  reciprocalRelationships: number;
  averageIntensity: number;
  mostConnectedCharacter: string;
  relationshipDistribution: Record<string, number>;
  characterConnectionCounts: Record<string, number>;
}

const CATEGORY_RELATIONSHIPS: Record<Exclude<RelationshipCategoryId, 'all'>, string[]> = {
  family: [
    'Parent', 'Child', 'Mother', 'Father', 'Son', 'Daughter', 'Sibling', 'Brother', 'Sister',
    'Twin', 'Cousin', 'Aunt', 'Uncle', 'Niece', 'Nephew', 'Grandparent', 'Grandchild',
    'Ancestor', 'Descendant', 'Step-Parent', 'Step-Child', 'Foster Parent', 'Foster Child',
    'Godparent', 'Godchild', 'Spouse', 'Husband', 'Wife', 'In-Laws', 'Family Friend',
  ],
  romance: [
    'Lover', 'Beloved', 'Romantic Interest', 'Crush', 'Secret Crush', 'Ex-Lover', 'Ex-Partner',
    'Soulmate', 'Forbidden Love', 'Arranged Spouse', 'Suitor', 'Admirer', 'Muse', 'Fiancé',
    'Fiancée', 'First Love', 'Love Triangle', 'Secret Affair', 'One-Sided Love', 'Stalker',
  ],
  friendship: [
    'Ally', 'Friend', 'Best Friend', 'Close Friend', 'Childhood Friend', 'Companion',
    'Confidant', 'Trusted Ally', 'Partner', 'Teammate', 'Associate', 'Acquaintance',
    'Neighbor', 'Classmate', 'Coworker', 'Roommate', 'Travel Companion', 'Pen Pal',
    'Online Friend', 'Frenemy', 'Sworn Brother', 'Sworn Sister', 'Blood Oath', 'Life Debt',
  ],
  rivalry: [
    'Rival', 'Competitor', 'Enemy', 'Nemesis', 'Adversary', 'Opponent', 'Betrayer',
    'Backstabber', 'Turncoat', 'Sworn Enemy', 'Protezé Rival', 'Caretaker Rival',
    'Arch-Nemesis', 'Killer', 'Persecutor', 'Tormentor', 'Bully', 'Ex-Friend', 'Traitor',
  ],
  professional: [
    'Boss', 'Employee', 'Commander', 'Officer', 'Subordinate', 'Leader', 'Follower',
    'Handler', 'Agent', 'Client', 'Contractor', 'Patron', 'Servant', 'Lord', 'Vassal',
    'King', 'Queen', 'Heir', 'Subject', 'Royal Advisor', 'Courtier', 'Political Ally',
    'Political Rival', 'Diplomat', 'Colleague', 'Mentor', 'Student', 'Teacher', 'Apprentice',
    'Master', 'Protégé', 'Guide', 'Advisor', 'Counselor', 'Partner-in-Crime',
  ],
  mentorship: [
    'Mentor', 'Student', 'Teacher', 'Apprentice', 'Master', 'Protégé', 'Guide', 'Advisor',
    'Counselor', 'Tutor', 'Sensei', 'Padawan', 'Disciple', 'Protective', 'Guardian',
    'Bodyguard', 'Caretaker', 'Rescuer', 'Benefactor', 'Sponsor', 'Trainer', 'Coach',
    'Father Figure', 'Mother Figure', 'Role Model', 'Inspiration', 'Pupil',
  ],
  supernatural: [
    'Vampire Sire', 'Werewolf Pack', 'Witch Coven', 'Demon Pact', 'Cultist', 'Spirit Guide',
    'Guardian Spirit', 'Familiar', 'Oracle', 'Prophet', 'Chosen One', 'Summoner', 'Coven Member',
    'Ghost', 'Possessed', 'The Monster', 'Hunter', 'Hunted', 'Creature', 'Dark Entity',
    'Soul Guide', 'Ritual Bond', 'Mysterious Stranger', 'Secret Keeper', 'Watcher',
  ],
  criminal: [
    'Smuggler', 'Fixer', 'Fence', 'Informant', 'Witness', 'Suspect', 'Detective', 'Sheriff', 'Investigator',
    'Outlaw', 'Bounty Hunter', 'Mercenary', 'Body Double', 'Double Agent', 'Mole',
    'Conspirator', 'Hitman', 'Mark', 'Kidnapper', 'Captive', 'Hostage', 'Jailer', 'Prisoner',
    'Debtor', 'Creditor', 'Blackmailer', 'Manipulator', 'Corrupt', 'Crook', 'Thief',
  ],
};

// Enhanced relationship templates
const RELATIONSHIP_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  kind: RelationshipKind;
  reciprocal: boolean;
  reverseKind?: RelationshipKind;
  intensity: number;
  visibility: RelationshipVisibility;
  category: RelationshipCategoryId;
}> = [
  {
    id: 'family-parent-child',
    name: 'Parent-Child',
    description: 'A protective, nurturing family relationship',
    kind: 'Parent',
    reciprocal: true,
    reverseKind: 'Child',
    intensity: 4,
    visibility: 'public',
    category: 'family'
  },
  {
    id: 'romantic-soulmates',
    name: 'Soulmates',
    description: 'Deep, destined romantic connection',
    kind: 'Soulmate',
    reciprocal: true,
    reverseKind: 'Soulmate',
    intensity: 5,
    visibility: 'public',
    category: 'romance'
  },
  {
    id: 'rivalry-nemesis',
    name: 'Arch-Nemesis',
    description: 'Ultimate opponent with deep hatred',
    kind: 'Arch-Nemesis',
    reciprocal: true,
    reverseKind: 'Arch-Nemesis',
    intensity: 5,
    visibility: 'public',
    category: 'rivalry'
  },
  {
    id: 'mentorship-master',
    name: 'Master-Apprentice',
    description: 'Teaching and learning relationship',
    kind: 'Master',
    reciprocal: true,
    reverseKind: 'Apprentice',
    intensity: 3,
    visibility: 'public',
    category: 'mentorship'
  },
  {
    id: 'secret-affair',
    name: 'Secret Affair',
    description: 'Hidden romantic relationship',
    kind: 'Secret Lover',
    reciprocal: true,
    reverseKind: 'Secret Lover',
    intensity: 4,
    visibility: 'secret',
    category: 'romance'
  },
  {
    id: 'alliance-brothers',
    name: 'Sworn Brothers',
    description: 'Unbreakable bond of loyalty',
    kind: 'Sworn Brother',
    reciprocal: true,
    reverseKind: 'Sworn Brother',
    intensity: 5,
    visibility: 'public',
    category: 'friendship'
  }
];

const createDraft = (characters: Character[]): DraftRelationship => ({
  sourceCharacterId: characters[0]?.id || '',
  targetCharacterId: characters[1]?.id || characters[0]?.id || '',
  kind: 'ally',
  reciprocal: false,
  reverseKind: 'ally',
  intensity: 3,
  visibility: 'public',
  notes: '',
});

function getCharacterName(characters: Character[], id: string) {
  return characters.find((character) => character.id === id)?.name || 'Unknown';
}

function calculateGraphAnalytics(relationships: CharacterRelationship[], characters: Character[]): GraphAnalytics {
  const connectionCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  let totalIntensity = 0;
  let publicCount = 0;
  let privateCount = 0;
  let secretCount = 0;
  let reciprocalCount = 0;

  // Initialize connection counts
  characters.forEach(char => {
    connectionCounts[char.id] = 0;
  });

  relationships.forEach(rel => {
    // Count connections
    connectionCounts[rel.sourceCharacterId] = (connectionCounts[rel.sourceCharacterId] || 0) + 1;
    connectionCounts[rel.targetCharacterId] = (connectionCounts[rel.targetCharacterId] || 0) + 1;

    // Count visibility
    if (rel.visibility === 'public') publicCount++;
    else if (rel.visibility === 'private') privateCount++;
    else if (rel.visibility === 'secret') secretCount++;

    // Count reciprocal
    if (rel.reciprocal) reciprocalCount++;

    // Sum intensity
    totalIntensity += rel.intensity;

    // Categorize relationship
    const normalizedKind = normalizeRelationshipKind(rel.kind);
    let category = 'other';
    if (CATEGORY_RELATIONSHIPS.family.some(r => normalizeRelationshipKind(r) === normalizedKind)) category = 'family';
    else if (CATEGORY_RELATIONSHIPS.romance.some(r => normalizeRelationshipKind(r) === normalizedKind)) category = 'romance';
    else if (CATEGORY_RELATIONSHIPS.friendship.some(r => normalizeRelationshipKind(r) === normalizedKind)) category = 'friendship';
    else if (CATEGORY_RELATIONSHIPS.rivalry.some(r => normalizeRelationshipKind(r) === normalizedKind)) category = 'rivalry';
    else if (CATEGORY_RELATIONSHIPS.professional.some(r => normalizeRelationshipKind(r) === normalizedKind)) category = 'professional';
    else if (CATEGORY_RELATIONSHIPS.mentorship.some(r => normalizeRelationshipKind(r) === normalizedKind)) category = 'mentorship';
    else if (CATEGORY_RELATIONSHIPS.supernatural.some(r => normalizeRelationshipKind(r) === normalizedKind)) category = 'supernatural';
    else if (CATEGORY_RELATIONSHIPS.criminal.some(r => normalizeRelationshipKind(r) === normalizedKind)) category = 'criminal';
    
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  const mostConnectedId = Object.entries(connectionCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])[0];
  const mostConnectedCharacter = characters.find(c => c.id === mostConnectedId)?.name || 'Unknown';

  return {
    totalRelationships: relationships.length,
    publicRelationships: publicCount,
    privateRelationships: privateCount,
    secretRelationships: secretCount,
    reciprocalRelationships: reciprocalCount,
    averageIntensity: relationships.length > 0 ? totalIntensity / relationships.length : 0,
    mostConnectedCharacter,
    relationshipDistribution: categoryCounts,
    characterConnectionCounts: connectionCounts,
  };
}

function calculateLayoutPositions(characters: Character[], relationships: CharacterRelationship[], algorithm: LayoutAlgorithm): Array<{id: string, x: number, y: number}> {
  const positions: Array<{id: string, x: number, y: number}> = [];
  const centerX = 400;
  const centerY = 300;

  switch (algorithm) {
    case 'circular': {
      const radius = 250;
      const total = Math.max(characters.length, 1);
      characters.forEach((character, index) => {
        const angle = (-Math.PI / 2) + ((Math.PI * 2) * index) / total;
        positions.push({
          id: character.id,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      });
      break;
    }
    
    case 'hierarchical': {
      const levels = Math.ceil(Math.sqrt(characters.length));
      const levelHeight = 150;
      const nodeSpacing = 200;
      
      characters.forEach((character, index) => {
        const level = Math.floor(index / levels);
        const posInLevel = index % levels;
        positions.push({
          id: character.id,
          x: centerX - (levels * nodeSpacing) / 2 + posInLevel * nodeSpacing,
          y: 100 + level * levelHeight,
        });
      });
      break;
    }
    
    case 'grid': {
      const cols = Math.ceil(Math.sqrt(characters.length));
      const spacing = 180;
      
      characters.forEach((character, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        positions.push({
          id: character.id,
          x: centerX - (cols * spacing) / 2 + col * spacing,
          y: centerY - (cols * spacing) / 2 + row * spacing,
        });
      });
      break;
    }
    
    case 'cluster': {
      // Group by relationship clusters
      const clusters: Record<string, string[]> = {};
      const processed = new Set<string>();
      
      characters.forEach(char => {
        if (!processed.has(char.id)) {
          const cluster = [char.id];
          processed.add(char.id);
          
          // Find connected characters
          relationships.forEach(rel => {
            if (rel.sourceCharacterId === char.id && !processed.has(rel.targetCharacterId)) {
              cluster.push(rel.targetCharacterId);
              processed.add(rel.targetCharacterId);
            } else if (rel.targetCharacterId === char.id && !processed.has(rel.sourceCharacterId)) {
              cluster.push(rel.sourceCharacterId);
              processed.add(rel.sourceCharacterId);
            }
          });
          
          clusters[char.id] = cluster;
        }
      });
      
      const clusterIds = Object.keys(clusters);
      const angleStep = (Math.PI * 2) / clusterIds.length;
      
      clusterIds.forEach((clusterId, clusterIndex) => {
        const cluster = clusters[clusterId];
        const clusterAngle = clusterIndex * angleStep;
        const clusterRadius = 200;
        const clusterCenterX = centerX + Math.cos(clusterAngle) * clusterRadius;
        const clusterCenterY = centerY + Math.sin(clusterAngle) * clusterRadius;
        
        cluster.forEach((charId, charIndex) => {
          const charAngle = (Math.PI * 2 * charIndex) / cluster.length;
          const charRadius = 50;
          positions.push({
            id: charId,
            x: clusterCenterX + Math.cos(charAngle) * charRadius,
            y: clusterCenterY + Math.sin(charAngle) * charRadius,
          });
        });
      });
      break;
    }
    
    case 'force':
    default: {
      // Simple force-directed layout
      const nodePositions: Record<string, {x: number, y: number, vx: number, vy: number}> = {};
      
      // Initialize positions randomly
      characters.forEach(character => {
        nodePositions[character.id] = {
          x: centerX + (Math.random() - 0.5) * 400,
          y: centerY + (Math.random() - 0.5) * 400,
          vx: 0,
          vy: 0,
        };
      });
      
      // Apply forces for several iterations
      for (let iter = 0; iter < 50; iter++) {
        // Repulsion between all nodes
        characters.forEach(char1 => {
          characters.forEach(char2 => {
            if (char1.id !== char2.id) {
              const dx = nodePositions[char2.id].x - nodePositions[char1.id].x;
              const dy = nodePositions[char2.id].y - nodePositions[char1.id].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0 && dist < 200) {
                const force = 1000 / (dist * dist);
                nodePositions[char1.id].vx -= (dx / dist) * force;
                nodePositions[char1.id].vy -= (dy / dist) * force;
              }
            }
          });
        });
        
        // Attraction along edges
        relationships.forEach(rel => {
          const dx = nodePositions[rel.targetCharacterId].x - nodePositions[rel.sourceCharacterId].x;
          const dy = nodePositions[rel.targetCharacterId].y - nodePositions[rel.sourceCharacterId].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const force = dist * 0.01;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nodePositions[rel.sourceCharacterId].vx += fx;
            nodePositions[rel.sourceCharacterId].vy += fy;
            nodePositions[rel.targetCharacterId].vx -= fx;
            nodePositions[rel.targetCharacterId].vy -= fy;
          }
        });
        
        // Update positions
        characters.forEach(character => {
          const pos = nodePositions[character.id];
          pos.x += pos.vx * 0.1;
          pos.y += pos.vy * 0.1;
          pos.vx *= 0.9;
          pos.vy *= 0.9;
          
          // Keep within bounds
          pos.x = Math.max(50, Math.min(750, pos.x));
          pos.y = Math.max(50, Math.min(550, pos.y));
        });
      }
      
      characters.forEach(character => {
        positions.push({
          id: character.id,
          x: nodePositions[character.id].x,
          y: nodePositions[character.id].y,
        });
      });
      break;
    }
  }
  
  return positions;
}

function normalizeRelationshipKind(kind: string) {
  return kind.trim().toLowerCase();
}

function getResolvedReverseKind(relationship: Pick<CharacterRelationship, 'kind' | 'reciprocal' | 'reverseKind'> | Pick<DraftRelationship, 'kind' | 'reciprocal' | 'reverseKind'>) {
  if (!relationship.reciprocal) {
    return '';
  }

  return relationship.reverseKind?.trim() || relationship.kind.trim();
}

function hasDistinctReverseKind(relationship: Pick<CharacterRelationship, 'kind' | 'reciprocal' | 'reverseKind'> | Pick<DraftRelationship, 'kind' | 'reciprocal' | 'reverseKind'>) {
  const forwardKind = relationship.kind.trim();
  const reverseKind = getResolvedReverseKind(relationship);
  return Boolean(reverseKind) && reverseKind !== forwardKind;
}

function getRelationshipEdgeLabel(relationship: Pick<CharacterRelationship, 'kind' | 'reciprocal' | 'reverseKind'>) {
  const forwardKind = relationship.kind.trim();
  const reverseKind = getResolvedReverseKind(relationship);

  if (!relationship.reciprocal || !reverseKind || reverseKind === forwardKind) {
    return forwardKind;
  }

  return `${forwardKind} ↔ ${reverseKind}`;
}

function getRelationColor(kind: RelationshipKind) {
  const normalizedKind = normalizeRelationshipKind(kind);

  // ROMANTIC / INTIMATE
  if (['romance', 'lover', 'love', 'partner', 'spouse', 'husband', 'wife', 'girlfriend', 'boyfriend', 'crush', 'affair', 'engaged', 'married', 'fiancé', 'fiancée'].some((token) => normalizedKind.includes(token))) {
    return { stroke: '#f43f5e', bg: 'from-pink-500/30 to-rose-500/10 border-pink-500/30 text-pink-200' };
  }

  // FAMILY / BLOOD
  if (['family', 'parent', 'child', 'son', 'daughter', 'father', 'mother', 'sibling', 'brother', 'sister', 'cousin', 'aunt', 'uncle', 'grandparent', 'ancestor', 'descendant'].some((token) => normalizedKind.includes(token))) {
    return { stroke: '#3b82f6', bg: 'from-blue-500/30 to-cyan-500/10 border-blue-500/30 text-blue-200' };
  }

  // HOSTILE / ANTAGONISTIC
  if (['rival', 'enemy', 'betrayal', 'traitor', 'nemesis', 'hostile', 'opponent', 'villain', 'adversary', 'hates', 'grudge'].some((token) => normalizedKind.includes(token))) {
    return { stroke: '#ef4444', bg: 'from-red-500/30 to-orange-500/10 border-red-500/30 text-red-200' };
  }

  // MENTORSHIP / GUIDANCE
  if (['mentor', 'protective', 'guardian', 'teacher', 'student', 'protege', 'protégé', 'master', 'apprentice', 'disciple', 'tutor', 'sensei', 'padawan'].some((token) => normalizedKind.includes(token))) {
    return { stroke: '#10b981', bg: 'from-emerald-500/30 to-teal-500/10 border-emerald-500/30 text-emerald-200' };
  }

  // PROFESSIONAL / AUTHORITY
  if (['authority', 'boss', 'leader', 'commander', 'servant', 'superior', 'subordinate', 'employee', 'employer', 'manager', 'colleague', 'coworker', 'partner-in-crime', 'client', 'contractor'].some((token) => normalizedKind.includes(token))) {
    return { stroke: '#8b5cf6', bg: 'from-violet-500/30 to-fuchsia-500/10 border-violet-500/30 text-violet-200' };
  }

  // MYSTERIOUS / SUPERNATURAL / TENSION
  if (['mysterious', 'secret', 'stalker', 'obsessed', 'watcher', 'blackmail', 'manipulator', 'suspicious', 'unknown'].some((token) => normalizedKind.includes(token))) {
    return { stroke: '#f59e0b', bg: 'from-amber-500/30 to-yellow-500/10 border-amber-500/30 text-amber-200' };
  }

  // FRIENDSHIP / ALLIANCE
  if (['friend', 'ally', 'companion', 'bestie', 'buddy', 'pal', 'confidant', 'associate', 'teammate'].some((token) => normalizedKind.includes(token))) {
    return { stroke: '#84cc16', bg: 'from-lime-500/30 to-green-500/10 border-lime-500/30 text-lime-200' };
  }

  return { stroke: '#71717a', bg: 'from-zinc-500/30 to-zinc-500/10 border-white/10 text-zinc-200' };
}

interface CharacterNodeData {
  label: string;
  subtitle: string;
  isPresent: boolean;
  characterId: string;
  isConnected?: boolean;
  isDimmed?: boolean;
  [key: string]: unknown;
}

type CharacterNode = Node<CharacterNodeData>;

const CharacterNodeComponent = ({ data, selected }: { data: CharacterNodeData; selected: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isSourceHovered, setIsSourceHovered] = useState(false);
  const [isTargetHovered, setIsTargetHovered] = useState(false);
  
  return (
    <div
      className={cn(
        'rounded-xl border-2 px-4 py-3 shadow-xl backdrop-blur-sm min-w-[120px] transition-all relative',
        data.isPresent
          ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/40'
          : 'bg-gradient-to-br from-zinc-800/90 to-zinc-900/80 border-white/15',
        selected && 'ring-2 ring-emerald-400/60 border-emerald-400 scale-[1.02]',
        !selected && data.isConnected && 'ring-2 ring-sky-400/35 border-sky-400/45 shadow-[0_0_22px_rgba(56,189,248,0.18)]',
        data.isDimmed && 'opacity-35 saturate-50',
        isHovered && 'scale-[1.01] shadow-xl',
        (isSourceHovered || isTargetHovered) && 'ring-2 ring-emerald-400/40'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ pointerEvents: 'auto' }} // Ensure proper event handling
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className={cn(
          "!bg-zinc-300 !w-3 !h-3 !border-2 !border-[#1a1a1a] !-left-1.5 cursor-crosshair transition-all z-10",
          "hover:!bg-emerald-400 hover:!scale-125 hover:shadow-[0_0_12px_rgba(52,211,153,0.6)]",
          isTargetHovered && "!bg-emerald-500 !scale-150 !shadow-[0_0_16px_rgba(52,211,153,0.8)]"
        )}
        isConnectable={true}
        onMouseEnter={() => setIsTargetHovered(true)}
        onMouseLeave={() => setIsTargetHovered(false)}
      />
      <div className="text-xs font-bold text-center truncate pointer-events-none">{data.label}</div>
      <div className="text-[9px] text-zinc-400 text-center truncate mt-0.5 pointer-events-none">{data.subtitle}</div>
      {data.isPresent && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#1a1a1a] pointer-events-none" />
      )}
      <Handle 
        type="source" 
        position={Position.Right} 
        className={cn(
          "!bg-zinc-300 !w-3 !h-3 !border-2 !border-[#1a1a1a] !-right-1.5 cursor-crosshair transition-all z-10",
          "hover:!bg-emerald-400 hover:!scale-125 hover:shadow-[0_0_12px_rgba(52,211,153,0.6)]",
          isSourceHovered && "!bg-emerald-500 !scale-150 !shadow-[0_0_16px_rgba(52,211,153,0.8)]"
        )}
        isConnectable={true}
        onMouseEnter={() => setIsSourceHovered(true)}
        onMouseLeave={() => setIsSourceHovered(false)}
      />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  character: CharacterNodeComponent,
};

const GraphCanvas = ({ 
  characters, 
  relationships, 
  draft, 
  setDraft, 
  editingId, 
  setEditingId,
  selectedNodeId,
  setSelectedNodeId,
  selectedRelationshipId,
  setSelectedRelationshipId,
  onEditRelationship,
  onRemoveRelationship,
  setContext,
  theme,
}: {
  characters: Character[];
  relationships: CharacterRelationship[];
  draft: DraftRelationship;
  setDraft: React.Dispatch<React.SetStateAction<DraftRelationship>>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedRelationshipId: string | null;
  setSelectedRelationshipId: (id: string | null) => void;
  onEditRelationship: (rel: CharacterRelationship) => void;
  onRemoveRelationship: (id: string) => void;
  setContext: React.Dispatch<React.SetStateAction<SceneContext>>;
  theme?: string;
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();
  const [selectedCategory, setSelectedCategory] = useState<RelationshipCategoryId>('all');
  const [categorySearch, setCategorySearch] = useState('');
  const [reverseCategory, setReverseCategory] = useState<RelationshipCategoryId>('all');
  const [reverseCategorySearch, setReverseCategorySearch] = useState('');
  const [layoutAlgorithm, setLayoutAlgorithm] = useState<LayoutAlgorithm>('force');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showMinimap, setShowMinimap] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<{nodeId: string, type: 'source' | 'target'} | null>(null);

  const selectedRelationship = useMemo(
    () => relationships.find((relationship) => relationship.id === selectedRelationshipId) || null,
    [relationships, selectedRelationshipId],
  );

  const highlightedNodeIds = useMemo(() => {
    if (selectedRelationship) {
      return new Set([selectedRelationship.sourceCharacterId, selectedRelationship.targetCharacterId]);
    }

    if (selectedNodeId) {
      return new Set(
        relationships
          .filter((relationship) => relationship.sourceCharacterId === selectedNodeId || relationship.targetCharacterId === selectedNodeId)
          .flatMap((relationship) => [relationship.sourceCharacterId, relationship.targetCharacterId]),
      );
    }

    return new Set<string>();
  }, [relationships, selectedNodeId, selectedRelationship]);

  const analytics = useMemo(() => calculateGraphAnalytics(relationships, characters), [relationships, characters]);

  const hasSelection = Boolean(selectedNodeId || selectedRelationshipId);

  const filteredRelationships = useMemo(() => {
    let filtered = relationships;
    
    // Apply view mode filter
    if (viewMode === 'public') {
      filtered = filtered.filter(rel => rel.visibility === 'public');
    } else if (viewMode === 'private') {
      filtered = filtered.filter(rel => rel.visibility === 'private');
    } else if (viewMode === 'secret') {
      filtered = filtered.filter(rel => rel.visibility === 'secret');
    } else if (viewMode === 'active') {
      const activeCharacterIds = characters.filter(c => c.isPresent).map(c => c.id);
      filtered = filtered.filter(rel => 
        activeCharacterIds.includes(rel.sourceCharacterId) || activeCharacterIds.includes(rel.targetCharacterId)
      );
    }
    
    // Apply global search
    if (globalSearch.trim()) {
      const searchLower = globalSearch.toLowerCase();
      filtered = filtered.filter(rel => {
        const sourceName = getCharacterName(characters, rel.sourceCharacterId).toLowerCase();
        const targetName = getCharacterName(characters, rel.targetCharacterId).toLowerCase();
        const kind = rel.kind.toLowerCase();
        const notes = rel.notes.toLowerCase();
        
        return sourceName.includes(searchLower) || 
               targetName.includes(searchLower) || 
               kind.includes(searchLower) || 
               notes.includes(searchLower);
      });
    }
    
    return filtered;
  }, [relationships, viewMode, globalSearch, characters]);

  const relationshipKinds = useMemo(() => {
    const themeKey = theme as NarrativeTheme;
    const themeSuggestions = theme ? (THEME_RELATIONSHIP_KINDS[themeKey] || []) : [];
    const mergedLabels = new Set<string>([
      ...PREDEFINED_RELATIONSHIP_TYPES,
      ...themeSuggestions.map((entry) => entry.label),
    ]);

    return Array.from(mergedLabels)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((label) => ({ value: label as RelationshipKind, label }));
  }, [theme]);

  const filteredRelationshipKinds = useMemo(() => {
    let rels: string[] = [];
    
    if (selectedCategory === 'all') {
      rels = [
        ...CATEGORY_RELATIONSHIPS.family,
        ...CATEGORY_RELATIONSHIPS.romance,
        ...CATEGORY_RELATIONSHIPS.friendship,
        ...CATEGORY_RELATIONSHIPS.rivalry,
        ...CATEGORY_RELATIONSHIPS.professional,
        ...CATEGORY_RELATIONSHIPS.mentorship,
        ...CATEGORY_RELATIONSHIPS.supernatural,
        ...CATEGORY_RELATIONSHIPS.criminal,
      ];
    } else {
      rels = CATEGORY_RELATIONSHIPS[selectedCategory];
    }

    if (categorySearch.trim()) {
      const searchLower = categorySearch.toLowerCase();
      rels = rels.filter(r => r.toLowerCase().includes(searchLower));
    }

    return rels;
  }, [selectedCategory, categorySearch]);

  const filteredReverseRelationships = useMemo(() => {
    let rels: string[] = [];
    
    if (reverseCategory === 'all') {
      rels = [
        ...CATEGORY_RELATIONSHIPS.family,
        ...CATEGORY_RELATIONSHIPS.romance,
        ...CATEGORY_RELATIONSHIPS.friendship,
        ...CATEGORY_RELATIONSHIPS.rivalry,
        ...CATEGORY_RELATIONSHIPS.professional,
        ...CATEGORY_RELATIONSHIPS.mentorship,
        ...CATEGORY_RELATIONSHIPS.supernatural,
        ...CATEGORY_RELATIONSHIPS.criminal,
      ];
    } else {
      rels = CATEGORY_RELATIONSHIPS[reverseCategory];
    }

    if (reverseCategorySearch.trim()) {
      const searchLower = reverseCategorySearch.toLowerCase();
      rels = rels.filter(r => r.toLowerCase().includes(searchLower));
    }

    return rels;
  }, [reverseCategory, reverseCategorySearch]);
  
  const initialNodes: CharacterNode[] = useMemo(() => {
    const layoutPositions = calculateLayoutPositions(characters, relationships, layoutAlgorithm);
    
    return characters.map((character) => {
      const position = layoutPositions.find(p => p.id === character.id) || { x: 400, y: 300 };
      return {
        id: character.id,
        type: 'character',
        selected: character.id === selectedNodeId,
        position: { x: position.x, y: position.y },
        data: {
          label: character.name,
          subtitle: character.profession || character.vibe || character.race || 'Character',
          isPresent: character.isPresent ?? true,
          characterId: character.id,
          isConnected: highlightedNodeIds.has(character.id),
          isDimmed: hasSelection && character.id !== selectedNodeId && !highlightedNodeIds.has(character.id),
        },
      };
    });
  }, [characters, relationships, layoutAlgorithm, hasSelection, highlightedNodeIds, selectedNodeId]);

  const initialEdges: Edge[] = useMemo(() => {
    return filteredRelationships.map((rel) => {
      const color = getRelationColor(rel.kind);
      const isSelected = rel.id === selectedRelationshipId;
      const isLinkedToSelectedNode = selectedNodeId
        ? rel.sourceCharacterId === selectedNodeId || rel.targetCharacterId === selectedNodeId
        : false;
      const shouldDim = hasSelection && !isSelected && !isLinkedToSelectedNode;

      return {
        id: rel.id,
        source: rel.sourceCharacterId,
        target: rel.targetCharacterId,
        label: getRelationshipEdgeLabel(rel),
        type: 'smoothstep',
        animated: rel.visibility === 'public',
        style: { 
          stroke: color.stroke, 
          strokeWidth: 1.5 + rel.intensity * 0.5 + (isSelected ? 2 : isLinkedToSelectedNode ? 0.75 : 0),
          opacity: shouldDim ? 0.14 : rel.visibility === 'secret' ? 0.35 : rel.visibility === 'private' ? 0.6 : 1,
          filter: isSelected ? 'drop-shadow(0 0 8px rgba(56,189,248,0.55))' : undefined,
        },
        labelStyle: { fill: isSelected ? '#e0f2fe' : '#a1a1aa', fontSize: isSelected ? 11 : 10 },
        labelBgStyle: { fill: isSelected ? '#082f49' : '#1a1a1a', fillOpacity: isSelected ? 0.98 : 0.9 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: color.stroke,
        },
        markerStart: rel.reciprocal
          ? {
              type: MarkerType.ArrowClosed,
              color: color.stroke,
            }
          : undefined,
      };
    });
  }, [hasSelection, filteredRelationships, selectedNodeId, selectedRelationshipId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    // Enhanced connection validation
    const sourceChar = characters.find(c => c.id === connection.source);
    const targetChar = characters.find(c => c.id === connection.target);
    
    if (!sourceChar || !targetChar) {
      console.warn('Invalid connection: characters not found');
      return;
    }

    // Check for existing relationships
    const existingRelationship = relationships.find(
      (relationship) => (
        relationship.sourceCharacterId === connection.source && relationship.targetCharacterId === connection.target
      ) || (
        relationship.reciprocal && relationship.sourceCharacterId === connection.target && relationship.targetCharacterId === connection.source
      ),
    );

    if (existingRelationship) {
      setSelectedRelationshipId(existingRelationship.id);
      setSelectedNodeId(null);
      onEditRelationship(existingRelationship);
      return;
    }

    // Create new relationship with enhanced defaults
    const nextRelationship: CharacterRelationship = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceCharacterId: connection.source,
      targetCharacterId: connection.target,
      kind: (draft.kind.trim() || 'ally') as RelationshipKind,
      reciprocal: draft.reciprocal,
      reverseKind: draft.reciprocal ? getResolvedReverseKind(draft) as RelationshipKind : undefined,
      intensity: Math.min(5, Math.max(1, draft.intensity)),
      visibility: draft.visibility,
      notes: draft.notes.trim(),
    };

    setContext((prev) => ({
      ...prev,
      relationships: [...(prev.relationships || []), nextRelationship],
    }));

    setSelectedRelationshipId(nextRelationship.id);
    setSelectedNodeId(null);
    setEditingId(null);
    setDraft((prev) => ({
      ...prev,
      sourceCharacterId: connection.source,
      targetCharacterId: connection.target,
    }));
    
    // Reset connection state
    setIsConnecting(false);
    setConnectionSource(null);
  }, [draft, onEditRelationship, relationships, setContext, setDraft, setEditingId, setSelectedNodeId, setSelectedRelationshipId, characters]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedRelationshipId(null);
    setDraft((prev) => ({ ...prev, sourceCharacterId: node.id }));
  }, [setSelectedNodeId, setSelectedRelationshipId, setDraft]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedRelationshipId(edge.id);
    setSelectedNodeId(null);
    const rel = relationships.find((r) => r.id === edge.id);
    if (rel) {
      onEditRelationship(rel);
    }
  }, [relationships, onEditRelationship, setSelectedNodeId, setSelectedRelationshipId]);

  const onConnectStart = useCallback((_: any, params: any) => {
    if (params.nodeId) {
      setIsConnecting(true);
      setConnectionSource(params.nodeId);
      setDraft((prev) => ({ ...prev, sourceCharacterId: params.nodeId }));
      
      // Don't change selection during connection to prevent UI jumps
      // setSelectedNodeId(params.nodeId);
      // setSelectedRelationshipId(null);
    }
  }, [setDraft]);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    const target = event.target as HTMLElement;
    const nodeElement = target.closest('.react-flow__node');
    
    if (!nodeElement) {
      // Connection cancelled - reset state
      setIsConnecting(false);
      setConnectionSource(null);
      setDraft((prev) => ({ ...prev, sourceCharacterId: '', targetCharacterId: '' }));
      return;
    }
    
    // Find the target node id
    const nodeId = nodeElement.getAttribute('data-nodeid');
    if (nodeId && nodeId !== connectionSource) {
      setDraft((prev) => ({ ...prev, targetCharacterId: nodeId }));
    }
    
    // Small delay to allow connection to complete
    setTimeout(() => {
      setIsConnecting(false);
      setConnectionSource(null);
    }, 100);
  }, [connectionSource, setDraft]);

  const onHandleMouseEnter = useCallback((nodeId: string, handleType: 'source' | 'target') => {
    if (isConnecting) {
      setHoveredHandle({ nodeId, type: handleType });
    }
  }, [isConnecting]);

  const onHandleMouseLeave = useCallback(() => {
    setHoveredHandle(null);
  }, []);

  const onPaneClick = useCallback(() => {
    // Only clear selections if not connecting to prevent interference
    if (!isConnecting) {
      setSelectedNodeId(null);
      setSelectedRelationshipId(null);
    }
    
    // Reset connection state if connecting
    if (isConnecting) {
      setIsConnecting(false);
      setConnectionSource(null);
      setDraft((prev) => ({ ...prev, sourceCharacterId: '', targetCharacterId: '' }));
    }
  }, [setSelectedNodeId, setSelectedRelationshipId, isConnecting, setDraft]);

  const persistRelationship = useCallback(() => {
    if (!draft.sourceCharacterId || !draft.targetCharacterId || draft.sourceCharacterId === draft.targetCharacterId) {
      return;
    }

    const nextRelationship: CharacterRelationship = {
      id: editingId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceCharacterId: draft.sourceCharacterId,
      targetCharacterId: draft.targetCharacterId,
      kind: (draft.kind.trim() || 'ally') as RelationshipKind,
      reciprocal: draft.reciprocal,
      reverseKind: draft.reciprocal ? getResolvedReverseKind(draft) as RelationshipKind : undefined,
      intensity: Math.min(5, Math.max(1, draft.intensity)),
      visibility: draft.visibility,
      notes: draft.notes.trim(),
    };

    setContext((prev) => ({
      ...prev,
      relationships: editingId
        ? (prev.relationships || []).map((relationship) => relationship.id === editingId ? nextRelationship : relationship)
        : [...(prev.relationships || []), nextRelationship],
    }));

    setSelectedRelationshipId(nextRelationship.id);
    setSelectedNodeId(null);
    setDraft(createDraft(characters));
    setEditingId(null);
  }, [draft, editingId, characters, setContext, setDraft, setEditingId, setSelectedNodeId, setSelectedRelationshipId]);

  const resetDraft = useCallback(() => {
    setDraft(createDraft(characters));
    setEditingId(null);
  }, [characters, setDraft, setEditingId]);

  const selectedNodeOptions = characters.filter((character) => character.id !== draft.sourceCharacterId);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-80 shrink-0 border-r border-white/10 bg-[#111111] flex flex-col">
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              <GitBranchPlus className="w-4 h-4" />
              {editingId ? 'Edit Link' : 'Create Link'}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={cn(
                  "p-1.5 rounded transition-all",
                  showAnalytics ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-white/10 text-zinc-400"
                )}
                title="Toggle Analytics"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-white/10 pb-3"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Total Links</div>
                    <div className="text-lg font-bold text-emerald-400">{analytics.totalRelationships}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Avg Intensity</div>
                    <div className="text-lg font-bold text-blue-400">{analytics.averageIntensity.toFixed(1)}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Visibility</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-300">Public</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${analytics.totalRelationships > 0 ? (analytics.publicRelationships / analytics.totalRelationships) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[9px] text-emerald-400">{analytics.publicRelationships}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-300">Private</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 transition-all" style={{ width: `${analytics.totalRelationships > 0 ? (analytics.privateRelationships / analytics.totalRelationships) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[9px] text-yellow-400">{analytics.privateRelationships}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-300">Secret</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 transition-all" style={{ width: `${analytics.totalRelationships > 0 ? (analytics.secretRelationships / analytics.totalRelationships) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[9px] text-red-400">{analytics.secretRelationships}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Most Connected</div>
                  <div className="text-xs text-emerald-300 font-medium">{analytics.mostConnectedCharacter}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">From Character</label>
            <select
              value={draft.sourceCharacterId}
              onChange={(event) => {
                const nextSource = event.target.value;
                const nextTarget = nextSource === draft.targetCharacterId ? (characters.find((character) => character.id !== nextSource)?.id || '') : draft.targetCharacterId;
                setDraft((prev) => ({ ...prev, sourceCharacterId: nextSource, targetCharacterId: nextTarget }));
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            >
              {characters.map((character) => (
                <option key={character.id} value={character.id} className="bg-[#0f0f0f] text-zinc-200">
                  {character.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">To Character</label>
            <select
              value={draft.targetCharacterId}
              onChange={(event) => setDraft((prev) => ({ ...prev, targetCharacterId: event.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            >
              {selectedNodeOptions.map((character) => (
                <option key={character.id} value={character.id} className="bg-[#0f0f0f] text-zinc-200">
                  {character.name}
                </option>
              ))}
            </select>
          </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Quick Templates</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                {RELATIONSHIP_TEMPLATES.map((template) => {
                  const categoryInfo = RELATIONSHIP_CATEGORIES.find(cat => cat.id === template.category);
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setDraft((prev) => ({ 
                        ...prev, 
                        kind: template.kind,
                        reciprocal: template.reciprocal,
                        reverseKind: template.reverseKind || template.kind,
                        intensity: template.intensity,
                        visibility: template.visibility,
                        notes: template.description
                      }))}
                      className={cn(
                        'px-2 py-1.5 rounded-lg border border-white/5 bg-white/5 text-[9px] font-medium transition-all truncate hover:border-emerald-500/50 hover:bg-emerald-500/10',
                        'color' in categoryInfo && categoryInfo.color === 'blue' ? 'border-blue-500/30' :
                        'color' in categoryInfo && categoryInfo.color === 'rose' ? 'border-rose-500/30' :
                        'color' in categoryInfo && categoryInfo.color === 'lime' ? 'border-lime-500/30' :
                        'color' in categoryInfo && categoryInfo.color === 'red' ? 'border-red-500/30' :
                        'color' in categoryInfo && categoryInfo.color === 'violet' ? 'border-violet-500/30' :
                        'color' in categoryInfo && categoryInfo.color === 'emerald' ? 'border-emerald-500/30' :
                        'color' in categoryInfo && categoryInfo.color === 'amber' ? 'border-amber-500/30' :
                        'color' in categoryInfo && categoryInfo.color === 'orange' ? 'border-orange-500/30' :
                        'border-white/10'
                      )}
                      title={`${template.name}: ${template.description}`}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="opacity-70 text-[8px]">{template.category}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Quick Select</label>
            
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search relationships..."
                className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-zinc-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {RELATIONSHIP_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-2 py-1 rounded-md text-[9px] font-medium transition-all flex items-center gap-1',
                    selectedCategory === cat.id
                      ? cat.id === 'all' ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' :
                        'color' in cat && cat.color === 'blue' ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40' :
                        'color' in cat && cat.color === 'rose' ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40' :
                        'color' in cat && cat.color === 'lime' ? 'bg-lime-500/30 text-lime-200 border border-lime-400/40' :
                        'color' in cat && cat.color === 'red' ? 'bg-red-500/30 text-red-200 border border-red-400/40' :
                        'color' in cat && cat.color === 'violet' ? 'bg-violet-500/30 text-violet-200 border border-violet-400/40' :
                        'color' in cat && cat.color === 'emerald' ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' :
                        'color' in cat && cat.color === 'amber' ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40' :
                        'color' in cat && cat.color === 'orange' ? 'bg-orange-500/30 text-orange-200 border border-orange-400/40' :
                        'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                      : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-300'
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
              {filteredRelationshipKinds.slice(0, 24).map((rel) => {
                const isSelected = draft.kind.toLowerCase() === rel.toLowerCase();
                const relLower = rel.toLowerCase();
                const colorClass = 
                  CATEGORY_RELATIONSHIPS.family.includes(rel) ? 'hover:border-blue-500/50 hover:bg-blue-500/10' :
                  CATEGORY_RELATIONSHIPS.romance.includes(rel) ? 'hover:border-rose-500/50 hover:bg-rose-500/10' :
                  CATEGORY_RELATIONSHIPS.friendship.includes(rel) ? 'hover:border-lime-500/50 hover:bg-lime-500/10' :
                  CATEGORY_RELATIONSHIPS.rivalry.includes(rel) ? 'hover:border-red-500/50 hover:bg-red-500/10' :
                  CATEGORY_RELATIONSHIPS.professional.includes(rel) ? 'hover:border-violet-500/50 hover:bg-violet-500/10' :
                  CATEGORY_RELATIONSHIPS.mentorship.includes(rel) ? 'hover:border-emerald-500/50 hover:bg-emerald-500/10' :
                  CATEGORY_RELATIONSHIPS.supernatural.includes(rel) ? 'hover:border-amber-500/50 hover:bg-amber-500/10' :
                  CATEGORY_RELATIONSHIPS.criminal.includes(rel) ? 'hover:border-orange-500/50 hover:bg-orange-500/10' :
                  'hover:border-white/30 hover:bg-white/5';
                
                return (
                  <button
                    key={rel}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, kind: rel as RelationshipKind }))}
                    className={cn(
                      'px-2 py-1.5 rounded-lg border border-white/5 bg-white/5 text-[9px] font-medium transition-all truncate',
                      colorClass,
                      isSelected && 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                    )}
                    title={rel}
                  >
                    {rel}
                  </button>
                );
              })}
            </div>
            {filteredRelationshipKinds.length > 24 && (
              <div className="text-[9px] text-zinc-500 text-center">
                +{filteredRelationshipKinds.length - 24} more (use search)
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">Relationship Type</label>
            <input
              type="text"
              list="relationship-type-suggestions"
              value={draft.kind}
              onChange={(event) => setDraft((prev) => ({ ...prev, kind: event.target.value as RelationshipKind }))}
              placeholder="Type (e.g. son, rival, lover, boss)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            />
            <datalist id="relationship-type-suggestions">
              {relationshipKinds.map((kind) => (
                <option key={`${kind.value}-${kind.label}`} value={kind.label} />
              ))}
            </datalist>
          </div>

          <button
            type="button"
            onClick={() => setDraft((prev) => ({
              ...prev,
              reciprocal: !prev.reciprocal,
              reverseKind: !prev.reciprocal ? (prev.reverseKind || prev.kind) : prev.reverseKind,
            }))}
            className={cn(
              'w-full rounded-lg border px-3 py-2.5 text-left transition-all',
              draft.reciprocal
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest">Double-sided relationship</div>
                <div className="mt-1 text-[11px] leading-relaxed opacity-80">
                  {draft.reciprocal
                    ? 'Both directions are active and can use different relationship types.'
                    : 'This link is currently one-way only.'}
                </div>
              </div>
              <div className={cn('rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest', draft.reciprocal ? 'bg-emerald-400/15 text-emerald-200' : 'bg-black/20 text-zinc-500')}>
                {draft.reciprocal ? 'On' : 'Off'}
              </div>
            </div>
          </button>

          {draft.reciprocal && (
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500">Reverse Type</label>
              
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={reverseCategorySearch}
                  onChange={(e) => setReverseCategorySearch(e.target.value)}
                  placeholder="Search reverse..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {RELATIONSHIP_CATEGORIES.map((cat) => (
                  <button
                    key={`reverse-${cat.id}`}
                    type="button"
                    onClick={() => setReverseCategory(cat.id)}
                    className={cn(
                      'px-2 py-1 rounded-md text-[9px] font-medium transition-all flex items-center gap-1',
                      reverseCategory === cat.id
                        ? cat.id === 'all' ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' :
                          'color' in cat && cat.color === 'blue' ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40' :
                          'color' in cat && cat.color === 'rose' ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40' :
                          'color' in cat && cat.color === 'lime' ? 'bg-lime-500/30 text-lime-200 border border-lime-400/40' :
                          'color' in cat && cat.color === 'red' ? 'bg-red-500/30 text-red-200 border border-red-400/40' :
                          'color' in cat && cat.color === 'violet' ? 'bg-violet-500/30 text-violet-200 border border-violet-400/40' :
                          'color' in cat && cat.color === 'emerald' ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' :
                          'color' in cat && cat.color === 'amber' ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40' :
                          'color' in cat && cat.color === 'orange' ? 'bg-orange-500/30 text-orange-200 border border-orange-400/40' :
                          'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                        : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-300'
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1">
                {filteredReverseRelationships.slice(0, 18).map((rel) => {
                  const isSelected = draft.reverseKind.toLowerCase() === rel.toLowerCase();
                  const colorClass = 
                    CATEGORY_RELATIONSHIPS.family.includes(rel) ? 'hover:border-blue-500/50 hover:bg-blue-500/10' :
                    CATEGORY_RELATIONSHIPS.romance.includes(rel) ? 'hover:border-rose-500/50 hover:bg-rose-500/10' :
                    CATEGORY_RELATIONSHIPS.friendship.includes(rel) ? 'hover:border-lime-500/50 hover:bg-lime-500/10' :
                    CATEGORY_RELATIONSHIPS.rivalry.includes(rel) ? 'hover:border-red-500/50 hover:bg-red-500/10' :
                    CATEGORY_RELATIONSHIPS.professional.includes(rel) ? 'hover:border-violet-500/50 hover:bg-violet-500/10' :
                    CATEGORY_RELATIONSHIPS.mentorship.includes(rel) ? 'hover:border-emerald-500/50 hover:bg-emerald-500/10' :
                    CATEGORY_RELATIONSHIPS.supernatural.includes(rel) ? 'hover:border-amber-500/50 hover:bg-amber-500/10' :
                    CATEGORY_RELATIONSHIPS.criminal.includes(rel) ? 'hover:border-orange-500/50 hover:bg-orange-500/10' :
                    'hover:border-white/30 hover:bg-white/5';
                  
                  return (
                    <button
                      key={rel}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, reverseKind: rel as RelationshipKind }))}
                      className={cn(
                        'px-2 py-1.5 rounded-lg border border-white/5 bg-white/5 text-[9px] font-medium transition-all truncate',
                        colorClass,
                        isSelected && 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                      )}
                      title={rel}
                    >
                      {rel}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-zinc-400 leading-relaxed">
                <div>
                  {getCharacterName(characters, draft.sourceCharacterId)} → {getCharacterName(characters, draft.targetCharacterId)}: <span className="text-zinc-200">{draft.kind.trim() || '—'}</span>
                </div>
                <div className="mt-1">
                  {getCharacterName(characters, draft.targetCharacterId)} → {getCharacterName(characters, draft.sourceCharacterId)}: <span className="text-zinc-200">{getResolvedReverseKind(draft) || '—'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500">Intensity</label>
              <span className="text-[10px] text-emerald-400 font-medium">{draft.intensity}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={draft.intensity}
              onChange={(event) => setDraft((prev) => ({ ...prev, intensity: Number(event.target.value) }))}
              className="w-full accent-emerald-500 h-1.5"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">Visibility</label>
            <select
              value={draft.visibility}
              onChange={(event) => setDraft((prev) => ({ ...prev, visibility: event.target.value as RelationshipVisibility }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#0f0f0f] text-zinc-200">{option.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500">Notes</label>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Hidden notes for AI..."
              className="w-full h-20 resize-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={persistRelationship}
              disabled={!draft.sourceCharacterId || !draft.targetCharacterId || draft.sourceCharacterId === draft.targetCharacterId}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-2.5 text-xs font-medium text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-500/30"
            >
              {editingId ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {editingId ? 'Update' : 'Add'}
            </button>
            {editingId && (
              <button
                onClick={() => onRemoveRelationship(editingId)}
                className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2.5 text-xs font-medium text-red-300 hover:bg-red-500/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={resetDraft}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-medium text-zinc-400 hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#111111]/90 backdrop-blur-sm rounded-xl border border-white/10 p-2">
          <div className="flex items-center gap-1 border-r border-white/10 pr-2">
            <button
              onClick={() => setViewMode('all')}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-medium transition-all",
                viewMode === 'all' ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-400 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              All
            </button>
            <button
              onClick={() => setViewMode('active')}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-medium transition-all",
                viewMode === 'active' ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-400 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              Active
            </button>
            <button
              onClick={() => setViewMode('public')}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-medium transition-all",
                viewMode === 'public' ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-400 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              Public
            </button>
          </div>
          
          <div className="flex items-center gap-1 border-r border-white/10 pr-2">
            <button
              onClick={() => setLayoutAlgorithm('force')}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-medium transition-all",
                layoutAlgorithm === 'force' ? "bg-blue-500/20 text-blue-300" : "text-zinc-400 hover:text-zinc-300 hover:bg-white/5"
              )}
              title="Force-directed layout"
            >
              Force
            </button>
            <button
              onClick={() => setLayoutAlgorithm('circular')}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-medium transition-all",
                layoutAlgorithm === 'circular' ? "bg-blue-500/20 text-blue-300" : "text-zinc-400 hover:text-zinc-300 hover:bg-white/5"
              )}
              title="Circular layout"
            >
              Circle
            </button>
            <button
              onClick={() => setLayoutAlgorithm('hierarchical')}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-medium transition-all",
                layoutAlgorithm === 'hierarchical' ? "bg-blue-500/20 text-blue-300" : "text-zinc-400 hover:text-zinc-300 hover:bg-white/5"
              )}
              title="Hierarchical layout"
            >
              Hierarchy
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMinimap(!showMinimap)}
              className={cn(
                "p-1.5 rounded transition-all",
                showMinimap ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-zinc-300 hover:bg-white/5"
              )}
              title="Toggle minimap"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowControls(!showControls)}
              className={cn(
                "p-1.5 rounded transition-all",
                showControls ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-zinc-300 hover:bg-white/5"
              )}
              title="Toggle controls"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fitView({ padding: 0.2 })}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-300 hover:bg-white/5 transition-all"
              title="Fit view"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        {/* Connection Status Indicator */}
        {isConnecting && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 shadow-[0_8px_32px_rgba(16,185,129,0.25)] backdrop-blur-sm pointer-events-none">
            <div className="flex items-center gap-2 text-emerald-300">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium">
                Connecting from {getCharacterName(characters, connectionSource || '')}
              </span>
            </div>
          </div>
        )}
        
        {/* Hover Indicator */}
        {hoveredHandle && hoveredHandle.nodeId !== connectionSource && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 shadow-lg backdrop-blur-sm pointer-events-none">
            <div className="text-xs text-emerald-300 font-medium">
              Connect to {getCharacterName(characters, hoveredHandle.nodeId)}
            </div>
          </div>
        )}
        {/* Global Search */}
        <div className="absolute top-4 right-4 z-10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search relationships..."
              className="w-48 pl-8 pr-3 py-1.5 bg-[#111111]/90 backdrop-blur-sm border border-white/10 rounded-lg text-[10px] text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
        
        {hasSelection && (
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 shadow-[0_14px_36px_rgba(14,165,233,0.18)] backdrop-blur-sm">
            {selectedRelationship ? (
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Selected relationship</div>
                <div className="text-sm font-semibold text-white">
                  {getCharacterName(characters, selectedRelationship.sourceCharacterId)} {selectedRelationship.reciprocal ? '↔' : '→'} {getCharacterName(characters, selectedRelationship.targetCharacterId)}
                </div>
                <div className="text-xs text-sky-100/80">{getRelationshipEdgeLabel(selectedRelationship)}</div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Selected character</div>
                <div className="text-sm font-semibold text-white">{getCharacterName(characters, selectedNodeId || '')}</div>
                <div className="text-xs text-sky-100/80">Connected links stay highlighted while unrelated elements fade.</div>
              </div>
            )}
          </div>
        )}

        {characters.length < 2 ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 bg-[#0c0c0c] z-10">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Add at least two characters to build a relation graph.</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onNodeMouseEnter={(_, node) => {
              // Don't interfere with connection process
              if (!isConnecting || node.id === connectionSource) return;
              
              // Visual feedback for valid target
              const nodeElement = document.querySelector(`[data-nodeid="${node.id}"]`);
              if (nodeElement) {
                nodeElement.classList.add('ring-2', 'ring-emerald-400/50');
              }
            }}
            onNodeMouseLeave={(_, node) => {
              // Remove visual feedback
              const nodeElement = document.querySelector(`[data-nodeid="${node.id}"]`);
              if (nodeElement) {
                nodeElement.classList.remove('ring-2', 'ring-emerald-400/50');
              }
            }}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'smoothstep',
            }}
            connectionLineStyle={{ 
              stroke: isConnecting ? '#10b981' : '#6b7280', 
              strokeWidth: isConnecting ? 3 : 2,
              strokeDasharray: isConnecting ? '5,5' : 'none'
            }}
            connectionLineContainerStyle={{ 
              stroke: '#10b981',
              filter: isConnecting ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' : 'none'
            }}
            autoPanOnConnect={true}
            panOnDrag={true}
            preventScrolling={true}
            proOptions={{ hideAttribution: true }}
            className="bg-[#0c0c0c]"
          >
            <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="rgba(255,255,255,0.05)" />
            {showControls && <Controls className="!bg-[#1a1a1a] !border-white/10 !rounded-lg" />}
            {showMinimap && (
              <MiniMap 
                className="!bg-[#1a1a1a] !border-white/10 !rounded-lg"
                nodeColor={(node) => node.data?.isPresent ? '#10b981' : '#71717a'}
                maskColor="rgba(0,0,0,0.5)"
              />
            )}
          </ReactFlow>
        )}
      </div>

      <div className="w-80 shrink-0 border-l border-white/10 bg-[#111111] flex flex-col">
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              <Settings2 className="w-4 h-4" />
              Relationships
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400">{filteredRelationships.length}</span>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(filteredRelationships, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  const exportFileDefaultName = 'relationships.json';
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                }}
                className="p-1.5 rounded text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                title="Export relationships"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              {filteredRelationships.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`Delete all ${filteredRelationships.length} filtered relationships? This action cannot be undone.`)) {
                      const filteredIds = filteredRelationships.map(r => r.id);
                      setContext(prev => ({
                        ...prev,
                        relationships: (prev.relationships || []).filter(r => !filteredIds.includes(r.id))
                      }));
                      setSelectedRelationshipId(null);
                      setEditingId(null);
                    }
                  }}
                  className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Delete all filtered relationships"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {filteredRelationships.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-500 text-center leading-relaxed">
              {relationships.length === 0 ? 'No relationships yet. Drag from one character node to another to create connections.' : 'No relationships match current filters.'}
            </div>
          ) : (
            filteredRelationships.map((relationship) => {
              const color = getRelationColor(relationship.kind);
              return (
                <div
                  key={relationship.id}
                  onClick={() => {
                    setSelectedRelationshipId(relationship.id);
                    setSelectedNodeId(null);
                    onEditRelationship(relationship);
                  }}
                  className={cn(
                    'rounded-xl border bg-gradient-to-br p-3 cursor-pointer transition-all hover:scale-[1.02]',
                    color.bg,
                    selectedRelationshipId === relationship.id && 'border-sky-400/45 ring-2 ring-sky-400/25 shadow-[0_12px_32px_rgba(14,165,233,0.16)]',
                    selectedNodeId && (relationship.sourceCharacterId === selectedNodeId || relationship.targetCharacterId === selectedNodeId) && 'border-emerald-400/30 ring-1 ring-emerald-400/20',
                    hasSelection && !selectedNodeId && selectedRelationshipId !== relationship.id && 'opacity-55',
                    selectedNodeId && relationship.sourceCharacterId !== selectedNodeId && relationship.targetCharacterId !== selectedNodeId && 'opacity-30'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 truncate">
                      {getCharacterName(characters, relationship.sourceCharacterId)}
                      <span className="mx-1 opacity-50">{relationship.reciprocal ? '↔' : '→'}</span>
                      {getCharacterName(characters, relationship.targetCharacterId)}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedRelationshipId === relationship.id && (
                        <span className="rounded-full border border-sky-400/30 bg-sky-400/15 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.18em] text-sky-200">Selected</span>
                      )}
                      <div className="text-[9px] uppercase tracking-wider opacity-60">{relationship.visibility}</div>
                    </div>
                  </div>
                  <div className="space-y-1 mb-1">
                    <div className="text-sm font-semibold">{relationship.kind}</div>
                    {relationship.reciprocal && hasDistinctReverseKind(relationship) && (
                      <div className="text-xs font-medium opacity-80">Reverse: {getResolvedReverseKind(relationship)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider opacity-70">
                    <span>{relationship.reciprocal ? 'Mutual' : 'Directional'}</span>
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    <span>Intensity: {relationship.intensity}/5</span>
                  </div>
                  {relationship.notes && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-[10px] opacity-70 line-clamp-2">{relationship.notes}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export const SocialGraph: React.FC<SocialGraphProps> = ({ context, setContext }) => {
  const characters = context.characters;
  const relationships = context.relationships || [];
  const theme = context.theme;
  const [draft, setDraft] = useState<DraftRelationship>(() => createDraft(characters));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);

  const editRelationship = useCallback((relationship: CharacterRelationship) => {
    setEditingId(relationship.id);
    setSelectedRelationshipId(relationship.id);
    setSelectedNodeId(null);
    setDraft({
      id: relationship.id,
      sourceCharacterId: relationship.sourceCharacterId,
      targetCharacterId: relationship.targetCharacterId,
      kind: relationship.kind,
      reciprocal: relationship.reciprocal ?? false,
      reverseKind: relationship.reciprocal ? (relationship.reverseKind || relationship.kind) : 'ally',
      intensity: relationship.intensity,
      visibility: relationship.visibility,
      notes: relationship.notes || '',
    });
  }, []);

  const removeRelationship = useCallback((id: string) => {
    setContext((prev) => ({
      ...prev,
      relationships: (prev.relationships || []).filter((relationship) => relationship.id !== id),
    }));

    if (editingId === id) {
      setDraft(createDraft(characters));
      setEditingId(null);
    }

    if (selectedRelationshipId === id) {
      setSelectedRelationshipId(null);
    }
  }, [characters, editingId, setContext]);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedNodeId(null);
    setSelectedRelationshipId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg">
            <Network className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Relations Graph</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Tracked by the AI as social canon</p>
          </div>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          {relationships.length} links
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          <BotMessageSquare className="w-3.5 h-3.5" /> Social chart
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="space-y-2">
            <p className="text-sm text-zinc-300 leading-relaxed">
              Open the full-screen relationship studio to edit family ties, attraction, hierarchy, secrets, and rivalries with more room for the graph.
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
              <span>{characters.length} characters</span>
              <span>•</span>
              <span>{relationships.length} social links</span>
              <span>•</span>
              <span>AI-aware canon</span>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <Expand className="w-4 h-4" /> Open graph studio
          </button>
        </div>

        {relationships.length > 0 && (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {relationships.slice(0, 4).map((relationship) => {
              const color = getRelationColor(relationship.kind);
              return (
                <div
                  key={relationship.id}
                  className={cn('rounded-2xl border bg-gradient-to-br p-3', color.bg)}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                    {getCharacterName(characters, relationship.sourceCharacterId)} {relationship.reciprocal ? '↔' : '→'} {getCharacterName(characters, relationship.targetCharacterId)}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{getRelationshipEdgeLabel(relationship)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="fixed inset-0 z-[120] flex flex-col bg-[#0a0a0a]"
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 bg-[#111111]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Network className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100">Relations Graph Studio</h3>
                    <p className="text-xs text-zinc-500">Drag between nodes to create relationships • Theme: {theme || 'Default'}</p>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ReactFlowProvider>
                <GraphCanvas 
                  characters={characters}
                  relationships={relationships}
                  draft={draft}
                  setDraft={setDraft}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  selectedNodeId={selectedNodeId}
                  setSelectedNodeId={setSelectedNodeId}
                  selectedRelationshipId={selectedRelationshipId}
                  setSelectedRelationshipId={setSelectedRelationshipId}
                  onEditRelationship={editRelationship}
                  onRemoveRelationship={removeRelationship}
                  setContext={setContext}
                  theme={theme}
                />
              </ReactFlowProvider>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
