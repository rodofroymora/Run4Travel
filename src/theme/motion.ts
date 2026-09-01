/**
 * Motion tokens — Apple-like timing, Batlló presence.
 * Prefer short springs; never bounce-chaos.
 */
export const motion = {
  /** Screen enter */
  enterMs: 320,
  enterStaggerMs: 70,
  /** Press feedback */
  pressScale: 0.97,
  pressMs: 120,
  /** Ambient blob breathe */
  breatheMs: 4200,
  /** Easing approximations for Animated */
  easeOut: { tension: 80, friction: 14 },
} as const;

/** Soft ink shadow for elevated organic surfaces. */
export const elevation = {
  card: {
    shadowColor: '#2b1d12',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
  },
  button: {
    shadowColor: '#2b1d12',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  medal: {
    shadowColor: '#2b1d12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
} as const;
