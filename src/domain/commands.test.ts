import { describe, expect, it } from "vitest";
import { CommandState } from "./commands.ts";

describe("CommandState", () => {
  it("holds a command while any source holds it", () => {
    const state = new CommandState();
    state.press("key:ArrowLeft", "left");
    state.press("key:KeyA", "left");
    state.release("key:KeyA");
    expect(state.frame().left).toBe(true);
    state.release("key:ArrowLeft");
    expect(state.frame().left).toBe(false);
  });

  it("reports a press once while the command stays held", () => {
    const state = new CommandState();
    state.press("key:Space", "jump");
    expect(state.frame()).toMatchObject({ jump: true, jumpPressed: true });
    expect(state.frame()).toMatchObject({ jump: true, jumpPressed: false });
  });

  it("counts the same source pressed twice as one press", () => {
    const state = new CommandState();
    state.press("key:Space", "jump");
    state.frame();
    state.press("key:Space", "jump");
    expect(state.frame().jumpPressed).toBe(false);
  });

  it("keeps a press and release between two frames", () => {
    const state = new CommandState();
    state.press("key:Space", "jump");
    state.release("key:Space");
    expect(state.frame()).toMatchObject({ jump: false, jumpPressed: true });
  });

  it("releaseAll drops held commands and pending presses", () => {
    const state = new CommandState();
    state.press("key:ArrowRight", "right");
    state.press("key:Escape", "pause");
    state.releaseAll();
    expect(state.frame()).toEqual({
      left: false,
      right: false,
      jump: false,
      jumpPressed: false,
      pausePressed: false,
    });
  });

  it("mixes keyboard and touch sources", () => {
    const state = new CommandState();
    state.press("key:ArrowLeft", "left");
    state.press("touch:1", "left");
    state.release("touch:1");
    expect(state.frame().left).toBe(true);
  });

  it("reports a pause press", () => {
    const state = new CommandState();
    state.press("key:KeyP", "pause");
    expect(state.frame().pausePressed).toBe(true);
    expect(state.frame().pausePressed).toBe(false);
  });
});
