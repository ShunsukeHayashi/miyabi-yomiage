import { describe, it, expect } from "vitest";
import { filterText, shouldSkip } from "../src/text/filter.js";

describe("filterText", () => {
  // --- URL置換 ---
  // URL_REGEX = /https?:\/\/[^\s]+/g は「非空白文字を貪欲にマッチ」するため
  // URLの直後に空白なしで日本語テキストが続く場合、そのテキストもURLとして取り込まれる
  it("スペース区切りのURLを「URL省略」に置換する", () => {
    expect(filterText("見て https://example.com です")).toBe(
      "見て URL省略 です"
    );
  });

  it("URLのみを「URL省略」に置換する", () => {
    expect(filterText("https://example.com")).toBe("URL省略");
  });

  it("複数のURLをすべて置換する（スペース区切り）", () => {
    expect(filterText("https://a.com と https://b.com")).toBe(
      "URL省略 と URL省略"
    );
  });

  it("URLと日本語テキストがスペースなしで連続する場合、日本語もURLに取り込まれる", () => {
    // /[^\s]+/ は非空白を貪欲マッチ → "https://example.comです" が全体でマッチする
    expect(filterText("見てhttps://example.comです")).toBe("見てURL省略");
  });

  // --- カスタム絵文字 ---
  it("カスタム絵文字 <:name:id> を名前のみに変換する", () => {
    expect(filterText("<:smile:123456>")).toBe("smile");
  });

  it("アニメーション絵文字 <a:name:id> を名前のみに変換する", () => {
    expect(filterText("<a:dance:789>")).toBe("dance");
  });

  it("テキスト中のカスタム絵文字を名前のみに変換する", () => {
    expect(filterText("いいね<:thumbsup:111>ありがとう")).toBe(
      "いいねthumbsupありがとう"
    );
  });

  it("スペースで区切られたURLとカスタム絵文字が続く場合", () => {
    // URL後にスペースがあれば絵文字は別トークンとして処理される
    expect(filterText("https://example.com <:fire:111>")).toBe("URL省略 fire");
  });

  // --- メンション除去 ---
  it("ユーザーメンション <@id> を除去する", () => {
    expect(filterText("<@123456789>")).toBe("");
  });

  it("ニックネームメンション <@!id> を除去する", () => {
    expect(filterText("<@!987654321>")).toBe("");
  });

  it("チャンネルメンション <#id> を除去する", () => {
    expect(filterText("<#123456>")).toBe("");
  });

  it("ロールメンション <@&id> を除去する", () => {
    expect(filterText("<@&123456>")).toBe("");
  });

  it("テキスト中のメンションを除去する", () => {
    expect(filterText("こんにちは<@123>さん")).toBe("こんにちはさん");
  });

  // --- コードブロック ---
  it("コードブロックを「コード省略」に置換する", () => {
    expect(filterText("前```const x = 1```後")).toBe("前コード省略後");
  });

  it("複数行のコードブロックを「コード省略」に置換する", () => {
    expect(filterText("前```\nconst x = 1;\nconst y = 2;\n```後")).toBe(
      "前コード省略後"
    );
  });

  // --- インラインコード ---
  it("インラインコードを「コード」に置換する", () => {
    expect(filterText("前`code`後")).toBe("前コード後");
  });

  it("複数のインラインコードをすべて置換する", () => {
    expect(filterText("`a` と `b`")).toBe("コード と コード");
  });

  // --- スポイラー ---
  it("スポイラーを「ネタバレ」に置換する", () => {
    expect(filterText("前||秘密||後")).toBe("前ネタバレ後");
  });

  it("複数行スポイラーを「ネタバレ」に置換する", () => {
    expect(filterText("前||ネタバレ\n内容||後")).toBe("前ネタバレ後");
  });

  // --- 繰り返し文字の圧縮 ---
  // REPEAT_CHAR_REGEX = /(.)\1{4,}/g → 同一文字が5回以上でマッチ（先頭1文字 + 4回以上の繰り返し）
  it("5回の繰り返し文字を3回に圧縮する", () => {
    expect(filterText("わわわわわ")).toBe("わわわ");
  });

  it("7回の繰り返し文字を3回に圧縮する", () => {
    expect(filterText("あああああああ")).toBe("あああ");
  });

  it("4回の繰り返しは圧縮しない（閾値未満）", () => {
    expect(filterText("わわわわ")).toBe("わわわわ");
  });

  it("ASCII文字の5回以上の繰り返しを圧縮する", () => {
    expect(filterText("wwwwwww")).toBe("www");
  });

  // --- 連続空白の整理 ---
  it("連続する半角スペースを1つに整理する", () => {
    expect(filterText("あ  い")).toBe("あ い");
  });

  it("連続する全角スペースを1つのスペースに整理する", () => {
    // \u3000 = 全角スペース
    expect(filterText("あ\u3000\u3000い")).toBe("あ い");
  });

  it("前後の空白をトリムする", () => {
    expect(filterText("  あいう  ")).toBe("あいう");
  });

  // --- 変換不要なテキスト ---
  it("普通のテキストはそのまま返す", () => {
    expect(filterText("こんにちは、世界！")).toBe("こんにちは、世界！");
  });

  it("空文字列は空文字列を返す", () => {
    expect(filterText("")).toBe("");
  });

  // --- 複合テスト ---
  it("コードブロック・スポイラー・メンションが混在する場合を正しく変換する", () => {
    // コードブロック → "コード省略"、メンション → 除去、スポイラー → "ネタバレ"
    const input = "```js\nconsole.log('hello')\n``` <@999> ||秘密||";
    expect(filterText(input)).toBe("コード省略 ネタバレ");
  });

  it("複数メンションとテキストが混在する場合を正しく変換する", () => {
    expect(filterText("<@123>さんと<#456>チャンネルでお話しします")).toBe(
      "さんとチャンネルでお話しします"
    );
  });

  it("カスタム絵文字とインラインコードが混在する場合", () => {
    expect(filterText("<:star:111>`code`<a:wave:222>")).toBe("starコードwave");
  });
});

