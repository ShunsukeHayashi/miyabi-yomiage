# miyabi-yomiage

Discord ボイスチャンネルでテキストメッセージを自動読み上げする Bot です。[VOICEVOX](https://voicevox.hiroshiba.jp/) をTTSエンジンとして使用します。

## 機能

- テキストチャンネルのメッセージをボイスチャンネルで自動読み上げ
- VOICEVOX の多彩な話者（ずんだもん、四国めたん、春日部つむぎ等）に対応
- サーバーごと・ユーザーごとに話者と速度をカスタマイズ
- 読み上げ辞書（単語 → 読み）をサーバーごとに管理
- VC に人がいれば起動時に自動参加、空になったら自動退出
- URL、コードブロック、スポイラー、メンション等の自動フィルタリング

## 必要なもの

- **Node.js** 20 以上
- **VOICEVOX** エンジン（ローカル起動、デフォルト `http://localhost:50021`）
- **Discord Bot Token**（[Discord Developer Portal](https://discord.com/developers/applications) で作成）
- **FFmpeg**（`brew install ffmpeg` / `apt install ffmpeg`）

## セットアップ

### 1. インストール

```bash
git clone https://github.com/ShunsukeHayashi/miyabi-yomiage.git
cd miyabi-yomiage
npm install
```

### 2. 環境変数

```bash
cp .env.example .env
```

`.env` を編集して Discord Bot Token と Client ID を設定:

```
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_client_id_here
```

### 3. VOICEVOX 起動

[VOICEVOX](https://voicevox.hiroshiba.jp/) をダウンロードして起動します。API サーバーが `http://localhost:50021` で待ち受けます。

### 4. スラッシュコマンド登録

```bash
npm run build
node dist/deploy-commands.js
```

### 5. Bot 起動

```bash
npm start
```

## スラッシュコマンド

| コマンド | 説明 |
|---------|------|
| `/join` | Bot をあなたのボイスチャンネルに参加させる |
| `/leave` | Bot をボイスチャンネルから退出させる |
| `/speaker <id>` | 話者を変更する |
| `/speed <値>` | 読み上げ速度を変更する（0.5〜2.0） |
| `/dict add <単語> <読み>` | 辞書にエントリを追加 |
| `/dict remove <単語>` | 辞書からエントリを削除 |
| `/dict list` | 辞書の一覧を表示 |

## 話者一覧

| ID | 話者 |
|----|------|
| 0 | 四国めたん（あまあま） |
| 1 | ずんだもん（あまあま） |
| 2 | 四国めたん（ノーマル） |
| 3 | ずんだもん（ノーマル）**← デフォルト** |
| 4 | 四国めたん（セクシー） |
| 5 | ずんだもん（セクシー） |
| 6 | 四国めたん（ツンツン） |
| 7 | ずんだもん（ツンツン） |
| 8 | 春日部つむぎ（ノーマル） |
| 10 | 雨晴はう（ノーマル） |
| 11 | 波音リツ（ノーマル） |
| 14 | 冥鳴ひまり（ノーマル） |
| 20 | もち子さん（ノーマル） |

## 環境変数

| 変数 | デフォルト | 説明 |
|------|----------|------|
| `DISCORD_TOKEN` | (必須) | Discord Bot トークン |
| `CLIENT_ID` | (必須) | Discord アプリケーション ID |
| `VOICEVOX_URL` | `http://localhost:50021` | VOICEVOX API の URL |
| `DEFAULT_SPEAKER` | `3` | デフォルト話者 ID |
| `DEFAULT_SPEED` | `1.2` | デフォルト速度 |
| `MAX_TEXT_LENGTH` | `200` | 読み上げ最大文字数 |
| `AUTO_JOIN` | `true` | メッセージ送信時の自動参加 |

## テキストフィルタ

読み上げ前に以下の変換が自動適用されます:

- URL → 「URL省略」
- コードブロック → 「コード省略」
- インラインコード → 「コード」
- スポイラー → 「ネタバレ」
- カスタム絵文字 → 名前のみ
- メンション → 除去
- 連続文字（wwwww）→ 圧縮（www）

## 技術スタック

- **TypeScript** + ESM
- **discord.js** v14
- **@discordjs/voice** v0.19
- **VOICEVOX** API
- **better-sqlite3**（設定・辞書の永続化）

## ライセンス

MIT
