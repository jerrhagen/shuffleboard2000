// Gnistor, svävande damm och chockvågar: partiklar utan fysikmotor.
import * as THREE from 'three';

function dotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d')!;
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const COUNT = 700;

export class Sparks {
  readonly points: THREE.Points;
  private position = new Float32Array(COUNT * 3);
  private color = new Float32Array(COUNT * 3);
  private velocity = new Float32Array(COUNT * 3);
  private base = new Float32Array(COUNT * 3);
  private life = new Float32Array(COUNT);
  private maxLife = new Float32Array(COUNT);
  private cursor = 0;

  constructor() {
    this.position.fill(-200);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.position, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.color, 3));
    this.points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.3,
        map: dotTexture(),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, color: THREE.Color, life: number): void {
    const i = this.cursor;
    this.cursor = (i + 1) % COUNT;
    this.position.set([x, y, z], i * 3);
    this.velocity.set([vx, vy, vz], i * 3);
    this.base.set([color.r, color.g, color.b], i * 3);
    this.life[i] = this.maxLife[i] = life;
  }

  burst(x: number, y: number, z: number, color: THREE.Color, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.8);
      this.emit(x, y, z, Math.cos(angle) * s, 2 + Math.random() * speed * 0.8, Math.sin(angle) * s, color, 0.45 + Math.random() * 0.7);
    }
  }

  update(dt: number): void {
    const { position, velocity, color, base, life, maxLife } = this;
    for (let i = 0; i < COUNT; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      const j = i * 3;
      if (life[i] <= 0) {
        position[j + 1] = -200;
        color[j] = color[j + 1] = color[j + 2] = 0;
        continue;
      }
      velocity[j + 1] -= 14 * dt;
      position[j] += velocity[j] * dt;
      position[j + 1] += velocity[j + 1] * dt;
      position[j + 2] += velocity[j + 2] * dt;
      if (position[j + 1] < 0.03 && Math.abs(position[j]) < 3.2) {
        position[j + 1] = 0.03;
        velocity[j + 1] *= -0.45;
      }
      const fade = life[i] / maxLife[i];
      color[j] = base[j] * fade;
      color[j + 1] = base[j + 1] * fade;
      color[j + 2] = base[j + 2] * fade;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

export function buildDust(): THREE.Points {
  const count = 320;
  const position = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  const palette = [new THREE.Color(1, 0.3, 0.8), new THREE.Color(0.3, 0.7, 1), new THREE.Color(1, 0.8, 0.5)];
  for (let i = 0; i < count; i++) {
    position.set([(Math.random() - 0.5) * 70, -5 + Math.random() * 28, (Math.random() - 0.5) * 80], i * 3);
    const c = palette[i % 3];
    const level = 0.25 + Math.random() * 0.6;
    color.set([c.r * level, c.g * level, c.b * level], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.34,
      map: dotTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
}

interface Wave {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  age: number;
}

export class Shockwaves {
  readonly group = new THREE.Group();
  private waves: Wave[] = [];
  private next = 0;

  constructor() {
    const geometry = new THREE.RingGeometry(0.86, 1, 64);
    geometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      mesh.renderOrder = 4;
      this.group.add(mesh);
      this.waves.push({ mesh, material, age: 1 });
    }
  }

  fire(x: number, z: number, color: THREE.Color): void {
    const wave = this.waves[this.next];
    this.next = (this.next + 1) % this.waves.length;
    wave.age = 0;
    wave.mesh.position.set(x, 0.05, z);
    wave.mesh.visible = true;
    wave.material.color.copy(color);
  }

  update(dt: number): void {
    for (const wave of this.waves) {
      if (!wave.mesh.visible) continue;
      wave.age += dt / 0.6;
      if (wave.age >= 1) {
        wave.mesh.visible = false;
        continue;
      }
      wave.mesh.scale.setScalar(0.8 + wave.age * 5);
      wave.material.opacity = (1 - wave.age) ** 2;
    }
  }
}
