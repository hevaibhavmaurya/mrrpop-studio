export interface LayerDef {
  id: string;
  /** Single SVG file (always shown). */
  file?: string;
  /** Folder of variants; the shown one is chosen by `slot`. */
  dir?: string;
  slot?: string;
  optional?: boolean;
  /** Legs / feet: bends with the knees, stays planted (default: the layer with id "legs"). */
  lower?: boolean;
  /** Part of the head group (rotates around headPivot). */
  head?: boolean;
  note?: string;
}

export interface CharacterManifest {
  format: 'mrrpop-character@1';
  id: string;
  name: string;
  status?: string;
  notes?: string;
  source?: string;
  viewBox: [number, number, number, number];
  crops?: Record<string, [number, number, number, number]>;
  headPivot: [number, number];
  /** Body motion pivots: belt line [x, y] and the y of the soles. Defaults [300, 880] / 1346. */
  hip?: [number, number];
  feet?: number;
  /** Stomach pivot [x, y] the chest bends from (laughing, leaning). Default 40 px above the hip. */
  waist?: [number, number];
  layers: LayerDef[];
  /** Slot values used when neither pose nor expression sets them (e.g. extras: none). */
  defaults?: Record<string, string>;
  reference?: string;
  /** Pose = slot values for the body (arms, …); expression = slot values for the face (eyes, brows, mouth, extras, …). */
  poses: Record<string, { use_for?: string } & Record<string, string>>;
  expressions: Record<string, { use_for?: string } & Record<string, string>>;
  visemes: { engine: string; map: Record<string, string>; labels: Record<string, string>; restUsesExpression?: boolean };
  blink?: { eyes: string; onlyWhen: string[]; every: number; duration: number };
}
