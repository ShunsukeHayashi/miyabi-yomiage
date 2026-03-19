import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import {
  setDictionaryEntry,
  deleteDictionaryEntry,
  getDictionary,
} from "../db/database.js";

export const data = new SlashCommandBuilder()
  .setName("dict")
  .setDescription("読み上げ辞書を管理します")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("辞書にエントリを追加します")
      .addStringOption((o) => o.setName("word").setDescription("単語").setRequired(true))
      .addStringOption((o) => o.setName("reading").setDescription("読み").setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("辞書からエントリを削除します")
      .addStringOption((o) => o.setName("word").setDescription("単語").setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("辞書のエントリ一覧を表示します"),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "サーバー内でのみ使用できます。", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();

  switch (sub) {
    case "add": {
      const word = interaction.options.getString("word", true);
      const reading = interaction.options.getString("reading", true);
      setDictionaryEntry(interaction.guildId, word, reading);
      await interaction.reply(`辞書に追加: **${word}** → **${reading}**`);
      break;
    }
    case "remove": {
      const word = interaction.options.getString("word", true);
      const removed = deleteDictionaryEntry(interaction.guildId, word);
      if (removed) {
        await interaction.reply(`辞書から削除: **${word}**`);
      } else {
        await interaction.reply({ content: `「${word}」は辞書に登録されていません。`, ephemeral: true });
      }
      break;
    }
    case "list": {
      const dict = getDictionary(interaction.guildId);
      if (dict.size === 0) {
        await interaction.reply({ content: "辞書にエントリがありません。", ephemeral: true });
        return;
      }
      let output = `辞書一覧 (${dict.size}件):\n`;
      for (const [word, reading] of dict) {
        const line = `**${word}** → ${reading}\n`;
        if (output.length + line.length > 1900) {
          output += `...他 ${dict.size - output.split("\n").length + 1}件`;
          break;
        }
        output += line;
      }
      await interaction.reply(output);
      break;
    }
  }
}
