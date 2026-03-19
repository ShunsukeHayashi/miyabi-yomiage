import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getVoiceState } from "../voice/manager.js";

export const data = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("現在の読み上げをスキップします");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "サーバー内でのみ使用できます。", ephemeral: true });
    return;
  }

  const state = getVoiceState(interaction.guildId);
  if (!state || !state.playing) {
    await interaction.reply({ content: "現在読み上げ中の音声はありません。", ephemeral: true });
    return;
  }

  state.player.stop();
  await interaction.reply({ content: "スキップしました。", ephemeral: true });
}
