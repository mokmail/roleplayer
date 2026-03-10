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
  "plot": string,
  "summary": string,
  "playerProfile": {
    "name": string,
    "role": string,
    "persona": string,
    "objective": string
  },
  "contentSafety": {
    "explicitMode": "fade-to-black" | "allow",
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

Rules:
- Create 2 to 6 strong characters unless the prompt clearly asks otherwise.
- Every character must have a distinct voice, motivation, and role in the opening situation.
- Give every character a short stable id and use those ids as references in the relationships array. Create only relationships that matter for dramatic flow.
- Use "kind" as the actual relationship text shown in the graph and prompts, such as "friend", "son", "boss", or "lover".
- If a relationship is reciprocal and the roles differ by direction, set "kind" for source -> target and "reverseKind" for target -> source, such as "son" / "father".
- If a reciprocal relationship uses the same bond both ways, "reverseKind" may match "kind".
- Infer sensible defaults for turn order and explicitness settings from the prompt.
- If the prompt is ambiguous, make bold but coherent creative choices.
- Do not include markdown fences, commentary, or extra text.
      `.trim();

      const text = await generateTextWithProvider({
        provider,
        model,
        baseUrl,
        effectiveKey,
        systemInstruction,
        history: [{ role: 'user', content: prompt }],
        temperature: 0.95,
      });

      return res.json({ text });
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
        You are the "Scene Manager". Analyze the previous chat history and the current context.
        The overarching theme of this roleplay is: ${context.theme || 'Not specified'}.
        Create a short summary of the current situation (summary) and a list of the most important events (events) as structured data (structuredEvents).
        Each event should have a description, the involved characters, and a type (action, dialogue, event).
        Return ONLY valid JSON with this exact structure:
        {
          "summary": string,
          "events": string[],
          "structuredEvents": Array<{
            "id": string,
            "description": string,
            "involvedCharacters": string[],
            "type": "action" | "dialogue" | "event"
          }>
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
      });

      res.json(parseJsonObject(text));
    } catch (error: any) {
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

function parseJsonObject(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Provider did not return valid JSON for scene update');
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

async function generateTextWithProvider({
  provider,
  model,
  baseUrl,
  effectiveKey,
  systemInstruction,
  history,
  temperature,
}: {
  provider: string;
  model?: string;
  baseUrl?: string;
  effectiveKey?: string | null;
  systemInstruction: string;
  history: Array<{ role: string; content: string }>;
  temperature: number;
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
        model: model || "minimax-m2.5:cloud",
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
  const presentCharacters = context.characters.filter((c: any) => c.isPresent);
  const inactiveCharacters = context.characters.filter((c: any) => !c.isPresent);
  const storyFlow = context.storyFlow;
  const relationships = context.relationships || [];
  const describeCharacter = (id: string) => context.characters.find((character: any) => character.id === id)?.name || 'Unknown';

  return `
# ROLEPLAY ORCHESTRATOR PROTOCOL: THE DIALOGUE ARCHITECT

## YOUR ROLE
You are the **Dialogue Architect & Character Engine**. You are responsible for maintaining a living, breathing world. Your primary goal is to simulate realistic, multi-dimensional characters and determine who should speak, when, and how, based on the narrative context.

## SCENE CONTEXT
- **Roleplay Theme:** ${context.theme || 'Not specified'}
- **Location:** ${context.location}
- **Current Plot/Goal:** ${context.plot}
- **Current Situation (Summary):** ${context.summary || 'No summary available yet.'}
- **Previous Events:** 
${context.events?.map((e: string) => `- ${e}`).join('\n') || 'No events recorded.'}

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

## DIALOGUE & INTERACTION RULES
1. **Dynamic turn-taking:** Analyze the last message. If the user addressed a specific character, that character MUST respond. If it was a general action or statement, decide which 1-3 characters would realistically react based on their personalities and goals.
2. **Exhaustive Multi-Turn Format:** Every response MUST follow the format: **Name:** [Dialogue and Action]. Start a new paragraph for EACH character speaking.
3. **No User Takeover:** NEVER write for the [USER].
4. **Cinematic Narration:** Use *italics* for physical actions, facial expressions, and environmental changes. Blend dialogue with action to enhance the "nature" of the scene.
5. **Character Voice:** Use the "Vibe" and "Personality" fields to define unique speech patterns. A "Scholarly" wizard uses complex syntax; a "Street Urchin" uses slang and short sentences.
6. **The Paradox Factor:** Occasionally let the character's Paradox influence their response (e.g., a powerful wizard showing a moment of cowardice or skepticism).
7. **Setup Tracking Is Authoritative:** Treat the tracked setup digest and pending setup changes as the latest source of truth. If any setup item changed, immediately honor it in the next response without arguing with or ignoring the update.
8. **Relationship Canon:** Treat the relationship graph as canon. Use it to shape loyalty, resentment, attraction, power imbalance, secrecy, and who trusts whom. Secret links should influence subtext without being exposed unless the scene justifies it. If a relationship is marked reciprocal, both characters should feel or recognize that bond unless notes specify nuance. When reciprocal labels differ by direction, honor each side's role exactly as written.
`;
}

startServer();
