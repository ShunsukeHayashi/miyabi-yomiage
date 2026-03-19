import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { setEmotionEnabled, getUserSettings } from "../db/database.js";
import { analyzeEmotionDetail } from "../emotion/analyzer.js";
import { resolveStyleId, getSpeakerInfo } from "../emotion/style-map.js";

export const data = new SlashCommandBuilder()
  .setName("emotion")
  .setDescription("感情分析によるスタイル自動切替の設定")
  .addStringOption((option) =>
    option
      .setName("mode")
      .setDescription("操作を選択")
      .setRequired(true)
      .addChoices(
        { name: "有効にする", value: "on" },
        { name: "無効にする", value: "off" },
        { name: "テスト（テキストを分析）", value: "test" },
      ),
  )
  .addStringOption((option) =>
    option
      .setName("text")
      .setDescription("テストモード時の分析テキスト")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "サーバー内でのみ使用できます。", ephemeral: true });
    return;
  }

  const mode = interaction.options.getString("mode", true);

  if (mode === "on") {
    setEmotionEnabled(interaction.guildId, interaction.user.id, true);
    await interaction.reply({
      content: "感情分析を **有効** にしました。メッセージの感情に応じてスタイルが自動で切り替わります。",
      ephemeral: true,
    });
    return;
  }

  if (mode === "off") {
    setEmotionEnabled(interaction.guildId, interaction.user.id, false);
    await interaction.reply({
      content: "感情分析を **無効** にしました。常にデフォルトスタイルで読み上げます。",
      ephemeral: true,
    });
    return;
  }

  // テストモード
  const text = interaction.options.getString("text") ?? "今日は楽しいね！";
  const result = analyzeEmotionDetail(text);

  const userSettings = getUserSettings(interaction.guildId, interaction.user.id);
  const baseSpeaker = userSettings?.speaker_id ?? 3;
  const resolvedSpeaker = resolveStyleId(baseSpeaker, result.emotion);

  const baseInfo = getSpeakerInfo(baseSpeaker);
  const resolvedInfo = getSpeakerInfo(resolvedSpeaker);

  const lines = [
    `**テキスト**: ${text}`,
    `**検出感情**: ${result.emotion}`,
    "",
    "**スコア詳細**:",
    `  happy: ${result.scores.happy.toFixed(1)}`,
    `  angry: ${result.scores.angry.toFixed(1)}`,
    `  sad: ${result.scores.sad.toFixed(1)}`,
    `  whisper: ${result.scores.whisper.toFixed(1)}`,
    "",
    `**ベース話者**: ${baseInfo ? `${baseInfo.character}（${baseInfo.style}）` : `ID:${baseSpeaker}`}`,
    `**適用話者**: ${resolvedInfo ? `${resolvedInfo.character}（${resolvedInfo.style}）` : `ID:${resolvedSpeaker}`}`,
  ];

  if (baseSpeaker === resolvedSpeaker && result.emotion !== "normal") {
    lines.push("", "⚠️ この話者に対応するスタイルバリエーションがありません。");
  }

  await interaction.reply({ content: lines.join("\n"), ephemeral: true });
}
