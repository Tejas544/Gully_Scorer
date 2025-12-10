import { createClient } from '@/utils/supabase/client';
import { calculateStats } from '@/lib/stats'; // UPDATED IMPORT

export async function checkAndCreateFinal(seasonId: string) {
  const supabase = createClient();

  console.log("Checking for league completion...");

  // 1. Fetch All Matches & Teams
  const [matchRes, teamRes] = await Promise.all([
    supabase
      .from('matches')
      .select(`*, innings(*), team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)`)
      .eq('season_id', seasonId),
    supabase
      .from('teams')
      .select('*')
      .eq('season_id', seasonId)
  ]);

  if (!matchRes.data || !teamRes.data) return;

  const matches = matchRes.data;
  const teams = teamRes.data;

  // 2. Check if League Stage is Done
  // We assume round_number >= 100 implies playoffs/finals. 
  const leagueMatches = matches.filter((m: any) => m.round_number < 100);
  const completedLeagueMatches = leagueMatches.filter((m: any) => m.is_completed);

  // If no matches exist OR not all are finished, stop.
  if (leagueMatches.length === 0 || leagueMatches.length !== completedLeagueMatches.length) {
    console.log("League not finished yet.");
    return;
  }

  // 3. Check if Final already exists
  const existingFinal = matches.find((m: any) => m.round_number === 100);
  if (existingFinal) {
      console.log("Final already exists.");
      return; 
  }

  // 4. Calculate Ranks (UPDATED LOGIC)
  // We now destructure 'standings' from the returned object
  const { standings } = calculateStats(matches, teams);
  
  if (standings.length < 2) return; // Need at least 2 teams

  const finalist1 = standings[0];
  const finalist2 = standings[1];

  console.log(`Creating Final: ${finalist1.name} vs ${finalist2.name}`);

  // 5. Create Final Match
  const { error } = await supabase.from('matches').insert({
      season_id: seasonId,
      round_number: 100, // Round 100 reserved for Final
      team_a_id: finalist1.teamId,
      team_b_id: finalist2.teamId,
      is_completed: false,
      result_note: 'GRAND FINAL'
  });

  if (error) console.error("Error creating final:", error);
}