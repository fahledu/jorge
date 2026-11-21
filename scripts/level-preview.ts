// `pnpm levels:preview <file.tmj | NNN.json>` and `pnpm levels:preview --sheet [tiles |
// characters | backgrounds]`: PNG previews
// in .preview/, so an agent can see what it wrote (ADR 0012). Draws in Playwright's
// Chromium on a 2D canvas, without a server and without a PNG library.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  MAP_HEIGHT,
  parseTmj,
  type SpawnType,
  TILE_SIZE,
  TILESET_PATH,
} from "../src/domain/tmj.ts";
import { parseTsx } from "../src/domain/tsx.ts";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, ".preview");
const MAP_ZOOM = 2;
const SHEET_ZOOM = 3;

/** Marker letter and color of each spawn type in the preview. */
const MARKERS: Record<SpawnType, { letter: string; color: string }> = {
  start: { letter: "S", color: "#2e7d32" },
  flag: { letter: "F", color: "#c62828" },
  walker: { letter: "W", color: "#6a1b9a" },
  flyer: { letter: "V", color: "#ad1457" },
  spiky: { letter: "K", color: "#4e342e" },
  "flyer-v": { letter: "U", color: "#283593" },
  coin: { letter: "C", color: "#f9a825" },
  heart: { letter: "H", color: "#d81b60" },
  spring: { letter: "M", color: "#00838f" },
  secret: { letter: "G", color: "#0277bd" },
};

