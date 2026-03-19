import { describe, it, expect } from "vitest";
import { analyzeEmotion, analyzeEmotionDetail } from "../src/emotion/analyzer.js";

// ================================================================
// analyzeEmotion — 感情判定ユニットテスト
// ================================================================

describe("analyzeEmotion", () => {
  // --------------------------------------------------------------
  // 1. normal ケース
  // --------------------------------------------------------------
  describe("normalケース — 感情的でない普通のテキスト", () => {
    it('"こんにちは" → "normal"', () => {
      expect(analyzeEmotion("こんにちは")).toBe("normal");
    });

    it('"明日は天気が良いらしい" → "normal"', () => {
      expect(analyzeEmotion("明日は天気が良いらしい")).toBe("normal");
    });

    it('"今日の会議は14時からです" → "normal"', () => {
      expect(analyzeEmotion("今日の会議は14時からです")).toBe("normal");
    });
  });

  // --------------------------------------------------------------
  // 2. happy ケース
  // --------------------------------------------------------------
  describe("happyケース — 嬉しいキーワード・パターン", () => {
    it('"嬉しい！楽しい！" → "happy" (キーワード×2 = 3.0)', () => {
      // 嬉しい(1.5) + 楽しい(1.5) = 3.0 >= 2.0
      expect(analyzeEmotion("嬉しい！楽しい！")).toBe("happy");
    });

    it('"やった！！" → "happy" (キーワード1.5 + 連続感嘆符1.0 = 2.5)', () => {
      // やった(1.5) + !!パターン(1.0) = 2.5 >= 2.0
      expect(analyzeEmotion("やった！！")).toBe("happy");
    });

    it('"😊😄" → "happy" (絵文字2つ × 1.0 = 2.0)', () => {
      // 😊(1.0) + 😄(1.0) = 2.0 >= 2.0
      expect(analyzeEmotion("😊😄")).toBe("happy");
    });

    it('"ありがとう！最高！" → "happy" (キーワード2つ × 1.5 = 3.0)', () => {
      // ありがとう(1.5) + 最高(1.5) = 3.0 >= 2.0
      expect(analyzeEmotion("ありがとう！最高！")).toBe("happy");
    });

    it('"最高！！！nice" → "happy" (複数キーワード + パターン)', () => {
      // 最高(1.5) + nice(1.5) + !!!パターン(angryにも+1.0) = happy: 3.0
      // angry: 3つ以上感嘆符 = 1.0 → happy(3.0) > angry(1.0) → happy
      expect(analyzeEmotion("最高！！！nice")).toBe("happy");
    });

    it('音符記号 "♪" を含む → "happy" (パターンマッチ、ただしキーワードと組合せ必要)', () => {
      // ♪(1.0) + やった(1.5) = 2.5 >= 2.0
      expect(analyzeEmotion("やった♪")).toBe("happy");
    });
  });

  // --------------------------------------------------------------
  // 3. angry ケース
  // --------------------------------------------------------------
  describe("angryケース — 怒りキーワード", () => {
    it('"ふざけるな" → "angry" (キーワード1つ × 2.0 = 2.0)', () => {
      // ふざけるな(2.0) >= 2.0
      expect(analyzeEmotion("ふざけるな")).toBe("angry");
    });

    it('"うざいクソ" → "angry" (キーワード2つ × 2.0 = 4.0)', () => {
      // うざい(2.0) + クソ(2.0) = 4.0
      expect(analyzeEmotion("うざいクソ")).toBe("angry");
    });

    it('"最悪だ" → "angry" (キーワード1つ × 2.0 = 2.0)', () => {
      expect(analyzeEmotion("最悪だ")).toBe("angry");
    });

    it('"ムカつくアホ" → "angry" (キーワード2つ × 2.0 = 4.0)', () => {
      expect(analyzeEmotion("ムカつくアホ")).toBe("angry");
    });

    it('"😡" → "angry" (絵文字カウント×1.5 + ANGRY_PATTERNSヒット = 2.5 >= 2.0)', () => {
      // 😡はANGRY_EMOJIカウント(×1.5=1.5) + ANGRY_PATTERNSの怒り絵文字正規表現にもマッチ(+1.0) = 2.5
      expect(analyzeEmotion("😡")).toBe("angry");
    });

    it('"😡🤬" → "angry" (怒り絵文字2つ × 1.5 = 3.0)', () => {
      // 😡(1.5) + 🤬(1.5) = 3.0 >= 2.0
      expect(analyzeEmotion("😡🤬")).toBe("angry");
    });
  });

  // --------------------------------------------------------------
  // 4. sad ケース
  // --------------------------------------------------------------
  describe("sadケース — 悲しみキーワード・絵文字", () => {
    it('"悲しい...辛い" → "sad" (キーワード2つ × 1.5 = 3.0)', () => {
      // 悲しい(1.5) + 辛い(1.5) = 3.0 >= 2.0
      expect(analyzeEmotion("悲しい...辛い")).toBe("sad");
    });

    it('"😢😭" → "sad" (絵文字2つ × 1.0 = 2.0)', () => {
      // 😢(1.0) + 😭(1.0) = 2.0 >= 2.0
      expect(analyzeEmotion("😢😭")).toBe("sad");
    });

    it('"寂しいなあ。。。" → "sad" (キーワード1.5 + 連続ドットパターン1.0 = 2.5)', () => {
      // 寂しい(1.5) + 。。。(1.0) = 2.5
      expect(analyzeEmotion("寂しいなあ。。。")).toBe("sad");
    });

    it('"ごめん泣く" → "sad" (キーワード2つ × 1.5 = 3.0)', () => {
      // ごめん(1.5) + 泣く(1.5) = 3.0
      expect(analyzeEmotion("ごめん泣く")).toBe("sad");
    });
  });

  // --------------------------------------------------------------
  // 5. whisper ケース
  // --------------------------------------------------------------
  describe("whisperケース — ささやきキーワード", () => {
    it('"こっそり内緒" → "whisper" (キーワード2つ × 2.0 = 4.0)', () => {
      // こっそり(2.0) + 内緒(2.0) = 4.0
      expect(analyzeEmotion("こっそり内緒")).toBe("whisper");
    });

    it('"ここだけの話" → "whisper" (キーワード1つ × 2.0 = 2.0)', () => {
      // ここだけの話(2.0) >= 2.0
      expect(analyzeEmotion("ここだけの話")).toBe("whisper");
    });

    it('"誰にも言わないで秘密" → "whisper" (キーワード2つ × 2.0 = 4.0)', () => {
      // 誰にも言わないで(2.0) + 秘密(2.0) = 4.0
      expect(analyzeEmotion("誰にも言わないで秘密")).toBe("whisper");
    });

    it('"小声でひそひそ" → "whisper" (キーワード2つ × 2.0 = 4.0)', () => {
      // 小声(2.0) + ひそひそ(2.0) = 4.0
      expect(analyzeEmotion("小声でひそひそ")).toBe("whisper");
    });
  });

  // --------------------------------------------------------------
  // 6. 閾値境界テスト (THRESHOLD = 2.0)
  // --------------------------------------------------------------
  describe("閾値境界 — スコア2.0未満はnormal", () => {
    it('"嬉しい" → "normal" (キーワード1つ × 1.5 = 1.5 < 2.0)', () => {
      expect(analyzeEmotion("嬉しい")).toBe("normal");
    });

    it('"悲しい" → "normal" (キーワード1つ × 1.5 = 1.5 < 2.0)', () => {
      expect(analyzeEmotion("悲しい")).toBe("normal");
    });

    it('"最高" → "normal" (キーワード1つ × 1.5 = 1.5 < 2.0)', () => {
      expect(analyzeEmotion("最高")).toBe("normal");
    });

    it('"😊" → "normal" (happy絵文字1つ × 1.0 = 1.0 < 2.0)', () => {
      expect(analyzeEmotion("😊")).toBe("normal");
    });
  });

  // --------------------------------------------------------------
  // 7. 混合感情 — 最大スコアの感情が勝つ
  // --------------------------------------------------------------
  describe("混合感情 — 最大スコアの感情が勝つ", () => {
    it('"嬉しいけど悲しい...泣く" → "sad" (sad:4.5 > happy:1.5)', () => {
      // happy: 嬉しい(1.5)
      // sad: 悲しい(1.5) + 泣く(1.5) + 連続ドットパターン(1.0) = 4.0
      // sad(4.0) > happy(1.5) → sad
      expect(analyzeEmotion("嬉しいけど悲しい...泣く")).toBe("sad");
    });

    it('"楽しいけどふざけるな" → "angry" (angry:2.0 > happy:1.5)', () => {
      // happy: 楽しい(1.5)
      // angry: ふざけるな(2.0)
      // angry(2.0) > happy(1.5) → angry
      expect(analyzeEmotion("楽しいけどふざけるな")).toBe("angry");
    });

    it('"こっそり嬉しい！楽しい！" → "whisper" (whisper:2.0 vs happy:3.0)', () => {
      // whisper: こっそり(2.0)
      // happy: 嬉しい(1.5) + 楽しい(1.5) = 3.0
      // happy(3.0) > whisper(2.0) → happy
      expect(analyzeEmotion("こっそり嬉しい！楽しい！")).toBe("happy");
    });
  });

  // --------------------------------------------------------------
  // 8. 空文字列
  // --------------------------------------------------------------
  describe("空文字列", () => {
    it('"" → "normal"', () => {
      expect(analyzeEmotion("")).toBe("normal");
    });
  });

  // --------------------------------------------------------------
  // 9. 大文字小文字（英語キーワード）
  // --------------------------------------------------------------
  describe("大文字小文字 — 英語キーワードはlowerCaseマッチ", () => {
    it('"GOOD" → happy (good が GOOD_KEYWORDS に含まれ lowercase比較)', () => {
      // good(1.5) + nice(1.5) で "good nice" は 3.0
      expect(analyzeEmotion("GOOD nice")).toBe("happy");
    });

    it('"GREAT HAPPY" → happy (great:1.5 + happy:1.5 = 3.0)', () => {
      expect(analyzeEmotion("GREAT HAPPY")).toBe("happy");
    });

    it('"LOL" → happy (lol:1.5 ただし単体では1.5 < 2.0 → normal)', () => {
      // lol(1.5) < 2.0 → normal
      expect(analyzeEmotion("LOL")).toBe("normal");
    });

    it('"LOL LOL" → normal (includes は1マッチのみで happy=1.5 < 2.0)', () => {
      // String.includes("lol") は部分一致で1回だけマッチ → happy=1.5 < 2.0
      expect(analyzeEmotion("LOL LOL")).toBe("normal");
    });
  });
});

