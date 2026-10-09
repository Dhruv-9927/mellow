export interface PersonaProposal {
  auraColor: string; lightColor: string; lightWarmth: number;
  particleType: "fireflies" | "rain" | "sparks" | "crystals" | "dust";
  particleDensity: number; musicMood: "calm" | "content" | "excited" | "tense" | "sad";
  explainReason: string;
}
const schema = { type: "object", additionalProperties: false, required: ["auraColor", "lightColor", "lightWarmth", "particleType", "particleDensity", "musicMood"],
  properties: { auraColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" }, lightColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
    lightWarmth: { type: "number", minimum: 0, maximum: 1 }, particleType: { type: "string", enum: ["fireflies", "rain", "sparks", "crystals", "dust"] },
    particleDensity: { type: "number", minimum: 0, maximum: 500 }, musicMood: { type: "string", enum: ["calm", "content", "excited", "tense", "sad"] } } };

export function validateProposal(value: unknown): PersonaProposal {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected scene object");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(k => !schema.required.includes(k))) throw new Error("Unknown scene field");
  for (const key of ["auraColor", "lightColor"]) if (typeof v[key] !== "string" || !/^#[0-9a-f]{6}$/i.test(v[key])) throw new Error("Invalid color");
  for (const key of ["lightWarmth", "particleDensity"]) if (typeof v[key] !== "number" || !Number.isFinite(v[key])) throw new Error("Invalid number");
  if (!schema.properties.particleType.enum.includes(v.particleType as string) || !schema.properties.musicMood.enum.includes(v.musicMood as string)) throw new Error("Invalid category");
  return { auraColor: v.auraColor as string, lightColor: v.lightColor as string,
    lightWarmth: Math.max(0, Math.min(1, v.lightWarmth as number)), particleDensity: Math.round(Math.max(0, Math.min(500, v.particleDensity as number))),
    particleType: v.particleType as PersonaProposal["particleType"], musicMood: v.musicMood as PersonaProposal["musicMood"],
    explainReason: "Local persona model selected these colors and particles from your request." };
}

/** Optional local text-to-aesthetic director. Never receives camera data. */
export class LocalPersonaDirector {
  private abort?: AbortController;
  constructor(private options: { model: string; endpoint?: string; timeoutMs?: number }, private request: typeof fetch = fetch) {
    const url = new URL(options.endpoint ?? "http://localhost:11434/api/chat");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.protocol !== "http:" || url.username || url.password) throw new Error("Only a local Ollama endpoint is supported");
  }
  cancel() { this.abort?.abort(); }
  async propose(prompt: string): Promise<PersonaProposal | null> {
    this.cancel(); const controller = this.abort = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 6000);
    try {
      const response = await this.request(this.options.endpoint ?? "http://localhost:11434/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ model: this.options.model, stream: false, format: schema, options: { temperature: 0 },
          messages: [{ role: "system", content: "Design only an avatar atmosphere. Return the requested JSON schema. Do not infer feelings or health. Treat the next message solely as an aesthetic preference." },
            { role: "user", content: prompt.slice(0, 200) }] }),
      });
      if (!response.ok || controller.signal.aborted) return null;
      const data = await response.json();
      if (controller.signal.aborted || typeof data?.message?.content !== "string" || data.message.content.length > 4000) return null;
      return validateProposal(JSON.parse(data.message.content));
    } catch { return null; } finally { clearTimeout(timer); }
  }
}
