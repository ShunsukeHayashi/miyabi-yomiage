# miyabi-yomiage

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2.svg)](https://discord.js.org/)
[![VOICEVOX](https://img.shields.io/badge/VOICEVOX-TTS-ff69b4.svg)](https://voicevox.hiroshiba.jp/)

Discord ボイスチャンネルでテキストを VOICEVOX で読み上げる Bot。
**感情分析によるスタイル自動切替** で、メッセージの感情に応じて声のトーンが変わります。

## 他の VOICEVOX Bot との違い

| 機能 | miyabi-yomiage | 一般的な Bot |
|------|:-:|:-:|
| 感情分析 → スタイル自動切替 | **対応** | - |
| ユーザー別話者設定 | 対応 | 一部対応 |
| サーバー辞書 | 対応 | 一部対応 |
| Docker Compose 一発起動 | 対応 | - |
| 自動参加 / 自動退出 | 対応 | 一部対応 |
| キュー管理 (/skip, /queue) | 対応 | - |

## 感情分析

テキストのキーワード・絵文字・パターンからスコアリングし、感情を自動判定します。
外部 API 不要、完全ローカル処理。

```
「今日は楽しいね！😊」  → happy  → ずんだもん（あまあま）
「ふざけるな💢」        → angry  → ずんだもん（ツンツン）
「悲しい...😢」        → sad    → ずんだもん（泣き）
「ここだけの話...」     → whisper → ずんだもん（ささやき）
```

対応感情: `normal` / `happy` / `angry` / `sad` / `whisper`

VOICEVOX の各キャラクターが持つスタイルバリエーション（あまあま、ツンツン等）に自動マッピングします。
`/speakers` API から起動時に動的構築するため、カスタム音声モデルにも対応します。

## アーキテクチャ

```
Discord Message
      │
      ▼
  テキスト前処理 (URL除去, 辞書適用, 文字数制限)
      │
      ▼
  感情分析 (ルールベース, スコアリング)
      │
      ▼
  スタイル解決 (baseSpeaker + emotion → targetSpeaker)
      │
      ▼
  VOICEVOX API (/audio_query → /synthesis)
      │
      ▼
  AudioPlayer → ボイスチャンネル再生
```

## クイックスタート

### ローカル起動

```bash
# 1. VOICEVOX エンジンを起動
# https://voicevox.hiroshiba.jp/ からダウンロード

# 2. クローン & セットアップ
git clone https://github.com/ShunsukeHayashi/miyabi-yomiage.git
cd miyabi-yomiage
npm install

# 3. 環境変数
cp .env.example .env
# .env に DISCORD_TOKEN を設定

# 4. ビルド & 起動
npm run build
npm start
```

### Docker Compose (推奨)

VOICEVOX エンジンと Bot を一発で起動:

```bash
# .env に DISCORD_TOKEN を設定後
docker compose up -d
```

## スラッシュコマンド

| コマンド | 説明 |
|---------|------|
| `/join` | ボイスチャンネルに参加 |
| `/leave` | ボイスチャンネルから退出 |
| `/speaker` | 読み上げ話者を変更 |
| `/speed` | 読み上げ速度を変更 (0.5x - 2.0x) |
| `/dict add <word> <reading>` | 辞書にエントリ追加 |
| `/dict remove <word>` | 辞書からエントリ削除 |
| `/dict list` | 辞書の一覧表示 |
| `/skip` | 現在の読み上げをスキップ |
| `/queue` | キューの状態を表示 |
| `/emotion on` | 感情分析を有効化 |
| `/emotion off` | 感情分析を無効化 |
| `/emotion test <text>` | テキストの感情分析結果を確認 |

## コマンド登録

スラッシュコマンドの初回登録 / 更新:

```bash
node dist/deploy-commands.js
```

## 環境変数

| 変数 | 必須 | デフォルト | 説明 |
|------|:----:|-----------|------|
| `DISCORD_TOKEN` | Yes | - | Discord Bot トークン |
| `CLIENT_ID` | Yes* | - | コマンド登録時に必要 (*初回のみ) |
| `VOICEVOX_URL` | No | `http://localhost:50021` | VOICEVOX API URL |
| `AUTO_JOIN` | No | `true` | VC自動参加 |

## 技術スタック

- **Runtime**: Node.js 20+
- **Language**: TypeScript (ESM, strict mode)
- **Discord**: discord.js v14, @discordjs/voice v0.19
- **TTS**: VOICEVOX Engine API
- **DB**: SQLite (better-sqlite3) - ユーザー設定・辞書の永続化
- **Container**: Docker + Docker Compose

## 開発

```bash
# 開発モード (tsx hot reload)
npm run dev

# 型チェック
npm run typecheck

# lint
npm run lint
```

## License

MIT

---

> Built with [VOICEVOX](https://voicevox.hiroshiba.jp/) - Free Japanese TTS Engine
