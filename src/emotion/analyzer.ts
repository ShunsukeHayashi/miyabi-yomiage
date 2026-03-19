// 感情分析エンジン（ルールベース）
// 外部API不要 — テキストのキーワード・パターンからスコアリング

export type Emotion = "normal" | "happy" | "angry" | "sad" | "whisper";

type EmotionScore = Record<Emotion, number>;

type EmotionResult = {
  emotion: Emotion;
  scores: EmotionScore;
};

// キーワード辞書（スコア加算方式）
const HAPPY_KEYWORDS = [
  "嬉しい", "楽しい", "ありがとう", "最高", "すごい", "やった",
  "わーい", "うれしい", "たのしい", "素敵", "素晴らしい", "幸せ",
  "おめでとう", "いいね", "good", "nice", "great", "happy",
  "笑", "www", "草", "ワロタ", "ウケる", "面白い", "lol",
];

const ANGRY_KEYWORDS = [
  "怒", "ふざけるな", "うざい", "クソ", "くそ", "きもい",
  "最悪", "ムカつく", "むかつく", "いい加減にしろ", "うるさい",
  "死ね", "消えろ", "バカ", "ばか", "アホ", "あほ",
];

const SAD_KEYWORDS = [
  "悲しい", "辛い", "つらい", "寂しい", "さみしい", "泣",
  "泣く", "涙", "しんどい", "ごめん", "すみません", "申し訳",
  "失敗", "ダメ", "だめ", "無理", "やばい",
];

const WHISPER_KEYWORDS = [
  "こっそり", "内緒", "ひそひそ", "秘密", "小声",
  "ここだけの話", "誰にも言わないで",
];

// パターンマッチ（正規表現）
const HAPPY_PATTERNS = [
  /[!！]{2,}/, // 連続感嘆符
  /[♪♫♬♩]/,  // 音符記号
  /[\u{1F3B5}\u{1F3B6}]/u,  // 音符絵文字
];

const ANGRY_PATTERNS = [
  /[!！]{3,}/, // 3つ以上の感嘆符
  /[\u{1F4A2}\u{1F620}\u{1F621}\u{1F624}]/u, // 怒り系絵文字
];

const SAD_PATTERNS = [
  /[。.]{3,}/, // 連続ドット
  /\.{3,}/,
  /orz/i,
];

// 絵文字カウント（Unicode安全）
function countEmoji(text: string, emojiSet: string[]): number {
  let count = 0;
  for (const emoji of emojiSet) {
    const chars = [...text];
    for (const c of chars) {
      if (c === emoji) count++;
    }
  }
  return count;
}

const HAPPY_EMOJI = ["😊", "😄", "😁", "🥰", "😍", "🤗", "✨", "🎉", "🎊", "👍", "💕", "❤️"];
const SAD_EMOJI = ["😢", "😭", "😞", "😔", "💔", "🥺", "😿"];
const ANGRY_EMOJI = ["😡", "🤬", "💢", "👊"];

function calculateScores(text: string): EmotionScore {
  const scores: EmotionScore = {
    normal: 0,
    happy: 0,
    angry: 0,
    sad: 0,
    whisper: 0,
  };

  const lower = text.toLowerCase();

  // キーワードマッチ
  for (const kw of HAPPY_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) scores.happy += 1.5;
  }
  for (const kw of ANGRY_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) scores.angry += 2.0;
  }
  for (const kw of SAD_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) scores.sad += 1.5;
  }
  for (const kw of WHISPER_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) scores.whisper += 2.0;
  }

  // パターンマッチ
  for (const pat of HAPPY_PATTERNS) {
    if (pat.test(text)) scores.happy += 1.0;
  }
  for (const pat of ANGRY_PATTERNS) {
    if (pat.test(text)) scores.angry += 1.0;
  }
  for (const pat of SAD_PATTERNS) {
    if (pat.test(text)) scores.sad += 1.0;
  }

  // 絵文字カウント
  scores.happy += countEmoji(text, HAPPY_EMOJI) * 1.0;
  scores.sad += countEmoji(text, SAD_EMOJI) * 1.0;
  scores.angry += countEmoji(text, ANGRY_EMOJI) * 1.5;

  return scores;
}

const THRESHOLD = 2.0;

export function analyzeEmotion(text: string): Emotion {
  const scores = calculateScores(text);

  let maxEmotion: Emotion = "normal";
  let maxScore = 0;

  for (const [emotion, score] of Object.entries(scores) as [Emotion, number][]) {
    if (emotion === "normal") continue;
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = emotion;
    }
  }

  return maxScore >= THRESHOLD ? maxEmotion : "normal";
}

export function analyzeEmotionDetail(text: string): EmotionResult {
  const scores = calculateScores(text);
  const emotion = analyzeEmotion(text);
  return { emotion, scores };
}
