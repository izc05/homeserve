export function deferAuthIdentityRefresh(refresh: () => void) {
  globalThis.setTimeout(refresh, 0);
}
