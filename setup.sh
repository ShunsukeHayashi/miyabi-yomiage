#!/bin/bash
# miyabi-yomiage セットアップスクリプト
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=== miyabi-yomiage セットアップ ==="

# 1. .env 作成
if [ ! -f .env ]; then
  echo ""
  echo "[1/4] .env ファイルを作成します"
  read -rp "Discord Bot Token: " DISCORD_TOKEN
  read -rp "Discord Client ID: " CLIENT_ID

  cat > .env <<EOF
DISCORD_TOKEN=${DISCORD_TOKEN}
CLIENT_ID=${CLIENT_ID}
VOICEVOX_URL=http://localhost:50021
DEFAULT_SPEAKER=3
DEFAULT_SPEED=1.2
MAX_TEXT_LENGTH=200
AUTO_JOIN=true
EOF
  echo "  -> .env 作成完了"
else
  echo "[1/4] .env 既に存在 — スキップ"
fi

# 2. 依存関係インストール
echo ""
echo "[2/4] 依存関係をインストール中..."
npm install

# 3. ビルド
echo ""
echo "[3/4] TypeScript ビルド中..."
npm run build

# 4. スラッシュコマンド登録
echo ""
echo "[4/4] Discord スラッシュコマンドを登録中..."
node dist/deploy-commands.js

echo ""
echo "=== セットアップ完了 ==="
echo ""
echo "起動方法:"
echo "  npm start        # 本番"
echo "  npm run dev      # 開発（tsx ホットリロード）"
echo ""
echo "VOICEVOX が localhost:50021 で起動していることを確認してください。"
