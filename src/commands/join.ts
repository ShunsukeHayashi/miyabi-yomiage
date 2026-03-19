import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { joinChannel } from "../voice/manager.js";

export const data = new SlashCommandBuilder()
  .setName("join")
  .setDescription("ボイスチャンネルに参加して読み上げを開始します");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member;
  if (!(member instanceof GuildMember) || !member.voice.channel) {
    await interaction.reply({
      content: "先にボイスチャンネルに参加してください。",
      ephemeral: true,
    });
    return;
  }

  try {
    await joinChannel(member.voice.channel);
    await interaction.reply(`${member.voice.channel.name} に参加しました。読み上げを開始します。`);
  } catch (err) {
    console.error("[join] Error:", err);
    await interaction.reply({
      content: "ボイスチャンネルへの接続に失敗しました。",
      ephemeral: true,
    });
  }
}
