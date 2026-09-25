export function sameOrigin(origin: string | undefined, appUrl: string) {
  return !!origin && origin === new URL(appUrl).origin;
}
