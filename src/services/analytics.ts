type Props = Record<string, string | number | boolean | undefined>;

/** Analytics stub — listo para swap a provider real. */
export function track(event: string, props?: Props): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`, props ?? {});
  }
}
