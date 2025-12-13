import { createClient } from './supabase/client'; // Adjust path if needed based on your structure
import { calculateStats } from '@/lib/stats';

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

  // --- NEW: Check Bowl Out (Round 101) ---
  const bowlOut = matches.find((m: any) => m.round_number === 101);
  if (bowlOut) {
      if (bowlOut.is_completed) {
          console.log("🏆 Bowl Out Complete. Tournament Finished.");
          return;
      }
      console.log("Bowl Out in progress...");
      return;
  }

  // --- NEW: Check Final (Round 100) ---
  const finalMatch = matches.find((m: any) => m.round_number === 100);
  if (finalMatch) {
      if (finalMatch.is_completed) {
          // If Final is DONE, check for TIE (winner_id is null)
          if (!finalMatch.winner_id) {
              console.log("⚠️ Final was a TIE! Creating Bowl Out (Round 101)...");
              
              // Create Bowl Out Match
              const { error } = await supabase.from('matches').insert({
                  season_id: seasonId,
                  round_number: 101, // Special ID for Bowl Out
                  team_a_id: finalMatch.team_a_id,
                  team_b_id: finalMatch.team_b_id,
                  is_completed: false,
                  result_note: "Bowl Out Decider"
              });

              if (error) console.error("Error creating Bowl Out:", error);
          } else {
              console.log("🏆 Final Complete. Champion Found. Season Over.");
          }
      } else {
          console.log("Final is active.");
      }
      return; // If Final exists (active or done), do not run league logic below
  }

  // --- EXISTING: League Logic (Create Final) ---
  const leagueMatches = matches.filter((m: any) => m.round_number < 100);
  const completedLeagueMatches = leagueMatches.filter((m: any) => m.is_completed);

  // If no matches exist OR not all are finished, stop.
  if (leagueMatches.length === 0 || leagueMatches.length !== completedLeagueMatches.length) {
    console.log("League not finished yet.");
    return;
  }

  // Calculate Ranks to find Top 2
  const { standings } = calculateStats(matches, teams);
  
  if (standings.length < 2) return; 

  const finalist1 = standings[0];
  const finalist2 = standings[1];

  console.log(`Creating Final: ${finalist1.name} vs ${finalist2.name}`);

  // Create Final Match (Round 100)
  const { error } = await supabase.from('matches').insert({
      season_id: seasonId,
      round_number: 100, 
      team_a_id: finalist1.teamId,
      team_b_id: finalist2.teamId,
      is_completed: false,
      result_note: 'GRAND FINAL'
  });

  if (error) console.error("Error creating final:", error);
}