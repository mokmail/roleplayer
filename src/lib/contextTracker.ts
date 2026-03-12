import { Character, SceneContext, StoryFlowChange, StoryFlowState } from '../types';
import { buildMemoryDigest, createEmptyMemory } from './memory';

const MAX_RECENT_CHANGES = 12;
const MAX_PENDING_CHANGES = 6;

export interface StorySetupValidation {
  isComplete: boolean;
  missingComponents: string[];
  warnings: string[];
}

export function validateStorySetup(context: SceneContext): StorySetupValidation {
  const missingComponents: string[] = [];
  const warnings: string[] = [];

  const hasPersona = cleanText(context.playerProfile?.persona);
  if (!hasPersona) {
    missingComponents.push('persona');
    warnings.push('No player persona defined - the AI won\'t know how to address or characterize you');
  }

  if (!cleanText(context.location)) {
    missingComponents.push('location');
    warnings.push('No location set - scenes need a place to happen');
  }

  if (!cleanText(context.theme)) {
    missingComponents.push('theme');
    warnings.push('No theme specified - the AI won\'t know the tone or genre');
  }

  if (!cleanText(context.sceneTime)) {
    missingComponents.push('time');
    warnings.push('No time of day/date set - scenes benefit from temporal context');
  }

  if (!context.conversationMode) {
    missingComponents.push('mode');
    warnings.push('No conversation mode set - specify tele (telechat) or presence (in-person)');
  }

  const isComplete = missingComponents.length === 0;

  return { isComplete, missingComponents, warnings };
}

function cleanText(value?: string) {
  return value?.trim().replace(/\s+/g, ' ') || '';
}

function normalizeConversationMode(mode?: string): 'tele' | 'presence' {
  const normalized = cleanText(mode).toLowerCase().replace(/[^a-z]/g, '');

  if (normalized === 'tele' || normalized === 'telechat' || normalized === 'remote' || normalized === 'messaging' || normalized === 'chat') {
    return 'tele';
  }

  return 'presence';
}

function characterSnapshot(character: Character) {
  return {
    id: character.id,
    name: cleanText(character.name),
    personality: cleanText(character.personality),
    backstory: cleanText(character.backstory),
    isPresent: character.isPresent,
    race: cleanText(character.race),
    profession: cleanText(character.profession),
    alignment: cleanText(character.alignment),
    background: cleanText(character.background),
    age: cleanText(character.age),
    gender: cleanText(character.gender),
    magicSystem: cleanText(character.magicSystem),
    socialStanding: cleanText(character.socialStanding),
    powerSource: cleanText(character.powerSource),
    vibe: cleanText(character.vibe),
    paradox: cleanText(character.paradox),
  };
}

function createComparableSnapshot(context: SceneContext) {
  return {
    theme: cleanText(context.theme),
    location: cleanText(context.location),
    plot: cleanText(context.plot),
    conversationMode: normalizeConversationMode(context.conversationMode),
    playerProfile: {
      name: cleanText(context.playerProfile?.name),
      role: cleanText(context.playerProfile?.role),
      persona: cleanText(context.playerProfile?.persona),
      objective: cleanText(context.playerProfile?.objective),
    },
    contentSafety: {
      explicitMode: context.contentSafety?.explicitMode || 'fade-to-black',
      blurExplicitContent: context.contentSafety?.blurExplicitContent ?? true,
      showExplicitBadges: context.contentSafety?.showExplicitBadges ?? true,
    },
    maxTurnsPerResponse: context.maxTurnsPerResponse || 3,
    autoTurnOrder: context.autoTurnOrder || 'sequential',
    characters: context.characters.map(characterSnapshot),
    relationships: (context.relationships || []).map((relationship) => ({
      id: relationship.id,
      sourceCharacterId: relationship.sourceCharacterId,
      targetCharacterId: relationship.targetCharacterId,
      kind: relationship.kind,
      reciprocal: relationship.reciprocal ?? false,
      reverseKind: cleanText(relationship.reverseKind),
      intensity: relationship.intensity,
      visibility: relationship.visibility,
      notes: cleanText(relationship.notes),
    })),
  };
}

