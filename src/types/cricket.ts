export type DismissalType = 'bowled' | 'caught' | 'run_out' | 'hit_six_out' | 'stumped';

// The specific inputs allowed on your keypad
export type ScoreInput = 
  | { type: 'runs'; value: 0 | 1 }
  | { type: 'wide' }
  | { type: 'no_ball' }
  | { type: 'wicket' }; 

export interface BallSchema {
  id: string;
  innings_id: string;
  ball_index: number; // <--- THIS WAS MISSING
  runs_batter: 0 | 1;
  extras: number;
  is_wide: boolean;
  is_no_ball: boolean;
  is_wicket: boolean;
  dismissal_kind?: DismissalType | null; // Allow null for non-wickets
}

export interface InningsState {
  runs: number;
  wickets: number;
  legalBalls: number; // Max 12
  currentOverHistory: string[]; // For UI e.g., ["0", "1", "W", "wd"]
}