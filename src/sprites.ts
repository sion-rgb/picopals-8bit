import type { NpcLook, Pet, Species } from "./types";
export type SpriteAnimation =
  | "idle"
  | "blink"
  | "walk"
  | "feed"
  | "happy"
  | "sad"
  | "gift"
  | "wedding"
  | "sick"
  | "sleep"
  | "play"
  | "evolve"
  | string;
export interface SpriteOptions {
  silhouette?: boolean;
  pet?: Partial<Pet>;
  frame?: number;
  senior?: boolean;
  legacyCosmetic?: Pet["legacyCosmetic"];
}
const rect = (
  c: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const dot = (
  c: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  size = 3,
) => rect(c, color, x, y, size, size);
const kindOf = (id: string) =>
  id.includes("bun") || id === "rosette"
    ? "rabbit"
    : id.includes("fox") || id === "aurora"
      ? "fox"
      : id.includes("kit") || id.includes("mew") || id === "celestia"
        ? "cat"
        : id.includes("pup") || id === "honeybell"
          ? "dog"
          : id.includes("lamb")
            ? "lamb"
            : id.includes("seal") || id === "opaline"
              ? "seal"
              : id.includes("deer") || id === "florielle"
                ? "deer"
                : id === "velvet"
                  ? "bat"
                  : id === "mallow"
                    ? "cloud"
                    : id === "pomu"
                      ? "blob"
                      : "egg";
const poseOf = (animation: string) =>
  animation.startsWith("feed")
    ? "feed"
    : animation.includes("wedding")
      ? "wedding"
      : animation.includes("gift")
        ? "gift"
        : animation.includes("play") || animation.includes("game")
          ? "play"
          : animation;

export function drawSpeciesSprite(
  c: CanvasRenderingContext2D,
  s: Species,
  position: { x: number; y: number },
  scale = 1,
  animation: SpriteAnimation = "idle",
  options: SpriteOptions = {},
) {
  const frame = options.frame ?? 0,
    pose = poseOf(animation),
    kind = kindOf(s.id),
    silhouette = Boolean(options.silhouette),
    ink = silhouette ? "#201b25" : "#4a3d4f",
    main = silhouette ? ink : s.color,
    accent = silhouette ? ink : s.accent,
    light = silhouette ? ink : "#fff6df",
    blush = silhouette ? ink : "#e989aa";
  const walk = pose === "walk" ? frame % 4 : 0,
    bob =
      pose === "sleep"
        ? 3
        : pose === "happy" || pose === "play"
          ? -(frame % 3)
          : frame % 4 === 1
            ? -1
            : 0;
  c.save();
  c.translate(position.x, position.y + bob);
  c.scale(scale, scale * (pose === "sleep" ? 0.82 : 1));
  if (pose === "sad") c.translate(0, 2);
  if (pose === "sick" || options.pet?.isSick) c.globalAlpha = 0.82;
  if (kind === "egg") {
    rect(c, ink, -17, -22, 34, 39);
    rect(c, main, -14, -20, 28, 34);
    rect(c, accent, -10, -12, 7, 6);
    rect(c, accent, 4, -3, 7, 7);
    rect(c, light, -4, -18, 7, 3);
    if (pose === "evolve")
      for (let i = 0; i < 5; i++)
        dot(c, light, -23 + i * 11, -27 + (i % 2) * 6, 3);
    c.restore();
    return;
  }
  drawTail(c, kind, ink, main, accent, frame, pose);
  drawEars(c, kind, ink, main, accent, frame, pose, s.id);
  const adult = s.stage === "adult",
    wide = kind === "seal" || kind === "cloud",
    bodyW = wide ? 38 : adult ? 34 : 31,
    bodyH = adult ? 25 : 22;
  rect(c, ink, -bodyW / 2 - 2, -18, bodyW + 4, 27);
  rect(c, main, -bodyW / 2, -16, bodyW, 23);
  if (kind === "lamb") {
    for (let x = -15; x <= 11; x += 7)
      dot(c, light, x, -19 + (Math.abs(x) % 3), 7);
    rect(c, main, -14, -13, 28, 21);
  }
  if (kind === "seal") {
    rect(c, ink, -20, 4, 40, 16);
    rect(c, main, -18, 3, 36, 13);
    rect(c, accent, -26, 4, 9, 7);
    rect(c, accent, 17, 4, 9, 7);
  } else if (kind === "cloud") {
    rect(c, ink, -20, 4, 40, 17);
    rect(c, main, -18, 2, 36, 16);
    for (let x = -17; x < 18; x += 9) dot(c, light, x, 12, 9);
  } else {
    rect(c, ink, -15, 5, 30, 18);
    rect(c, main, -13, 4, 26, 16);
    const left = walk === 1 || walk === 2 ? -10 : -8,
      right = walk === 1 || walk === 2 ? 5 : 7;
    rect(c, ink, left, 19, 7, 6);
    rect(c, ink, right, 19, 7, 6);
    rect(c, accent, left + 1, 19, 5, 4);
    rect(c, accent, right + 1, 19, 5, 4);
  }
  drawFace(c, ink, light, blush, frame, pose, silhouette);
  drawMarkings(c, s.id, kind, ink, main, accent, light, frame, pose);
  if (options.senior) {
    dot(c, light, 18, -28, 4);
    dot(c, silhouette ? ink : "#d7e7ef", 23, -33, 3);
    rect(c, silhouette ? ink : "#b9c7d6", -15, -21, 30, 2);
  }
  drawLegacy(c, options.legacyCosmetic, ink, accent, light);
  if (pose === "sick" || options.pet?.isSick) {
    dot(c, silhouette ? ink : "#729a78", 19, -27, 6);
    dot(c, silhouette ? ink : "#9bc59f", 24, -33, 3);
  }
  if (pose === "gift") {
    rect(c, ink, 16, -2, 14, 13);
    rect(c, silhouette ? ink : "#e86a99", 18, 0, 10, 9);
    rect(c, light, 22, -2, 3, 13);
  }
  if (pose === "wedding") {
    rect(c, light, -21, 9, 42, 4);
    dot(c, silhouette ? ink : "#ed7fa7", -24, -22, 5);
    dot(c, silhouette ? ink : "#f4d66e", 20, -26, 5);
  }
  c.restore();
}

function drawEars(
  c: CanvasRenderingContext2D,
  kind: string,
  ink: string,
  main: string,
  accent: string,
  frame: number,
  pose: string,
  id: string,
) {
  const wag = pose === "happy" || pose === "play" ? (frame % 3) - 1 : 0;
  if (kind === "rabbit") {
    rect(c, ink, -17, -38 + wag, 11, 25);
    rect(c, ink, 6, -38 - wag, 11, 25);
    rect(c, main, -15, -36 + wag, 7, 22);
    rect(c, main, 8, -36 - wag, 7, 22);
    rect(c, accent, -12, -32 + wag, 3, 13);
    rect(c, accent, 10, -32 - wag, 3, 13);
  } else if (kind === "fox" || kind === "cat" || kind === "bat") {
    rect(c, ink, -20, -31, 13, 17);
    rect(c, ink, 7, -31, 13, 17);
    rect(c, main, -17, -27, 9, 13);
    rect(c, main, 8, -27, 9, 13);
    dot(c, accent, -14, -25, 5);
    dot(c, accent, 10, -25, 5);
  } else if (kind === "dog") {
    rect(c, ink, -23, -25, 12, 18);
    rect(c, ink, 11, -25, 12, 18);
    rect(c, accent, -21, -22, 9, 14);
    rect(c, accent, 12, -22, 9, 14);
  } else if (kind === "lamb") {
    rect(c, ink, -23, -24, 10, 12);
    rect(c, ink, 13, -24, 10, 12);
    rect(c, accent, -21, -22, 7, 8);
    rect(c, accent, 14, -22, 7, 8);
  } else if (kind === "deer") {
    rect(c, ink, -16, -31, 8, 17);
    rect(c, ink, 8, -31, 8, 17);
    rect(c, main, -14, -28, 5, 14);
    rect(c, main, 9, -28, 5, 14);
    rect(c, accent, -20, -39, 4, 14);
    rect(c, accent, 16, -39, 4, 14);
    rect(c, accent, -25, -38, 9, 4);
    rect(c, accent, 16, -34, 9, 4);
  } else if (kind === "blob") {
    rect(c, ink, -7, -29, 14, 14);
    rect(c, main, -5, -27, 10, 12);
    dot(c, accent, -2, -31, 4);
  } else if (kind === "seal") {
    rect(c, ink, -22, -20, 9, 9);
    rect(c, ink, 13, -20, 9, 9);
    rect(c, accent, -20, -18, 6, 6);
    rect(c, accent, 14, -18, 6, 6);
  } else if (kind === "cloud") {
    rect(c, ink, -18, -25, 10, 12);
    rect(c, ink, 8, -25, 10, 12);
    rect(c, "#fff4d9", -15, -23, 6, 9);
    rect(c, "#fff4d9", 9, -23, 6, 9);
  }
  if (id === "velvet") {
    rect(c, accent, -26, -28, 10, 6);
    rect(c, accent, 16, -28, 10, 6);
  }
}
function drawTail(
  c: CanvasRenderingContext2D,
  kind: string,
  ink: string,
  main: string,
  accent: string,
  frame: number,
  pose: string,
) {
  const wag =
    pose === "happy" || pose === "play" ? (frame % 4) * 3 : (frame % 2) * 2;
  if (kind === "fox") {
    rect(c, ink, 13, -2, 20 + wag, 12);
    rect(c, main, 14, -1, 17 + wag, 9);
    rect(c, accent, 27 + wag, -1, 6, 9);
  } else if (kind === "cat") {
    rect(c, ink, 13, 4, 7, 18);
    rect(c, main, 14, 4, 4, 15);
    rect(c, ink, 17, 2, 11, 6);
    rect(c, accent, 18, 3, 8, 3);
  } else if (kind === "rabbit") {
    dot(c, ink, 15, 7, 10);
    dot(c, "#fff4d9", 17, 9, 6);
  } else if (kind === "dog") {
    rect(c, ink, 13, 1, 17, 7);
    rect(c, main, 14, 2, 14, 4);
  } else if (kind === "deer") {
    rect(c, ink, 13, 5, 9, 8);
    rect(c, "#fff4d9", 15, 7, 5, 4);
  } else if (kind === "bat") {
    rect(c, ink, 13, -2, 17, 18);
    rect(c, accent, 14, 0, 13, 12);
    rect(c, ink, 21, 6, 8, 4);
  }
}
function drawFace(
  c: CanvasRenderingContext2D,
  ink: string,
  light: string,
  blush: string,
  frame: number,
  pose: string,
  silhouette: boolean,
) {
  if (silhouette) return;
  const blink = pose === "blink" || pose === "sleep" || frame % 17 === 0;
  if (blink) {
    rect(c, ink, -10, -7, 6, 2);
    rect(c, ink, 5, -7, 6, 2);
  } else {
    rect(c, light, -11, -9, 7, 8);
    rect(c, light, 4, -9, 7, 8);
    rect(c, ink, -8, -7, 3, 5);
    rect(c, ink, 6, -7, 3, 5);
    if (pose === "sad") {
      dot(c, "#7eb5d0", -12, -1, 3);
      dot(c, "#7eb5d0", 11, -1, 3);
    }
  }
  dot(c, blush, -15, 1, 4);
  dot(c, blush, 12, 1, 4);
  if (pose === "happy") rect(c, ink, -4, 2, 8, 4);
  else if (pose === "feed") rect(c, ink, -3, 1, 6, 6);
  else rect(c, ink, -2, 2, 4, 2);
}
function drawMarkings(
  c: CanvasRenderingContext2D,
  id: string,
  kind: string,
  ink: string,
  main: string,
  accent: string,
  light: string,
  frame: number,
  pose: string,
) {
  if (id.includes("berry") || id.includes("ribbon") || id === "rosette") {
    rect(c, accent, -8, -23, 16, 6);
    rect(c, accent, -13, -20, 5, 5);
    rect(c, accent, 8, -20, 5, 5);
  }
  if (id.includes("cloud") || id === "mallow") {
    for (let x = -11; x < 12; x += 8) dot(c, light, x, 9, 7);
  }
  if (id.includes("moon") || id === "celestia") {
    rect(c, accent, -2, -22, 4, 7);
    dot(c, light, 1, -25, 3);
  }
  if (kind === "fox") {
    rect(c, light, -8, 8, 16, 6);
    rect(c, accent, -2, -22, 4, 5);
  }
  if (kind === "seal") {
    dot(c, light, -5, -20, 10);
    dot(c, accent, -3, -17, 6);
  }
  if (kind === "deer") {
    dot(c, accent, -6, -22, 5);
    dot(c, accent, 2, -25, 5);
    if (pose === "happy" || pose === "play")
      for (let i = 0; i < 3; i++)
        dot(
          c,
          i % 2 ? accent : light,
          -26 + i * 25,
          -22 - ((frame + i) % 3) * 3,
          3,
        );
  }
  if (id.includes("pup")) {
    rect(c, accent, -11, -17, 8, 8);
    rect(c, light, -8, -15, 3, 3);
  }
  if (id.includes("lamb")) {
    rect(c, accent, -13, 8, 26, 5);
  }
  if (id === "honeybell") {
    rect(c, accent, -10, 7, 20, 5);
    dot(c, light, -3, 11, 6);
  }
  if (id === "velvet") {
    rect(c, accent, -14, 7, 28, 5);
    rect(c, main, -4, 10, 8, 8);
  }
  if (id === "mallow") {
    rect(c, accent, -10, -23, 20, 4);
    dot(c, light, -3, -28, 6);
  }
  if (pose === "evolve")
    for (let i = 0; i < 6; i++)
      dot(c, light, -28 + ((i * 11 + frame * 3) % 58), -31 + (i % 3) * 10, 3);
}
function drawLegacy(
  c: CanvasRenderingContext2D,
  legacy: Pet["legacyCosmetic"] | undefined,
  ink: string,
  accent: string,
  light: string,
) {
  if (legacy === "star") dot(c, "#ffe06d", -27, -29, 5);
  if (legacy === "ribbon") {
    rect(c, ink, -7, -31, 14, 6);
    rect(c, "#ee75a3", -5, -29, 10, 3);
  }
  if (legacy === "halo") {
    rect(c, light, -14, -40, 28, 3);
    rect(c, accent, -9, -42, 18, 2);
  }
  if (legacy === "accent") dot(c, accent, 23, -24, 4);
}

export function drawNpcSprite(
  c: CanvasRenderingContext2D,
  look: NpcLook,
  position: { x: number; y: number },
  scale = 1,
  animation: SpriteAnimation = "idle",
  frame = 0,
) {
  const group = Math.floor((look.shape - 21) / 4),
    stageIndex = ["baby", "child", "teen", "adult"].indexOf(look.stage),
    ink = "#483d4e",
    main = look.color,
    accent = look.accent,
    light = "#fff4d9",
    bob = ["idle", "happy", "talk"].includes(animation) ? frame % 2 : 0,
    size = stageIndex * 2;
  c.save();
  c.translate(position.x, position.y + bob);
  c.scale(scale, scale);
  drawNpcTail(c, group, ink, main, accent, frame, animation);
  drawNpcHead(c, group, ink, main, accent, size);
  rect(c, ink, -15 - size / 2, 4, 30 + size, 21 + size);
  rect(c, main, -13 - size / 2, 3, 26 + size, 19 + size);
  rect(c, ink, -12, 20, 8, 6);
  rect(c, ink, 5, 20, 8, 6);
  drawFace(c, ink, light, "#eb8fa9", frame, animation, false);
  drawNpcAccessory(
    c,
    group,
    stageIndex,
    ink,
    main,
    accent,
    light,
    frame,
    animation,
  );
  if (animation === "gift") {
    rect(c, ink, 16, -1, 13, 12);
    rect(c, "#e85f91", 18, 1, 9, 8);
    rect(c, light, 21, -1, 3, 12);
  }
  if (animation === "talk" && frame % 2 === 0) rect(c, light, -2, 4, 4, 3);
  if (animation === "proposal" || animation === "wedding") {
    dot(c, "#f7d46b", 21, -25, 9);
    dot(c, light, 24, -22, 3);
    rect(c, "#fff7ea", -18, 12, 36, 7);
  }
  c.restore();
}
function drawNpcHead(
  c: CanvasRenderingContext2D,
  g: number,
  ink: string,
  main: string,
  accent: string,
  size: number,
) {
  rect(c, ink, -18 - size / 2, -19 - size / 2, 36 + size, 29 + size / 2);
  rect(c, main, -16 - size / 2, -17 - size / 2, 32 + size, 25 + size / 2);
  if (g === 0) {
    rect(c, ink, -20, -31, 12, 16);
    rect(c, ink, 8, -31, 12, 16);
    rect(c, accent, -17, -27, 8, 11);
    rect(c, accent, 9, -27, 8, 11);
  } else if (g === 1) {
    dot(c, ink, -19, -23, 12);
    dot(c, ink, 10, -23, 12);
    dot(c, main, -17, -21, 8);
    dot(c, main, 12, -21, 8);
  } else if (g === 2) {
    rect(c, ink, -20, -30, 12, 16);
    rect(c, ink, 8, -30, 12, 16);
    rect(c, accent, -17, -26, 8, 11);
    rect(c, accent, 9, -26, 8, 11);
  } else if (g === 3) {
    rect(c, ink, -23, -24, 12, 17);
    rect(c, ink, 11, -24, 12, 17);
    rect(c, accent, -20, -21, 8, 13);
    rect(c, accent, 12, -21, 8, 13);
  } else if (g === 4) {
    rect(c, ink, -16, -30, 8, 16);
    rect(c, ink, 8, -30, 8, 16);
    rect(c, accent, -14, -27, 5, 12);
    rect(c, accent, 9, -27, 5, 12);
    rect(c, accent, -21, -37, 4, 13);
    rect(c, accent, 17, -37, 4, 13);
  } else {
    dot(c, ink, -19, -23, 12);
    dot(c, ink, 10, -23, 12);
    dot(c, main, -17, -21, 8);
    dot(c, main, 12, -21, 8);
  }
}
function drawNpcTail(
  c: CanvasRenderingContext2D,
  g: number,
  ink: string,
  main: string,
  accent: string,
  frame: number,
  animation: string,
) {
  const wag = animation === "happy" ? (frame % 3) * 3 : 0;
  if (g === 0) {
    rect(c, ink, 12, -1, 22 + wag, 11);
    rect(c, main, 14, 0, 18 + wag, 8);
    rect(c, accent, 28 + wag, 0, 6, 8);
  } else if (g === 1) {
    rect(c, ink, 12, 4, 11, 9);
    rect(c, accent, 14, 5, 7, 6);
  } else if (g === 2) {
    rect(c, ink, 13, 3, 8, 18);
    rect(c, main, 14, 4, 5, 14);
  } else if (g === 3) {
    rect(c, ink, 13, 0, 18, 14);
    rect(c, accent, 15, 2, 13, 9);
  } else if (g === 4) {
    rect(c, ink, 13, 4, 10, 8);
    rect(c, "#fff4d9", 15, 6, 6, 4);
  } else {
    rect(c, ink, 13, 1, 17 + wag, 8);
    rect(c, main, 15, 3, 13 + wag, 4);
  }
}
function drawNpcAccessory(
  c: CanvasRenderingContext2D,
  g: number,
  stage: number,
  ink: string,
  main: string,
  accent: string,
  light: string,
  frame: number,
  animation: string,
) {
  if (g === 0) {
    rect(c, ink, -13, -24, 26, 5);
    rect(c, light, -10, -23, 8, 4);
    rect(c, light, 3, -23, 8, 4);
    rect(c, accent, -16, 8, 32, 5);
  } else if (g === 1) {
    dot(c, accent, -8, -27, 6);
    dot(c, accent, 2, -30, 6);
    if (stage > 1) {
      rect(c, accent, -20, -36, 4, 13);
      rect(c, accent, 16, -36, 4, 13);
    }
  } else if (g === 2) {
    rect(c, light, -10, -23, 20, 5);
    rect(c, ink, -2, -23, 4, 7);
    rect(c, accent, -12, 9, 24, 5);
    if (stage > 1) rect(c, light, -18, 13, 36, 4);
  } else if (g === 3) {
    rect(c, accent, -8, -29, 16, 6);
    rect(c, accent, -13, -26, 5, 5);
    rect(c, accent, 8, -26, 5, 5);
    if (stage > 1) {
      dot(c, light, -5, -34, 5);
      dot(c, light, 3, -37, 5);
    }
  } else if (g === 4) {
    rect(c, accent, -18, 10, 36, 6);
    dot(c, light, -8, 12, 4);
    dot(c, light, 5, 12, 4);
    if (stage > 1) {
      rect(c, accent, -24, -36, 4, 13);
      rect(c, accent, 20, -36, 4, 13);
    }
  } else {
    rect(c, ink, -8, -32, 16, 8);
    rect(c, accent, -6, -30, 12, 5);
    dot(c, light, 20, -21, 5);
    if (stage > 1) rect(c, accent, -19, 8, 38, 6);
  }
  if (animation === "happy")
    for (let i = 0; i < 3; i++)
      dot(
        c,
        i % 2 ? accent : light,
        -27 + i * 27,
        -28 - ((frame + i) % 2) * 5,
        3,
      );
}
