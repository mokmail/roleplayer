import {
  Character,
  CharacterAgent,
  CharacterSecret,
  CharacterObservation,
  CharacterKnownRelationship,
  CharacterKnowledgeLevel,
  StoryMemory,
  StoryMemoryEntry,
  StoryRevelations,
  CharacterRelationship,
  Message,
} from '../types';

export function createCharacterAgent(characterId: string): CharacterAgent {
  return {
    characterId,
    knownFacts: [],
    secretsKnown: [],
    relationships: [],
    observations: [],
    emotionalMemory: [],
    knowledgeLevel: {
      knowledgeScore: 0,
      understoodPlotPoints: [],
      misconceptions: [],
      lastUpdated: Date.now(),
    },
    lastSyncTimestamp: Date.now(),
  };
}

export function getOrCreateAgent(
  state: Record<string, CharacterAgent>,
  characterId: string
): CharacterAgent {
  const existing = state[characterId];
  if (existing) return existing;
  
  const newAgent = createCharacterAgent(characterId);
  state[characterId] = newAgent;
  return newAgent;
}

export function addKnownFact(
  agent: CharacterAgent,
  fact: string,
  entryId?: string
): CharacterAgent {
  if (agent.knownFacts.includes(fact)) return agent;
  
  return {
    ...agent,
    knownFacts: [...agent.knownFacts, fact],
    knowledgeLevel: {
      ...agent.knowledgeLevel,
      knowledgeScore: agent.knowledgeLevel.knowledgeScore + 1,
      understoodPlotPoints: [...agent.knowledgeLevel.understoodPlotPoints, fact].slice(-20),
      lastUpdated: Date.now(),
    },
  };
}

