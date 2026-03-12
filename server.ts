import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Mistral } from "@mistralai/mistralai";
import { Groq } from "groq-sdk";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 4000;

  app.use(express.json());

  // API Routes
  app.post("/api/chat", async (req, res) => {
    const { provider, model, apiKey, baseUrl, context, history } = req.body;
    const effectiveKey = resolveApiKey(provider, apiKey);

    if (!effectiveKey && provider !== 'ollama') {
      return res.status(400).json({ error: `No API key found for provider: ${provider}` });
    }

    try {
      const systemInstruction = constructSystemInstruction(context);
      const text = await generateTextWithProvider({ provider, model, baseUrl, effectiveKey, systemInstruction, history, temperature: 0.9 });
      return res.json({ text });
    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/story-setup", async (req, res) => {
    const { provider, model, apiKey, baseUrl, prompt } = req.body;
    const effectiveKey = resolveApiKey(provider, apiKey);

    if (!effectiveKey && provider !== 'ollama') {
      return res.status(400).json({ error: `No API key found for provider: ${provider}` });
    }

    try {
      const systemInstruction = `
You are the Quick Story Generator for a roleplay orchestrator.
Your task is to convert a single detailed user prompt into a complete roleplay setup.

Return ONLY valid JSON with this exact top-level structure:
{
  "theme": string,
  "location": string,
  "conversationMode": "tele" | "presence",
  "role": string,
  "persona": string,
  "objective": string,
  "contentSafety": {
    "explicitMode": "fade-to-black" | "allow",
    "vulgarityLevel": "low" | "medium" | "high" | "extreme",
    "blurExplicitContent": boolean,
    "showExplicitBadges": boolean
  },
  "relationships": [
    {
      "sourceCharacterId": string,
      "targetCharacterId": string,
      "kind": string,
      "reciprocal": boolean,
      "reverseKind": string,
      "intensity": number,
      "visibility": "public" | "private" | "secret",
      "notes": string
    }
  ],
  "maxTurnsPerResponse": number,
  "autoTurnOrder": "sequential" | "random" | "manual",
  "characters": [
    {
      "id": string,
      "name": string,
      "personality": string,
      "backstory": string,
      "isPresent": boolean,
      "race": string,
      "profession": string,
      "alignment": string,
      "background": string,
      "age": string,
      "gender": string,
      "magicSystem": string,
      "socialStanding": string,
      "powerSource": string,
      "vibe": string,
      "paradox": string
    }
  ]
}

CRITICAL ID MAPPING RULES:
- The character "id" field MUST be a lowercase, simple identifier derived from the character's name (e.g., "John" -> "john", "Sarah Miller" -> "sarah")
- Use ONLY lowercase letters, numbers, and underscores in IDs
- The "id" should be 2-15 characters long
- The "sourceCharacterId" and "targetCharacterId" in relationships MUST exactly match the "id" values of the characters array
- Example: If you have a character with "name": "John" and "id": "john", then any relationship involving John MUST use "john" as the sourceCharacterId or targetCharacterId
- NEVER use different ID formats for the same character

Rules:
- Create 2 to 6 strong characters unless the prompt clearly asks otherwise.
- Every character must have a distinct voice, motivation, and role in the opening situation.
- Give every character a simple lowercase ID derived from their name and use those exact IDs in the relationships array.
- Use "kind" as the actual relationship text shown in the graph and prompts, such as "friend", "son", "boss", or "lover".
- If a relationship is reciprocal and the roles differ by direction, set "kind" for source -> target and "reverseKind" for target -> source, such as "son" / "father".
- If a reciprocal relationship uses the same bond both ways, "reverseKind" may match "kind".
- Infer sensible defaults for turn order and explicitness settings from the prompt.
- If the prompt is ambiguous, make bold but coherent creative choices.
- Do not include markdown fences, commentary, or extra text.
- Output ONLY the JSON object - no surrounding text or explanation.
      `.trim();

      const text = await generateTextWithProvider({
        provider,
        model,
        baseUrl,
        effectiveKey,
        systemInstruction,
        history: [{ role: 'user', content: prompt }],
        temperature: 0.95,
        responseMimeType: 'application/json',
      });

      // attempt to parse on the server for convenience, but if parsing fails
      // fall back to returning the raw text so the client can repair it.
      try {
        const parsed = parseJsonObject(text);
        return res.json(parsed);
      } catch (parseError: any) {
        console.warn("Story setup JSON parse failed, returning raw text to client", {
          error: parseError.message,
          raw: text,
        });
        // send the text back to the client so the front-end can run its own
        // extractor/repair routines instead of dropping the result entirely.
        return res.json({ text });
      }
    } catch (error: any) {
      console.error("Story setup API error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/scene-update", async (req, res) => {
    const { provider, model, apiKey, baseUrl, context, history } = req.body;
    const effectiveKey = resolveApiKey(provider, apiKey);

    if (!effectiveKey && provider !== 'ollama') {
      return res.status(400).json({ error: `No API key found for provider: ${provider}` });
    }

    try {
      const systemInstruction = `
        You are the "Scene Manager & Quality Agent". Analyze the previous chat history and the current context.
        The overarching theme of this roleplay is: ${context.theme || 'Not specified'}.
        
        Your primary goal is to ensure natural conversation flow and prevent the story from stalling or losing its path.
        
        Tasks:
        1. Create a short summary of the current situation (summary).
        2. Extract a list of the most important events (events) and structured data (structuredEvents).
        3. Conduct a "Quality Analysis" of the dialogue:
           - narrativePath: Describe the current active narrative trajectory (where is this conversation going?).
           - conversationVelocity: A score from 0-10 on how much the plot is actually moving forward.
           - stalledTopics: Identify any repetitive loops or topics that have been exhausted.
           - recommendedPrompts: Suggest 2-3 "Quality Nudges" to keep things natural and moving.
           - bottleneckCharacters: Identify characters who are either hogging the spotlight or are present but being ignored.

        Summaries and events must respect the active mode: in telechat, describe message exchanges and remote actions; in presence mode, describe physical scene beats and in-person interactions.
        
        Return ONLY valid JSON with this exact structure:
        {
          "summary": string,
          "events": string[],
          "structuredEvents": Array<{
            "id": string,
            "description": string,
            "involvedCharacters": string[],
            "type": "action" | "dialogue" | "event"
          }>,
          "qualityAnalysis": {
            "narrativePath": string,
            "conversationVelocity": number,
            "stalledTopics": string[],
            "recommendedPrompts": string[],
            "bottleneckCharacters": string[]
          }
        }
      `;

      const text = await generateTextWithProvider({
        provider,
        model,
        baseUrl,
        effectiveKey,
        systemInstruction,
        history: [
          {
            role: 'user',
            content: `Context: ${JSON.stringify(context)}\n\nHistory: ${JSON.stringify(history.filter((m: any) => !m.isHidden))}`
          }
        ],
        temperature: 0.4,
        responseMimeType: 'application/json',
      });

      try {
        const parsed = parseJsonObject(text);
        return res.json(parsed);
      } catch (parseError: any) {
        console.warn("Scene update returned invalid JSON, forwarding raw text", parseError.message);
        return res.json({ text });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // new endpoint to interpret instructor commands
  app.post("/api/context-update", async (req, res) => {
    const { provider, model, apiKey, baseUrl, context, instruction } = req.body;
    const effectiveKey = resolveApiKey(provider, apiKey);

    if (!effectiveKey && provider !== 'ollama') {
      return res.status(400).json({ error: `No API key found for provider: ${provider}` });
    }

    try {
      const systemInstruction = `
You are the Roleplay Context Editor.
The current scene context is provided below as JSON. A user instruction follows describing how the context should be changed (e.g. move location, add or modify characters, alter plot, change safety settings, etc.).
Produce valid JSON representing a PATCH to the existing context, not a full rebuild.
Return only the fields that should change.
Do not regenerate unchanged setup data.
Do not replace the full cast or full relationship graph unless the instruction explicitly asks for a complete rewrite.
When modifying an existing character, return only that character entry with the same "id" when known, or the same "name" if no id is available.
When adding a new character, include only the new character entry.
When modifying a relationship, return only the changed or new relationship entries.
    Preserve the existing conversationMode unless the instruction clearly asks to switch between tele/remote chat and in-person/presence.
    If the instruction implies texting, calling, DMs, online chat, or remote messaging, use "conversationMode": "tele".
    If the instruction implies a shared room, face-to-face interaction, arrival at a place, or physical co-presence, use "conversationMode": "presence".
Do NOT include any explanatory text or markdown, just the JSON object.
Current context: ${JSON.stringify(context)}
Instruction: ${instruction}
      `;

      const text = await generateTextWithProvider({
        provider,
        model,
        baseUrl,
        effectiveKey,
        systemInstruction,
        history: [{ role: 'user', content: instruction }],
        temperature: 0.3,
        responseMimeType: 'application/json',
      });

      try {
        const parsed = parseJsonObject(text);
        return res.json(parsed);
      } catch (parseError: any) {
        console.warn("Context update returned invalid JSON, forwarding raw text", parseError.message);
        return res.json({ text });
      }
    } catch (error: any) {
      console.error("Context update API error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/location-suggestions", async (req, res) => {
    const { provider, model, apiKey, baseUrl, context, scenes } = req.body;
    const effectiveKey = resolveApiKey(provider, apiKey);

    if (!effectiveKey && provider !== 'ollama') {
      return res.status(400).json({ error: `No API key found for provider: ${provider}` });
    }

    try {
      const systemInstruction = `
You are the Location Agent for a roleplay orchestrator.
Analyze the full setup and propose scene locations that best fit the narrative momentum.

You are given:
- Current scene context (theme, plot, cast, relationships, mode, safety settings)
- Existing scene list snapshots from the current session

Return ONLY valid JSON with this exact structure:
{
  "suggestions": [
    {
      "location": string,
      "rationale": string,
      "transitionHook": string,
      "fitsMode": "tele" | "presence" | "both"
    }
  ]
}

Rules:
- Return 3 to 6 suggestions.
- Make each location specific and scene-ready (not generic).
- Ensure rationales explicitly reference setup elements (relationships, plot pressure, mode constraints, power dynamics, secrets, etc.).
- If conversation mode is telechat, include remote-friendly options; if presence, include physically co-present options.
- Keep each rationale concise (1-2 sentences).
- Do not include markdown, comments, or extra text.
      `.trim();

      const text = await generateTextWithProvider({
        provider,
        model,
        baseUrl,
        effectiveKey,
        systemInstruction,
        history: [
          {
            role: 'user',
            content: `Current context: ${JSON.stringify(context)}\n\nSession scenes: ${JSON.stringify(scenes || [])}`,
          }
        ],
        temperature: 0.5,
        responseMimeType: 'application/json',
      });

      try {
        const parsed = parseJsonObject(text);
        return res.json(parsed);
      } catch (parseError: any) {
        console.warn("Location suggestions returned invalid JSON, forwarding raw text", parseError.message);
        return res.json({ text });
      }
    } catch (error: any) {
      console.error("Location suggestions API error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/scene-transition", async (req, res) => {
    const { provider, model, apiKey, baseUrl, fromContext, toContext, fromMessages, reason, scenes } = req.body;
    const effectiveKey = resolveApiKey(provider, apiKey);

    if (!effectiveKey && provider !== 'ollama') {
      return res.status(400).json({ error: `No API key found for provider: ${provider}` });
    }

    try {
      const systemInstruction = `
You are the Scene Transition Knowledge Agent for a roleplay orchestrator.
Your job is to preserve continuity and create natural follow-up momentum between scenes.

You receive:
- Previous scene context and recent dialogue
- New target scene context
- Transition reason text
- Existing scene list metadata

Return ONLY valid JSON with this exact structure:
{
  "transitionNarration": string,
  "knowledgeCarryover": string[],
  "followUpBeats": string[],
  "updatedPlot": string
}

Rules:
- transitionNarration must be concise, cinematic, and feel like a natural handoff.
- knowledgeCarryover must list 3-7 concrete continuity facts from prior scene(s) to preserve.
- followUpBeats must list 2-5 immediate in-scene beats to keep momentum.
- updatedPlot should adapt the next scene's plot with continuity from previous scene.
- Respect conversation mode differences (tele vs presence) in narration and beats.
- Do not include markdown fences or extra commentary.
      `.trim();

      const text = await generateTextWithProvider({
        provider,
        model,
        baseUrl,
        effectiveKey,
        systemInstruction,
        history: [
          {
            role: 'user',
            content: `Transition reason: ${reason || 'Scene shift requested'}\n\nFrom context: ${JSON.stringify(fromContext)}\n\nTo context: ${JSON.stringify(toContext)}\n\nRecent messages: ${JSON.stringify((fromMessages || []).slice(-16))}\n\nScene list: ${JSON.stringify(scenes || [])}`,
          }
        ],
        temperature: 0.45,
        responseMimeType: 'application/json',
      });

      try {
        const parsed = parseJsonObject(text);
        return res.json(parsed);
      } catch (parseError: any) {
        console.warn("Scene transition agent returned invalid JSON, forwarding raw text", parseError.message);
        return res.json({ text });
      }
    } catch (error: any) {
      console.error("Scene transition API error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function resolveApiKey(provider: string, apiKey?: string) {
  return apiKey || (
    provider === 'gemini' ? process.env.GEMINI_API_KEY :
    provider === 'openai' ? process.env.OPENAI_API_KEY :
    provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY :
    provider === 'mistral' ? process.env.MISTRAL_API_KEY :
    provider === 'groq' ? process.env.GROQ_API_KEY : null
  );
}

function normalizeConversationMode(mode?: string): 'tele' | 'presence' {
  const normalized = (mode || '').trim().toLowerCase().replace(/[^a-z]/g, '');

  if (normalized === 'tele' || normalized === 'telechat' || normalized === 'remote' || normalized === 'messaging' || normalized === 'chat' || normalized === 'dm') {
    return 'tele';
  }

  return 'presence';
}

function buildConversationModeGuidance(conversationMode?: string) {
  if (normalizeConversationMode(conversationMode) === 'tele') {
    return `
## CONVERSATION MODE DIRECTIVE: TELECHAT / REMOTE MESSAGING
- Treat the scene as remote communication through texts, chat, DMs, calls, or digital messages unless the context explicitly says otherwise.
- Characters cannot perform visible in-person actions on one another in the current exchange. Do NOT describe touching, entering the room, eye contact, body positioning, or other shared physical staging as if they are co-present.
- Favor message-like beats: typing delays, read receipts, attached photos, voice notes, abrupt disconnects, missed calls, reactions, or carefully edited replies when appropriate to the tone.
- Environmental details should come from what each character reports, sends, or implies remotely, not from a shared physical camera view.
- If a character is not present in the chat thread, they should not suddenly speak unless the narrative clearly introduces them into the telechat.
- Keep action text anchored to remote behavior such as *typing...*, *sends a photo*, *goes silent*, *leaves the chat*, or *calls back later*.
`.trim();
  }

  return `
## CONVERSATION MODE DIRECTIVE: IN PERSON / SHARED SPACE
- Treat the scene as physical co-presence in a shared location.
- Characters may use body language, movement, proximity, objects in the environment, entrances, exits, and spatial reactions.
- Dialogue should feel grounded in what can be directly seen, heard, and physically experienced in the current location.
- Remote-only cues such as read receipts, typing indicators, DMs, or message reactions should not appear unless a character explicitly uses a device in-scene.
- When a present character reacts, include sensory or physical staging where useful: posture, distance, gestures, interruptions, glances, or changes in the room.
`.trim();
}

function repairJsonText(text: string) {
  let repaired = text.trim().replace(/```[a-z]*/gi, '').trim();

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
        chunks.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return chunks;
}

function parseJsonObject(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const chunks = splitTopLevelJsonObjects(cleaned);

  if (chunks.length === 0) {
    throw new Error('Provider did not return valid JSON');
  }

  if (chunks.length === 1) {
    return JSON.parse(repairJsonText(chunks[0]));
  }

  return chunks.reduce<Record<string, unknown>>((merged, chunk) => {
    const parsedChunk = JSON.parse(repairJsonText(chunk)) as Record<string, unknown>;
    return { ...merged, ...parsedChunk };
  }, {});
}

async function generateTextWithProvider({
  provider,
  model,
  baseUrl,
  effectiveKey,
  systemInstruction,
  history,
  temperature,
  responseMimeType,
}: {
  provider: string;
  model?: string;
  baseUrl?: string;
  effectiveKey?: string | null;
  systemInstruction: string;
  history: Array<{ role: string; content: string }>;
  temperature: number;
  responseMimeType?: string;
}) {
  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: effectiveKey! });
    const contents = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: model || "gemini-3.1-pro-preview",
      contents,
      config: {
        systemInstruction,
        temperature,
        ...(responseMimeType ? { responseMimeType } : {}),
      },
    });

    return response.text;
  }

  if (provider === 'openai') {
    const openai = new OpenAI({ apiKey: effectiveKey! });
    const response = await openai.chat.completions.create({
      model: model || "gpt-4o",
      messages: [
        { role: 'system', content: systemInstruction },
        ...history.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      ] as any,
      temperature,
    });
    return response.choices[0].message.content || "";
  }

  if (provider === 'anthropic') {
    const anthropic = new Anthropic({ apiKey: effectiveKey! });
    const response = await anthropic.messages.create({
      model: model || "claude-3-5-sonnet-latest",
      max_tokens: 4096,
      system: systemInstruction,
      messages: history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })) as any,
      temperature,
    });
    return (response.content[0] as any).text || "";
  }

  if (provider === 'mistral') {
    const mistral = new Mistral({ apiKey: effectiveKey! });
    const response = await mistral.chat.complete({
      model: model || "mistral-large-latest",
      messages: [
        { role: 'system', content: systemInstruction },
        ...history.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      ] as any,
      temperature,
    });
    return (response.choices?.[0].message.content as string) || "";
  }

  if (provider === 'groq') {
    const groq = new Groq({ apiKey: effectiveKey! });
    const response = await groq.chat.completions.create({
      model: model || "llama-3.3-70b-versatile",
      messages: [
        { role: 'system', content: systemInstruction },
        ...history.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      ] as any,
      temperature,
    });
    return response.choices[0].message.content || "";
  }

  if (provider === 'ollama') {
    const response = await fetch(`${baseUrl || 'http://localhost:11434'}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || "ministral-3:14b-cloud",
        messages: [
          { role: 'system', content: systemInstruction },
          ...history.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        ],
        stream: false,
        options: { temperature }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${error}`);
    }

    const data = await response.json();
    return data.message.content || "";
  }

  throw new Error("Unsupported provider");
}

function constructSystemInstruction(context: any) {
  const playingAsChar = context.characters.find((c: any) => c.id === context.playerProfile?.playingAsCharacterId);
  const effectivePlayerProfile = playingAsChar ? {
    name: playingAsChar.name,
    role: playingAsChar.profession || playingAsChar.alignment || 'Unknown',
    persona: `Personality: ${playingAsChar.personality}. Backstory: ${playingAsChar.backstory || 'N/A'}. Power Source: ${playingAsChar.powerSource || 'N/A'}. Vibe: ${playingAsChar.vibe || 'N/A'}. Paradox: ${playingAsChar.paradox || 'N/A'}`,
    objective: context.playerProfile?.objective || 'No personal objective defined.'
  } : context.playerProfile;

  const presentCharacters = context.characters.filter((c: any) => c.isPresent && c.id !== context.playerProfile?.playingAsCharacterId);
  const inactiveCharacters = context.characters.filter((c: any) => !c.isPresent && c.id !== context.playerProfile?.playingAsCharacterId);
  
  // Important: Explicitly identify the player role for the AI
  const playerIdentitySummary = playingAsChar 
    ? `The PLAYER is actings as **${playingAsChar.name}**. All user input is ${playingAsChar.name}'s speech and actions. DO NOT respond as ${playingAsChar.name}.`
    : `The PLAYER is acting as a Narrator/Instructor. All user input is meta-instruction or narration.`;

  const storyFlow = context.storyFlow;
  const relationships = context.relationships || [];
  const describeCharacter = (id: string) => context.characters.find((character: any) => character.id === id)?.name || 'Unknown';
  const conversationModeGuidance = buildConversationModeGuidance(context.conversationMode);
  
  const vulgarityLevel = context.contentSafety?.vulgarityLevel || 'medium';
  const vulgarityGuidance = {
    low: "Maintain a G-rated/Clean PG-13 atmosphere. No profanity. Use euphemisms or omit harsh language entirely.",
    medium: "Standard PG-13/TV-MA. Minor profanity is allowed if character-appropriate. Avoid excessive or gratuitous vulgarity.",
    high: "Rated R. Strong language, coarse dialogue, and raw expressions are encouraged where they fit the character's personality and the scene's intensity.",
    extreme: "Unfiltered/NC-17. Characters may use extremely vulgar, crude, or abrasive language. No linguistic filters apply to character dialogue or internal monologue."
  }[vulgarityLevel as 'low' | 'medium' | 'high' | 'extreme'] || "Standard PG-13 levels of vulgarity.";

  return `
# ROLEPLAY ORCHESTRATOR PROTOCOL: THE DIALOGUE ARCHITECT

## YOUR ROLE
You are the **Dialogue Architect & Character Engine**. You are responsible for maintaining a living, breathing world. Your primary goal is to simulate realistic, multi-dimensional characters and determine who should speak, when, and how, based on the narrative context.

## PLAYER IDENTITY (CRITICAL GAME RULES)
${playerIdentitySummary}
- **STRICT EXCLUSION**: You are FORBIDDEN from generating words, thoughts, or actions for the character the PLAYER has taken control of (**${playingAsChar?.name || 'none'}**).
- **AI CHARACTER POOL**: Every character listed under "Present Characters (Active)" who is NOT the player's character is now an AI-driven NPC.
- **HISTORY INTERPRETATION**: Entries marked with the player's character name are HUMAN actions. All other characters' entries are your responsibility to continue if appropriate.
- **GAMEPLAY FLOW**: When the user speaks as their character, reacting as the other present AI characters to create a dynamic "Game Player vs World" feel.

## CONTENT CONTROLS
- **VULGARITY LEVEL:** ${vulgarityLevel.toUpperCase()}
- **GUIDANCE:** ${vulgarityGuidance}

## SCENE CONTEXT
- **Roleplay Theme:** ${context.theme || 'Not specified'}
- **Location:** ${context.location}
- **Conversation Mode:** (ignored)
- **Current Plot/Goal:** ${context.plot}
- **Current Situation (Summary):** ${context.summary || 'No summary available yet.'}
- **Previous Events:** 
${context.events?.map((e: string) => `- ${e}`).join('\n') || 'No events recorded.'}

## PLAYER PROFILE
- **Player Name:** ${effectivePlayerProfile?.name || 'The User'}
- **Player Role:** ${effectivePlayerProfile?.role || 'Unspecified'}
- **Player Persona:** ${effectivePlayerProfile?.persona || 'No persona defined.'}
- **Player Objective:** ${effectivePlayerProfile?.objective || 'No personal objective defined.'}
${playingAsChar ? `\n### IMPORTANT: PLAYER IDENTITY
The player is CURRENTLY SPEAKING for **${playingAsChar.name}**. Do not treat ${playingAsChar.name} as a separate AI character while the user is playing as them. The user's input counts as ${playingAsChar.name}'s dialogue and actions.` : ''}

## SETUP MEMORY
- **Tracked Setup Digest:**
${storyFlow?.setupDigest || 'No tracked setup digest available.'}
- **Active Guidance:**
${storyFlow?.activeGuidance?.map((entry: string) => `  - ${entry}`).join('\n') || '  - No active guidance available.'}
- **Pending Setup Changes:**
${storyFlow?.pendingChanges?.map((change: any) => `  - ${change.summary}`).join('\n') || '  - No pending setup changes.'}

## RELATIONSHIP GRAPH
${relationships.length > 0
  ? relationships.map((relationship: any) => {
      const sourceName = describeCharacter(relationship.sourceCharacterId);
      const targetName = describeCharacter(relationship.targetCharacterId);
      const reverseKind = relationship.reverseKind || relationship.reverseLabel || relationship.kind || relationship.label;

      return `- ${sourceName} ${relationship.reciprocal ? '↔' : '→'} ${targetName}
    - ${sourceName} → ${targetName}: ${relationship.kind || relationship.label || 'relationship'}
${relationship.reciprocal ? `    - ${targetName} → ${sourceName}: ${reverseKind}
` : ''}    - Reciprocal: ${relationship.reciprocal ? 'Yes' : 'No'}
    - Intensity: ${relationship.intensity}/5
    - Visibility: ${relationship.visibility}
    - Notes: ${relationship.notes || 'None'}`;
    }).join('\n')
  : '- No declared relationships.'}

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

## MODE AWARENESS
${conversationModeGuidance}

## DIALOGUE & INTERACTION RULES
1. **STRICT ELIGIBILITY & SOCIAL AWARENESS**: 
   - **ONLY** characters listed under **Present Characters (Active)** may take part in the conversation.
   - **AUDIENCE AWARENESS (CRITICAL)**: Characters MUST be aware of EVERYONE present in the scene. If there are more than two people, characters should naturally guard their secrets or sensitive relationships unless they intend for the third party to hear.
   - **SOCIAL DYNAMICS**: Adjust the tone of conversations based on who is listening. A character might be flirtatious in private but professional in a group; trusting in 1-on-1 but suspicious in a crowd.
  - **EXCLUSION**: You MUST NOT generate dialogue, thoughts, or actions for **${playingAsChar?.name || "the player's character"}**.
   - **Inactive Characters (Observing)** are NOT in the scene and MUST NOT speak, act, or be addressed directly as if they were present.
2. **Dynamic turn-taking:** Analyze the last message. If the user addressed a specific character (and that character is present and NOT the player), that character MUST respond. If it was a general action or statement, decide which 1-3 eligible characters would realistically react.
2. **Exhaustive Multi-Turn Format:** Every response MUST follow the format: **Name:** [Dialogue and Action]. Start a new paragraph for EACH character speaking.
3. **No System Voice:** NEVER output turns labeled "System", "Narrator", "Assistant", or "AI". Only in-world character voices are allowed in visible dialogue.
4. **No User Takeover:** NEVER write for the [USER].
5. **Mode-Locked Narration:** Use *italics* for actions, but the actions must obey the active conversation mode. In telechat, actions are remote communication behaviors only. In presence mode, actions may include physical staging and environment interaction.
6. **Character Voice:** Use the "Vibe" and "Personality" fields to define unique speech patterns. A "Scholarly" wizard uses complex syntax; a "Street Urchin" uses slang and short sentences.
7. **The Paradox Factor:** Occasionally let the character's Paradox influence their response (e.g., a powerful wizard showing a moment of cowardice or skepticism).
8. **Setup Tracking Is Authoritative:** Treat the tracked setup digest and pending setup changes as the latest source of truth. If any setup item changed, immediately honor it in the next response without arguing with or ignoring the update.
9. **Relationship Canon:** Treat the relationship graph as canon. Use it to shape loyalty, resentment, attraction, power imbalance, secrecy, and who trusts whom. Secret links should influence subtext without being exposed unless the scene justifies it. If a relationship is marked reciprocal, both characters should feel or recognize that bond unless notes specify nuance. When reciprocal labels differ by direction, honor each side's role exactly as written.
10. **Mode Consistency Is Mandatory:** Never mix telechat framing with shared-room staging in the same reply unless the context explicitly transitions from one mode to the other.
`;
}

startServer();
