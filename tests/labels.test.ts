import { expect, test } from 'vitest';
import { placeLabel } from '../src/lib/labels';

const box = { left: 0, top: 0, right: 400, bottom: 300 };
const line = (from: [number, number], to: [number, number], n = 200) =>
  Array.from({ length: n + 1 }, (_, i): [number, number] => [from[0] + ((to[0] - from[0]) * i) / n, from[1] + ((to[1] - from[1]) * i) / n]);

test('free space: the label goes above the point', () => {
  expect(placeLabel([200, 150], '2,439 m', [], box)).toEqual({ x: 200, y: 142, anchor: 'middle' });
});

test('a line rising to the point from the left, falling to the right: above stays clear', () => {
  const peak = [...line([100, 250], [200, 150]), ...line([200, 150], [300, 250])];
  expect(placeLabel([200, 150], '2,439 m · km 14.5', peak, box).anchor).toBe('middle');
  expect(placeLabel([200, 150], '2,439 m · km 14.5', peak, box).y).toBeLessThan(150);
});

test('a line passing horizontally above and through the point: the label goes below', () => {
  const across = [...line([100, 150], [300, 150]), ...line([100, 142], [300, 142])];
  expect(placeLabel([200, 150], '948 m', across, box).y).toBeGreaterThan(150);
});

test('never outside the box: near the top-right corner it turns inward', () => {
  const p = placeLabel([395, 4], '2,439 m', [], box);
  expect(p.anchor).toBe('end');
  expect(p.y).toBeGreaterThan(4);
});
