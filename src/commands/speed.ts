import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { setUserSettings, getUserSettings } from "../db/database.js";

export const data = new SlashCommandBuilder()
  .setName("speed")
  .setDescription("あなたの読み上げ速度を変更します")
  .addNumberOption((option) =>
    option
      .setName("rate")
      .setDescription("速度倍率（0.5〜2.0）")
      .setRequired(true)
      .setMinValue(0.5)
      .setMaxValue(2.0),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "サーバー内でのみ使用できます。", ephemeral: true });
    return;
  }

  const speed = interaction.options.getNumber("rate", true);

  const existing = getUserSettings(interaction.guildId, interaction.user.id);
  setUserSettings({
    guild_id: interaction.guildId,
    user_id: interaction.user.id,
    speaker_id: existing?.speaker_id ?? null,
    speed,
    nickname: existing?.nickname ?? null,
  });

  await interaction.reply({
    content: `読み上げ速度を **${speed}倍** に変更しました。`,
    ephemeral: true,
  });
}
