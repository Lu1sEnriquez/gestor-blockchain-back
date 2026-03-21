/**
 * Font pre-loading utility using the native document.fonts API.
 *
 * Injects Google Fonts <link> stylesheets and waits for the browser to
 * download the font files before Fabric.js renders text, preventing
 * FOUT (Flash of Unstyled Text) and incorrect Textbox width calculations.
 */

const SYSTEM_FONTS = new Set([
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'serif',
  'sans-serif',
  'monospace',
]);

const injectedLinks = new Set<string>();

function toGoogleFontsUrl(family: string): string {
  const encoded = family.replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap`;
}

function injectStylesheetLink(family: string): void {
  if (SYSTEM_FONTS.has(family) || injectedLinks.has(family)) {
    return;
  }

  if (typeof document === 'undefined') {
    return;
  }

  const url = toGoogleFontsUrl(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.dataset.fontFamily = family;
  document.head.appendChild(link);
  injectedLinks.add(family);
}

/**
 * Loads a single font family, injecting the Google Fonts stylesheet if needed,
 * then waiting for the browser to finish downloading the font file.
 */
export async function loadFont(family: string): Promise<void> {
  if (typeof document === 'undefined') {
    return;
  }

  if (SYSTEM_FONTS.has(family)) {
    return;
  }

  // Check if already available
  if (document.fonts.check(`16px "${family}"`)) {
    return;
  }

  injectStylesheetLink(family);

  try {
    await document.fonts.load(`16px "${family}"`);
  } catch {
    // Font may not exist on Google Fonts — silently continue.
    // The browser will fall back to the next available font.
  }
}

/**
 * Extracts all unique fontFamily values from a Fabric.js JSON scene,
 * then pre-loads them all concurrently before hydration.
 */
export async function preloadSceneFonts(scene: Record<string, unknown>): Promise<void> {
  const families = new Set<string>();

  function scan(objects: unknown[]): void {
    for (const entry of objects) {
      if (!entry || typeof entry !== 'object') continue;
      const obj = entry as Record<string, unknown>;

      if (typeof obj.fontFamily === 'string' && obj.fontFamily.length > 0) {
        families.add(obj.fontFamily);
      }

      if (Array.isArray(obj.objects)) {
        scan(obj.objects as unknown[]);
      }
    }
  }

  if (Array.isArray(scene.objects)) {
    scan(scene.objects as unknown[]);
  }

  if (families.size === 0) {
    return;
  }

  await Promise.all(Array.from(families).map((family) => loadFont(family)));
}
