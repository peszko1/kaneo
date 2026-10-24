export type KaneoSettings = {
  /** The address people open Kaneo at; task links point here. */
  webUrl: string;
  /** Only for separately hosted APIs; empty means `webUrl` serves `/api`. */
  apiUrl: string;
  /** Name of the Obsidian secret holding the API key, never the key itself. */
  apiKeySecret: string;
  /** Default seconds between block refreshes; 0 turns it off. */
  autorefreshSeconds: number;
};

export const DEFAULT_SETTINGS: KaneoSettings = {
  webUrl: "https://cloud.kaneo.app",
  apiUrl: "",
  apiKeySecret: "",
  autorefreshSeconds: 300,
};
