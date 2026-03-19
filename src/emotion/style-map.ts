// VOICEVOX スタイルマップ
// /speakers API から動的にスタイル名→感情マッピングを構築

import type { Emotion } from "./analyzer.js";
import { config } from "../config.js";

// スタイル名 → 感情カテゴリのマッピング
const STYLE_EMOTION_MAP: Record<string, Emotion> = {
  あまあま: "happy",
  ツンツン: "angry",
  セクシー: "whisper",
  ささやき: "whisper",
  ヒソヒソ: "whisper",
  怒り: "angry",
  悲しみ: "sad",
  喜び: "happy",
  泣き: "sad",
};

// speakerId → (emotion → targetSpeakerId) のマップ
type EmotionStyleMap = Map<number, Map<Emotion, number>>;

let styleMap: EmotionStyleMap = new Map();
let speakerInfo: Map<number, { character: string; style: string }> = new Map();

type VoicevoxSpeaker = {
  name: string;
  styles: { name: string; id: number }[];
};

export async function initStyleMap(): Promise<void> {
  try {
    const res = await fetch(`${config.voicevox.url}/speakers`);
    if (!res.ok) {
      console.warn("[style-map] /speakers API failed:", res.status);
      return;
    }

    const speakers: VoicevoxSpeaker[] = await res.json();
    const newMap: EmotionStyleMap = new Map();
    const newInfo: Map<number, { character: string; style: string }> = new Map();

    for (const speaker of speakers) {
      // キャラクター内のスタイルをマッピング
      const styleIds: { style: string; id: number; emotion: Emotion | null }[] = [];

      for (const style of speaker.styles) {
        newInfo.set(style.id, { character: speaker.name, style: style.name });

        // スタイル名から感情を特定
        let emotion: Emotion | null = null;
        for (const [keyword, emo] of Object.entries(STYLE_EMOTION_MAP)) {
          if (style.name.includes(keyword)) {
            emotion = emo;
            break;
          }
        }
        styleIds.push({ style: style.name, id: style.id, emotion });
      }

      // 各スタイルIDに対して、同じキャラクターの別感情スタイルをマッピング
      for (const source of styleIds) {
        const emotionMap = new Map<Emotion, number>();
        for (const target of styleIds) {
          if (target.emotion && target.id !== source.id) {
            emotionMap.set(target.emotion, target.id);
          }
        }
        if (emotionMap.size > 0) {
          newMap.set(source.id, emotionMap);
        }
      }
    }

    styleMap = newMap;
    speakerInfo = newInfo;
    console.log(`[style-map] ${speakerInfo.size} スタイル読み込み完了（${newMap.size} マッピング）`);
  } catch (err) {
    console.warn("[style-map] 初期化エラー:", err);
  }
}

export function resolveStyleId(baseSpeakerId: number, emotion: Emotion): number {
  const emotionMap = styleMap.get(baseSpeakerId);
  if (!emotionMap) return baseSpeakerId;

  const targetId = emotionMap.get(emotion);
  return targetId ?? baseSpeakerId;
}

export function getSpeakerInfo(speakerId: number): { character: string; style: string } | null {
  return speakerInfo.get(speakerId) ?? null;
}
