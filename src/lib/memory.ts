import { StoryMemory, StoryMemoryEntry, MemoryEntryType, Character, Message, Character as CharacterType, StoryRevelations, StoryRevelationBeat, CharacterKnowledgeState } from '../types';

export function createEmptyMemory(): StoryMemory {
  return { entries: [] };
}

export function createMemoryEntry(
  type: MemoryEntryType,
  content: string,
  characterIds?: string[],
  importance: StoryMemoryEntry['importance'] = 'medium',
  emotionalTone?: StoryMemoryEntry['emotionalTone'],
  previousEventId?: string
): StoryMemoryEntry {
  return {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    content,
    timestamp: Date.now(),
    characterIds,
    importance,
    isActive: true,
    emotionalTone,
    sequencePosition: Date.now(),
    previousEventId,
  };
}

export function addMemoryEntry(memory: StoryMemory, entry: StoryMemoryEntry): StoryMemory {
  return {
    entries: [...memory.entries, entry],
  };
}

export function removeMemoryEntry(memory: StoryMemory, entryId: string): StoryMemory {
  return {
    entries: memory.entries.filter(e => e.id !== entryId),
  };
}

export function updateMemoryEntry(memory: StoryMemory, entryId: string, updates: Partial<StoryMemoryEntry>): StoryMemory {
  return {
    entries: memory.entries.map(e => e.id === entryId ? { ...e, ...updates } : e),
  };
}

export function getActiveMemoryEntries(memory: StoryMemory): StoryMemoryEntry[] {
  return memory.entries.filter(e => e.isActive);
}

export function getMemoryForCharacter(memory: StoryMemory, characterId: string): StoryMemoryEntry[] {
  return getActiveMemoryEntries(memory).filter(
    e => !e.characterIds || e.characterIds.includes(characterId)
  );
}

const IMPORTANCE_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

export function buildMemoryDigest(memory: StoryMemory, characters: Character[]): string {
  const active = getActiveMemoryEntries(memory);
  if (active.length === 0) return 'No recorded memories yet.';

  const characterMap = new Map(characters.map(c => [c.id, c.name]));

  return active
    .sort((a, b) => (IMPORTANCE_ORDER[b.importance] - IMPORTANCE_ORDER[a.importance]) || b.timestamp - a.timestamp)
    .map(entry => {
      const charNames = entry.characterIds?.map(id => characterMap.get(id) || 'Unknown').join(', ');
      const charPart = charNames ? ` (${charNames})` : '';
      return `• [${entry.type.replace('_', ' ')}]${charPart} ${entry.content}`;
    })
    .join('\n');
}

export function extractMemoriesFromMessage(
  message: Message,
  context: { characters: CharacterType[] }
): StoryMemoryEntry[] {
  const entries: StoryMemoryEntry[] = [];
  const content = message.content.toLowerCase();
  const characterIds = message.characterName 
    ? context.characters.filter(c => c.name.toLowerCase() === message.characterName?.toLowerCase()).map(c => c.id)
    : [];

  if (content.includes('first time') || content.includes('never before') || content.includes('remember')) {
    entries.push(createMemoryEntry(
      'fact',
      message.content.slice(0, 200),
      characterIds,
      'high'
    ));
  }

  if (content.includes(' relationship') || content.includes(' fell in love') || content.includes(' became ')) {
    entries.push(createMemoryEntry(
      'relationship_change',
      message.content.slice(0, 200),
      characterIds,
      'high'
    ));
  }

  if (content.includes('secret') || content.includes('discovered') || content.includes('found out')) {
    entries.push(createMemoryEntry(
      'important_detail',
      message.content.slice(0, 200),
      characterIds,
      'critical'
    ));
  }

  return entries;
}

export function createEmptyRevelations(): StoryRevelations {
  return {
    beats: [],
    characterKnowledge: [],
  };
}

export function addRevelationBeat(
  revelations: StoryRevelations,
  beat: Omit<StoryRevelationBeat, 'id' | 'isRevealed'>
): StoryRevelations {
  const newBeat: StoryRevelationBeat = {
    ...beat,
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    isRevealed: false,
  };
  return {
    ...revelations,
    beats: [...revelations.beats, newBeat],
  };
}

