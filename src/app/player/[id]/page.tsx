'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type CareerStats = {
  matches: number;
  // Batting
  runs: number;
  inningsBat: number;
  highScore: number;
  strikeRate: number;
  average: number;
  notOuts: number;
  // Bowling
  wickets: number;
  inningsBowl: number;
  runsConceded: number;
  ballsBowled: number;
  economy: number;
  bestBowling: string; // "3/12"
};

type MatchLog = {
  id: string;
  date: string;
  opponent: string;
  runs: number;
  wickets: number;
  result: string;
};

export default function PlayerProfile() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [player, setPlayer] = useState<any>(null);
  const [stats, setStats] = useState<CareerStats | null>(null);
  const [history, setHistory] = useState<MatchLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // 1. Fetch Player Details
        const { data: playerData, error: pErr } = await supabase
          .from('players')
          .select('*')
          .eq('id', id)
          .single();
        
        if (pErr) throw pErr;
        setPlayer(playerData);

        // 2. Fetch All Match Stats
        const { data: rawStats, error: sErr } = await supabase
          .from('match_player_stats')
          .select(`
            *,
            matches (
              created_at,
              season_id,
              team_a_id, team_b_id,
              winner_id,
              team_a:teams!team_a_id(name),
              team_b:teams!team_b_id(name)
            )
          `)
          .eq('player_id', id)
          .order('created_at', { ascending: false });

        if (sErr) throw sErr;

        // 3. Calculate Career Aggregates
        const calculated: CareerStats = {
          matches: rawStats.length,
          runs: 0, inningsBat: 0, highScore: 0, strikeRate: 0, average: 0, notOuts: 0,
          wickets: 0, inningsBowl: 0, runsConceded: 0, ballsBowled: 0, economy: 0, bestBowling: '0/0'
        };

        let bestWickets = -1;
        let bestRunsForWickets = 999;

        const historyLog: MatchLog[] = [];

        rawStats.forEach((log: any) => {
           // Batting
           if (log.balls_faced > 0 || log.is_out) { // Played as batter
               calculated.inningsBat++;
               calculated.runs += log.runs_scored;
               if (log.runs_scored > calculated.highScore) calculated.highScore = log.runs_scored;
               if (!log.is_out) calculated.notOuts++;
           }

           // Bowling
           if (log.legal_balls_bowled > 0) {
               calculated.inningsBowl++;
               calculated.wickets += log.wickets_taken;
               calculated.runsConceded += log.runs_conceded;
               calculated.ballsBowled += log.legal_balls_bowled;

               // BBF Logic (More wickets > Less Runs)
               if (log.wickets_taken > bestWickets || (log.wickets_taken === bestWickets && log.runs_conceded < bestRunsForWickets)) {
                   bestWickets = log.wickets_taken;
                   bestRunsForWickets = log.runs_conceded;
                   calculated.bestBowling = `${bestWickets}/${bestRunsForWickets}`;
               }
           }

           // History Log
           const isTeamA = log.team_id === log.matches.team_a_id;
           const opponentName = isTeamA ? log.matches.team_b?.name : log.matches.team_a?.name;
           
           const isWinner = log.matches.winner_id === log.team_id;
           const resultChar = isWinner ? 'W' : log.matches.winner_id ? 'L' : 'T';

           historyLog.push({
               id: log.match_id,
               date: new Date(log.matches.created_at).toLocaleDateString(),
               opponent: opponentName || "Unknown",
               runs: log.runs_scored,
               wickets: log.wickets_taken,
               result: resultChar
           });
        });

        // Averages
        const timesOut = calculated.inningsBat - calculated.notOuts;
        calculated.average = timesOut > 0 ? parseFloat((calculated.runs / timesOut).toFixed(2)) : calculated.runs;
        
        const totalBallsFaced = rawStats.reduce((acc: number, curr: any) => acc + (curr.balls_faced || 0), 0);
        calculated.strikeRate = totalBallsFaced > 0 ? parseFloat(((calculated.runs / totalBallsFaced) * 100).toFixed(2)) : 0;

        const totalOvers = calculated.ballsBowled / 6;
        calculated.economy = totalOvers > 0 ? parseFloat((calculated.runsConceded / totalOvers).toFixed(2)) : 0;

        setStats(calculated);
        setHistory(historyLog);

      } catch (err) {
        console.error("Profile Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) loadProfile();
  }, [id]);

  if (loading) return <div className="min-h-screen p-8 text-center animate-pulse text-gray-500 dark:text-gray-400">Loading Career Data...</div>;
  if (!player) return <div className="min-h-screen p-8 text-center text-gray-500 dark:text-white">Player not found</div>;

  return (
    // THEME UPDATE: Removed 'bg-black'. Added adaptive text colors.
    <div className="min-h-screen p-4 pb-safe flex flex-col text-gray-900 dark:text-white">
        {/* HEADER */}
        <div className="mb-6">
            <button 
                onClick={() => router.back()} 
                className="text-gray-500 hover:text-black dark:hover:text-white text-sm mb-4 transition-colors"
            >
                ← Back
            </button>
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-linear-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/20 text-white shadow-lg">
                    {player.name.charAt(0)}
                </div>
                <div>
                    <h1 className="text-3xl font-bold">{player.name}</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Matches Played: <span className="text-black dark:text-white font-bold">{stats?.matches}</span></p>
                </div>
            </div>
        </div>

        {/* MAIN STATS GRID */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Batting Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="text-orange-600 dark:text-orange-500 text-xs font-bold uppercase tracking-widest mb-4">Batting Career</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">Runs</span>
                        <span className="text-3xl font-black text-gray-900 dark:text-white">{stats?.runs}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-2 text-sm">
                        <span className="text-gray-500">Highest</span>
                        <span className="font-mono font-bold">{stats?.highScore}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Average</span>
                        <span className="font-mono font-bold">{stats?.average}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">SR</span>
                        <span className="font-mono font-bold">{stats?.strikeRate}</span>
                    </div>
                </div>
            </div>

            {/* Bowling Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="text-purple-600 dark:text-purple-500 text-xs font-bold uppercase tracking-widest mb-4">Bowling Career</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">Wickets</span>
                        <span className="text-3xl font-black text-gray-900 dark:text-white">{stats?.wickets}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-2 text-sm">
                        <span className="text-gray-500">Best</span>
                        <span className="font-mono font-bold">{stats?.bestBowling}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Econ</span>
                        <span className="font-mono font-bold">{stats?.economy}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Balls</span>
                        <span className="font-mono font-bold">{stats?.ballsBowled}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* MATCH HISTORY LOG */}
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-widest mb-4">Recent Matches</h3>
        <div className="space-y-3">
            {history.map((match) => (
                <div key={match.id} className="bg-white dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center shadow-sm dark:shadow-none">
                    <div>
                        <div className="text-xs text-gray-500 mb-1">{match.date} vs {match.opponent}</div>
                        <div className="font-bold flex gap-3">
                            <span className="text-gray-900 dark:text-white">🏏 {match.runs}</span>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <span className="text-gray-900 dark:text-white">🥎 {match.wickets}w</span>
                        </div>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded 
                        ${match.result === 'W' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-transparent' 
                            : match.result === 'L' 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-transparent' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-transparent'
                        }`}>
                        {match.result}
                    </div>
                </div>
            ))}
            {history.length === 0 && <div className="text-gray-500 text-center text-sm py-4">No matches played yet.</div>}
        </div>
    </div>
  );
}