describe("shouldSkip", () => {
  // --- スキップすべきケース ---
  it("空文字列はスキップする", () => {
    expect(shouldSkip("")).toBe(true);
  });

  it("半角スペースのみの文字列はスキップする", () => {
    expect(shouldSkip("   ")).toBe(true);
  });

  it("タブのみの文字列はスキップする", () => {
    expect(shouldSkip("\t\t")).toBe(true);
  });

  it("スラッシュコマンドはスキップする", () => {
    expect(shouldSkip("/help")).toBe(true);
  });

  it("スラッシュコマンド（引数付き）はスキップする", () => {
    expect(shouldSkip("/join general")).toBe(true);
  });

  it("ユーザーメンションのみの文字列はスキップする（filterText後に空になる）", () => {
    expect(shouldSkip("<@123>")).toBe(true);
  });

  it("複数メンションのみの文字列はスキップする", () => {
    expect(shouldSkip("<@123> <#456> <@&789>")).toBe(true);
  });

  // --- スキップしないケース ---
  it("通常のテキストはスキップしない", () => {
    expect(shouldSkip("こんにちは")).toBe(false);
  });

  it("URLのみのテキストはスキップしない（filterText後に「URL省略」が残る）", () => {
    expect(shouldSkip("https://example.com")).toBe(false);
  });

  it("カスタム絵文字のみのテキストはスキップしない（名前が残る）", () => {
    expect(shouldSkip("<:smile:123>")).toBe(false);
  });

  it("コードブロックのみのテキストはスキップしない（「コード省略」が残る）", () => {
    expect(shouldSkip("```const x = 1```")).toBe(false);
  });

  it("スラッシュで始まらないテキストはスキップしない", () => {
    expect(shouldSkip("よろしくお願いします/敬具")).toBe(false);
  });

  it("メンションを含む通常テキストはスキップしない（filterText後にテキストが残る）", () => {
    expect(shouldSkip("<@123>ありがとう")).toBe(false);
  });
});
