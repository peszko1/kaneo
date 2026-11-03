import { readUserDocument, saveUserDocument } from "../document-store";

// The 120h tracker keeps everything in one document per user. Kaneo only
// stores it; the tracker page reads and merges it.
const KIND = "practice-120h";

type PracticeData = {
  enabled: boolean;
  config: string | null;
  state: Record<string, unknown> | null;
};

const EMPTY: PracticeData = { enabled: false, config: null, state: null };

function toPractice(document: { data: unknown; version: number } | null) {
  const data = {
    ...EMPTY,
    ...(document?.data as Partial<PracticeData> | undefined),
  };
  return {
    enabled: data.enabled === true,
    config: typeof data.config === "string" ? data.config : null,
    state:
      data.state && typeof data.state === "object"
        ? (data.state as Record<string, unknown>)
        : null,
    version: document?.version ?? 0,
  };
}

export async function readPractice(userId: string) {
  return toPractice(await readUserDocument(userId, KIND));
}

export async function savePractice(
  userId: string,
  change: { version: number } & Partial<PracticeData>,
) {
  const current = toPractice(await readUserDocument(userId, KIND));
  if (current.version !== change.version)
    return { saved: false as const, practice: current };
  const { version, ...fields } = change;
  const data: PracticeData = {
    enabled: fields.enabled ?? current.enabled,
    config: fields.config !== undefined ? fields.config : current.config,
    state: fields.state !== undefined ? fields.state : current.state,
  };
  const result = await saveUserDocument(userId, KIND, data, version);
  return { saved: result.saved, practice: toPractice(result.document) };
}
