/**
 * Document title of every page, shared by the client and the SSR renderer
 * so that both produce the same <title>.
 */
export function title(pageTitle: string) {
  return pageTitle ? `${pageTitle} - AquaTracking` : 'AquaTracking'
}