export function createSceneSetupSignature(context: SceneContext) {
  return JSON.stringify(createComparableSnapshot(context));
}

function compactList(items: string[]) {
  if (items.length === 0) return 'none';
  return items.join(', ');
}

function describeCharacter(character: Character) {
  const descriptors = [character.profession, character.race, character.vibe, character.socialStanding]
    .map(cleanText)
    .filter(Boolean);

  return descriptors.length > 0
    ? `${cleanText(character.name) || 'Unnamed character'} (${descriptors.join(', ')})`
    : cleanText(character.name) || 'Unnamed character';
}

export function buildSetupDigest(context: SceneContext) {
  const mode = normalizeConversationMode(context.conversationMode);
  const activeCharacters = context.characters.filter((character) => character.isPresent).map(describeCharacter);
  const inactiveCharacters = context.characters.filter((character) => !character.isPresent).map(describeCharacter);
  const relationshipSummary = (context.relationships || []).map((relationship) => {
    const sourceName = context.characters.find((character) => character.id === relationship.sourceCharacterId)?.name || 'Unknown';
    const targetName = context.characters.find((character) => character.id === relationship.targetCharacterId)?.name || 'Unknown';
    const visibility = relationship.visibility === 'public' ? '' : `, ${relationship.visibility}`;
    const notes = cleanText(relationship.notes);
    const forwardKind = cleanText(relationship.kind) || 'relationship';
    const reverseKind = cleanText(relationship.reverseKind) || forwardKind;
    const reciprocal = relationship.reciprocal ? ', reciprocal' : '';

    if (relationship.reciprocal) {
      return `${sourceName} ↔ ${targetName}: ${sourceName} → ${targetName} = ${forwardKind}; ${targetName} → ${sourceName} = ${reverseKind} (${forwardKind}, intensity ${relationship.intensity}${visibility}${reciprocal})${notes ? ` — ${notes}` : ''}`;
    }

    return `${sourceName} → ${targetName}: ${forwardKind} (intensity ${relationship.intensity}${visibility})${notes ? ` — ${notes}` : ''}`;
  });
  const playerBits = [
    cleanText(context.playerProfile?.name) && `name ${cleanText(context.playerProfile?.name)}`,
    cleanText(context.playerProfile?.role) && `role ${cleanText(context.playerProfile?.role)}`,
    cleanText(context.playerProfile?.persona) && `persona ${cleanText(context.playerProfile?.persona)}`,
    cleanText(context.playerProfile?.objective) && `objective ${cleanText(context.playerProfile?.objective)}`,
  ].filter(Boolean);

  return [
    `Theme: ${cleanText(context.theme) || 'Unspecified'}`,
    `Location: ${cleanText(context.location) || 'Unspecified'}`,
    `Mode: ${mode === 'tele' ? 'telechat' : 'presence'}`,
    `Plot frame: ${cleanText(context.plot) || 'No active plot defined.'}`,
    `Player anchor: ${playerBits.length > 0 ? playerBits.join('; ') : 'No player profile defined.'}`,
    `Turn engine: up to ${context.maxTurnsPerResponse || 3} character turns, ${(context.autoTurnOrder || 'sequential')} order.`,
    `Safety: explicit mode ${context.contentSafety?.explicitMode || 'fade-to-black'}, blur ${context.contentSafety?.blurExplicitContent ?? true ? 'on' : 'off'}, badges ${context.contentSafety?.showExplicitBadges ?? true ? 'on' : 'off'}.`,
    `Active cast: ${compactList(activeCharacters)}.`,
    `Offstage cast: ${compactList(inactiveCharacters)}.`,
    `Relationship graph: ${relationshipSummary.length > 0 ? relationshipSummary.join(' | ') : 'No declared social links yet.'}`,
  ].join('\n');
}

