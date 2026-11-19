// Development only (ADR 0010): imported behind `import.meta.env.DEV`, absent from the
// production build. Its text is a tool for the developer, not interface (plan 1c).

const UPDATES_PER_SECOND = 2;
const AVERAGE_SECONDS = 30;
const SAMPLES = UPDATES_PER_SECOND * AVERAGE_SECONDS;

/** Shows the current fps and the average of the last 30 s in a corner of `parent`. */
export function mountFpsMeter(parent: HTMLElement, readFps: () => number): void {
  const meter = document.createElement("div");
  meter.className = "fps-meter";
  meter.setAttribute("aria-hidden", "true");
  parent.append(meter);

  const samples: number[] = [];
  setInterval(() => {
    const fps = readFps();
    samples.push(fps);
    if (samples.length > SAMPLES) samples.shift();
    const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    meter.textContent = `${fps.toFixed(0)} fps · média ${AVERAGE_SECONDS} s ${average.toFixed(1)}`;
  }, 1000 / UPDATES_PER_SECOND);
}
