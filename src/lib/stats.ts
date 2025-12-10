import { calculateNRR } from './nrr';

// --- TYPES ---
export type TeamStats = {
  teamId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  draw: number;
  points: number;
  runsScored: number;
  ballsFaced: number;
  runsConceded: number;
  ballsBowled: number;
  nrr: number;
};

export type PlayerBattingStats = {
  teamId: string;
  name: string;
  innings: number;
  runs: number;
  balls: number;
  strikeRate: number;
  highestScore: number;
  notOuts: number; // Important for average (optional)
};

export type PlayerBowlingStats = {
  teamId: string;
  name: string;
  innings: number;
  wickets: number;
  runs: number;
  balls: number;
  economy: number;
  bestFigures: string; // e.g., "1/4"
};

// --- MAIN FUNCTION ---
export function calculateStats(matches: any[], teams: any[]) {
  const teamStats: Record<string, TeamStats> = {};
  const batStats: Record<string, PlayerBattingStats> = {};
  const bowlStats: Record<string, PlayerBowlingStats> = {};

  // 1. Initialize Teams & Players
  teams.forEach(team => {
    // Team Standings Init
    teamStats[team.id] = {
      teamId: team.id,
      name: team.name,
      played: 0, won: 0, lost: 0, draw: 0, points: 0,
      runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0, nrr: 0
    };
    
    // Player Batting Init
    batStats[team.id] = {
      teamId: team.id, name: team.name, innings: 0, runs: 0, balls: 0, strikeRate: 0, highestScore: 0, notOuts: 0
    };

    // Player Bowling Init
    bowlStats[team.id] = {
      teamId: team.id, name: team.name, innings: 0, wickets: 0, runs: 0, balls: 0, economy: 0, bestFigures: "0/0"
    };
  });

  // 2. Process Matches
  matches.forEach(match => {
    if (!match.is_completed) return;

    // A. Points Table Logic
    const tA = teamStats[match.team_a_id];
    const tB = teamStats[match.team_b_id];
    
    if (tA && tB) {
        tA.played++; tB.played++;
        if (match.winner_id === match.team_a_id) {
            tA.won++; tA.points += 2; tB.lost++;
        } else if (match.winner_id === match.team_b_id) {
            tB.won++; tB.points += 2; tA.lost++;
        } else {
            tA.draw++; tB.draw++; tA.points += 1; tB.points += 1;
        }
    }

    // B. Player Stats Logic (Parsing Innings)
    if (match.innings) {
      match.innings.forEach((inn: any) => {
         const batterId = inn.batting_team_id;
         // Bowler is the OTHER team in the match
         const bowlerId = match.team_a_id === batterId ? match.team_b_id : match.team_a_id;

         // --- BATTING ---
         if (batStats[batterId]) {
            const p = batStats[batterId];
            p.innings++;
            p.runs += inn.total_runs;
            p.balls += inn.legal_balls_bowled; // Only legal balls count for SR usually, or all balls? 
            // Strict rule: SR uses legal balls faced.
            if (inn.total_runs > p.highestScore) p.highestScore = inn.total_runs;
         }

         // --- BOWLING ---
         if (bowlStats[bowlerId]) {
            const b = bowlStats[bowlerId];
            b.innings++;
            b.runs += inn.total_runs;
            b.wickets += inn.total_wickets;
            b.balls += inn.legal_balls_bowled;
            
            // Best Figures Logic (More wickets is better; if equal, fewer runs is better)
            const [bestW, bestR] = b.bestFigures.split('/').map(Number);
            if (inn.total_wickets > bestW || (inn.total_wickets === bestW && inn.total_runs < bestR)) {
                b.bestFigures = `${inn.total_wickets}/${inn.total_runs}`;
            }
         }

         // --- NRR DATA ---
         if (teamStats[batterId]) {
             teamStats[batterId].runsScored += inn.total_runs;
             // If All Out, use full quota (12 balls)
             teamStats[batterId].ballsFaced += (inn.total_wickets >= 1 ? 12 : inn.legal_balls_bowled);
         }
         if (teamStats[bowlerId]) {
             teamStats[bowlerId].runsConceded += inn.total_runs;
             teamStats[bowlerId].ballsBowled += (inn.total_wickets >= 1 ? 12 : inn.legal_balls_bowled);
         }
      });
    }
  });

  // 3. Final Calculations (SR, Economy, NRR)
  
  // Standings
  const standings = Object.values(teamStats).map(t => {
      t.nrr = calculateNRR(t.runsScored, t.ballsFaced, t.runsConceded, t.ballsBowled);
      return t;
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
  });

  // Batting Leaderboard
  const batting = Object.values(batStats).map(p => {
      p.strikeRate = p.balls > 0 ? (p.runs / p.balls) * 100 : 0;
      return p;
  }).sort((a, b) => b.runs - a.runs); // Sort by Runs

  // Bowling Leaderboard
  const bowling = Object.values(bowlStats).map(p => {
      const overs = p.balls / 6;
      p.economy = overs > 0 ? p.runs / overs : 0;
      return p;
  }).sort((a, b) => {
      if (b.wickets !== a.wickets) return b.wickets - a.wickets; // Most wickets
      return a.economy - b.economy; // Lower economy
  });

  return { standings, batting, bowling };
}