function buildActiveGuidance(context: SceneContext) {
  const guidance = [
    `Honor the ${cleanText(context.theme) || 'current'} tone and keep the action grounded in ${cleanText(context.location) || 'the established location'}.`,
    `Advance the current plot pressure: ${cleanText(context.plot) || 'keep the scene moving naturally'}.`,
  ];

  if (cleanText(context.playerProfile?.objective)) {
    guidance.push(`Keep the player's objective in play: ${cleanText(context.playerProfile?.objective)}.`);
  }

  if (context.characters.some((character) => character.isPresent)) {
    guidance.push(`Favor reactions from present characters whose motives and relationships make them most relevant.`);
  }

  if ((context.relationships || []).length > 0) {
    guidance.push('Respect the declared relationship graph, especially secrets, hierarchy, attraction, grudges, and family ties.');
  }

  guidance.push(
    context.contentSafety?.explicitMode === 'allow'
      ? 'Explicit intimacy is permitted, but only when it fits the story and character logic.'
      : 'Handle intimacy with restraint and imply explicit moments instead of describing them graphically.'
  );

  return guidance;
}

function createChange(category: StoryFlowChange['category'], summary: string, timestamp: number): StoryFlowChange {
  return {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    category,
    summary,
  };
}

function mergeChangeList(nextChanges: StoryFlowChange[], existingChanges: StoryFlowChange[], limit: number) {
  const incomingCategories = new Set(nextChanges.map((change) => change.category));
  const mergedExisting = existingChanges.filter((change) => {
    if (change.category === 'character') {
      return !nextChanges.some((nextChange) => nextChange.summary === change.summary);
    }

    return !incomingCategories.has(change.category);
  });

  return [...nextChanges, ...mergedExisting].slice(0, limit);
}

function diffCharacters(previousContext: SceneContext, nextContext: SceneContext, timestamp: number) {
  const changes: StoryFlowChange[] = [];
  const previousCharacters = new Map(previousContext.characters.map((character) => [character.id, character]));
  const nextCharacters = new Map(nextContext.characters.map((character) => [character.id, character]));

  nextContext.characters.forEach((character) => {
    const previousCharacter = previousCharacters.get(character.id);

    if (!previousCharacter) {
      changes.push(createChange('character', `Added ${describeCharacter(character)} to the setup.`, timestamp));
      return;
    }

    if (previousCharacter.isPresent !== character.isPresent) {
      changes.push(createChange('character', `${cleanText(character.name) || 'A character'} is now ${character.isPresent ? 'present in the scene' : 'offstage or absent'}.`, timestamp));
    }

    const previousProfile = JSON.stringify(characterSnapshot(previousCharacter));
    const nextProfile = JSON.stringify(characterSnapshot(character));

    if (previousProfile !== nextProfile && previousCharacter.isPresent === character.isPresent) {
      changes.push(createChange('character', `Updated the profile or relationships around ${cleanText(character.name) || 'a character'}.`, timestamp));
    }
  });

  previousContext.characters.forEach((character) => {
    if (!nextCharacters.has(character.id)) {
      changes.push(createChange('character', `Removed ${cleanText(character.name) || 'a character'} from the setup.`, timestamp));
    }
  });

  return changes;
}

