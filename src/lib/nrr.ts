/**
 * Calculates Net Run Rate (NRR)
 * Formula: (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)
 */
export function calculateNRR(
  runsScored: number,
  legalBallsFaced: number,
  runsConceded: number,
  legalBallsBowled: number
): number {
  // Convert balls to overs (standard cricket: 6 balls = 1 over)
  // Avoid division by zero
  const oversFaced = legalBallsFaced === 0 ? 0 : legalBallsFaced / 6;
  const oversBowled = legalBallsBowled === 0 ? 0 : legalBallsBowled / 6;

  const runRateFor = oversFaced === 0 ? 0 : runsScored / oversFaced;
  const runRateAgainst = oversBowled === 0 ? 0 : runsConceded / oversBowled;

  return parseFloat((runRateFor - runRateAgainst).toFixed(3));
}