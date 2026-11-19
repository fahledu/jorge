export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export interface Dialog {
  veil: HTMLDivElement;
  panel: HTMLElement;
  title: HTMLHeadingElement;
}

/** A hidden modal panel over the game (base components of docs/DESIGN.md). */
export function dialog(root: HTMLElement, id: string): Dialog {
  const veil = element("div", "veil veil-dim");
  veil.hidden = true;
  const panel = element("section", "panel panel-dialog");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", id);
  const title = element("h1", "title");
  title.id = id;
  panel.append(title);
  veil.append(panel);
  root.append(veil);
  return { veil, panel, title };
}

export function button(text: string): HTMLButtonElement {
  const node = element("button", "btn btn-primary", text);
  node.type = "button";
  return node;
}
