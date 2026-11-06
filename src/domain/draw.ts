// Ren logik för lottningen: inga DOM- eller 3D-beroenden.

export type Team = 'red' | 'blue';
export type Rng = () => number;

export interface DrawnTable<T> {
  index: number;
  red: T[];
  blue: T[];
  redName: string;
  blueName: string;
}

const RED_NAMES = ['Röda Raketerna', 'Röda Rävarna', 'Röda Faran', 'Glödgänget', 'Lavaligan', 'Röda Rebellerna', 'Hetluften', 'Eldsjälarna'];
const BLUE_NAMES = ['Blå Blixtarna', 'Blå Bävrarna', 'Blåsbaggarna', 'Iskalla Gänget', 'Djuphavsligan', 'Blå Banditerna', 'Kylskåpet', 'Frostfolket'];

export function maxTables(playerCount: number): number {
  return Math.max(1, Math.floor(playerCount / 2));
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Fördelar spelarna över borden; storlekarna skiljer sig högst en. */
export function tableSizes(playerCount: number, tables: number): number[] {
  const base = Math.floor(playerCount / tables);
  const extra = playerCount % tables;
  return Array.from({ length: tables }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Text som "3 mot 3" per bord, för att visa vad valet ger innan lottningen. */
export function matchups(playerCount: number, tables: number): string[] {
  return tableSizes(playerCount, tables).map((size) => `${Math.ceil(size / 2)} mot ${Math.floor(size / 2)}`);
}

export function drawTeams<T>(players: readonly T[], tables: number, rng: Rng = Math.random): DrawnTable<T>[] {
  if (players.length < 2) throw new Error('Det behövs minst två spelare');
  const count = Math.min(Math.max(1, tables), maxTables(players.length));
  const pool = shuffle(players, rng);
  const redNames = shuffle(RED_NAMES, rng);
  const blueNames = shuffle(BLUE_NAMES, rng);
  let cursor = 0;
  return tableSizes(pool.length, count).map((size, index) => {
    const group = pool.slice(cursor, cursor + size);
    cursor += size;
    // Ojämnt bord: slumpen avgör vilket lag som får den extra spelaren.
    const redSize = size % 2 === 0 || rng() < 0.5 ? Math.ceil(size / 2) : Math.floor(size / 2);
    return {
      index,
      red: group.slice(0, redSize),
      blue: group.slice(redSize),
      redName: redNames[index % redNames.length],
      blueName: blueNames[index % blueNames.length],
    };
  });
}
