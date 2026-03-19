import Database from "better-sqlite3";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "..", "data", "yomiage.db");

// dataディレクトリを作成
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// WALモード
db.pragma("journal_mode = WAL");

// テーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS server_settings (
    guild_id TEXT PRIMARY KEY,
    speaker_id INTEGER DEFAULT 3,
    speed REAL DEFAULT 1.2,
    auto_join INTEGER DEFAULT 1,
    read_username INTEGER DEFAULT 1,
    max_length INTEGER DEFAULT 200
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    speaker_id INTEGER DEFAULT NULL,
    speed REAL DEFAULT NULL,
    nickname TEXT DEFAULT NULL,
    emotion_enabled INTEGER DEFAULT 1,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS dictionary (
    guild_id TEXT NOT NULL,
    word TEXT NOT NULL,
    reading TEXT NOT NULL,
    PRIMARY KEY (guild_id, word)
  );
`);

export type ServerSettings = {
  guild_id: string;
  speaker_id: number;
  speed: number;
  auto_join: number;
  read_username: number;
  max_length: number;
};

export type UserSettings = {
  guild_id: string;
  user_id: string;
  speaker_id: number | null;
  speed: number | null;
  nickname: string | null;
  emotion_enabled: number;
};

// サーバー設定
const getServerStmt = db.prepare<[string], ServerSettings>(
  "SELECT * FROM server_settings WHERE guild_id = ?",
);
const upsertServerStmt = db.prepare(`
  INSERT INTO server_settings (guild_id, speaker_id, speed, auto_join, read_username, max_length)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    speaker_id = excluded.speaker_id,
    speed = excluded.speed,
    auto_join = excluded.auto_join,
    read_username = excluded.read_username,
    max_length = excluded.max_length
`);

export function getServerSettings(guildId: string): ServerSettings {
  const row = getServerStmt.get(guildId);
  if (row) return row;
  return {
    guild_id: guildId,
    speaker_id: 3,
    speed: 1.2,
    auto_join: 1,
    read_username: 1,
    max_length: 200,
  };
}

export function setServerSettings(settings: ServerSettings): void {
  upsertServerStmt.run(
    settings.guild_id,
    settings.speaker_id,
    settings.speed,
    settings.auto_join,
    settings.read_username,
    settings.max_length,
  );
}

// ユーザー設定
const getUserStmt = db.prepare<[string, string], UserSettings>(
  "SELECT * FROM user_settings WHERE guild_id = ? AND user_id = ?",
);
const upsertUserStmt = db.prepare(`
  INSERT INTO user_settings (guild_id, user_id, speaker_id, speed, nickname)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(guild_id, user_id) DO UPDATE SET
    speaker_id = excluded.speaker_id,
    speed = excluded.speed,
    nickname = excluded.nickname
`);

export function getUserSettings(guildId: string, userId: string): UserSettings | null {
  return getUserStmt.get(guildId, userId) ?? null;
}

export function setUserSettings(settings: UserSettings): void {
  upsertUserStmt.run(
    settings.guild_id,
    settings.user_id,
    settings.speaker_id,
    settings.speed,
    settings.nickname,
  );
}

// 辞書
const getDictStmt = db.prepare<[string], { word: string; reading: string }>(
  "SELECT word, reading FROM dictionary WHERE guild_id = ?",
);
const upsertDictStmt = db.prepare(`
  INSERT INTO dictionary (guild_id, word, reading)
  VALUES (?, ?, ?)
  ON CONFLICT(guild_id, word) DO UPDATE SET reading = excluded.reading
`);
const deleteDictStmt = db.prepare(
  "DELETE FROM dictionary WHERE guild_id = ? AND word = ?",
);

export function getDictionary(guildId: string): Map<string, string> {
  const rows = getDictStmt.all(guildId);
  return new Map(rows.map((r) => [r.word, r.reading]));
}

export function setDictionaryEntry(guildId: string, word: string, reading: string): void {
  upsertDictStmt.run(guildId, word, reading);
}

export function deleteDictionaryEntry(guildId: string, word: string): boolean {
  const result = deleteDictStmt.run(guildId, word);
  return result.changes > 0;
}

// 感情分析 ON/OFF
export function getEmotionEnabled(guildId: string, userId: string): boolean {
  const row = db.prepare<[string, string], { emotion_enabled: number }>(
    "SELECT emotion_enabled FROM user_settings WHERE guild_id = ? AND user_id = ?",
  ).get(guildId, userId);
  return row?.emotion_enabled !== 0; // デフォルト有効
}

export function setEmotionEnabled(guildId: string, userId: string, enabled: boolean): void {
  db.prepare(`
    INSERT INTO user_settings (guild_id, user_id, emotion_enabled)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET emotion_enabled = excluded.emotion_enabled
  `).run(guildId, userId, enabled ? 1 : 0);
}

// 既存DBのマイグレーション（emotion_enabled カラム追加）
try {
  db.exec("ALTER TABLE user_settings ADD COLUMN emotion_enabled INTEGER DEFAULT 1");
  console.log("[db] Migration: emotion_enabled column added");
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg.includes("duplicate column")) {
    console.warn("[db] Migration unexpected error:", msg);
  }
}

export function closeDatabase(): void {
  db.close();
}