// ================================================================
// analyzeEmotionDetail — 詳細スコア付き感情分析テスト
// ================================================================

describe("analyzeEmotionDetail", () => {
  // --------------------------------------------------------------
  // 8. スコアオブジェクトの構造確認
  // --------------------------------------------------------------
  describe("scoresオブジェクトの構造", () => {
    it("全キーが存在する: normal, happy, angry, sad, whisper", () => {
      const result = analyzeEmotionDetail("こんにちは");
      expect(result.scores).toHaveProperty("normal");
      expect(result.scores).toHaveProperty("happy");
      expect(result.scores).toHaveProperty("angry");
      expect(result.scores).toHaveProperty("sad");
      expect(result.scores).toHaveProperty("whisper");
    });

    it("scores の各値が数値 (number) であること", () => {
      const result = analyzeEmotionDetail("嬉しい！楽しい！");
      for (const val of Object.values(result.scores)) {
        expect(typeof val).toBe("number");
      }
    });

    it("emotion フィールドが analyzeEmotion と一致する", () => {
      const text = "うざいクソ";
      const result = analyzeEmotionDetail(text);
      expect(result.emotion).toBe(analyzeEmotion(text));
    });
  });

  // --------------------------------------------------------------
  // happy テキストのスコア詳細
  // --------------------------------------------------------------
  describe("happyテキストのスコア詳細", () => {
    it('"嬉しい！楽しい！" のhappyスコアが最大', () => {
      const { scores } = analyzeEmotionDetail("嬉しい！楽しい！");
      expect(scores.happy).toBeGreaterThanOrEqual(2.0);
      expect(scores.happy).toBeGreaterThan(scores.angry);
      expect(scores.happy).toBeGreaterThan(scores.sad);
      expect(scores.happy).toBeGreaterThan(scores.whisper);
    });

    it('"嬉しい！楽しい！" のhappyスコアは3.0（キーワード×2 = 1.5×2）', () => {
      const { scores } = analyzeEmotionDetail("嬉しい！楽しい！");
      expect(scores.happy).toBe(3.0);
    });
  });

  // --------------------------------------------------------------
  // angry テキストのスコア詳細
  // --------------------------------------------------------------
  describe("angryテキストのスコア詳細", () => {
    it('"ふざけるな" のangryスコアが2.0', () => {
      const { scores } = analyzeEmotionDetail("ふざけるな");
      expect(scores.angry).toBe(2.0);
    });

    it('"ふざけるな" のemotion は "angry"', () => {
      const { emotion } = analyzeEmotionDetail("ふざけるな");
      expect(emotion).toBe("angry");
    });
  });

  // --------------------------------------------------------------
  // whisper テキストのスコア詳細
  // --------------------------------------------------------------
  describe("whisperテキストのスコア詳細", () => {
    it('"ここだけの話" のwhisperスコアが2.0', () => {
      const { scores } = analyzeEmotionDetail("ここだけの話");
      expect(scores.whisper).toBe(2.0);
    });
  });

  // --------------------------------------------------------------
  // normal テキストのスコア詳細
  // --------------------------------------------------------------
  describe("normalテキストのスコア詳細", () => {
    it('"こんにちは" の全スコアが0', () => {
      const { scores } = analyzeEmotionDetail("こんにちは");
      expect(scores.happy).toBe(0);
      expect(scores.angry).toBe(0);
      expect(scores.sad).toBe(0);
      expect(scores.whisper).toBe(0);
    });

    it('"こんにちは" のemotion は "normal"', () => {
      const { emotion } = analyzeEmotionDetail("こんにちは");
      expect(emotion).toBe("normal");
    });
  });

  // --------------------------------------------------------------
  // 空文字列
  // --------------------------------------------------------------
  describe("空文字列のスコア詳細", () => {
    it('"" の全スコアが0', () => {
      const { scores } = analyzeEmotionDetail("");
      expect(scores.happy).toBe(0);
      expect(scores.angry).toBe(0);
      expect(scores.sad).toBe(0);
      expect(scores.whisper).toBe(0);
    });
  });
});
