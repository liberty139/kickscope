export type Ball = { x: number; y: number; r?: number | null };
export type Status = "good" | "warn" | "bad" | "info";

export type Phases = { plant: number; backswing: number; contact: number; contact_t: number; follow: number; confident: boolean };

export type Analysis = {
  fps: number;
  n_frames: number;
  width: number;
  height: number;
  kick_foot: "left" | "right";
  mirrored: boolean;
  missing_share: number;
  phases: Phases;
  window: [number, number];
  scale: { m_per_px: number; source: "ball" | "height" | "assumed" };
  metrics: Record<string, number>;
  chain: { order_ok: boolean; thigh_ms: number; shank_ms: number; foot_ms: number };
  series: { knee: number[]; hip: number[]; thigh: number[]; shank: number[]; trunk: number[]; shank_speed: number[]; foot_speed: number[] };
  ball?: Ball | null;
  height_cm?: number | null;
};

export type MetricRow = { key: string; label: string; unit: string; value: number; ref: number; ref_sd: number | null; z: number | null; status: Status };

export type Comparison = {
  ref_id: string;
  ref_name: string;
  score: number;
  similarity: number;
  phase_scores: { key: string; label: string; score: number }[];
  metrics: MetricRow[];
  focus: string | null;
  ghost_frames: number[];
  ghost_swap: boolean;
};

export type Attempt = {
  id: string;
  player_id: string | null;
  created: number;
  ref_id: string;
  score: number;
  kick_foot: string;
  source: string;
  advice: string | null;
  advice_source: "llm" | "rules" | null;
  is_demo: boolean;
  analysis: Analysis;
  comparison: Comparison;
  landmarks: number[][][];
};

export type Reference = { id: string; name: string; fps: number; n_frames: number; frames: number[][][]; is_demo: boolean; n_kicks: number };
export type Player = { id: string; nickname: string; team_code: string | null; created: number; is_demo: number };

export type Progress = {
  player: Player;
  attempts: { id: string; created: number; score: number; focus: string | null; is_demo: boolean }[];
  scores: number[];
  score_per_week: number | null;
  metrics: { key: string; label: string; unit: string; ref: number; ref_sd: number; values: number[]; per_week: number | null; closer: boolean | null; status: Status }[];
};

export type TeamView = {
  team: { code: string; name: string; is_demo: number };
  total: number;
  players: { id: string; nickname: string; attempts: number; is_demo: boolean; last_id?: string; score?: number; first_score?: number; focus?: string | null; statuses?: Record<string, Status> }[];
  issues: { key: string; text: string; players: string[]; count: number }[];
};

export type NewAttempt = {
  landmarks: number[][][];
  fps: number;
  width: number;
  height: number;
  ball?: Ball | null;
  foot?: string;
  height_cm?: number | null;
  player_id?: string | null;
  source?: string;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api${path}`, { headers: { "Content-Type": "application/json" }, ...init });
  if (!r.ok) {
    let msg = `Ошибка ${r.status}`;
    try {
      const j = await r.json();
      msg = typeof j.detail === "string" ? j.detail : msg;
    } catch {
      /* not json */
    }
    throw new Error(msg);
  }
  return r.json();
}

const post = <T,>(path: string, body: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  health: () => call<{ ok: boolean; ai: { enabled: boolean; model: string; host: string; key: boolean }; refs: number }>("/health"),
  demo: () => call<{ team_code: string; featured: string; ref_id: string }>("/demo"),
  attempt: (id: string) => call<Attempt>(`/attempts/${id}`),
  createAttempt: (body: NewAttempt) => post<Attempt>("/attempts", body),
  recompute: (id: string, body: { contact?: number; ball?: Ball | null }) => post<Attempt>(`/attempts/${id}/recompute`, body),
  advice: (id: string) => post<{ text: string; source: "llm" | "rules" }>(`/attempts/${id}/advice`, {}),
  ref: (id: string) => call<Reference>(`/refs/${id}`),
  createPlayer: (nickname: string, team_code?: string | null) => post<Player>("/players", { nickname, team_code }),
  player: (id: string) => call<Player>(`/players/${id}`),
  progress: (id: string) => call<Progress>(`/players/${id}/progress`),
  deletePlayer: (id: string) => call<{ ok: boolean }>(`/players/${id}`, { method: "DELETE" }),
  createTeam: (name: string) => post<{ code: string; name: string }>("/teams", { name }),
  team: (code: string) => call<TeamView>(`/teams/${code}`),
  joinTeam: (code: string, player_id: string) => post<{ code: string; name: string }>(`/teams/${code}/join`, { player_id }),
};
