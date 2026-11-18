/**
 * Imperative bridge to the 3D viewer, registered by <ViewerControlsBridge/> inside
 * the R3F Canvas. Lets toolbar buttons and the PDF service drive the camera or
 * capture a snapshot without lifting Three.js objects into React state.
 */
export interface ViewerApi {
  zoom(factor: number): void;
  resetView(): void;
  /** Renders the product from the default angle and returns a PNG data URL. */
  capture(): string | null;
}

let api: ViewerApi | null = null;

export const viewerBridge = {
  register(next: ViewerApi | null) {
    api = next;
  },
  zoom(factor: number) {
    api?.zoom(factor);
  },
  resetView() {
    api?.resetView();
  },
  capture(): string | null {
    try {
      return api?.capture() ?? null;
    } catch {
      return null;
    }
  },
};
