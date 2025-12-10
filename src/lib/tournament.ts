import { createClient } from '@/utils/supabase/client';

type Fixture = {
  round: number;
  homeTeamId: string;
  awayTeamId: string;
};

/**
 * Generates a Double Round Robin Schedule using the Circle Method.
 * 1. Each team plays every other team twice.
 * 2. If teams are odd, a "BYE" (dummy) is added.
 */
export function generateFixtures(teamIds: string[]): Fixture[] {
  let teams = [...teamIds];
  
  // If odd number of teams, add a dummy 'BYE'
  if (teams.length % 2 !== 0) {
    teams.push('BYE');
  }

  const numTeams = teams.length;
  const roundsPerHalf = numTeams - 1;
  const totalRounds = roundsPerHalf * 2;
  const matchesPerRound = numTeams / 2;
  
  const fixtures: Fixture[] = [];

  for (let round = 0; round < totalRounds; round++) {
    const isSecondHalf = round >= roundsPerHalf;
    
    for (let i = 0; i < matchesPerRound; i++) {
      const home = teams[i];
      const away = teams[numTeams - 1 - i];

      // Skip matches involving 'BYE'
      if (home !== 'BYE' && away !== 'BYE') {
        fixtures.push({
          round: round + 1,
          // Swap home/away in the second half of tournament
          homeTeamId: isSecondHalf ? away : home,
          awayTeamId: isSecondHalf ? home : away,
        });
      }
    }

    // ROTATION LOGIC (Circle Method):
    // Keep index 0 fixed.
    // Move last element to index 1.
    // Shift everything else down.
    // [0, 1, 2, 3] -> [0, 3, 1, 2]
    const lastTeam = teams.pop();
    if (lastTeam) {
      teams.splice(1, 0, lastTeam);
    }
  }

  return fixtures;
}

/**
 * Creates a Super Over match (Round 101) for tie-breaking.
 */
export async function createSuperOver(seasonId: string, teamAId: string, teamBId: string) {
  const supabase = createClient();
  
  // Create a match with Round 101 (Super Over)
  const { data, error } = await supabase.from('matches').insert({
    season_id: seasonId,
    round_number: 101, // 101 = Super Over
    team_a_id: teamAId,
    team_b_id: teamBId,
    is_completed: false,
    result_note: 'SUPER OVER'
  }).select().single();

  if (error) throw error;
  return data.id;
}