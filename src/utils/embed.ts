/**
 * iframe embedding helpers. When embedded, the configurator notifies the host
 * page via postMessage. Messages never contain secrets; set ?parentOrigin=
 * to restrict delivery to a specific host origin.
 */
export type EmbedEvent =
  | { type: 'canopy:ready'; productId: string }
  | { type: 'canopy:quote'; configurationId: string; total: number; currency: string }
  | { type: 'canopy:cart'; configurationId: string; cartId: string; checkoutUrl: string | null }
  | { type: 'canopy:resize'; height: number };

export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin access throws, which means we are framed
  }
}

function targetOrigin(): string {
  return new URLSearchParams(window.location.search).get('parentOrigin') ?? '*';
}

export function postToParent(event: EmbedEvent): void {
  if (!isEmbedded()) return;
  window.parent.postMessage(event, targetOrigin());
}
