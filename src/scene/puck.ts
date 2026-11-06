// En puck: krompuck med spelarens ansikte och en lysande ring i lagets färg.
import * as THREE from 'three';
import type { Body } from './physics';

export const PUCK_RADIUS = 0.8;

export const TEAM_COLORS = {
  neutral: new THREE.Color(1.5, 1.5, 1.8),
  red: new THREE.Color(2.6, 0.15, 0.32),
  blue: new THREE.Color(0.14, 0.9, 2.8),
};

const R = PUCK_RADIUS;
const bodyGeometry = new THREE.LatheGeometry(
  [
    [0, 0],
    [0.92, 0],
    [1, 0.05],
    [1, 0.3],
    [0.95, 0.38],
    [0.84, 0.38],
    [0.8, 0.34],
    [0, 0.34],
  ].map(([x, y]) => new THREE.Vector2(x * R, y)),
  48,
);
const capGeometry = new THREE.CircleGeometry(R * 0.8, 48);
capGeometry.rotateX(-Math.PI / 2);
const ringGeometry = new THREE.RingGeometry(R * 0.82, R * 0.95, 64);
ringGeometry.rotateX(-Math.PI / 2);
const shadowGeometry = new THREE.CircleGeometry(R * 1.45, 32);
shadowGeometry.rotateX(-Math.PI / 2);

const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde8, metalness: 1, roughness: 0.2 });
let shadowTexture: THREE.CanvasTexture | null = null;

function contactShadow(): THREE.CanvasTexture {
  if (shadowTexture) return shadowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!;
  const g = c.createRadialGradient(64, 64, 26, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,.85)');
  g.addColorStop(0.6, 'rgba(0,0,0,.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  shadowTexture = new THREE.CanvasTexture(canvas);
  return shadowTexture;
}

export async function faceTexture(photo: string | null, name: string): Promise<THREE.CanvasTexture> {
  const size = 320;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d')!;
  let drawn = false;
  if (photo) {
    try {
      const image = new Image();
      image.src = photo;
      await image.decode();
      c.drawImage(image, 0, 0, size, size);
      drawn = true;
    } catch {
      // Trasig bild: faller tillbaka på initialen nedan.
    }
  }
  if (!drawn) {
    const g = c.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, '#3a2a86');
    g.addColorStop(1, '#0d0a24');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    c.fillStyle = '#f2f5ff';
    c.font = '700 150px Michroma, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(name.trim().charAt(0).toUpperCase() || '?', size / 2, size / 2 + 6);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export type PuckState = 'hidden' | 'physics' | 'vortex' | 'tween' | 'rest';

export class Puck {
  readonly group = new THREE.Group();
  readonly mirror = new THREE.Group();
  readonly shadow: THREE.Mesh;
  readonly ring: THREE.MeshBasicMaterial;
  readonly cap: THREE.MeshStandardMaterial;
  readonly body: Body = { x: 0, z: 0, vx: 0, vz: 0, r: R, active: false };
  readonly pos = new THREE.Vector3();
  readonly from = new THREE.Vector3();

  state: PuckState = 'hidden';
  yaw = 0;
  spin = 0;
  tiltX = 0;
  tiltZ = 0;
  scale = 1;
  blend = 0;
  orbitAngle = 0;
  orbitRadius = 0;
  orbitHeight = 0;
  phase = Math.random() * Math.PI * 2;
  ownsTexture: boolean;

  constructor(texture: THREE.Texture, ownsTexture: boolean, mirrorRoot: THREE.Group, scene: THREE.Group) {
    this.ownsTexture = ownsTexture;
    this.cap = new THREE.MeshStandardMaterial({
      map: texture,
      emissive: 0xffffff,
      emissiveMap: texture,
      emissiveIntensity: 0.3,
      roughness: 0.4,
    });
    this.ring = new THREE.MeshBasicMaterial({ color: TEAM_COLORS.neutral.clone(), toneMapped: false });
    for (const holder of [this.group, this.mirror]) {
      holder.add(new THREE.Mesh(bodyGeometry, chrome));
      const cap = new THREE.Mesh(capGeometry, this.cap);
      cap.position.y = 0.345;
      holder.add(cap);
      const ring = new THREE.Mesh(ringGeometry, this.ring);
      ring.position.y = 0.388;
      holder.add(ring);
    }
    this.shadow = new THREE.Mesh(
      shadowGeometry,
      new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false }),
    );
    this.shadow.renderOrder = 3;
    scene.add(this.group, this.shadow);
    mirrorRoot.add(this.mirror);
    this.hide();
  }

  setScale(scale: number): void {
    this.scale = scale;
    this.body.r = R * scale;
  }

  show(): void {
    this.group.visible = this.shadow.visible = true;
    this.mirror.visible = true;
  }

  hide(): void {
    this.state = 'hidden';
    this.body.active = false;
    this.group.visible = this.mirror.visible = this.shadow.visible = false;
  }

  sync(): void {
    const { pos, group, mirror, shadow } = this;
    for (const holder of [group, mirror]) {
      holder.position.copy(pos);
      holder.rotation.set(this.tiltX, this.yaw, this.tiltZ);
      holder.scale.setScalar(this.scale);
    }
    mirror.visible = group.visible && pos.y < 2.5;
    const onTable = Math.abs(pos.x) < 3.2 && Math.abs(pos.z) < 17;
    shadow.visible = group.visible && onTable && pos.y < 6;
    shadow.position.set(pos.x, 0.02, pos.z);
    const lift = Math.max(0, pos.y);
    shadow.scale.setScalar(this.scale * (1 + lift * 0.14));
    (shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - lift * 0.17);
  }

  dispose(): void {
    this.group.removeFromParent();
    this.mirror.removeFromParent();
    this.shadow.removeFromParent();
    (this.shadow.material as THREE.Material).dispose();
    this.cap.dispose();
    this.ring.dispose();
    if (this.ownsTexture) this.cap.map?.dispose();
  }
}
