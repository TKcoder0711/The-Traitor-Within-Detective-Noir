
export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  WON = 'WON',
  FAILED = 'FAILED'
}

export interface Clue {
  id: string;
  name: string;
  description: string;
  found: boolean;
  position: [number, number, number];
  roomName: string;
}

export interface NPC {
  id: string;
  name: string;
  color: string;
  isMurderer: boolean;
  position: [number, number, number];
  traits: string[];
}

export interface GameState {
  status: GameStatus;
  level: number;
  clues: Clue[];
  npcs: NPC[];
  murdererId: string;
  foundCluesCount: number;
  isPistolEquipped: boolean;
}
