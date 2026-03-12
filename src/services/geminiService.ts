import { SceneContext, Message, AIConfig } from "../types";

async function readApiPayload<T = any>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`The server returned an empty response (${response.status} ${response.statusText}). If you just changed the backend, restart the dev server and try again.`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return { text: raw } as T;
  }
}

async function readApiError(response: Response, fallbackMessage: string) {
  try {
    const payload = await readApiPayload<{ error?: string; text?: string }>(response);
    return payload.error || payload.text || `${fallbackMessage} (${response.status} ${response.statusText})`;
  } catch (error: any) {
    return error.message || `${fallbackMessage} (${response.status} ${response.statusText})`;
  }
}

function escapeControlCharactersInStrings(text: string) {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      result += char;
      inString = !inString;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        result += '\\n';
        continue;
      }
      if (char === '\r') {
        result += '\\r';
        continue;
      }
      if (char === '\t') {
        result += '\\t';
        continue;
      }
    }

    result += char;
  }

  return result;
}

function repairJsonText(text: string) {
  let repaired = escapeControlCharactersInStrings(text.trim().replace(/```[a-z]*/gi, '').trim());

  repaired = repaired.replace(/'([^'\n]*)'\s+'([^']+)'\s*:/g, "'$1', '$2':");
  repaired = repaired.replace(/"([^"]+)"\s+"([^"]+)"\s*:\s*/g, '"$1", "$2": ');
  repaired = repaired.replace(/([\]\}])\s+("[a-zA-Z_])/g, '$1, $2');
  repaired = repaired.replace(/,\s*([\]\}])/g, '$1');
  repaired = repaired.replace(/'([^'\n]*)'/g, (match) => match.replace(/'/g, '"'));
  repaired = repaired.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  repaired = repaired.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}\]])/g, (match, value, end) => {
    if (value === 'true' || value === 'false' || value === 'null') {
      return `: ${value}${end}`;
    }
    return `: "${value}"${end}`;
  });
  repaired = repaired.replace(/("[^"]+"\s*:\s*"[^"]+")\s*(?=\n\s*"[^"]+"\s*:)/g, '$1,');
  repaired = repaired.replace(/(^\s*"[^"]+"\s*:\s*.*?,\s*$)\n\s*[^\n:{}\[\]]+\s*$\n(?=\s*"[^"]+"\s*:)/gm, '$1\n');

  return repaired;
}

function splitTopLevelJsonObjects(text: string) {
  const chunks: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

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

    if (inString) continue;

    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        chunks.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return chunks;
}

function parsePossiblyMalformedJson(rawText: string) {
  const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const chunks = splitTopLevelJsonObjects(cleaned);

  if (chunks.length === 0) {
    throw new Error('The server did not return valid JSON.');
  }

  if (chunks.length === 1) {
    return JSON.parse(repairJsonText(chunks[0]));
  }

  return chunks.reduce<Record<string, unknown>>((merged, chunk) => {
    const parsedChunk = JSON.parse(repairJsonText(chunk)) as Record<string, unknown>;
    return { ...merged, ...parsedChunk };
  }, {});
}

function normalizeSceneStatePayload(payload: any) {
  const structuredEvents = Array.isArray(payload?.structuredEvents)
    ? payload.structuredEvents.map((event: any, index: number) => ({
        id: typeof event?.id === 'string' && event.id.trim() ? event.id : `event-${Date.now()}-${index}`,
        description: typeof event?.description === 'string' ? event.description : '',
        involvedCharacters: Array.isArray(event?.involvedCharacters)
          ? event.involvedCharacters.filter((item: unknown) => typeof item === 'string')
          : [],
        type: event?.type === 'action' || event?.type === 'dialogue' || event?.type === 'event'
          ? event.type
          : 'event',
      }))
    : [];

  return {
    summary: typeof payload?.summary === 'string' ? payload.summary : '',
    events: Array.isArray(payload?.events) ? payload.events.filter((item: unknown) => typeof item === 'string') : [],
    structuredEvents,
  };
}

export async function generateRoleplayResponse(
  config: AIConfig,
  context: SceneContext,
  history: Message[]
) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      context,
      history
    })
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Failed to generate response'));
  }

  const data = await readApiPayload<{ text: string }>(response);
  return data.text;
}

export async function updateSceneState(
  config: AIConfig,
  context: SceneContext,
  history: Message[]
) {
  const response = await fetch('/api/scene-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      context,
      history
    })
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Failed to update scene'));
  }

  const payload = await readApiPayload<any>(response);

  if (payload && typeof payload === 'object' && 'text' in payload && typeof payload.text === 'string') {
    return normalizeSceneStatePayload(parsePossiblyMalformedJson(payload.text));
  }

  return normalizeSceneStatePayload(payload);
}

export async function generateCharacterDetails(
  config: AIConfig,
  prompt: string
) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      context: { location: 'Character Creation', plot: 'Generating a new character', characters: [] },
      history: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Failed to generate character details'));
  }

  const data = await readApiPayload<{ text: string }>(response);
  return data.text;
}

export async function generateStorySetup(
  config: AIConfig,
  prompt: string
) {
  const response = await fetch('/api/story-setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      prompt,
    })
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Failed to generate story setup'));
  }

  // server may return either a parsed object or an object containing a
  // `text` property when it was unable to parse the model output.  The
  // caller is responsible for normalizing/repairing the payload.
  return readApiPayload<any>(response);
}

export async function generateContextUpdate(
  config: AIConfig,
  context: SceneContext,
  instruction: string
) {
  const response = await fetch('/api/context-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      context,
      instruction,
    })
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Failed to update context'));
  }

  return readApiPayload<any>(response);
}

export async function generateLocationSuggestions(
  config: AIConfig,
  context: SceneContext,
  scenes: Array<{ id: string; name: string; context: SceneContext; createdAt: number; updatedAt: number }>
) {
  const response = await fetch('/api/location-suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      context,
      scenes,
    })
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Failed to generate location suggestions'));
  }

  const payload = await readApiPayload<any>(response);

  if (payload && typeof payload === 'object' && 'text' in payload && typeof payload.text === 'string') {
    return parsePossiblyMalformedJson(payload.text);
  }

  return payload;
}

export async function generateSceneTransitionPlan(
  config: AIConfig,
  payload: {
    fromContext: SceneContext;
    toContext: SceneContext;
    fromMessages: Message[];
    reason: string;
    scenes: Array<{ id: string; name: string; createdAt: number; updatedAt: number }>;
  }
) {
  const response = await fetch('/api/scene-transition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      ...payload,
    })
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Failed to generate scene transition plan'));
  }

  const result = await readApiPayload<any>(response);

  if (result && typeof result === 'object' && 'text' in result && typeof result.text === 'string') {
    return parsePossiblyMalformedJson(result.text);
  }

  return result;
}

function constructSystemInstruction(context: any) {
  const presentCharacters = context.characters?.filter((c: any) => c.isPresent) || [];
  const inactiveCharacters = context.characters?.filter((c: any) => !c.isPresent) || [];

  const maxTurns = context.maxTurnsPerResponse || 3;
  const turnOrder = context.autoTurnOrder || 'sequential';

  let turnLogic = '';
  if (turnOrder === 'sequential') {
    turnLogic = `Follow a natural sequential order based on who was spoken to or who is most relevant to the situation. Respond with up to **${maxTurns}** characters maximum.`;
  } else if (turnOrder === 'random') {
    turnLogic = `React with a random selection of up to **${maxTurns}** present characters who haven't spoken recently.`;
  } else {
    turnLogic = `Wait for specific triggers or direct mentions before a character speaks. Keep responses brief and focused.`;
  }

  return `
# ROLEPLAY ORCHESTRATOR PROTOCOL: THE DIALOGUE ARCHITECT

## YOUR ROLE
You are the **Dialogue Architect & Character Engine**. You are responsible for maintaining a living, breathing world. Your primary goal is to simulate realistic, multi-dimensional characters and determine who should speak, when, and how, based on the narrative context.

## SCENE CONTEXT
- **Roleplay Theme:** ${context.theme || 'Not specified'}
- **Location:** ${context.location}
- **Conversation Mode:** ${context.conversationMode === 'tele' ? 'tele/messaging' : 'presence/in-person'}
- **Current Plot/Goal:** ${context.plot}
- **Current Situation (Summary):** ${context.summary || 'No summary available yet.'}
- **Max Characters per Turn:** ${maxTurns}
- **Turn Order Strategy:** ${turnOrder}
- **Previous Events:** 
${context.events?.map((e: string) => `- ${e}`).join('\n') || 'No events recorded.'}

## PLAYER PROFILE
- **Player Name:** ${context.playerProfile?.name || 'The User'}
- **Player Role:** ${context.playerProfile?.role || 'Unspecified'}
- **Player Persona:** ${context.playerProfile?.persona || 'No persona defined.'}
- **Player Objective:** ${context.playerProfile?.objective || 'No personal objective defined.'}

## CONTENT SAFETY
- **Explicit Content Mode:** ${context.contentSafety?.explicitMode || 'fade-to-black'}
- **Blur Explicit Content In UI:** ${context.contentSafety?.blurExplicitContent ? 'Enabled' : 'Disabled'}
- **Show Explicit Indicators:** ${context.contentSafety?.showExplicitBadges ? 'Enabled' : 'Disabled'}

## CHARACTER PROFILES
### Present Characters (Active)
${presentCharacters.map((c: any) => `- **${c.name}**
    - Personality: ${c.personality}
    - Backstory: ${c.backstory || 'N/A'}
    - Magic/System: ${c.magicSystem || 'N/A'}
    - Social Standing: ${c.socialStanding || 'N/A'}
    - Power Source: ${c.powerSource || 'N/A'}
    - Vibe: ${c.vibe || 'N/A'}
    - Paradox: ${c.paradox || 'N/A'}`).join('\n')}

### Inactive Characters (Observing)
${inactiveCharacters.map((c: any) => `- ${c.name}`).join('\n')}

## DIALOGUE & INTERACTION RULES
1. **Strict Presence Only:** Only characters listed under **Present Characters (Active)** may take part in the conversation. **Inactive Characters (Observing)** are NOT in the scene and MUST NOT speak, act, or be addressed directly by other characters as if they were present.
2. **Dynamic turn-taking:** ${turnLogic} Analyze the last message. If the user addressed a specific character, that character MUST respond. 
3. **Exhaustive Multi-Turn Format:** Every response MUST follow the format: **Name:** [Dialogue and Action]. Start a new paragraph for EACH character speaking.
4. **No User Takeover:** NEVER write for the [USER].
5. **Respect Player Identity:** Treat the player as an in-world participant with the profile above. Characters may react to the player's stated role, reputation, and objective, but never decide the player's feelings, speech, or actions.
6. **Cinematic Narration:** Use *italics* for physical actions, facial expressions, and environmental changes. Blend dialogue with action to enhance the "nature" of the scene.
7. **Character Voice:** Use the "Vibe" and "Personality" fields to define unique speech patterns. A "Scholarly" wizard uses complex syntax; a "Street Urchin" uses slang and short sentences.
8. **The Paradox Factor:** Occasionally let the character's Paradox influence their response (e.g., a powerful wizard showing a moment of cowardice or skepticism).
9. **Explicit Content Rules:** If explicit content mode is "fade-to-black", avoid graphic sexual detail and imply intimate moments with restrained language. If explicit content mode is "allow" and a turn contains explicit sexual content, include the marker [explicit] once near the start of that turn so the UI can indicate and blur it.
`;
}
