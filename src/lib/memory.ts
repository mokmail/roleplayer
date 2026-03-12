import { StoryMemory, StoryMemoryEntry, MemoryEntryType, Character, Message, Character as CharacterType } from '../types';

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