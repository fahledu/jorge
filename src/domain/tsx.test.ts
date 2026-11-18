import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTsx } from "./tsx.ts";

const real = readFileSync(
  path.resolve(import.meta.dirname, "../../assets/kenney/Tiled/tileset-tiles.tsx"),
  "utf8",
);

describe("parseTsx", () => {
  it("reads the real tileset of the pack", () => {
    expect(parseTsx(real)).toEqual({
      name: "tileset-tiles",
      tilewidth: 18,
      tileheight: 18,
      tilecount: 180,
      columns: 20,
      margin: 0,
      spacing: 0,
      image: "../Tilemap/tilemap_packed.png",
      imagewidth: 360,
      imageheight: 162,
    });
  });

  it("rejects a tileset without tilecount", () => {
    expect(() => parseTsx(real.replace(' tilecount="180"', ""))).toThrow(/tilecount/);
  });

  it("rejects spacing other than 0", () => {
    expect(() => parseTsx(real.replace("<tileset ", '<tileset spacing="1" '))).toThrow(/spacing/);
  });

  it("accepts explicit zero margin and spacing", () => {
    const text = real.replace("<tileset ", '<tileset margin="0" spacing="0" ');
    expect(parseTsx(text).margin).toBe(0);
  });

  it.each([
    ["no tileset", "<image source='a.png'/>", /<tileset>/],
    ["no image", '<tileset name="a" tilewidth="18">', /<image>/],
    ["tile children", real.replace("</tileset>", '<tile id="1"/></tileset>'), /<tile>/],
    ["no name", real.replace(' name="tileset-tiles"', ""), /name/],
    ["no image source", real.replace('source="../Tilemap/tilemap_packed.png" ', ""), /source/],
    ["non-integer size", real.replace('tilewidth="18"', 'tilewidth="1.5"'), /integer/],
  ])("rejects %s", (_name, text, message) => {
    expect(() => parseTsx(text)).toThrow(message);
  });
});
