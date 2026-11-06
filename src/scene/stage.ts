// 3D-scenen: lugnt bord bakom menyerna och hela lottningsshowen.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buzz, sfx } from '../audio';
import type { DrawnTable, Team } from '../domain/draw';
import { Shockwaves, Sparks, buildDust } from './effects';
import { step, type World } from './physics';
import { PUCK_RADIUS, Puck, TEAM_COLORS, faceTexture } from './puck';
import { TABLE_LENGTH, TABLE_WIDTH, buildTable, type TableParts } from './table';

export interface StagePlayer {
  id: string;
  name: string;
  photo: string | null;
}

export type StageEvent =
  | { type: 'launch' }
  | { type: 'vortex' }
  | { type: 'flash' }
  | { type: 'table'; index: number; total: number; redName: string; blueName: string }
  | { type: 'player'; name: string; team: Team }
  | { type: 'tableDone' };

class Skipped extends Error {}

interface Pose {
  position: THREE.Vector3;
  look: THREE.Vector3;
}

interface Tween {
  time: number;
  duration: number;
  apply: (t: number) => void;
  resolve: () => void;
  reject: (error: Error) => void;
}

const easeInOut = (t: number) => t * t * (3 - 2 * t);
const easeIn = (t: number) => t * t * t;
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pose = (x: number, y: number, z: number, lx: number, ly: number, lz: number): Pose => ({
  position: new THREE.Vector3(x, y, z),
  look: new THREE.Vector3(lx, ly, lz),
});

const VORTEX = new THREE.Vector3(0, 5, -3);
const REVEAL_Z = 1.5;
const BLOOM = 0.32;

const PLAY_WORLD: Omit<World, 'onHit'> = {
  halfWidth: TABLE_WIDTH / 2,
  zMin: -TABLE_LENGTH / 2,
  zMax: TABLE_LENGTH / 2,
  friction: 9,
  restitution: 0.88,
};

