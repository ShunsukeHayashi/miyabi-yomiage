import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getVoiceState } from "../voice/manager.js";

export const data = new SlashCommandBuilder()
  .setName("queue")
  .setDescription("読み上げキューの状態を表示します");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "サーバー内でのみ使用できます。", ephemeral: true });
    return;
  }

  const state = getVoiceState(interaction.guildId);
  if (!state) {
    await interaction.reply({ content: "ボイスチャンネルに接続していません。", ephemeral: true });
    return;
  }

  const lines: string[] = [];

  if (state.playing) {
    lines.push("**再生中** 🔊");
  } else {
    lines.push("**待機中** ⏸️");
  }

  if (state.queue.length === 0) {
    lines.push("キューは空です。");
  } else {
    lines.push(`キュー: **${state.queue.length}** 件`);
    const preview = state.queue.slice(0, 5);
    for (let i = 0; i < preview.length; i++) {
      const text = preview[i].text.length > 40
        ? preview[i].text.slice(0, 40) + "..."
        : preview[i].text;
      lines.push(`${i + 1}. ${text}`);
    }
    if (state.queue.length > 5) {
      lines.push(`...他 ${state.queue.length - 5} 件`);
    }
  }

  await interaction.reply({ content: lines.join("\n"), ephemeral: true });
}
