import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  type VoiceConnection,
  type AudioPlayer,
} from "@discordjs/voice";
import type { VoiceBasedChannel } from "discord.js";
import { textToSpeech, bufferToReadable } from "../tts/voicevox.js";
import { filterText, shouldSkip } from "../text/filter.js";
import { getServerSettings, getUserSettings, getDictionary, getEmotionEnabled } from "../db/database.js";
import { analyzeEmotion } from "../emotion/analyzer.js";
import { resolveStyleId } from "../emotion/style-map.js";
// node:stream is used by bufferToReadable in tts/voicevox.ts

// Voice管理定数
const MAX_QUEUE_SIZE = 50;
const VOICE_CONNECT_TIMEOUT_MS = 30_000;
const VOICE_RECONNECT_TIMEOUT_MS = 5_000;
const PENDING_CONNECT_TIMEOUT_MS = 35_000;
const QUEUE_RETRY_DELAY_MS = 100;

type QueueItem = {
  text: string;
  speaker: number;
  speed: number;
};

type GuildVoiceState = {
  connection: VoiceConnection;
  player: AudioPlayer;
  queue: QueueItem[];
  playing: boolean;
  channelId: string;
};

const guildStates = new Map<string, GuildVoiceState>();
// 接続中のギルドを追跡して重複接続を防止
const pendingConnections = new Map<string, Promise<GuildVoiceState>>();

export function getVoiceState(guildId: string): GuildVoiceState | undefined {
  return guildStates.get(guildId);
}

export function isConnected(guildId: string): boolean {
  const state = guildStates.get(guildId);
  if (!state) return false;
  return state.connection.state.status !== VoiceConnectionStatus.Destroyed;
}

export function isConnecting(guildId: string): boolean {
  return pendingConnections.has(guildId);
}

export async function joinChannel(channel: VoiceBasedChannel): Promise<GuildVoiceState> {
  const guildId = channel.guild.id;

  // 既に接続済みなら再利用
  const existing = guildStates.get(guildId);
  if (existing && existing.connection.state.status !== VoiceConnectionStatus.Destroyed) {
    if (existing.channelId === channel.id) return existing;
    existing.connection.destroy();
  }

  // 接続中なら既存のPromiseを待つ（重複接続防止）
  const pending = pendingConnections.get(guildId);
  if (pending) {
    console.log(`[voice] guild=${guildId} は接続中 — 既存の接続を待機`);
    return pending;
  }

  const promise = connectToChannel(channel);
  pendingConnections.set(guildId, promise);

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("接続タイムアウト（pendingConnections保護）")), PENDING_CONNECT_TIMEOUT_MS),
    );
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    pendingConnections.delete(guildId);
  }
}

async function connectToChannel(channel: VoiceBasedChannel): Promise<GuildVoiceState> {
  const guildId = channel.guild.id;

  console.log(`[voice] joinVoiceChannel: guild=${guildId} channel=${channel.id}`);

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guildId,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  connection.on("stateChange", (oldState, newState) => {
    console.log(`[voice] state: ${oldState.status} → ${newState.status}`);
  });

  connection.on("error", (error: Error) => {
    console.error(`[voice] connection error:`, error.message);
  });

  const player = createAudioPlayer();
  connection.subscribe(player);

  const state: GuildVoiceState = {
    connection,
    player,
    queue: [],
    playing: false,
    channelId: channel.id,
  };

  // 接続待機
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, VOICE_CONNECT_TIMEOUT_MS);
  } catch {
    console.error(`[voice] 接続タイムアウト — 最終ステート: ${connection.state.status}`);
    if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
      connection.destroy();
    }
    throw new Error("ボイスチャンネルへの接続がタイムアウトしました");
  }

  // 再生完了時にキューを処理
  player.on(AudioPlayerStatus.Idle, () => {
    state.playing = false;
    processQueue(guildId).catch(console.error);
  });

  // 切断時のクリーンアップ
  connection.on(VoiceConnectionStatus.Destroyed, () => {
    guildStates.delete(guildId);
  });

  // 予期しない切断からの復帰
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, VOICE_RECONNECT_TIMEOUT_MS),
        entersState(connection, VoiceConnectionStatus.Connecting, VOICE_RECONNECT_TIMEOUT_MS),
      ]);
    } catch {
      if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
        connection.destroy();
      }
    }
  });

  guildStates.set(guildId, state);
  console.log(`[voice] 接続成功: guild=${guildId} channel=${channel.id}`);
  return state;
}

