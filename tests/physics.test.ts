import { describe, expect, it } from 'vitest';
import { step, type Body, type World } from '../src/scene/physics';

const world: World = { halfWidth: 3, zMin: -17, zMax: 17, friction: 9, restitution: 0.9 };
const body = (x: number, z: number, vx = 0, vz = 0): Body => ({ x, z, vx, vz, r: 0.8, active: true });
const energy = (bodies: Body[]) => bodies.reduce((sum, b) => sum + b.vx ** 2 + b.vz ** 2, 0);

describe('puckfysiken', () => {
  it('stannar en puck genom friktionen', () => {
    const b = body(0, 10, 0, -20);
    for (let i = 0; i < 400; i++) step([b], 1 / 60, world);
    expect(Math.abs(b.vz)).toBe(0);
  });

  it('håller puckarna på bordet', () => {
    const bodies = [body(0, 0, 30, -30), body(1, 2, -25, 40), body(-1, -3, 18, 22)];
    for (let i = 0; i < 600; i++) {
      step(bodies, 1 / 60, world);
      for (const b of bodies) {
        expect(Math.abs(b.x)).toBeLessThanOrEqual(world.halfWidth);
        expect(Math.abs(b.z)).toBeLessThanOrEqual(world.zMax);
      }
    }
  });

  it('skapar aldrig energi i en krock', () => {
    const bodies = [body(0, 5, 0, -30), body(0.2, -5, 0, 0)];
    let before = energy(bodies);
    for (let i = 0; i < 200; i++) {
      step(bodies, 1 / 60, world);
      const after = energy(bodies);
      expect(after).toBeLessThanOrEqual(before + 1e-9);
      before = after;
    }
  });

  it('rapporterar krockar', () => {
    let hits = 0;
    const bodies = [body(0, 4, 0, -25), body(0, 0)];
    for (let i = 0; i < 60; i++) step(bodies, 1 / 60, { ...world, onHit: () => hits++ });
    expect(hits).toBeGreaterThan(0);
  });

  it('skiljer puckar som startar ovanpå varandra', () => {
    const a = body(0, 0);
    const b = body(0, 0.1);
    step([a, b], 1 / 60, world);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(1.59);
  });
});