export function revealBeat(revelations: StoryRevelations, beatId: string, characterIds: string[]): StoryRevelations {
  const updatedBeats = revelations.beats.map(beat => {
    if (beat.id === beatId && !beat.isRevealed) {
      return { ...beat, isRevealed: true, revealedAt: Date.now() };
    }
    return beat;
  });

  const beat = revelations.beats.find(b => b.id === beatId);
  let updatedKnowledge = [...revelations.characterKnowledge];

  if (beat) {
    characterIds.forEach(charId => {
      const existing = updatedKnowledge.find(k => k.characterId === charId);
      if (existing) {
        if (!existing.knownSecrets.includes(beat.content)) {
          existing.knownSecrets.push(beat.content);
        }
      } else {
        updatedKnowledge.push({
          characterId: charId,
          knownSecrets: [beat.content],
          knownRelationships: [],
          discoveredFacts: [],
        });
      }
    });
  }

  return {
    beats: updatedBeats,
    characterKnowledge: updatedKnowledge,
  };
}

export function getRevealedSecrets(revelations: StoryRevelations): StoryRevelationBeat[] {
  return revelations.beats.filter(b => b.isRevealed);
}

export function getPendingRevelations(revelations: StoryRevelations): StoryRevelationBeat[] {
  return revelations.beats.filter(b => !b.isRevealed);
}

export function getCharacterKnowledge(revelations: StoryRevelations, characterId: string): CharacterKnowledgeState | undefined {
  return revelations.characterKnowledge.find(k => k.characterId === characterId);
}

export function buildCharacterKnowledgeDigest(
  revelations: StoryRevelations,
  characters: Character[]
): string {
  const charMap = new Map(characters.map(c => [c.id, c.name]));
  
  if (revelations.characterKnowledge.length === 0) {
    return 'No secrets have been discovered yet.';
  }

  return revelations.characterKnowledge
    .map(k => {
      const charName = charMap.get(k.characterId) || 'Unknown';
      if (k.knownSecrets.length === 0) return null;
      return `${charName} now knows: ${k.knownSecrets.slice(0, 3).join('; ')}`;
    })
    .filter(Boolean)
    .join('\n');
}

export const REVELATION_TRIGGER_KEYWORDS = [
  'discovered', 'found out', 'revealed', 'secret', 'knows the truth',
  'caught', 'witnessed', 'overheard', 'confessed', 'admitted',
  'exposed', 'uncovered', 'learned the truth', 'saw it coming',
  'was right about', 'knew all along', 'finally admitted'
];

export function detectRevelationInContent(
  content: string,
  speakerName?: string
): { hasRevelation: boolean; secretContent: string } {
  const lowerContent = content.toLowerCase();
  const hasTrigger = REVELATION_TRIGGER_KEYWORDS.some(keyword => lowerContent.includes(keyword));
  
  if (!hasTrigger) {
    return { hasRevelation: false, secretContent: '' };
  }

  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const relevantSentence = sentences.find(s => 
    REVELATION_TRIGGER_KEYWORDS.some(keyword => s.toLowerCase().includes(keyword))
  );

  if (!relevantSentence) {
    return { hasRevelation: true, secretContent: content.slice(0, 150) };
  }

  return {
    hasRevelation: true,
    secretContent: relevantSentence.trim().slice(0, 150)
  };
}

export function createRevelationsFromCharacters(
  characters: Character[]
): StoryRevelations {
  const beats: StoryRevelationBeat[] = [];
  
  characters.forEach(char => {
    if (char.backstory && char.backstory.length > 50) {
      beats.push({
        id: `rev-backstory-${char.id}-${Date.now()}`,
        triggerCondition: `When ${char.name}'s backstory is revealed or asked about`,
        revealTo: [],
        content: `BACKSTORY: ${char.name}: ${char.backstory.slice(0, 200)}`,
        isRevealed: false,
      });
    }
    
    if (char.paradox) {
      beats.push({
        id: `rev-paradox-${char.id}-${Date.now()}`,
        triggerCondition: `When ${char.name}'s true nature is revealed`,
        revealTo: [],
        content: `PARADOX: ${char.name}: ${char.paradox}`,
        isRevealed: false,
      });
    }
  });

  return {
    beats,
    characterKnowledge: [],
  };
}