export function leaveChannel(guildId: string): boolean {
  const state = guildStates.get(guildId);
  if (!state) return false;
  state.queue.length = 0;
  state.player.stop();
  state.connection.destroy();
  guildStates.delete(guildId);
  return true;
}

function applyDictionary(text: string, guildId: string): string {
  const dict = getDictionary(guildId);
  if (dict.size === 0) return text;

  // 長いワードから先にマッチさせる（部分一致の誤置換を防止）
  const words = [...dict.keys()].sort((a, b) => b.length - a.length);
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(escaped.join("|"), "g");

  return text.replace(pattern, (match) => dict.get(match) ?? match);
}

export async function enqueueMessage(
  guildId: string,
  text: string,
  userId?: string,
  username?: string,
): Promise<void> {
  const state = guildStates.get(guildId);
  if (!state) return;

  if (shouldSkip(text)) return;

  // 入力バリデーション
  if (text.length > 5000) {
    console.warn(`[voice] テキストが長すぎます (${text.length}文字) guild=${guildId} — スキップ`);
    return;
  }

  const serverSettings = getServerSettings(guildId);
  const userSettings = userId ? getUserSettings(guildId, userId) : null;

  // 話者・速度の決定（ユーザー設定 > サーバー設定）
  const baseSpeaker = userSettings?.speaker_id ?? serverSettings.speaker_id;
  const speed = userSettings?.speed ?? serverSettings.speed;
  // 速度の範囲制限（VOICEVOX: 0.5〜2.0）
  const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));

  // テキスト前処理
  let processedText = filterText(text);
  processedText = applyDictionary(processedText, guildId);

  // ユーザー名読み上げ
  if (serverSettings.read_username && username) {
    const displayName = userSettings?.nickname ?? username;
    processedText = `${displayName}、${processedText}`;
  }

  // 最大文字数チェック
  if (processedText.length > serverSettings.max_length) {
    processedText = processedText.slice(0, serverSettings.max_length) + "...以下省略";
  }

  // 感情分析 → スタイル自動切替
  let speaker = baseSpeaker;
  const emotionEnabled = userId ? getEmotionEnabled(guildId, userId) : true;
  if (emotionEnabled) {
    const emotion = analyzeEmotion(processedText);
    if (emotion !== "normal") {
      speaker = resolveStyleId(baseSpeaker, emotion);
    }
  }

  // キューサイズ制限（メモリ保護）
  if (state.queue.length >= MAX_QUEUE_SIZE) {
    console.warn(`[voice] キュー上限到達 (${MAX_QUEUE_SIZE}) guild=${guildId} — 古いメッセージを破棄`);
    state.queue.shift();
  }

  state.queue.push({ text: processedText, speaker, speed: clampedSpeed });
  if (!state.playing) {
    await processQueue(guildId);
  }
}

async function processQueue(guildId: string): Promise<void> {
  const state = guildStates.get(guildId);
  if (!state || state.playing || state.queue.length === 0) return;

  const item = state.queue.shift();
  if (!item) return;

  state.playing = true;

  try {
    const audioBuffer = await textToSpeech(item.text, item.speaker, item.speed);
    const readable = bufferToReadable(audioBuffer);
    const resource = createAudioResource(readable, {
      inputType: StreamType.Arbitrary,
    });
    state.player.play(resource);
  } catch (err) {
    console.error("[voice] TTS error:", err);
    state.playing = false;
    // 非同期で次のアイテムを処理（スタックオーバーフロー防止）
    setTimeout(() => processQueue(guildId).catch(console.error), QUEUE_RETRY_DELAY_MS);
  }
}
