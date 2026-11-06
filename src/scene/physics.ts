// Puckarnas fysik i bordets plan. Ren matematik utan three.js, så att den kan testas.

export interface Body {
  x: number;
  z: number;
  vx: number;
  vz: number;
  r: number;
  active: boolean;
}

export interface World {
  halfWidth: number;
  zMin: number;
  zMax: number;
  friction: number;
  restitution: number;
  onHit?: (speed: number, x: number, z: number) => void;
}

export function step(bodies: Body[], dt: number, world: World): void {
  const substeps = 3;
  const h = dt / substeps;
  for (let s = 0; s < substeps; s++) {
    for (const b of bodies) {
      if (!b.active) continue;
      const speed = Math.hypot(b.vx, b.vz);
      if (speed > 0) {
        const next = Math.max(0, speed - world.friction * h);
        b.vx *= next / speed;
        b.vz *= next / speed;
      }
      b.x += b.vx * h;
      b.z += b.vz * h;
      const limit = world.halfWidth - b.r;
      if (Math.abs(b.x) > limit) {
        const hit = Math.abs(b.vx);
        b.x = Math.sign(b.x) * limit;
        b.vx = -b.vx * world.restitution;
        if (hit > 1) world.onHit?.(hit, b.x, b.z);
      }
      if (b.z < world.zMin + b.r || b.z > world.zMax - b.r) {
        const hit = Math.abs(b.vz);
        b.z = Math.min(world.zMax - b.r, Math.max(world.zMin + b.r, b.z));
        b.vz = -b.vz * world.restitution;
        if (hit > 1) world.onHit?.(hit, b.x, b.z);
      }
    }
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (!a.active) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (b.active) collide(a, b, world);
      }
    }
  }
}

function collide(a: Body, b: Body, world: World): void {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const min = a.r + b.r;
  const distSq = dx * dx + dz * dz;
  if (distSq >= min * min) return;
  const dist = Math.sqrt(distSq) || 0.0001;
  const nx = dx / dist;
  const nz = dz / dist;
  const push = (min - dist) / 2;
  a.x -= nx * push;
  a.z -= nz * push;
  b.x += nx * push;
  b.z += nz * push;
  const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
  if (closing <= 0) return;
  const impulse = (closing * (1 + world.restitution)) / 2;
  a.vx -= impulse * nx;
  a.vz -= impulse * nz;
  b.vx += impulse * nx;
  b.vz += impulse * nz;
  if (closing > 1) world.onHit?.(closing, (a.x + b.x) / 2, (a.z + b.z) / 2);
}
