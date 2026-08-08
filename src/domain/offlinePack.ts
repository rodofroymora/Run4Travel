import type { OfflinePackStatus } from '../types/discovery';

export function createEmptyPack(routeId: string): OfflinePackStatus {
  return {
    routeId,
    geometry: false,
    storiesText: false,
    audio: false,
    mapTiles: false,
    ready: false,
    progress: 0,
  };
}

export function computePackReady(pack: Omit<OfflinePackStatus, 'ready' | 'progress'>): boolean {
  // Audio opcional: si falta, aún se puede START con texto (SPEC-003 edge case)
  return pack.geometry && pack.storiesText && pack.mapTiles;
}

export function withProgress(
  pack: OfflinePackStatus,
  patch: Partial<OfflinePackStatus>,
): OfflinePackStatus {
  const next = { ...pack, ...patch };
  const parts = [next.geometry, next.storiesText, next.audio, next.mapTiles];
  next.progress = parts.filter(Boolean).length / parts.length;
  next.ready = computePackReady(next);
  return next;
}

/** Gate de START: no permitir si pack incompleto. */
export function canStartRun(pack: OfflinePackStatus | null | undefined): boolean {
  return Boolean(pack?.ready);
}
