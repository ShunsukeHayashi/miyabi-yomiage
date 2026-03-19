# miyabi-yomiage 改善タスク DAG

## DAG構造

```
Layer 0 (並列・依存なし・異なるファイル)
├── T1: ログプレフィックス統一 [全ファイル・出力のみ]
├── T2: initStyleMap VOICEVOX障害フォールバック [style-map.ts]
└── T3: textToSpeech リトライ機構 [voicevox.ts]
         │
Layer 1 (並列可・manager.ts 異セクション)
├── T4: applyDictionary O(n×m)最適化 [manager.ts:162-168]
├── T5: processQueue オーバーフロー警告ログ [manager.ts:214-218]
└── T6: pendingConnections タイムアウト安全策 [manager.ts:62-76]
         │
Layer 2 (L0+L1完了後)
└── T7: テストスイート作成 [新規ファイル・コード変更なし]
         │
Layer 3 (T7完了後)
├── T8: enqueueMessage 入力バリデーション [manager.ts:170-223]
└── T9: マジックナンバー定数化 [複数ファイル]
```

## タスク詳細

### T1: ログプレフィックス統一
- **ファイル**: 全 `.ts`
- **内容**: `[voice]`, `[db]`, `[style-map]` 等のプレフィックスを統一形式に
- **リスク**: NONE（console出力のみ）
- **呼び出し元**: なし
- **GitNexusクラスター**: 全6クラスター横断

### T2: initStyleMap VOICEVOX障害フォールバック
- **ファイル**: `src/emotion/style-map.ts:31-81`
- **内容**: VOICEVOX接続失敗時にハードコードのデフォルトマップを使用
- **リスク**: LOW（呼び出し元: index.ts のみ）
- **GitNexus**: Emotion クラスター、プロセス参加なし（孤立初期化関数）

### T3: textToSpeech リトライ機構
- **ファイル**: `src/tts/voicevox.ts:42-51`
- **内容**: 一時的なネットワークエラー時のリトライ（最大2回）
- **リスク**: LOW（呼び出し元: processQueue のみ）
- **GitNexus**: Tts クラスター、リーフノード

### T4: applyDictionary 最適化
- **ファイル**: `src/voice/manager.ts:162-169`
- **内容**: O(n×m) の replaceAll ループを正規表現一括置換に
- **リスク**: LOW（呼び出し元: enqueueMessage のみ・内部関数）
- **GitNexus**: Voice クラスター

### T5: processQueue オーバーフロー警告
- **ファイル**: `src/voice/manager.ts:214-218`
- **内容**: キュー上限到達時に warn ログを出力
- **リスク**: MEDIUM（自己再帰 + 3呼び出し元）
- **GitNexus**: 3プロセスに参加（Execute→CreateAudioQuery, →Synthesis, →BufferToReadable）

### T6: pendingConnections タイムアウト
- **ファイル**: `src/voice/manager.ts:62-76`
- **内容**: pendingConnections がリークしないようタイムアウト設定
- **リスク**: MEDIUM（呼び出し元: joinChannel）
- **GitNexus**: Voice クラスター

### T7: テストスイート作成
- **ファイル**: 新規 `tests/*.test.ts`
- **内容**: analyzer, filter, style-map, database のユニットテスト
- **リスク**: NONE（既存コード変更なし）
- **依存**: T1-T6 完了後（テスト対象コードが安定してから）

### T8: enqueueMessage 入力バリデーション
- **ファイル**: `src/voice/manager.ts:170-223`
- **内容**: 空文字列・異常長テキスト・不正speaker IDの検証
- **リスク**: HIGH（9個の外部呼び出し・ハブ関数）
- **依存**: T7（テストで保護してから変更）
- **GitNexus**: 4呼び出し元、プロセス EnqueueMessage→FilterText に参加

### T9: マジックナンバー定数化
- **ファイル**: 複数
- **内容**: THRESHOLD=2.0, MAX_QUEUE=50, タイムアウト値等を定数に
- **リスク**: LOW（値変更なし・リファクタリング）
- **依存**: T7（テストで保護してから）

## 実行計画

| フェーズ | タスク | エージェント | 並列度 |
|---------|--------|-------------|--------|
| Layer 0 | T1, T2, T3 | Agent-A, Agent-B, Agent-C | ×3 並列 |
| Layer 1 | T4 → T5 → T6 | Agent-D (順次) | ×1 |
| Layer 2 | T7 | Agent-E | ×1 |
| Layer 3 | T8, T9 | Agent-F, Agent-G | ×2 並列 |
