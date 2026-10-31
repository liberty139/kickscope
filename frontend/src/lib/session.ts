/** Videos analysed in this tab, so the result page can play the skeleton over the real clip. Nothing is uploaded. */
export type LocalClip = { url: string; start: number; frameTime: number };

const clips = new Map<string, LocalClip>();

export const session = {
  put: (attemptId: string, clip: LocalClip) => clips.set(attemptId, clip),
  get: (attemptId: string) => clips.get(attemptId) ?? null,
};
