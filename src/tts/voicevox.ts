import { config } from "../config.js";
import { Readable } from "node:stream";

const BASE_URL = config.voicevox.url;

type AudioQuery = Record<string, unknown>;

export async function createAudioQuery(
  text: string,
  speaker: number = config.voicevox.defaultSpeaker,
): Promise<AudioQuery> {
  const url = `${BASE_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`;
  const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`VOICEVOX audio_query failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as AudioQuery;
}

export async function synthesis(
  query: AudioQuery,
  speaker: number = config.voicevox.defaultSpeaker,
  speed: number = config.voicevox.defaultSpeed,
): Promise<Buffer> {
  // speedScaleを上書き
  const modifiedQuery = { ...query, speedScale: speed };

  const url = `${BASE_URL}/synthesis?speaker=${speaker}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(modifiedQuery),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`VOICEVOX synthesis failed: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function textToSpeech(
  text: string,
  speaker?: number,
  speed?: number,
): Promise<Buffer> {
  const spk = speaker ?? config.voicevox.defaultSpeaker;
  const spd = speed ?? config.voicevox.defaultSpeed;
  const query = await createAudioQuery(text, spk);
  return synthesis(query, spk, spd);
}

export function bufferToReadable(buf: Buffer): Readable {
  const readable = new Readable();
  readable.push(buf);
  readable.push(null);
  return readable;
}

export async function getSpeakers(): Promise<Array<{ name: string; styles: Array<{ name: string; id: number }> }>> {
  const res = await fetch(`${BASE_URL}/speakers`);
  if (!res.ok) {
    throw new Error(`VOICEVOX speakers failed: ${res.status}`);
  }
  return (await res.json()) as Array<{ name: string; styles: Array<{ name: string; id: number }> }>;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/version`);
    return res.ok;
  } catch {
    return false;
  }
}
