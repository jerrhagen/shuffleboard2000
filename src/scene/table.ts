// Bordet och rummet runt det: allt som står still. Texturerna ritas med kod.
import * as THREE from 'three';

export const TABLE_WIDTH = 6.4;
export const TABLE_LENGTH = 34;

const RED = new THREE.Color(2.4, 0.12, 0.3);
const BLUE = new THREE.Color(0.1, 0.85, 2.8);
const GOLD = new THREE.Color(2.2, 1.3, 0.4);

function seededNoise(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function woodTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 4096;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d')!;
  const rnd = seededNoise(2000);

  const planks = 8;
  const plankWidth = w / planks;
  const tones = ['#b9783a', '#a9692f', '#c48542', '#9f612b', '#b87a3d', '#ae6f33', '#c18040', '#a56630'];
  for (let i = 0; i < planks; i++) {
    c.fillStyle = tones[i];
    c.fillRect(i * plankWidth, 0, plankWidth, h);
  }
  for (let i = 0; i < 3600; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const length = 180 + rnd() * 1300;
    c.strokeStyle = rnd() > 0.45 ? `rgba(66,30,8,${0.03 + rnd() * 0.12})` : `rgba(255,214,150,${0.02 + rnd() * 0.08})`;
    c.lineWidth = 0.6 + rnd() * 2.4;
    c.beginPath();
    c.moveTo(x, y);
    const sway = (rnd() - 0.5) * 16;
    c.bezierCurveTo(x + sway, y + length / 3, x - sway, y + (2 * length) / 3, x + sway / 2, y + length);
    c.stroke();
  }
  c.fillStyle = 'rgba(30,12,3,.75)';
  for (let i = 1; i < planks; i++) c.fillRect(i * plankWidth - 1, 0, 2, h);

  // Mörknar mot kanterna, som lacken på ett riktigt bord.
  const edge = c.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, 'rgba(12,4,0,.72)');
  edge.addColorStop(0.16, 'rgba(12,4,0,0)');
  edge.addColorStop(0.84, 'rgba(12,4,0,0)');
  edge.addColorStop(1, 'rgba(12,4,0,.72)');
  c.fillStyle = edge;
  c.fillRect(0, 0, w, h);

  // Poängzonerna i båda ändar.
  const zone = (flip: boolean) => {
    c.save();
    if (flip) {
      c.translate(w, h);
      c.rotate(Math.PI);
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '700 150px Michroma, sans-serif';
    [150, 400, 650].forEach((y, i) => {
      c.fillStyle = 'rgba(12,6,20,.42)';
      c.fillRect(30, y, w - 60, 250);
      c.fillStyle = i === 0 ? '#ffd86b' : '#f7ead6';
      c.fillRect(30, y + 246, w - 60, 8);
      c.save();
      c.translate(w / 2, y + 128);
      if (flip) c.rotate(Math.PI);
      c.fillText(String(3 - i), 0, 0);
      c.restore();
    });
    c.restore();
  };
  zone(false);
  zone(true);

  // Emblemet mitt på bordet.
  c.save();
  c.translate(w / 2, h / 2);
  c.strokeStyle = 'rgba(30,10,2,.55)';
  c.lineWidth = 12;
  c.beginPath();
  c.arc(0, 0, 330, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 4;
  c.beginPath();
  c.arc(0, 0, 300, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = 'rgba(30,10,2,.6)';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = '700 150px Michroma, sans-serif';
  c.fillText('2000', 0, 0);
  c.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function gradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 4;
  const c = canvas.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 4);
  return new THREE.CanvasTexture(canvas);
}

export interface TableParts {
  group: THREE.Group;
  grid: THREE.GridHelper;
  setPulse(amount: number): void;
}

export function buildTable(maxAnisotropy: number): TableParts {
  const group = new THREE.Group();

  // Skivan är lätt genomskinlig: de speglade puckarna under den blir reflektionen.
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(TABLE_WIDTH, TABLE_LENGTH),
    new THREE.MeshPhysicalMaterial({
      map: woodTexture(maxAnisotropy),
      roughness: 0.34,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 0.7,
      transparent: true,
      opacity: 0.8,
    }),
  );
  top.rotation.x = -Math.PI / 2;
  top.renderOrder = 1;
  group.add(top);

  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x20222e, metalness: 1, roughness: 0.3 });
  const railLength = TABLE_LENGTH + 1.6;
  const makeRail = (x: number) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.3, railLength), railMaterial);
    rail.position.set(x, -0.65, 0);
    group.add(rail);
  };
  makeRail(-(TABLE_WIDTH / 2 + 0.4));
  makeRail(TABLE_WIDTH / 2 + 0.4);
  const makeEnd = (z: number) => {
    const end = new THREE.Mesh(new THREE.BoxGeometry(TABLE_WIDTH, 2.3, 0.8), railMaterial);
    end.position.set(0, -0.65, z);
    group.add(end);
  };
  makeEnd(-(TABLE_LENGTH / 2 + 0.4));
  makeEnd(TABLE_LENGTH / 2 + 0.4);

  const redStrip = new THREE.MeshBasicMaterial({ color: RED.clone(), toneMapped: false });
  const blueStrip = new THREE.MeshBasicMaterial({ color: BLUE.clone(), toneMapped: false });
  const goldStrip = new THREE.MeshBasicMaterial({ color: GOLD.clone(), toneMapped: false });
  const strip = (x: number, z: number, sx: number, sz: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.09, sz), material);
    mesh.position.set(x, 0.52, z);
    group.add(mesh);
  };
  strip(-(TABLE_WIDTH / 2 + 0.4), 0, 0.16, railLength, redStrip);
  strip(TABLE_WIDTH / 2 + 0.4, 0, 0.16, railLength, blueStrip);
  strip(0, -(TABLE_LENGTH / 2 + 0.4), TABLE_WIDTH, 0.16, goldStrip);
  strip(0, TABLE_LENGTH / 2 + 0.4, TABLE_WIDTH, 0.16, goldStrip);

  // Neonljuset som spiller ut över lacken.
  const spillTexture = gradientTexture();
  const spill = (x: number, flip: boolean, color: THREE.Color) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, TABLE_LENGTH),
      new THREE.MeshBasicMaterial({
        map: spillTexture,
        color: color.clone().multiplyScalar(0.1),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    if (flip) mesh.rotation.z = Math.PI;
    mesh.position.set(x, 0.012, 0);
    mesh.renderOrder = 2;
    group.add(mesh);
  };
  spill(-(TABLE_WIDTH / 2 - 0.95), false, RED);
  spill(TABLE_WIDTH / 2 - 0.95, true, BLUE);

  const grid = new THREE.GridHelper(300, 100, 0xff2bd6, 0x3b1d8f);
  grid.position.y = -7;
  const gridMaterial = grid.material as THREE.LineBasicMaterial;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.75;
  group.add(grid);

  return {
    group,
    grid,
    setPulse(amount) {
      const k = 1 + amount;
      redStrip.color.copy(RED).multiplyScalar(k);
      blueStrip.color.copy(BLUE).multiplyScalar(k);
      goldStrip.color.copy(GOLD).multiplyScalar(k);
    },
  };
}
