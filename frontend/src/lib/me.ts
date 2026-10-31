import { useSyncExternalStore } from "react";
import type { Player } from "./api";

/** The player on this device and the teams this device coaches. Kept in localStorage, no accounts. */
type Local = { me: Pick<Player, "id" | "nickname" | "team_code"> | null; teams: { code: string; name: string }[] };

const KEY = "kickscope.local";
const listeners = new Set<() => void>();

function read(): Local {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { me: null, teams: [], ...JSON.parse(raw) };
  } catch {
    /* private mode or blocked storage */
  }
  return { me: null, teams: [] };
}

let state = read();

function write(next: Local) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* still works for this tab */
  }
  listeners.forEach((l) => l());
}

export const local = {
  get: () => state,
  setMe: (me: Local["me"]) => write({ ...state, me }),
  addTeam: (team: { code: string; name: string }) => write({ ...state, teams: [team, ...state.teams.filter((t) => t.code !== team.code)] }),
};

export function useLocal() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
