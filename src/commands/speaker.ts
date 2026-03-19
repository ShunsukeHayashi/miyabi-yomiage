import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { setUserSettings, getUserSettings } from "../db/database.js";

// VOICEVOX 主要話者リスト
const SPEAKERS = [
  { name: "四国めたん（あまあま）", value: 0 },
  { name: "四国めたん（ノーマル）", value: 2 },
  { name: "ずんだもん（あまあま）", value: 1 },
  { name: "ずんだもん（ノーマル）", value: 3 },
  { name: "春日部つむぎ", value: 8 },
  { name: "波音リツ", value: 9 },
  { name: "雨晴はう", value: 10 },
  { name: "玄野武宏", value: 11 },
  { name: "白上虎太郎", value: 12 },
  { name: "青山龍星", value: 13 },
  { name: "冥鳴ひまり", value: 14 },
  { name: "九州そら（あまあま）", value: 15 },
  { name: "九州そら（ノーマル）", value: 16 },
];

export const data = new SlashCommandBuilder()
  .setName("speaker")
  .setDescription("あなたの読み上げ話者を変更します")
  .addIntegerOption((option) =>
    option
      .setName("voice")
      .setDescription("話者を選択")
      .setRequired(true)
      .addChoices(...SPEAKERS.map((s) => ({ name: s.name, value: s.value }))),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "サーバー内でのみ使用できます。", ephemeral: true });
    return;
  }

  const speakerId = interaction.options.getInteger("voice", true);
  const speakerName = SPEAKERS.find((s) => s.value === speakerId)?.name ?? `ID:${speakerId}`;

  const existing = getUserSettings(interaction.guildId, interaction.user.id);
  setUserSettings({
    guild_id: interaction.guildId,
    user_id: interaction.user.id,
    speaker_id: speakerId,
    speed: existing?.speed ?? null,
    nickname: existing?.nickname ?? null,
    emotion_enabled: existing?.emotion_enabled ?? 1,
  });

  await interaction.reply({
    content: `あなたの話者を **${speakerName}** に変更しました。`,
    ephemeral: true,
  });
}
