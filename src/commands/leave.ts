import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { leaveChannel } from "../voice/manager.js";

export const data = new SlashCommandBuilder()
  .setName("leave")
  .setDescription("ボイスチャンネルから退出します");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "サーバー内でのみ使用できます。", ephemeral: true });
    return;
  }

  const left = leaveChannel(interaction.guildId);
  if (left) {
    await interaction.reply("ボイスチャンネルから退出しました。");
  } else {
    await interaction.reply({ content: "ボイスチャンネルに参加していません。", ephemeral: true });
  }
}
