import { ScoreInput, DismissalType, InningsState } from '@/types/cricket';

/**
 * Calculates the result of a ball button press
 */
export function calculateBallResult(
  currentInput: ScoreInput, 
  dismissalDetails: DismissalType | null // Only used if input type is 'wicket'
) {
  let runs_batter = 0;
  let extras = 0;
  let is_wide = false;
  let is_no_ball = false;
  let is_wicket = false;
  let is_legal_delivery = true;

  switch (currentInput.type) {
    case 'runs':
      runs_batter = currentInput.value; // Strictly 0 or 1
      break;
      
    case 'wide':
      is_wide = true;
      extras = 1;
      is_legal_delivery = false; // Doesn't count towards 12 balls
      break;
      
    case 'no_ball':
      is_no_ball = true;
      extras = 1;
      is_legal_delivery = false; 
      // Note: In some gully rules, you can run on NB. 
      // If so, we need a secondary input "Runs on NB?". 
      // For now, assuming standard NB = 1 run total.
      break;
      
    case 'wicket':
      is_wicket = true;
      runs_batter = 0;
      // If "Hit Six Out", runs are 0, ball is legal, batter is OUT.
      break;
  }

  return {
    ballData: {
      runs_batter,
      extras,
      is_wide,
      is_no_ball,
      is_wicket,
      dismissal_kind: is_wicket ? dismissalDetails : null
    },
    is_legal_delivery
  };
}