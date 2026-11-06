import { describe, expect, it } from 'vitest';
import { drawTeams, matchups, maxTables, shuffle, tableSizes } from '../src/domain/draw';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const people = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('lottningen', () => {
  it('använder varje spelare exakt en gång', () => {
    for (let n = 2; n <= 40; n++) {
      for (let tables = 1; tables <= maxTables(n); tables++) {
        const drawn = drawTeams(people(n), tables, seeded(n * 31 + tables));
        const all = drawn.flatMap((t) => [...t.red, ...t.blue]).sort((a, b) => a - b);
        expect(all).toEqual(people(n));
      }
    }
  });

  it('håller lagen på ett bord högst en spelare ifrån varandra', () => {
    for (let n = 2; n <= 40; n++) {
      for (let tables = 1; tables <= maxTables(n); tables++) {
        for (const t of drawTeams(people(n), tables, seeded(n + tables))) {
          expect(t.red.length).toBeGreaterThan(0);
          expect(t.blue.length).toBeGreaterThan(0);
          expect(Math.abs(t.red.length - t.blue.length)).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('håller borden högst en spelare ifrån varandra', () => {
    expect(tableSizes(11, 3)).toEqual([4, 4, 3]);
    expect(matchups(11, 3)).toEqual(['2 mot 2', '2 mot 2', '2 mot 1']);
  });

  it('begränsar antalet bord så att varje lag får en spelare', () => {
    expect(maxTables(5)).toBe(2);
    expect(drawTeams(people(5), 9, seeded(1))).toHaveLength(2);
  });

  it('kräver minst två spelare', () => {
    expect(() => drawTeams(people(1), 1)).toThrow();
  });

  it('ger olika bord olika lagnamn', () => {
    const drawn = drawTeams(people(12), 3, seeded(7));
    expect(new Set(drawn.map((t) => t.redName)).size).toBe(3);
    expect(new Set(drawn.map((t) => t.blueName)).size).toBe(3);
  });

  it('blandar utan att tappa något', () => {
    const out = shuffle(people(20), seeded(3));
    expect(out).not.toEqual(people(20));
    expect([...out].sort((a, b) => a - b)).toEqual(people(20));
  });
});
