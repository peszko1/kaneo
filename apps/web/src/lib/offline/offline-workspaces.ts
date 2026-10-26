import { authClient } from "../auth-client";
import { savedSessionUserId } from "./saved-session";

// The workspace list and the active workspace come from Better Auth, not the
// query cache, so the snapshot does not hold them. Without them, offline
// screens have no workspace id and every permission reads as false.
const ATOMS = ["listOrganizations", "activeOrganization"] as const;
type AtomName = (typeof ATOMS)[number];

type AtomValue = {
  data: unknown;
  error: { status?: number } | null;
  isPending: boolean;
  isRefetching?: boolean;
};

const key = (name: AtomName) => `kaneo:offline-${name}`;

function save(name: AtomName, data: unknown) {
  try {
    localStorage.setItem(
      key(name),
      JSON.stringify({ userId: savedSessionUserId(), data }),
    );
  } catch {
    // Storage full or blocked: the app still works online.
  }
}

function read(name: AtomName): unknown {
  try {
    const raw = localStorage.getItem(key(name));
    if (!raw) return null;
    const saved = JSON.parse(raw) as { userId: string; data: unknown };
    // Another user's workspaces are never shown.
    return saved.userId === savedSessionUserId() ? saved.data : null;
  } catch {
    return null;
  }
}

export function removeSavedWorkspaces() {
  for (const name of ATOMS) {
    try {
      localStorage.removeItem(key(name));
    } catch {
      // Nothing saved to remove.
    }
  }
}

// Saves both while the server answers, and shows the saved copy when a
// request fails because the server is out of reach.
export function keepWorkspacesOffline() {
  for (const name of ATOMS) {
    const atom = authClient.$store.atoms[name];
    if (!atom) continue;
    atom.subscribe((value: AtomValue) => {
      if (value.isPending || value.isRefetching) return;
      if (value.data) {
        save(name, value.data);
        return;
      }
      const status = value.error?.status;
      if (!value.error || (status && status < 500)) return;
      const saved = read(name);
      if (saved) atom.set({ ...value, data: saved, error: null });
    });
  }
}
