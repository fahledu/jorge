import { describe, expect, it } from "vitest";
import { formatPoints, formatSeconds, formatTime } from "./format.ts";

describe("format (pt-BR)", () => {
  it("points with a dot for thousands", () => {
    expect(formatPoints(12_340)).toBe("12.340");
    expect(formatPoints(1080)).toBe("1.080");
    expect(formatPoints(0)).toBe("0");
  });

  it("time as m:ss,d with the tenth truncated", () => {
    expect(formatTime(42_850)).toBe("0:42,8");
    expect(formatTime(65_300)).toBe("1:05,3");
    expect(formatTime(20_960)).toBe("0:20,9");
    expect(formatTime(0)).toBe("0:00,0");
  });

  it("whole seconds as m:ss", () => {
    expect(formatSeconds(32)).toBe("0:32");
    expect(formatSeconds(45)).toBe("0:45");
    expect(formatSeconds(725)).toBe("12:05");
  });
});
