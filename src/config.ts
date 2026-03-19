import { config as dotenvConfig } from "dotenv";

dotenvConfig();

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN ?? "",
    clientId: process.env.CLIENT_ID ?? "",
  },
  voicevox: {
    url: process.env.VOICEVOX_URL ?? "http://localhost:50021",
    defaultSpeaker: Number(process.env.DEFAULT_SPEAKER ?? 3),
    defaultSpeed: Number(process.env.DEFAULT_SPEED ?? 1.2),
    maxTextLength: Number(process.env.MAX_TEXT_LENGTH ?? 200),
  },
  autoJoin: process.env.AUTO_JOIN !== "false",
} as const;
