import type {
  DesignElement,
  ProductConfiguration,
  UploadedAsset,
} from '../types';
import { CONFIGURATION_SCHEMA_VERSION } from '../types';
import { isHexColor } from '../utils/format';

/**
 * Serialization keeps the configuration a plain JSON document so it can be
 * saved, shared via URL, attached to a Shopify order or restored later.
 */

export interface SerializeOptions {
  /** Include base64 artwork. Disable for pricing/cart payloads. */
  includeAssetData?: boolean;
  pretty?: boolean;
}

export function stripAssetData(config: ProductConfiguration): ProductConfiguration {
  const assets: Record<string, UploadedAsset> = {};
  for (const [id, asset] of Object.entries(config.assets)) {
    const { dataUrl: _omit, ...meta } = asset;
    assets[id] = meta;
  }
  return { ...config, assets };
}

export function serializeConfiguration(
  config: ProductConfiguration,
  { includeAssetData = true, pretty = false }: SerializeOptions = {},
): string {
  const payload = includeAssetData ? config : stripAssetData(config);
  return JSON.stringify(payload, null, pretty ? 2 : undefined);
}

export type DeserializeResult =
  | { ok: true; configuration: ProductConfiguration }
  | { ok: false; errors: string[] };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isString = (v: unknown): v is string => typeof v === 'string';

function parseElement(raw: unknown, path: string, errors: string[]): DesignElement | null {
  if (!isObject(raw)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  const { id, x, y, rotation, type } = raw;
  if (!isString(id) || !isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(rotation)) {
    errors.push(`${path} has invalid id/x/y/rotation`);
    return null;
  }
  if (type === 'text') {
    const { text, fontFamily, fontWeight, fontSize, color } = raw;
    if (
      !isString(text) ||
      !isString(fontFamily) ||
      (fontWeight !== 400 && fontWeight !== 700) ||
      !isFiniteNumber(fontSize) ||
      !isHexColor(color)
    ) {
      errors.push(`${path} is not a valid text element`);
      return null;
    }
    return { id, type, x, y, rotation, text, fontFamily, fontWeight, fontSize, color };
  }
  if (type === 'image') {
    const { assetId, width } = raw;
    if (!isString(assetId) || !isFiniteNumber(width)) {
      errors.push(`${path} is not a valid image element`);
      return null;
    }
    return { id, type, x, y, rotation, assetId, width };
  }
  errors.push(`${path}.type must be "text" or "image"`);
  return null;
}

function parseAsset(raw: unknown, path: string, errors: string[]): UploadedAsset | null {
  if (!isObject(raw)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  const { id, name, mimeType, width, height, byteSize, dataUrl } = raw;
  if (
    !isString(id) ||
    !isString(name) ||
    !isString(mimeType) ||
    !isFiniteNumber(width) ||
    !isFiniteNumber(height) ||
    !isFiniteNumber(byteSize)
  ) {
    errors.push(`${path} has invalid metadata`);
    return null;
  }
  if (dataUrl !== undefined && (!isString(dataUrl) || !dataUrl.startsWith('data:image/'))) {
    errors.push(`${path}.dataUrl must be an image data URL`);
    return null;
  }
  const asset: UploadedAsset = { id, name, mimeType, width, height, byteSize };
  if (dataUrl !== undefined) asset.dataUrl = dataUrl;
  return asset;
}

/** Older schema versions are migrated here before structural parsing. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  // v1 is the first published schema; future migrations chain here.
  return raw;
}

/**
 * Structural parse of untrusted input (JSON string or object). Returns a typed
 * configuration or the list of structural errors. Business rules are checked
 * separately by validateConfiguration().
 */
export function deserializeConfiguration(input: unknown): DeserializeResult {
  let raw: unknown = input;
  if (isString(input)) {
    try {
      raw = JSON.parse(input);
    } catch {
      return { ok: false, errors: ['Configuration is not valid JSON'] };
    }
  }
  if (!isObject(raw)) return { ok: false, errors: ['Configuration must be an object'] };

  const data = migrate(raw);
  const errors: string[] = [];

  if (data.schemaVersion !== CONFIGURATION_SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion ${String(data.schemaVersion)}`);
  }
  const { id, productId, quantity, createdAt, updatedAt } = data;
  if (!isString(id)) errors.push('id must be a string');
  if (!isString(productId)) errors.push('productId must be a string');
  if (!isFiniteNumber(quantity) || !Number.isInteger(quantity)) errors.push('quantity must be an integer');
  if (!isString(createdAt) || !isString(updatedAt)) errors.push('timestamps must be strings');

  const selections: Record<string, string> = {};
  if (!isObject(data.selections)) {
    errors.push('selections must be an object');
  } else {
    for (const [k, v] of Object.entries(data.selections)) {
      if (isString(v)) selections[k] = v;
      else errors.push(`selections.${k} must be a string`);
    }
  }

  let base = '';
  const panelColors: Record<string, string> = {};
  if (!isObject(data.colors) || !isHexColor(data.colors.base) || !isObject(data.colors.panels)) {
    errors.push('colors must contain a hex base color and a panels map');
  } else {
    base = data.colors.base;
    for (const [k, v] of Object.entries(data.colors.panels)) {
      if (isHexColor(v)) panelColors[k] = v;
      else errors.push(`colors.panels.${k} must be a hex color`);
    }
  }

  const designs: Record<string, DesignElement[]> = {};
  if (!isObject(data.designs)) {
    errors.push('designs must be an object');
  } else {
    for (const [panelId, list] of Object.entries(data.designs)) {
      if (!Array.isArray(list)) {
        errors.push(`designs.${panelId} must be an array`);
        continue;
      }
      designs[panelId] = list
        .map((el, i) => parseElement(el, `designs.${panelId}[${i}]`, errors))
        .filter((el): el is DesignElement => el !== null);
    }
  }

  const assets: Record<string, UploadedAsset> = {};
  if (!isObject(data.assets)) {
    errors.push('assets must be an object');
  } else {
    for (const [assetId, a] of Object.entries(data.assets)) {
      const asset = parseAsset(a, `assets.${assetId}`, errors);
      if (asset) assets[assetId] = asset;
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    configuration: {
      schemaVersion: CONFIGURATION_SCHEMA_VERSION,
      id: id as string,
      productId: productId as string,
      selections,
      quantity: quantity as number,
      colors: { base, panels: panelColors },
      designs,
      assets,
      createdAt: createdAt as string,
      updatedAt: updatedAt as string,
    },
  };
}
