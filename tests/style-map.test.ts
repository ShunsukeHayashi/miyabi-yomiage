import { describe, it, expect, beforeAll, vi } from "vitest";

// config モジュールを vi.mock でモックし、
// VOICEVOX_URL を存在しないアドレスに向けてフォールバックを強制する
vi.mock("../src/config.js", () => ({
  config: {
    discord: { token: "", clientId: "" },
    voicevox: {
      url: "http://localhost:19999", // 存在しないポート → fetch 失敗 → フォールバック
      defaultSpeaker: 3,
      defaultSpeed: 1.2,
      maxTextLength: 200,
    },
    autoJoin: false,
  },
}));

import { initStyleMap, resolveStyleId, getSpeakerInfo } from "../src/emotion/style-map.js";

// VOICEVOX 未接続時のハードコードフォールバックマップに基づくテスト
// フォールバック定義:
//   ずんだもん  : ノーマル(3), あまあま(1), ツンツン(7), ささやき(22)
//   四国めたん  : ノーマル(2), あまあま(0), ツンツン(6), ささやき(36)
//   春日部つむぎ: ノーマル(8) のみ（バリエーションなし）

describe("style-map (フォールバックマップ強制)", () => {
  beforeAll(async () => {
    // config がモックされているため fetch は http://localhost:19999 に向かい失敗する
    // → ハードコードのデフォルトマップが使われる
    await initStyleMap();
  });

  // ----------------------------------------------------------------
  // resolveStyleId テスト
  // ----------------------------------------------------------------
  describe("resolveStyleId", () => {
    describe("ずんだもん ノーマル (id=3)", () => {
      it("happy → 1 (あまあま)", () => {
        expect(resolveStyleId(3, "happy")).toBe(1);
      });

      it("angry → 7 (ツンツン)", () => {
        expect(resolveStyleId(3, "angry")).toBe(7);
      });

      it("whisper → 22 (ささやき)", () => {
        expect(resolveStyleId(3, "whisper")).toBe(22);
      });
    });

    describe("ずんだもん あまあま (id=1)", () => {
      it("angry → 7 (ツンツン)", () => {
        expect(resolveStyleId(1, "angry")).toBe(7);
      });

      it("happy → 1 (自分自身 — happy ターゲットが自分なのでマップに登録されない)", () => {
        // フォールバック構築: targetId !== id のときのみ emotionMap に登録
        // ID=1 の happy ターゲットは 1 (同じ) なので登録なし → baseSpeakerId を返す
        expect(resolveStyleId(1, "happy")).toBe(1);
      });

      it("whisper → 22 (ささやき)", () => {
        expect(resolveStyleId(1, "whisper")).toBe(22);
      });
    });

    describe("四国めたん ノーマル (id=2)", () => {
      it("happy → 0 (あまあま)", () => {
        expect(resolveStyleId(2, "happy")).toBe(0);
      });

      it("angry → 6 (ツンツン)", () => {
        expect(resolveStyleId(2, "angry")).toBe(6);
      });

      it("whisper → 36 (ささやき)", () => {
        expect(resolveStyleId(2, "whisper")).toBe(36);
      });
    });

    describe("春日部つむぎ ノーマル (id=8) — バリエーションなし", () => {
      it("happy → 8 (自分自身)", () => {
        // フォールバックマップに春日部つむぎのエントリなし
        expect(resolveStyleId(8, "happy")).toBe(8);
      });

      it("angry → 8 (自分自身)", () => {
        expect(resolveStyleId(8, "angry")).toBe(8);
      });

      it("whisper → 8 (自分自身)", () => {
        expect(resolveStyleId(8, "whisper")).toBe(8);
      });
    });

    describe("未知の speakerId", () => {
      it("unknown(999) + happy → 999 (マップにないので自分自身)", () => {
        expect(resolveStyleId(999, "happy")).toBe(999);
      });

      it("ID=0 (四国めたんあまあま) + sad → 0 (フォールバックに sad マッピングなし)", () => {
        // フォールバックには sad エントリが定義されていない
        expect(resolveStyleId(0, "sad")).toBe(0);
      });
    });
  });

  // ----------------------------------------------------------------
  // getSpeakerInfo テスト
  // ----------------------------------------------------------------
  describe("getSpeakerInfo", () => {
    it("3 → ずんだもん ノーマル", () => {
      expect(getSpeakerInfo(3)).toEqual({ character: "ずんだもん", style: "ノーマル" });
    });

    it("0 → 四国めたん あまあま", () => {
      expect(getSpeakerInfo(0)).toEqual({ character: "四国めたん", style: "あまあま" });
    });

    it("2 → 四国めたん ノーマル", () => {
      expect(getSpeakerInfo(2)).toEqual({ character: "四国めたん", style: "ノーマル" });
    });

    it("8 → 春日部つむぎ ノーマル", () => {
      expect(getSpeakerInfo(8)).toEqual({ character: "春日部つむぎ", style: "ノーマル" });
    });

    it("1 → ずんだもん あまあま", () => {
      expect(getSpeakerInfo(1)).toEqual({ character: "ずんだもん", style: "あまあま" });
    });

    it("7 → ずんだもん ツンツン", () => {
      expect(getSpeakerInfo(7)).toEqual({ character: "ずんだもん", style: "ツンツン" });
    });

    it("22 → ずんだもん ささやき", () => {
      expect(getSpeakerInfo(22)).toEqual({ character: "ずんだもん", style: "ささやき" });
    });

    it("6 → 四国めたん ツンツン", () => {
      expect(getSpeakerInfo(6)).toEqual({ character: "四国めたん", style: "ツンツン" });
    });

    it("36 → 四国めたん ささやき", () => {
      expect(getSpeakerInfo(36)).toEqual({ character: "四国めたん", style: "ささやき" });
    });

    it("未知のID(999) → null", () => {
      expect(getSpeakerInfo(999)).toBeNull();
    });

    it("未知のID(500) → null", () => {
      expect(getSpeakerInfo(500)).toBeNull();
    });
  });
});
