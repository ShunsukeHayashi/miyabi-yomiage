import {
  Client,
  GatewayIntentBits,
  Events,
  type Message,
  type Interaction,
  GuildMember,
} from "discord.js";
import { config } from "./config.js";
import { commands } from "./commands/index.js";
import {
  joinChannel,
  isConnected,
  isConnecting,
  enqueueMessage,
  getVoiceState,
  leaveChannel,
} from "./voice/manager.js";
import { checkHealth } from "./tts/voicevox.js";
import { closeDatabase } from "./db/database.js";
import { initStyleMap } from "./emotion/style-map.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// スラッシュコマンド処理
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.find((cmd) => cmd.data.name === interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[command] ${interaction.commandName} error:`, err);
    const reply = {
      content: "コマンドの実行中にエラーが発生しました。",
      ephemeral: true,
    };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch {
      // reply自体の失敗は無視
    }
  }
});

// テキストメッセージ → 読み上げ
client.on(Events.MessageCreate, async (message: Message) => {
  // Bot自身とBot全般を無視
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content) return;

  const guildId = message.guild.id;

  // ボイスチャンネルに接続中の場合のみ読み上げ
  if (!isConnected(guildId)) {
    // auto_join: メンバーがVCに居て、テキストチャンネルにメッセージを送った場合に自動参加
    if (config.autoJoin && message.member instanceof GuildMember && message.member.voice.channel) {
      // 既に接続中または接続試行中ならスキップ
      if (isConnecting(guildId)) return;
      const voiceState = getVoiceState(guildId);
      // まだ接続していなければ自動参加
      if (!voiceState) {
        try {
          await joinChannel(message.member.voice.channel);
          console.log(`[auto-join] ${message.guild.name} / ${message.member.voice.channel.name}`);
        } catch (err) {
          console.error("[auto-join] Error:", err);
          return;
        }
      }
    } else {
      return;
    }
  }

  // 読み上げ対象テキストチャンネルのチェック
  // （VCに接続中のチャンネルと同じテキストチャンネルのみ読み上げ — 将来的にバインド機能追加）

  const displayName =
    message.member instanceof GuildMember
      ? message.member.displayName
      : message.author.displayName;

  try {
    await enqueueMessage(guildId, message.content, message.author.id, displayName);
  } catch (err) {
    console.error("[message] enqueue error:", err);
  }
});

// ボイスチャンネルが空になったら退出
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  // メンバーが退出した場合
  if (oldState.channel && !newState.channel) {
    const guildId = oldState.guild.id;
    const voiceState = getVoiceState(guildId);
    if (!voiceState) return;

    // Botが参加中のチャンネルからの退出か確認
    if (oldState.channelId === voiceState.channelId) {
      // Bot以外のメンバーが残っているか確認
      const members = oldState.channel.members.filter((m) => !m.user.bot);
      if (members.size === 0) {
        console.log(`[auto-leave] ${oldState.guild.name} / ${oldState.channel.name} — 空になったため退出`);
        leaveChannel(guildId);
      }
    }
  }
});

// 起動
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`[ready] ${readyClient.user.tag} としてログイン`);
  console.log(`[ready] ${readyClient.guilds.cache.size} サーバーに参加中`);

  // VOICEVOX ヘルスチェック
  const healthy = await checkHealth();
  if (healthy) {
    console.log("[ready] VOICEVOX: 接続OK");
    await initStyleMap();
  } else {
    console.warn("[ready] VOICEVOX: 接続失敗 — 読み上げが動作しません");
  }

  // 起動時に人がいるVCへ自動参加（キャッシュ完了を待つ）
  setTimeout(async () => {
    for (const guild of readyClient.guilds.cache.values()) {
      for (const [, voiceState] of guild.voiceStates.cache) {
        if (voiceState.member?.user.bot) continue;
        if (!voiceState.channel) continue;
        // このVCにまだBotが参加していなければ参加
        if (!isConnected(guild.id)) {
          try {
            await joinChannel(voiceState.channel);
            const humans = voiceState.channel.members.filter((m) => !m.user.bot).size;
            console.log(`[startup-join] ${guild.name} / ${voiceState.channel.name} (${humans}人)`);
          } catch (err) {
            console.error(`[startup-join] ${guild.name} 失敗:`, err);
          }
          break; // 1サーバー1VC
        }
      }
    }
  }, 3000);
});

// 未処理のPromise rejectionをキャッチ
process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});

// graceful shutdown
function shutdown(signal: string) {
  console.log(`[shutdown] ${signal} received`);
  closeDatabase();
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// 起動
if (!config.discord.token) {
  console.error("[error] DISCORD_TOKEN が設定されていません。.env ファイルを確認してください。");
  process.exit(1);
}

client.login(config.discord.token);
