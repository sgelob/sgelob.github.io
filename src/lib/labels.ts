// Where to put a short label beside a point on a drawing so it does not sit on the drawing's own line.

export interface Placement {
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
}

/** Spots around the point, in order of preference (above first, as a map or chart reader expects). */
const SPOTS: readonly [number, number, Placement['anchor']][] = [
  [0, -8, 'middle'], [7, -6, 'start'], [-7, -6, 'end'], [9, 3, 'start'],
  [-9, 3, 'end'], [0, 15, 'middle'], [7, 13, 'start'], [-7, 13, 'end'],
];

/**
 * The spot for `text` beside `at` that covers the fewest `obstacles` (the points of the line it labels), inside `box`.
 * The text box is estimated for a monospaced font of `size` px (0.6 em per character). Ties keep the earlier spot.
 */
export function placeLabel(
  at: readonly [number, number],
  text: string,
  obstacles: readonly (readonly [number, number])[],
  box: { left: number; top: number; right: number; bottom: number },
  size = 9,
): Placement {
  const w = text.length * size * 0.6;
  let best: Placement | undefined;
  let bestScore = Infinity;
  for (const [dx, dy, anchor] of SPOTS) {
    const x = at[0] + dx, y = at[1] + dy;
    const x0 = anchor === 'start' ? x : anchor === 'middle' ? x - w / 2 : x - w;
    const x1 = x0 + w, y0 = y - size * 0.8, y1 = y + size * 0.2;
    if (x0 < box.left || x1 > box.right || y0 < box.top || y1 > box.bottom) continue;
    let score = 0;
    for (const [ox, oy] of obstacles) if (ox >= x0 - 2 && ox <= x1 + 2 && oy >= y0 - 2 && oy <= y1 + 2) score++;
    if (score < bestScore) { bestScore = score; best = { x, y, anchor }; }
  }
  return best ?? { x: at[0], y: at[1] - 8, anchor: 'middle' };
}
