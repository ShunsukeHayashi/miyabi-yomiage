// URLを「URL省略」に置換
const URL_REGEX = /https?:\/\/[^\s]+/g;

// カスタム絵文字 <:name:id> を名前に置換
const CUSTOM_EMOJI_REGEX = /<a?:(\w+):\d+>/g;

// メンション <@!?id> を除去
const MENTION_REGEX = /<@!?\d+>/g;

// チャンネルメンション <#id> を除去
const CHANNEL_MENTION_REGEX = /<#\d+>/g;

// ロールメンション <@&id> を除去
const ROLE_MENTION_REGEX = /<@&\d+>/g;

// コードブロック
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const INLINE_CODE_REGEX = /`[^`]+`/g;

// スポイラー
const SPOILER_REGEX = /\|\|[\s\S]*?\|\|/g;

// 繰り返し文字の圧縮（wwwwww → www）
const REPEAT_CHAR_REGEX = /(.)\1{4,}/g;

export function filterText(text: string): string {
  let result = text;

  // コードブロック → 「コード省略」
  result = result.replace(CODE_BLOCK_REGEX, "コード省略");
  result = result.replace(INLINE_CODE_REGEX, "コード");

  // スポイラー → 「ネタバレ」
  result = result.replace(SPOILER_REGEX, "ネタバレ");

  // URL → 「URL省略」
  result = result.replace(URL_REGEX, "URL省略");

  // カスタム絵文字 → 名前のみ
  result = result.replace(CUSTOM_EMOJI_REGEX, "$1");

  // メンション類を除去
  result = result.replace(MENTION_REGEX, "");
  result = result.replace(CHANNEL_MENTION_REGEX, "");
  result = result.replace(ROLE_MENTION_REGEX, "");

  // 繰り返し文字の圧縮
  result = result.replace(REPEAT_CHAR_REGEX, "$1$1$1");

  // 連続空白の整理
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

export function shouldSkip(text: string): boolean {
  // Bot自身のメッセージ、空テキスト、コマンドプレフィクス
  if (!text || text.trim().length === 0) return true;
  if (text.startsWith("/")) return true; // スラッシュコマンド

  // フィルター後に何も残らない場合
  const filtered = filterText(text);
  return filtered.trim().length === 0;
}
