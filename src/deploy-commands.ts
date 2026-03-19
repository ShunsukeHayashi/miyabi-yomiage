import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import { commands } from "./commands/index.js";

const rest = new REST({ version: "10" }).setToken(config.discord.token);

async function deploy() {
  try {
    console.log(`[deploy] ${commands.length} コマンドを登録中...`);

    const commandData = commands.map((cmd) => cmd.data.toJSON());

    await rest.put(Routes.applicationCommands(config.discord.clientId), {
      body: commandData,
    });

    console.log("[deploy] コマンド登録完了");
  } catch (err) {
    console.error("[deploy] Error:", err);
    process.exit(1);
  }
}

deploy();
