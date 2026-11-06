// Kameran: livebild via getUserMedia, och bildbehandling som ger kvadratiska JPEG:ar.

const SIZE = 512;

export type Facing = 'user' | 'environment';

export function canUseLiveCamera(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export class LiveCamera {
  private stream: MediaStream | null = null;
  facing: Facing = 'user';

  constructor(private video: HTMLVideoElement) {}

  async start(facing: Facing = this.facing): Promise<void> {
    this.stop();
    this.facing = facing;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } },
    });
    this.video.srcObject = this.stream;
    this.video.classList.toggle('mirrored', facing === 'user');
    await this.video.play();
  }

  flip(): Promise<void> {
    return this.start(this.facing === 'user' ? 'environment' : 'user');
  }

  capture(): string {
    const { videoWidth: w, videoHeight: h } = this.video;
    return toSquareJpeg(this.video, w, h, this.facing === 'user');
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
}

function toSquareJpeg(source: CanvasImageSource, w: number, h: number, mirror: boolean): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const side = Math.min(w, h);
  if (mirror) {
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE);
  return canvas.toDataURL('image/jpeg', 0.86);
}

/** Används när livekameran inte går att få: telefonens egen kamera eller en vald bild. */
export async function fileToPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const photo = toSquareJpeg(bitmap, bitmap.width, bitmap.height, false);
  bitmap.close();
  return photo;
}