export function addSecretKnowledge(
  agent: CharacterAgent,
  secret: Omit<CharacterSecret, 'id' | 'discoveredAt'>
): CharacterAgent {
  const newSecret: CharacterSecret = {
    ...secret,
    id: `secret-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    discoveredAt: Date.now(),
  };
  
  return {
    ...agent,
    secretsKnown: [...agent.secretsKnown, newSecret],
    knowledgeLevel: {
      ...agent.knowledgeLevel,
      knowledgeScore: agent.knowledgeLevel.knowledgeScore + 5,
      lastUpdated: Date.now(),
    },
  };
}

export function addObservation(
  agent: CharacterAgent,
  content: string,
  emotionalImpact: CharacterObservation['emotionalImpact'],
  involvedCharacters: string[] = [],
  entryId?: string
): CharacterAgent {
  const observation: CharacterObservation = {
    id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content,
    entryId,
    timestamp: Date.now(),
    emotionalImpact,
    involvedCharacters,
  };
  
  return {
    ...agent,
    observations: [...agent.observations.slice(-50), observation],
  };
}

export function updateRelationshipKnowledge(
  agent: CharacterAgent,
  targetCharacterId: string,
  kind: string,
  isDirectlyObserved: boolean = false,
  sourceOfKnowledge?: string
): CharacterAgent {
  const existingIdx = agent.relationships.findIndex(
    r => r.targetCharacterId === targetCharacterId
  );
  
  const newRel: CharacterKnownRelationship = {
    targetCharacterId,
    kind,
    knownSince: Date.now(),
    isDirectlyObserved,
    sourceOfKnowledge,
  };
  
  let updatedRels: CharacterKnownRelationship[];
  if (existingIdx >= 0) {
    updatedRels = [...agent.relationships];
    updatedRels[existingIdx] = newRel;
  } else {
    updatedRels = [...agent.relationships, newRel];
  }
  
  return {
    ...agent,
    relationships: updatedRels,
    knowledgeLevel: {
      ...agent.knowledgeLevel,
      knowledgeScore: agent.knowledgeLevel.knowledgeScore + 2,
      lastUpdated: Date.now(),
    },
  };
}

export function addEmotionalMemory(
  agent: CharacterAgent,
  eventId: string,
  emotion: string,
  intensity: number
): CharacterAgent {
  return {
    ...agent,
    emotionalMemory: [
      ...agent.emotionalMemory.slice(-30),
      { eventId, emotion, intensity: Math.min(10, Math.max(1, intensity)) },
    ],
  };
}

export function addMisconception(
  agent: CharacterAgent,
  misconception: string
): CharacterAgent {
  if (agent.knowledgeLevel.misconceptions.includes(misconception)) {
    return agent;
  }
  
  return {
    ...agent,
    knowledgeLevel: {
      ...agent.knowledgeLevel,
      misconceptions: [...agent.knowledgeLevel.misconceptions, misconception].slice(-10),
      lastUpdated: Date.now(),
    },
  };
}

export function syncAgentFromStoryMemory(
  agent: CharacterAgent,
  memory: StoryMemory,
  relevantCharacterIds: string[]
): CharacterAgent {
  const relevantEntries = memory.entries
    .filter(e => e.isActive && (!e.characterIds || e.characterIds.some(id => 
      relevantCharacterIds.includes(id) || id === agent.characterId
    )))
    .slice(-20);
  
  let updatedAgent = { ...agent };
  
  for (const entry of relevantEntries) {
    const alreadyKnown = updatedAgent.knownFacts.some(f => 
      f.includes(entry.content.slice(0, 50))
    );
    
    if (!alreadyKnown && entry.type !== 'important_detail') {
      updatedAgent = addKnownFact(updatedAgent, entry.content, entry.id);
    }
    
    if (entry.emotionalTone) {
      updatedAgent = addEmotionalMemory(
        updatedAgent,
        entry.id,
        entry.emotionalTone,
        entry.importance === 'critical' ? 5 : entry.importance === 'high' ? 3 : 1
      );
    }
    
    if (entry.type === 'relationship_change') {
      updatedAgent = addObservation(
        updatedAgent,
        `Relationship change observed: ${entry.content.slice(0, 100)}`,
        'neutral',
        entry.characterIds || [],
        entry.id
      );
    }
  }
  
  return {
    ...updatedAgent,
    lastSyncTimestamp: Date.now(),
  };
}

export function syncAgentFromRevelations(
  agent: CharacterAgent,
  revelations: StoryRevelations
): CharacterAgent {
  const charKnowledge = revelations.characterKnowledge.find(
    k => k.characterId === agent.characterId
  );
  
  if (!charKnowledge) return agent;
  
  let updatedAgent = { ...agent };
  
  for (const secret of charKnowledge.knownSecrets) {
    const alreadyKnown = updatedAgent.secretsKnown.some(s => s.content === secret);
    if (!alreadyKnown) {
      updatedAgent = addSecretKnowledge(updatedAgent, {
        content: secret,
        trustLevel: 5,
        isBelieved: true,
      });
    }
  }
  
  for (const fact of charKnowledge.discoveredFacts) {
    updatedAgent = addKnownFact(updatedAgent, fact);
  }
  
  return updatedAgent;
}

export function syncAgentFromRelationships(
  agent: CharacterAgent,
  relationships: CharacterRelationship[],
  allCharacterIds: string[]
): CharacterAgent {
  let updatedAgent = { ...agent };
  
  for (const rel of relationships) {
    if (rel.sourceCharacterId === agent.characterId) {
      updatedAgent = updateRelationshipKnowledge(
        updatedAgent,
        rel.targetCharacterId,
        rel.kind,
        true,
        'direct_interaction'
      );
    } else if (rel.targetCharacterId === agent.characterId) {
      updatedAgent = updateRelationshipKnowledge(
        updatedAgent,
        rel.sourceCharacterId,
        rel.reverseKind || rel.kind,
        true,
        'direct_interaction'
      );
    } else if (allCharacterIds.includes(rel.sourceCharacterId) && 
               allCharacterIds.includes(rel.targetCharacterId)) {
      if (rel.visibility !== 'secret') {
        const otherTarget = rel.sourceCharacterId === agent.characterId 
          ? rel.targetCharacterId 
          : rel.sourceCharacterId;
        updatedAgent = updateRelationshipKnowledge(
          updatedAgent,
          otherTarget,
          rel.kind,
          false,
          'observed'
        );
      }
    }
  }
  
  return updatedAgent;
}

export function buildCharacterAgentDigest(agent: CharacterAgent): string {
  const parts: string[] = [];
  
  if (agent.knownFacts.length > 0) {
    parts.push(`Known Facts (${agent.knownFacts.length}):`);
    parts.push(agent.knownFacts.slice(-3).map(f => `  - ${f.slice(0, 80)}`).join('\n'));
  }
  
  if (agent.secretsKnown.length > 0) {
    parts.push(`\nSecrets Known (${agent.secretsKnown.length}):`);
    parts.push(agent.secretsKnown.slice(-2).map(s => `  - ${s.content.slice(0, 60)}`).join('\n'));
  }
  
  if (agent.relationships.length > 0) {
    parts.push(`\nRelationships (${agent.relationships.length}):`);
    parts.push(agent.relationships.slice(-4).map(r => `  - ${r.kind} (observed: ${r.isDirectlyObserved})`).join('\n'));
  }
  
  if (agent.emotionalMemory.length > 0) {
    const recentEmotions = agent.emotionalMemory.slice(-3);
    parts.push(`\nRecent Emotions:`);
    parts.push(recentEmotions.map(e => `  - ${e.emotion}: ${'●'.repeat(e.intensity)}`).join('\n'));
  }
  
  return parts.length > 0 
    ? parts.join('\n') 
    : 'No accumulated knowledge yet.';
}

export function getAgentSummary(
  agent: CharacterAgent,
  characterName: string
): string {
  const knowledgeLevel = agent.knowledgeLevel.knowledgeScore;
  const secretCount = agent.secretsKnown.length;
  const relationshipCount = agent.relationships.length;
  
  return `${characterName}: Knowledge Level ${knowledgeLevel}, ${secretCount} secrets known, ${relationshipCount} relationship observations`;
}

export function findRelevantSecretsForCharacter(
  agent: CharacterAgent,
  targetCharacterId: string
): CharacterSecret[] {
  return agent.secretsKnown.filter(s => 
    s.isBelieved && s.trustLevel >= 3
  );
}

export function getEmotionalTrend(agent: CharacterAgent): string[] {
  const recent = agent.emotionalMemory.slice(-10);
  const emotionCounts = recent.reduce((acc, e) => {
    acc[e.emotion] = (acc[e.emotion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion]) => emotion);
}

export function syncAllAgentsFromStory(
  agents: Record<string, CharacterAgent>,
  characters: Character[],
  memory: StoryMemory,
  revelations: StoryRevelations,
  relationships: CharacterRelationship[]
): Record<string, CharacterAgent> {
  const characterIds = characters.map(c => c.id);
  
  const updatedAgents: Record<string, CharacterAgent> = { ...agents };
  
  for (const char of characters) {
    const existingAgent = agents[char.id];
    let agent = existingAgent || createCharacterAgent(char.id);
    
    agent = syncAgentFromStoryMemory(agent, memory, characterIds);
    agent = syncAgentFromRevelations(agent, revelations);
    agent = syncAgentFromRelationships(agent, relationships, characterIds);
    
    updatedAgents[char.id] = agent;
  }
  
  return updatedAgents;
}

export function createAgentState(): Record<string, CharacterAgent> {
  return {};
}

export function updateAgentFromMessage(
  agent: CharacterAgent,
  message: Message,
  characterNames: Map<string, string>
): CharacterAgent {
  let updatedAgent = { ...agent };
  const content = message.content.toLowerCase();
  
  if (message.characterName && message.role === 'assistant') {
    const charId = [...characterNames.entries()].find(
      ([, name]) => name.toLowerCase() === message.characterName?.toLowerCase()
    )?.[0];
    
    if (charId && charId !== agent.characterId) {
      updatedAgent = addObservation(
        updatedAgent,
        `${message.characterName}: ${message.content.slice(0, 100)}`,
        content.includes('!') ? 'positive' : content.includes('?') ? 'negative' : 'neutral',
        charId ? [charId] : [],
        message.id
      );
    }
  }
  
  if (content.includes('secret') || content.includes('discovered') || content.includes('found out')) {
    updatedAgent = addSecretKnowledge(updatedAgent, {
      content: message.content.slice(0, 150),
      trustLevel: 3,
      isBelieved: true,
      sourceEntryId: message.id,
    });
  }
  
  if (content.includes('relationship') || content.includes('love') || content.includes('hate')) {
    const mentionedChars = [...characterNames.entries()].filter(
      ([, name]) => content.includes(name.toLowerCase())
    );
    
    for (const [targetId] of mentionedChars) {
      if (targetId !== agent.characterId) {
        updatedAgent = updateRelationshipKnowledge(
          updatedAgent,
          targetId,
          'observed_relationship',
          false,
          'conversation'
        );
      }
    }
  }
  
  return updatedAgent;
}