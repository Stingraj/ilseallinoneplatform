/** Architectural identities for the rooms. Colours and materials only; no collection content lives here. */
export type MaterialKind = 'plaster' | 'limestone' | 'concrete' | 'marble' | 'oak' | 'walnut' | 'terrazzo';
export type CeilingKind = 'coffered' | 'skylight' | 'plain' | 'tracks';

export interface RoomTheme {
  id: 'limestone' | 'nero' | 'walnut' | 'sage' | 'concrete';
  /** Short descriptive line shown in the room's introduction. */
  mood: string;
  wall: string;
  wainscot: string | null;
  floor: MaterialKind;
  floorColor: string;
  floorRoughness: number;
  wallMaterial: MaterialKind;
  ceiling: CeilingKind;
  ceilingColor: string;
  frame: string;
  accent: string;
  /** Hemisphere (ambient) light and fog/background colour. */
  ambient: string;
  ambientIntensity: number;
  fog: string;
  /** Spot colour (warm ↔ cool). */
  spot: string;
  /** Multiplies the spotlight strength: bright rooms need less, so paintings are not burnt out. */
  spotScale: number;
  width: number;
  height: number;
}

export const THEMES: Record<RoomTheme['id'], RoomTheme> = {
  limestone: {
    id: 'limestone',
    mood: 'A hall of pale limestone and soft daylight.',
    wall: '#e7e0d2', wainscot: null, floor: 'oak', floorColor: '#c9a977', floorRoughness: 0.42, wallMaterial: 'limestone',
    ceiling: 'coffered', ceilingColor: '#f1ece3', frame: '#1b1a19', accent: '#cc0000',
    ambient: '#fff3df', ambientIntensity: 0.62, fog: '#d9d2c4', spot: '#ffe9c9', spotScale: 0.75, width: 9, height: 5,
  },
  nero: {
    id: 'nero',
    mood: 'A dark, quiet room where every painting holds its own light.',
    wall: '#2a2a2f', wainscot: null, floor: 'marble', floorColor: '#17171a', floorRoughness: 0.14, wallMaterial: 'plaster',
    ceiling: 'plain', ceilingColor: '#121214', frame: '#c9a24a', accent: '#c9a24a',
    ambient: '#8c93b8', ambientIntensity: 0.38, fog: '#101013', spot: '#fff1d6', spotScale: 1, width: 8, height: 4.6,
  },
  walnut: {
    id: 'walnut',
    mood: 'Warm timber panelling and the glow of amber lamps.',
    wall: '#cdbba0', wainscot: '#4a3224', floor: 'walnut', floorColor: '#5a3b28', floorRoughness: 0.34, wallMaterial: 'plaster',
    ceiling: 'plain', ceilingColor: '#e9dfcf', frame: '#2a1c14', accent: '#b5651d',
    ambient: '#ffd9a8', ambientIntensity: 0.5, fog: '#3a281c', spot: '#ffd7a0', spotScale: 0.85, width: 8.4, height: 4.4,
  },
  sage: {
    id: 'sage',
    mood: 'A tall room of sage plaster, lit from above.',
    wall: '#b7c1aa', wainscot: null, floor: 'terrazzo', floorColor: '#d8d3c6', floorRoughness: 0.3, wallMaterial: 'plaster',
    ceiling: 'skylight', ceilingColor: '#e8ecdf', frame: '#262b24', accent: '#4f6b4a',
    ambient: '#eaf2ff', ambientIntensity: 0.5, fog: '#aab59d', spot: '#f4f7ff', spotScale: 0.55, width: 9.6, height: 6,
  },
  concrete: {
    id: 'concrete',
    mood: 'Raw concrete and track lighting, like the studio itself.',
    wall: '#9b9a95', wainscot: null, floor: 'concrete', floorColor: '#6e6d69', floorRoughness: 0.26, wallMaterial: 'concrete',
    ceiling: 'tracks', ceilingColor: '#4b4b49', frame: '#0f0f0f', accent: '#e8e2d4',
    ambient: '#dfe6ee', ambientIntensity: 0.45, fog: '#6e6e6a', spot: '#fffaf0', spotScale: 0.8, width: 10, height: 5.4,
  },
};

export const THEME_ORDER: RoomTheme['id'][] = ['nero', 'limestone', 'walnut', 'sage', 'concrete'];
