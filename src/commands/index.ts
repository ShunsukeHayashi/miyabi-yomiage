import type {
  ChatInputCommandInteraction,
  SharedSlashCommand,
} from "discord.js";

import * as join from "./join.js";
import * as leave from "./leave.js";
import * as speaker from "./speaker.js";
import * as speed from "./speed.js";
import * as dict from "./dict.js";

export type Command = {
  data: SharedSlashCommand;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export const commands: Command[] = [join, leave, speaker, speed, dict];