function diffContextChanges(previousContext: SceneContext, nextContext: SceneContext) {
  const timestamp = Date.now();
  const changes: StoryFlowChange[] = [];

  if (cleanText(previousContext.theme) !== cleanText(nextContext.theme)) {
    changes.push(createChange('scene', `Theme changed from ${cleanText(previousContext.theme) || 'unspecified'} to ${cleanText(nextContext.theme) || 'unspecified'}.`, timestamp));
  }

  if (cleanText(previousContext.location) !== cleanText(nextContext.location)) {
    changes.push(createChange('scene', `Location shifted to ${cleanText(nextContext.location) || 'an unspecified place'}.`, timestamp));
  }

  if (cleanText(previousContext.plot) !== cleanText(nextContext.plot)) {
    changes.push(createChange('scene', `Plot focus updated: ${cleanText(nextContext.plot) || 'No plot details provided.'}`, timestamp));
  }

  const previousPlayer = previousContext.playerProfile;
  const nextPlayer = nextContext.playerProfile;
  if (
    cleanText(previousPlayer?.name) !== cleanText(nextPlayer?.name) ||
    cleanText(previousPlayer?.role) !== cleanText(nextPlayer?.role) ||
    cleanText(previousPlayer?.persona) !== cleanText(nextPlayer?.persona) ||
    cleanText(previousPlayer?.objective) !== cleanText(nextPlayer?.objective)
  ) {
    changes.push(createChange('player', 'Player identity, persona, or objective changed.', timestamp));
  }

  if (
    previousContext.contentSafety?.explicitMode !== nextContext.contentSafety?.explicitMode ||
    (previousContext.contentSafety?.blurExplicitContent ?? true) !== (nextContext.contentSafety?.blurExplicitContent ?? true) ||
    (previousContext.contentSafety?.showExplicitBadges ?? true) !== (nextContext.contentSafety?.showExplicitBadges ?? true)
  ) {
    changes.push(createChange('safety', 'Content safety rules were updated.', timestamp));
  }

  if (
    (previousContext.maxTurnsPerResponse || 3) !== (nextContext.maxTurnsPerResponse || 3) ||
    (previousContext.autoTurnOrder || 'sequential') !== (nextContext.autoTurnOrder || 'sequential')
  ) {
    changes.push(createChange('turns', 'Turn management settings changed.', timestamp));
  }

  if (JSON.stringify(previousContext.relationships || []) !== JSON.stringify(nextContext.relationships || [])) {
    changes.push(createChange('relationship', 'The social graph or relationship map changed.', timestamp));
  }

  changes.push(...diffCharacters(previousContext, nextContext, timestamp));

  return changes;
}

export function syncSceneContextTracking(nextContext: SceneContext, previousContext?: SceneContext) {
  const normalizedNextContext: SceneContext = {
    ...nextContext,
    conversationMode: normalizeConversationMode(nextContext.conversationMode),
    storyMemory: nextContext.storyMemory || createEmptyMemory(),
  };

  const existingFlow = normalizedNextContext.storyFlow;
  const previousFlow = existingFlow || previousContext?.storyFlow;
  const changes = previousContext ? diffContextChanges(previousContext, normalizedNextContext) : [];
  const recentChanges = changes.length > 0
    ? mergeChangeList(changes, existingFlow?.recentChanges || previousFlow?.recentChanges || [], MAX_RECENT_CHANGES)
    : (existingFlow?.recentChanges || previousFlow?.recentChanges || []).slice(0, MAX_RECENT_CHANGES);
  const pendingChanges = changes.length > 0
    ? mergeChangeList(changes, existingFlow?.pendingChanges || previousFlow?.pendingChanges || [], MAX_PENDING_CHANGES)
    : (existingFlow?.pendingChanges || previousFlow?.pendingChanges || []).slice(0, MAX_PENDING_CHANGES);

  const storyMemory = normalizedNextContext.storyMemory || createEmptyMemory();
  const storyMemoryDigest = buildMemoryDigest(storyMemory, normalizedNextContext.characters);

  const storyFlow: StoryFlowState = {
    setupDigest: buildSetupDigest(normalizedNextContext),
    activeGuidance: buildActiveGuidance(normalizedNextContext),
    pendingChanges,
    recentChanges,
    lastSignature: createSceneSetupSignature(normalizedNextContext),
    lastUpdated: changes.length > 0 ? Date.now() : existingFlow?.lastUpdated || previousFlow?.lastUpdated || Date.now(),
    storyMemoryDigest,
  };

  return {
    ...normalizedNextContext,
    storyFlow,
  };
}

export function acknowledgeSceneContextChanges(context: SceneContext) {
  if (!context.storyFlow || context.storyFlow.pendingChanges.length === 0) {
    return context;
  }

  return {
    ...context,
    storyFlow: {
      ...context.storyFlow,
      pendingChanges: [],
    },
  };
}