interface PreviewMap {
  width: number;
  terrain: number[];
  decor: number[];
  spawns: { type: SpawnType; x: number; y: number }[];
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function skyColor(): string {
  const css = readFileSync(path.join(root, "src/ui/tokens.css"), "utf8");
  return /--color-sky:\s*([^;]+);/.exec(css)?.[1]?.trim() ?? "#5aa9e6";
}

const tsxPath = path.join(root, TILESET_PATH);
const tileset = parseTsx(readFileSync(tsxPath, "utf8"));
const pngUrl = (file: string): string =>
  `data:image/png;base64,${readFileSync(file).toString("base64")}`;
const sheetUrl = pngUrl(path.resolve(path.dirname(tsxPath), tileset.image));

/** A numbered sheet: any image of the pack cut in square cells. */
interface Sheet {
  name: string;
  url: string;
  columns: number;
  tilecount: number;
  tile: number;
}

const kenneyTilemap = (file: string): string => path.join(root, "assets/kenney/Tilemap", file);
const SHEETS: Record<string, () => Sheet> = {
  tiles: () => ({
    name: "tileset-tiles",
    url: sheetUrl,
    columns: tileset.columns,
    tilecount: tileset.tilecount,
    tile: TILE_SIZE,
  }),
  characters: () => {
    const tsx = path.join(root, "assets/kenney/Tiled/tileset-characters.tsx");
    const chars = parseTsx(readFileSync(tsx, "utf8"));
    return {
      name: "characters",
      url: pngUrl(path.resolve(path.dirname(tsx), chars.image)),
      columns: chars.columns,
      tilecount: chars.tilecount,
      tile: 24,
    };
  },
  // No .tsx for the backgrounds: 192×72 packed, 24 px cells, 8 × 3.
  backgrounds: () => ({
    name: "backgrounds",
    url: pngUrl(kenneyTilemap("tilemap-backgrounds_packed.png")),
    columns: 8,
    tilecount: 24,
    tile: 24,
  }),
};

function readMap(file: string): PreviewMap {
  const full = path.resolve(file);
  const json: unknown = JSON.parse(readFileSync(full, "utf8"));
  if (full.endsWith(".json")) {
    // Generated level: already validated by the build; read its layers as they are.
    const level = json as {
      width: number;
      layers: { name: string; data?: number[]; objects?: PreviewMap["spawns"] }[];
    };
    const layer = (name: string) => level.layers.find((l) => l.name === name);
    return {
      width: level.width,
      terrain: layer("terrain")?.data ?? [],
      decor: layer("decor")?.data ?? [],
      spawns: layer("spawns")?.objects ?? [],
    };
  }
  const rel = path.relative(root, full).split(path.sep).join("/");
  const kind = rel.startsWith("levels/chunks/") ? "chunk" : "manual";
  const parsed = parseTmj(json, { kind, file: rel, tileset });
  if (!parsed.ok) {
    fail(parsed.errors.map((e) => `${e.file} [${e.layer ?? "-"}] ${e.message}`).join("\n"));
  }
  return parsed.map;
}

async function render(
  task: { kind: "sheet"; sheet: Sheet } | { kind: "map"; map: PreviewMap },
): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const dataUrl = await page.evaluate(
      async ({ task, sheetUrl, sky, columns, tile, height, markers, zoom }) => {
        const image = new Image();
        image.src = sheetUrl;
        await image.decode();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2D context");
        const drawTile = (gid: number, x: number, y: number, size: number): void => {
          if (gid === 0) return;
          const id = gid - 1;
          const sx = (id % columns) * tile;
          const sy = Math.floor(id / columns) * tile;
          ctx.drawImage(image, sx, sy, tile, tile, x, y, size, size);
        };

        if (task.kind === "sheet") {
          const { sheet } = task;
          const sheetImage = new Image();
          sheetImage.src = sheet.url;
          await sheetImage.decode();
          const size = sheet.tile * zoom.sheet;
          const { columns, tilecount } = sheet;
          const rows = Math.ceil(tilecount / columns);
          canvas.width = columns * size;
          canvas.height = rows * size;
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.font = "bold 10px monospace";
          for (let id = 0; id < tilecount; id++) {
            const x = (id % columns) * size;
            const y = Math.floor(id / columns) * size;
            const sx = (id % columns) * sheet.tile;
            const sy = Math.floor(id / columns) * sheet.tile;
            ctx.drawImage(sheetImage, sx, sy, sheet.tile, sheet.tile, x, y, size, size);
            ctx.strokeStyle = "rgba(0,0,0,0.35)";
            ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
            const label = `${id}/${id + 1}`; // local id / GID
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(x + 1, y + 1, ctx.measureText(label).width + 4, 12);
            ctx.fillStyle = "#fff";
            ctx.fillText(label, x + 3, y + 10);
          }
        } else {
          const { map } = task;
          const size = tile * zoom.map;
          const ruler = 14;
          canvas.width = map.width * size;
          canvas.height = height * size + ruler;
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, canvas.width, height * size);
          for (const data of [map.decor, map.terrain]) {
            data.forEach((gid, i) => {
              drawTile(gid, (i % map.width) * size, Math.floor(i / map.width) * size, size);
            });
          }
          // Column ruler every 5 tiles, under the map.
          ctx.fillStyle = "#222";
          ctx.fillRect(0, height * size, canvas.width, ruler);
          ctx.font = "bold 11px monospace";
          for (let col = 0; col < map.width; col += 5) {
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.fillRect(col * size, 0, 1, height * size);
            ctx.fillStyle = "#fff";
            ctx.fillText(String(col), col * size + 2, height * size + 11);
          }
          ctx.font = "bold 12px monospace";
          for (const spawn of map.spawns) {
            const marker = markers[spawn.type];
            const x = spawn.x * zoom.map;
            const y = spawn.y * zoom.map;
            ctx.fillStyle = marker.color;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.fillText(marker.letter, x - 4, y + 4);
          }
        }
        return canvas.toDataURL("image/png");
      },
      {
        task,
        sheetUrl,
        sky: skyColor(),
        columns: tileset.columns,
        tile: TILE_SIZE,
        height: MAP_HEIGHT,
        markers: MARKERS,
        zoom: { map: MAP_ZOOM, sheet: SHEET_ZOOM },
      },
    );
    return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  } finally {
    await browser.close();
  }
}

const usage =
  "usage: pnpm levels:preview <file.tmj | NNN.json> | --sheet [tiles | characters | backgrounds]";
const arg = process.argv[2];
if (!arg) fail(usage);
mkdirSync(outDir, { recursive: true });
const isSheet = arg === "--sheet";
const makeSheet = isSheet ? SHEETS[process.argv[3] ?? "tiles"] : undefined;
if (isSheet && !makeSheet) fail(usage);
const sheet = makeSheet?.();
const png = await render(sheet ? { kind: "sheet", sheet } : { kind: "map", map: readMap(arg) });
const name = sheet ? sheet.name : path.basename(arg).replace(/\.(tmj|json)$/, "");
const target = path.join(outDir, `${name}.png`);
writeFileSync(target, png);
process.stdout.write(`levels:preview: ${path.relative(root, target)}\n`);
