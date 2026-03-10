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

  return readApiPayload(response);
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

  const data = await readApiPayload<{ text: string }>(response);
  return data.text as string;
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
1. **Dynamic turn-taking:** ${turnLogic} Analyze the last message. If the user addressed a specific character, that character MUST respond. 
2. **Exhaustive Multi-Turn Format:** Every response MUST follow the format: **Name:** [Dialogue and Action]. Start a new paragraph for EACH character speaking.
3. **No User Takeover:** NEVER write for the [USER].
4. **Respect Player Identity:** Treat the player as an in-world participant with the profile above. Characters may react to the player's stated role, reputation, and objective, but never decide the player's feelings, speech, or actions.
5. **Cinematic Narration:** Use *italics* for physical actions, facial expressions, and environmental changes. Blend dialogue with action to enhance the "nature" of the scene.
6. **Character Voice:** Use the "Vibe" and "Personality" fields to define unique speech patterns. A "Scholarly" wizard uses complex syntax; a "Street Urchin" uses slang and short sentences.
7. **The Paradox Factor:** Occasionally let the character's Paradox influence their response (e.g., a powerful wizard showing a moment of cowardice or skepticism).
8. **Explicit Content Rules:** If explicit content mode is "fade-to-black", avoid graphic sexual detail and imply intimate moments with restrained language. If explicit content mode is "allow" and a turn contains explicit sexual content, include the marker [explicit] once near the start of that turn so the UI can indicate and blur it.
`;
}