export class Stage {
  static async create(canvas: HTMLCanvasElement): Promise<Stage> {
    await Promise.all([document.fonts.load('700 150px Michroma'), document.fonts.ready]);
    return new Stage(canvas);
  }

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 260);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private useComposer = true;
  private forceQuality = new URLSearchParams(location.search).get('kvalitet') === 'hog';

  private table: TableParts;
  private world = new THREE.Group();
  private mirrorRoot = new THREE.Group();
  private sparks = new Sparks();
  private waves = new Shockwaves();
  private dust = buildDust();
  private redLight = new THREE.PointLight(0xff2a4d, 22, 34);
  private blueLight = new THREE.PointLight(0x22b8ff, 22, 34);

  private idlePucks: Puck[] = [];
  private pucks: Puck[] = [];
  private tweens: Tween[] = [];
  private playing = false;
  private paused = false;
  private skipRequested: (() => void) | null = null;

  private time = 0;
  private lastFrame = 0;
  private lastRender = 0;
  private raf = 0;
  private nextIdleShot = 2;
  private idleShots = 0;
  private frameTimes: number[] = [];

  private cameraPose: Pose;
  private shake = 0;
  private pulse = 0;
  private bloomBoost = 0;
  private gridSpeed = 1.2;
  private gridTarget = 1.2;
  private gridOffset = 0;
  private vortexSpeed = 2;

  private constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    this.scene.background = new THREE.Color(0x05030c);
    this.scene.fog = new THREE.FogExp2(0x05030c, 0.016);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.3;
    pmrem.dispose();

    this.scene.add(this.world, this.mirrorRoot);
    this.mirrorRoot.scale.y = -1;
    this.table = buildTable(this.renderer.capabilities.getMaxAnisotropy());
    this.world.add(this.table.group, this.waves.group, this.sparks.points, this.dust);

    this.scene.add(new THREE.HemisphereLight(0x8a7cff, 0x201008, 0.9));
    const lamp = new THREE.SpotLight(0xffdcae, 95, 90, 0.95, 0.6, 1.7);
    lamp.position.set(0, 20, 1);
    lamp.target.position.set(0, 0, -2);
    this.scene.add(lamp, lamp.target);
    this.redLight.position.set(-5.5, 4, 2);
    this.blueLight.position.set(5.5, 4, 2);
    this.scene.add(this.redLight, this.blueLight);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), BLOOM, 0.5, 1);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.cameraPose = this.idlePose();
    this.buildIdlePucks();
    this.resize();
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      this.lastFrame = 0;
      if (!document.hidden) this.schedule();
    });
    canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
    this.schedule();
  }

  // Offentligt gränssnitt

  /** Stoppar ritandet medan kameran är igång, så att telefonen orkar med den. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.lastFrame = 0;
    this.schedule();
  }

  skip(): void {
    this.skipRequested?.();
  }

  async play(tables: DrawnTable<StagePlayer>[], onEvent: (event: StageEvent) => void): Promise<void> {
    const players = tables.flatMap((table) => [...table.red, ...table.blue]);
    this.playing = true;
    this.paused = false;
    this.schedule();
    this.frameTimes = [];
    this.idlePucks.forEach((puck) => puck.hide());
    const bySeat = new Map<string, Puck>();
    const scale = players.length <= 14 ? 1 : Math.max(0.62, Math.sqrt(14 / players.length));
    await Promise.all(
      players.map(async (player) => {
        const puck = new Puck(await faceTexture(player.photo, player.name), true, this.mirrorRoot, this.world);
        puck.setScale(scale);
        this.pucks.push(puck);
        bySeat.set(player.id, puck);
      }),
    );
    try {
      await Promise.race([
        this.sequence(tables, bySeat, onEvent),
        new Promise<never>((_, reject) => {
          this.skipRequested = () => reject(new Skipped());
        }),
      ]);
    } catch (error) {
      if (!(error instanceof Skipped)) throw error;
    } finally {
      this.endShow();
    }
  }

  // Lottningsshowen

  private async sequence(
    tables: DrawnTable<StagePlayer>[],
    seats: Map<string, Puck>,
    onEvent: (event: StageEvent) => void,
  ): Promise<void> {
    const pucks = [...this.pucks].sort(() => Math.random() - 0.5);
    const z0 = TABLE_LENGTH / 2;

    // 1. Puckarna skjuts ned längs bordet och krockar.
    onEvent({ type: 'launch' });
    this.gridTarget = 16;
    this.cameraPose = pose(0, 3.4, z0 + 5.5, 0, 0.3, -7);
    const gap = Math.min(0.24, 2.2 / pucks.length);
    for (const puck of pucks) {
      const b = puck.body;
      b.x = rand(-1.7, 1.7);
      b.z = z0 - 1.6;
      b.vx = rand(-6, 6);
      b.vz = -rand(29, 38);
      b.active = true;
      puck.spin = rand(-16, 16);
      puck.tiltX = puck.tiltZ = 0;
      puck.state = 'physics';
      puck.pos.set(b.x, 0, b.z);
      puck.show();
      this.pulse = 1;
      sfx.whoosh();
      buzz(12);
      await this.wait(gap);
    }
    void this.moveCamera(pose(0, 18, 11, 0, 0, -6), 1.5).catch(() => {});
    await this.wait(1.7);

    // 2. Allt lyfter och snurrar upp i en virvel.
    onEvent({ type: 'vortex' });
    sfx.riser(1.7);
    buzz([30, 40, 30, 40, 60]);
    this.vortexSpeed = 2;
    pucks.forEach((puck, i) => {
      puck.body.active = false;
      puck.from.copy(puck.pos);
      puck.blend = -i * 0.03;
      puck.orbitAngle = Math.atan2(puck.pos.z - VORTEX.z, puck.pos.x);
      puck.orbitRadius = rand(1.5, 3.5);
      puck.orbitHeight = rand(-1.8, 1.8);
      puck.state = 'vortex';
    });
    void this.tween(1.7, (t) => {
      this.vortexSpeed = 2 + 8 * t;
      this.bloomBoost = t * 0.5;
      this.gridSpeed = 16 + 40 * t;
    }).catch(() => {});
    const reveal = this.revealPose();
    void this.moveCamera(reveal, 1.6).catch(() => {});
    await this.wait(1.7);
    onEvent({ type: 'flash' });
    this.pulse = 2.5;
    this.shake = 0.4;
    this.gridTarget = 3;

    // 3. Ett bord i taget: puckarna slår ned på sin plats.
    for (const table of tables) {
      onEvent({ type: 'table', index: table.index, total: tables.length, redName: table.redName, blueName: table.blueName });
      await this.wait(0.75);
      const rows = Math.max(table.red.length, table.blue.length);
      const scale = Math.min(this.pucks[0].scale, 5 / rows);
      const spacing = 1.95 * scale;
      const seating = [...Array(rows).keys()].flatMap((row) => [
        { player: table.red[row], team: 'red' as Team, row },
        { player: table.blue[row], team: 'blue' as Team, row },
      ]).filter((seat) => seat.player);
      const interval = Math.max(0.24, Math.min(0.5, 6.5 / seating.length));
      for (const { player, team, row } of seating) {
        const puck = seats.get(player.id)!;
        const x = (team === 'red' ? -1 : 1) * 1.55;
        const z = REVEAL_Z + (row - (rows - 1) / 2) * spacing;
        void this.slam(puck, x, z, scale, team, player.name, onEvent).catch(() => {});
        await this.wait(interval);
      }
      await this.wait(1.25);
      onEvent({ type: 'tableDone' });
      if (table.index < tables.length - 1) {
        sfx.whoosh();
        const leaving = [...table.red, ...table.blue].map((player) => seats.get(player.id)!);
        await this.clearTable(leaving);
      }
    }

    // 4. Final.
    sfx.fanfare();
    buzz([40, 30, 40, 30, 120]);
    this.bloomBoost = 0.5;
    for (let i = 0; i < 3; i++) {
      this.sparks.burst(rand(-2.4, 2.4), 0.6, REVEAL_Z + rand(-3, 3), i % 2 ? TEAM_COLORS.blue : TEAM_COLORS.red, 90, 10);
      await this.wait(0.16);
    }
    await this.wait(0.5);
  }

  private async slam(
    puck: Puck,
    x: number,
    z: number,
    scale: number,
    team: Team,
    name: string,
    onEvent: (event: StageEvent) => void,
  ): Promise<void> {
    const color = TEAM_COLORS[team];
    const start = puck.pos.clone();
    const startYaw = puck.yaw;
    const startTiltX = puck.tiltX;
    const startTiltZ = puck.tiltZ;
    const startScale = puck.scale;
    const yawGoal = Math.round(startYaw / (Math.PI * 2)) * Math.PI * 2;
    puck.state = 'tween';
    puck.ring.color.copy(color);
    onEvent({ type: 'player', name, team });
    await this.tween(0.34, (t) => {
      const s = easeInOut(t);
      puck.pos.x = THREE.MathUtils.lerp(start.x, x, s);
      puck.pos.z = THREE.MathUtils.lerp(start.z, z, s);
      puck.pos.y = THREE.MathUtils.lerp(start.y, 0, easeIn(t));
      puck.yaw = THREE.MathUtils.lerp(startYaw, yawGoal, s);
      puck.tiltX = THREE.MathUtils.lerp(startTiltX, 0, s);
      puck.tiltZ = THREE.MathUtils.lerp(startTiltZ, 0, s);
      puck.scale = THREE.MathUtils.lerp(startScale, scale, s);
    });
    puck.state = 'rest';
    this.waves.fire(x, z, color);
    this.sparks.burst(x, 0.3, z, color, 46, 8);
    this.shake = Math.max(this.shake, 0.28);
    this.pulse = 1.6;
    this.bloomBoost = Math.max(this.bloomBoost, 0.2);
    sfx.slam(team);
    buzz(35);
  }

  private async clearTable(pucks: Puck[]): Promise<void> {
    const starts = pucks.map((puck) => puck.pos.clone());
    await this.tween(0.5, (t) => {
      pucks.forEach((puck, i) => {
        puck.pos.z = starts[i].z - easeIn(t) * 60;
        puck.pos.y = easeIn(t) * 3;
      });
    });
    pucks.forEach((puck) => puck.hide());
  }

  private endShow(): void {
    this.skipRequested = null;
    this.tweens.forEach((tween) => tween.reject(new Skipped()));
    this.tweens = [];
    this.pucks.forEach((puck) => puck.dispose());
    this.pucks = [];
    this.playing = false;
    this.gridTarget = 1.2;
    this.bloomBoost = 0;
    this.pulse = 0;
    this.cameraPose = this.idlePose();
    this.resetIdlePucks();
  }

  // Tid och kamera

  private tween(duration: number, apply: (t: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tweens.push({ time: 0, duration, apply, resolve, reject });
    });
  }

  private wait(seconds: number): Promise<void> {
    return this.tween(seconds, () => {});
  }

  private moveCamera(target: Pose, duration: number): Promise<void> {
    const from: Pose = { position: this.cameraPose.position.clone(), look: this.cameraPose.look.clone() };
    const current: Pose = { position: from.position.clone(), look: from.look.clone() };
    this.cameraPose = current;
    return this.tween(duration, (t) => {
      const s = easeInOut(t);
      current.position.lerpVectors(from.position, target.position, s);
      current.look.lerpVectors(from.look, target.look, s);
    });
  }

  private idlePose(): Pose {
    return pose(0, 5.2, TABLE_LENGTH / 2 + 7, 0, 0, -9);
  }

  /** Avståndet väljs så att bordets hela bredd får plats även på en smal telefon. */
  private revealPose(): Pose {
    const distance = Math.max(12.5, 8.3 / this.camera.aspect);
    return pose(0, distance * 0.83, REVEAL_Z + distance * 0.55, 0, 0, REVEAL_Z - 0.6);
  }

  private resize(): void {
    const w = innerWidth;
    const h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Lugna scenen bakom menyerna

  private buildIdlePucks(): void {
    const texture = (color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const c = canvas.getContext('2d')!;
      const g = c.createRadialGradient(50, 44, 4, 64, 64, 76);
      g.addColorStop(0, color);
      g.addColorStop(1, '#10061c');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
      const out = new THREE.CanvasTexture(canvas);
      out.colorSpace = THREE.SRGBColorSpace;
      return out;
    };
    const red = texture('#ff2a4d');
    const blue = texture('#22b8ff');
    for (let i = 0; i < 6; i++) {
      const team = i % 2 ? 'blue' : 'red';
      const puck = new Puck(team === 'red' ? red : blue, false, this.mirrorRoot, this.world);
      puck.ring.color.copy(TEAM_COLORS[team]);
      this.idlePucks.push(puck);
    }
    this.resetIdlePucks();
  }

  private resetIdlePucks(): void {
    const spots = [[-1.5, -11], [1.2, -12.6], [0, -9], [-0.4, -13.4], [1.9, -9.8], [-1.9, -8.4]];
    this.idlePucks.forEach((puck, i) => {
      const b = puck.body;
      b.x = spots[i][0];
      b.z = spots[i][1];
      b.vx = b.vz = 0;
      b.active = true;
      puck.state = 'physics';
      puck.spin = 0;
      puck.pos.set(b.x, 0, b.z);
      puck.show();
    });
    this.idleShots = 0;
    this.nextIdleShot = this.time + 1.5;
  }

  private idleUpdate(): void {
    if (this.time < this.nextIdleShot) return;
    this.nextIdleShot = this.time + rand(3, 5);
    if (++this.idleShots > 7) {
      this.resetIdlePucks();
      return;
    }
    const puck = this.idlePucks[Math.floor(Math.random() * this.idlePucks.length)];
    const b = puck.body;
    b.x = rand(-1.6, 1.6);
    b.z = TABLE_LENGTH / 2 - 2;
    b.vx = rand(-1.5, 1.5);
    b.vz = -rand(21, 26);
    puck.spin = rand(-9, 9);
  }

  // Bildrutan

  private schedule(): void {
    if (this.raf || document.hidden || this.paused) return;
    this.raf = requestAnimationFrame((now) => {
      this.raf = 0;
      this.frame(now);
      this.schedule();
    });
  }

  private frame(now: number): void {
    // Bakom menyerna räcker 30 bilder per sekund och batteriet tackar.
    if (!this.playing && now - this.lastRender < 30) return;
    const raw = this.lastFrame ? (now - this.lastFrame) / 1000 : 1 / 60;
    this.lastFrame = now;
    this.watchPerformance(raw);
    // Tiden kläms: en seg telefon får en långsammare show, inte en som hoppar.
    const dt = Math.min(raw, 0.05);
    this.time += dt;
    this.advanceTweens(dt);
    if (this.playing) this.updateShow(dt);
    else this.idleUpdate();
    this.updateCommon(dt);
    this.lastRender = now;
    if (this.useComposer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  private watchPerformance(raw: number): void {
    if (!this.playing || !this.useComposer || this.forceQuality) return;
    this.frameTimes.push(raw);
    if (this.frameTimes.length < 40) return;
    const average = this.frameTimes.reduce((sum, value) => sum + value, 0) / this.frameTimes.length;
    this.frameTimes = [];
    if (average > 0.042) {
      this.useComposer = false;
      this.renderer.setPixelRatio(1);
      this.resize();
    }
  }

  private advanceTweens(dt: number): void {
    const running = [...this.tweens];
    for (const tween of running) {
      tween.time += dt;
      const t = Math.min(1, tween.time / tween.duration);
      tween.apply(t);
      if (t >= 1) {
        this.tweens.splice(this.tweens.indexOf(tween), 1);
        tween.resolve();
      }
    }
  }

  private updateShow(dt: number): void {
    const world: World = {
      ...PLAY_WORLD,
      onHit: (speed, x, z) => {
        sfx.clack(speed);
        if (speed > 5) {
          this.sparks.burst(x, 0.3, z, Math.random() > 0.5 ? TEAM_COLORS.red : TEAM_COLORS.blue, 14, speed * 0.3);
          this.shake = Math.max(this.shake, Math.min(0.16, speed * 0.008));
        }
      },
    };
    step(this.pucks.map((puck) => puck.body), dt, world);
    this.vortexSpin(dt);
  }

  private vortexSpin(dt: number): void {
    for (const puck of this.pucks) {
      if (puck.state !== 'vortex') continue;
      puck.blend = Math.min(1, puck.blend + dt / 0.9);
      puck.orbitAngle += this.vortexSpeed * dt;
      const radius = puck.orbitRadius * (1 + Math.sin(this.time * 2 + puck.phase) * 0.12);
      const target = new THREE.Vector3(
        VORTEX.x + Math.cos(puck.orbitAngle) * radius,
        VORTEX.y + puck.orbitHeight + Math.sin(this.time * 3 + puck.phase) * 0.4,
        VORTEX.z + Math.sin(puck.orbitAngle) * radius,
      );
      const s = easeInOut(Math.max(0, puck.blend));
      puck.pos.lerpVectors(puck.from, target, s);
      puck.tiltX = Math.sin(this.time * 4 + puck.phase) * 0.9 * s;
      puck.tiltZ = Math.cos(this.time * 3 + puck.phase) * 0.9 * s;
      puck.yaw += this.vortexSpeed * 1.3 * dt;
      const strobe = Math.sin(this.time * 18 + puck.phase) > 0 ? TEAM_COLORS.red : TEAM_COLORS.blue;
      puck.ring.color.copy(strobe);
      if (Math.random() < 0.3) {
        this.sparks.emit(puck.pos.x, puck.pos.y, puck.pos.z, rand(-1, 1), rand(-2, 1), rand(-1, 1), strobe, 0.5);
      }
    }
  }

  private updateCommon(dt: number): void {
    if (!this.playing) {
      step(this.idlePucks.map((puck) => puck.body), dt, PLAY_WORLD as World);
    }
    for (const puck of this.playing ? this.pucks : this.idlePucks) {
      if (puck.state === 'physics') {
        const b = puck.body;
        puck.pos.set(b.x, 0, b.z);
        const speed = Math.hypot(b.vx, b.vz);
        puck.yaw += puck.spin * dt;
        puck.spin *= Math.exp(-dt * (speed > 0 ? 0.5 : 5));
        if (this.playing && speed > 9 && Math.random() < 0.6) {
          this.sparks.emit(b.x, 0.08, b.z, -b.vx * 0.05 + rand(-0.5, 0.5), rand(0.3, 1.4), -b.vz * 0.05, puck.ring.color, 0.5);
        }
      }
      if (puck.state !== 'hidden') puck.sync();
    }
    this.sparks.update(dt);
    this.waves.update(dt);
    this.dust.rotation.y += dt * 0.012;

    this.gridSpeed += (this.gridTarget - this.gridSpeed) * Math.min(1, dt * 2);
    this.gridOffset = (this.gridOffset + this.gridSpeed * dt) % 3;
    this.table.grid.position.z = this.gridOffset;

    this.pulse = Math.max(0, this.pulse - dt * 3.2);
    this.bloomBoost = Math.max(0, this.bloomBoost - dt * 1.4);
    this.table.setPulse(this.pulse + Math.sin(this.time * 2.2) * 0.1);
    this.bloom.strength = BLOOM + this.bloomBoost;
    const lightBeat = 22 + this.pulse * 30;
    this.redLight.intensity = lightBeat + Math.sin(this.time * 1.7) * 6;
    this.blueLight.intensity = lightBeat + Math.cos(this.time * 1.3) * 6;

    const { position, look } = this.cameraPose;
    this.camera.position.copy(position);
    if (!this.playing) {
      this.camera.position.x += Math.sin(this.time * 0.22) * 1.4;
      this.camera.position.y += Math.sin(this.time * 0.31) * 0.35;
    }
    this.shake = Math.max(0, this.shake - dt * 1.1);
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
    }
    this.camera.lookAt(look);
  }
}

export const PUCK_SIZE = PUCK_RADIUS * 2;
