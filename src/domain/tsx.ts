// Reader of the external Tiled tileset (.tsx) referenced by chunks and manual levels
// (ADR 0012). Only the attributes of <tileset> and <image> are read: the files are fixed
// and checked by hash (ADR 0008), so a full XML parser would be weight without benefit.

export interface TilesetInfo {
  name: string;
  tilewidth: number;
  tileheight: number;
  tilecount: number;
  columns: number;
  margin: number;
  spacing: number;
  /** Path of the sheet, relative to the .tsx file. */
  image: string;
  imagewidth: number;
  imageheight: number;
}

function attributes(tag: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of tag.matchAll(/([A-Za-z_][\w.-]*)="([^"]*)"/g)) {
    const [, key, value] = match;
    if (key !== undefined && value !== undefined) found.set(key, value);
  }
  return found;
}

function intAttribute(attrs: Map<string, string>, tag: string, key: string): number {
  const raw = attrs.get(key);
  if (raw === undefined) throw new Error(`.tsx: <${tag}> has no "${key}" attribute`);
  if (!/^\d+$/.test(raw)) throw new Error(`.tsx: <${tag}> "${key}" is not an integer: ${raw}`);
  return Number(raw);
}

/** Parses the subset of a .tsx accepted by ADR 0012; throws with the reason otherwise. */
export function parseTsx(xml: string): TilesetInfo {
  const tilesetTag = /<tileset\b[^>]*>/.exec(xml)?.[0];
  if (!tilesetTag) throw new Error(".tsx: no <tileset> element");
  const imageTag = /<image\b[^>]*>/.exec(xml)?.[0];
  if (!imageTag) throw new Error(".tsx: no <image> element");
  if (/<tile\b/.test(xml)) throw new Error(".tsx: <tile> children are not supported");

  const tileset = attributes(tilesetTag);
  const image = attributes(imageTag);
  const name = tileset.get("name");
  if (!name) throw new Error('.tsx: <tileset> has no "name" attribute');
  const source = image.get("source");
  if (!source) throw new Error('.tsx: <image> has no "source" attribute');

  const margin = tileset.has("margin") ? intAttribute(tileset, "tileset", "margin") : 0;
  const spacing = tileset.has("spacing") ? intAttribute(tileset, "tileset", "spacing") : 0;
  if (margin !== 0 || spacing !== 0) throw new Error(".tsx: margin and spacing must be 0");

  return {
    name,
    tilewidth: intAttribute(tileset, "tileset", "tilewidth"),
    tileheight: intAttribute(tileset, "tileset", "tileheight"),
    tilecount: intAttribute(tileset, "tileset", "tilecount"),
    columns: intAttribute(tileset, "tileset", "columns"),
    margin,
    spacing,
    image: source,
    imagewidth: intAttribute(image, "image", "width"),
    imageheight: intAttribute(image, "image", "height"),
  };
}
