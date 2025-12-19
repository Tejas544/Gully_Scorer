'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { calculateStats, TeamStats, PlayerBattingStats, PlayerBowlingStats } from '@/lib/stats';
import Link from 'next/link';
import AnimatedList from '@/components/ui/AnimatedList';

export default function TournamentDashboard() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  // Data State
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [playerMap, setPlayerMap] = useState<Record<string, string>>({}); 
  const [loading, setLoading] = useState(true);
  const [seasonName, setSeasonName] = useState("");
  const [user, setUser] = useState<any>(null); 
  
  // UI State
  const [activeTab, setActiveTab] = useState<'fixtures' | 'table' | 'stats'>('fixtures');

  // 1. Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const [seasonRes, matchRes, teamRes] = await Promise.all([
           supabase.from('seasons').select('name').eq('id', id).maybeSingle(),
           supabase.from('matches')
             .select('*, innings(*), team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)')
             .eq('season_id', id)
             .order('round_number'),
           supabase.from('teams')
             .select('*, team_players(player_id)')
             .eq('season_id', id)
        ]);

        if (seasonRes.data) setSeasonName(seasonRes.data.name);
        if (matchRes.data) setMatches(matchRes.data);
        
        if (teamRes.data) {
            setTeams(teamRes.data);
            const map: Record<string, string> = {};
            teamRes.data.forEach((t: any) => {
                if (t.team_players && t.team_players.length > 0) {
                    map[t.id] = t.team_players[0].player_id;
                }
            });
            setPlayerMap(map);
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // 2. Realtime Listener
  useEffect(() => {
    const channel = supabase.channel('tournament-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `season_id=eq.${id}` }, 
        async (payload) => {
            const newId = (payload.new as any).id;
            if (!newId) return;
          const { data: newMatch } = await supabase
            .from('matches')
            .select('*, innings(*), team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)')
            .eq('id', newId)
            .single();
            
          if (newMatch) {
             setMatches(prev => {
                 const exists = prev.find(m => m.id === newMatch.id);
                 return exists ? prev.map(m => m.id === newMatch.id ? newMatch : m) : [...prev, newMatch];
             });
          }
        }
      )
      .subscribe();

    const interval = setInterval(async () => {
        const { data: newMatches } = await supabase.from('matches').select('*, innings(*), team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)').eq('season_id', id).order('round_number');
        if (newMatches) {
            setMatches(current => {
                if (newMatches.length !== current.length) return newMatches;
                const isChanged = newMatches.some((m, i) => m.is_completed !== current[i]?.is_completed);
                return isChanged ? newMatches : current;
            });
        }
    }, 3000);

    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [id]);

  const handleMatchClick = (matchId: string) => router.push(`/match/${matchId}`);
  const { standings, batting, bowling } = calculateStats(matches, teams);

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Tournament...</div>;

  return (
    // Background upgraded to use gradient for glass effect to pop
    <div key={id as string} className="min-h-screen p-4 pb-safe flex flex-col text-gray-900 dark:text-white bg-gradient-to-br from-gray-50 to-gray-200 dark:from-black dark:to-gray-900">
      
      {/* HEADER */}
      {/* HEADER */}
      <header className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/tournament')}
              className="glass-card p-2 rounded-full hover:scale-105 active:scale-95"
              title="Back to All Seasons"
            >
              🏠
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{seasonName || "Tournament Schedule"}</h1>
              <p className="text-gray-500 text-xs uppercase tracking-widest mt-1 font-mono">ID: {id?.toString().slice(0,8)}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* NEW BUTTON */}
            <button 
                onClick={() => router.push('/players')}
                className="glass-card px-3 py-2 rounded-full text-xs font-bold hover:scale-105 transition"
            >
                👥 All Players
            </button>
            
            {user && (
                <button 
                    onClick={() => router.push('/admin/create')}
                    className="text-xs bg-black dark:bg-white text-white dark:text-black font-bold px-4 py-2 rounded-full shadow-lg hover:opacity-80 transition"
                >
                    + New
                </button>
            )}
          </div>
      </header>
      
      {/* GLASS TABS */}
      <div className="flex p-1 rounded-xl mb-6 bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-sm">
        {(['fixtures', 'table', 'stats'] as const).map(tab => (
            <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize ${
                activeTab === tab 
                ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-md scale-100' 
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white scale-95'
            }`}
            >
            {tab}
            </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'fixtures' && <FixturesView matches={matches} onMatchClick={handleMatchClick} />}
        {activeTab === 'table' && <PointsTableView standings={standings} />}
        {activeTab === 'stats' && <StatsView batting={batting} bowling={bowling} playerMap={playerMap} />}
      </div>
    </div>
  );
}

// --- SUB COMPONENTS (GLASS VERSION) ---

function FixturesView({ matches, onMatchClick }: { matches: any[], onMatchClick: (id: string) => void }) {
    if (matches.length === 0) return <div className="text-gray-500 text-center mt-10">No matches scheduled.</div>;
    
    return (
        <AnimatedList className="space-y-4">
            {matches.map(match => {
                const r = match.round_number;
                
                // LABELS
                let label = `ROUND ${r}`;
                let isSpecial = false;

                if (r === 91) { label = "QUALIFIER 1"; isSpecial = true; }
                else if (r === 92) { label = "QUALIFIER 2"; isSpecial = true; }
                else if (r === 100) { label = "🏆 GRAND FINAL"; isSpecial = true; }
                else if (r > 9000) { 
                    label = r % 10 === 1 ? "⚡ SUPER OVER" : "🎯 BOWL OUT"; 
                    isSpecial = true; 
                }

                return (
                    <div 
                        key={match.id}
                        onClick={() => onMatchClick(match.id)}
                        className={`
                            relative group cursor-pointer p-5 rounded-2xl border backdrop-blur-md transition-all duration-300
                            ${match.is_completed 
                                ? 'bg-gray-100/50 dark:bg-gray-800/30 border-gray-200/50 dark:border-gray-700/30 opacity-70 hover:opacity-100' 
                                : 'glass-card hover:-translate-y-1' 
                            }
                            ${isSpecial ? 'border-blue-500/30 dark:border-blue-500/30' : ''}
                            ${r === 100 ? 'border-yellow-500/50 dark:border-yellow-500/50 shadow-yellow-500/10' : ''}
                        `}
                    >
                        {/* Final Glow */}
                        {r === 100 && <div className="absolute inset-0 bg-yellow-500/5 rounded-2xl blur-xl -z-10" />}

                        <div className="flex justify-between items-center">
                            <div>
                                <div className={`text-[10px] uppercase font-bold tracking-wider mb-2 flex items-center gap-2 ${isSpecial ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} ${r===100 ? '!text-yellow-600 dark:!text-yellow-500' : ''}`}>
                                    {label}
                                </div>
                                
                                <div className="flex items-center gap-3 text-lg font-bold">
                                    <span className={match.winner_id === match.team_a_id ? 'text-green-600 dark:text-green-400' : ''}>{match.team_a?.name || "TBD"}</span>
                                    <span className="text-xs text-gray-400 font-normal">VS</span>
                                    <span className={match.winner_id === match.team_b_id ? 'text-green-600 dark:text-green-400' : ''}>{match.team_b?.name || "TBD"}</span>
                                </div>

                                {match.is_completed && (
                                    <div className="text-green-600 dark:text-green-400 text-xs mt-2 font-medium bg-green-100/50 dark:bg-green-900/30 px-2 py-1 rounded-md inline-block">
                                        {match.result_note}
                                    </div>
                                )}
                            </div>

                            <div className="ml-4">
                                {match.is_completed ? (
                                    <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center text-sm">✓</div>
                                ) : (
                                    <div className={`px-4 py-2 rounded-full font-bold text-xs text-white shadow-lg transition-transform group-hover:scale-105 ${r === 100 ? 'bg-gradient-to-r from-yellow-600 to-orange-600' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`}>
                                        PLAY
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </AnimatedList>
    );
}

function PointsTableView({ standings }: { standings: TeamStats[] }) {
    return (
        <AnimatedList className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider backdrop-blur-sm">
                    <tr>
                        <th className="px-4 py-4">Team</th>
                        <th className="px-2 py-4 text-center">P</th>
                        <th className="px-2 py-4 text-center">W</th>
                        <th className="px-2 py-4 text-center">L</th>
                        <th className="px-2 py-4 text-center hidden sm:table-cell">NRR</th>
                        <th className="px-4 py-4 text-right">Pts</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                    {standings.map((team, idx) => (
                        <tr key={team.teamId} className="hover:bg-white/40 dark:hover:bg-gray-800/40 transition">
                            <td className="px-4 py-4 font-bold flex items-center gap-3">
                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black ${idx < 2 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-sm' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                                    {idx + 1}
                                </span>
                                {team.name}
                            </td>
                            <td className="px-2 py-4 text-center text-gray-500 dark:text-gray-400">{team.played}</td>
                            <td className="px-2 py-4 text-center text-green-600 dark:text-green-400 font-bold">{team.won}</td>
                            <td className="px-2 py-4 text-center text-red-500 dark:text-red-400 opacity-80">{team.lost}</td>
                            <td className="px-2 py-4 text-center text-gray-400 font-mono text-xs hidden sm:table-cell">
                                {team.nrr > 0 ? '+' : ''}{team.nrr}
                            </td>
                            <td className="px-4 py-4 text-right font-black text-lg">{team.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </AnimatedList>
    );
}

function StatsView({ batting, bowling, playerMap }: { batting: PlayerBattingStats[], bowling: PlayerBowlingStats[], playerMap: Record<string, string> }) {
    
    const PlayerLink = ({ teamId, name }: { teamId: string, name: string }) => {
        const pid = playerMap[teamId];
        return pid ? (
            <Link href={`/player/${pid}`} className="hover:text-blue-500 hover:underline decoration-blue-500/50 underline-offset-4 transition flex items-center gap-1 group">
                {name} <span className="text-[10px] text-gray-400 group-hover:text-blue-500 transition opacity-0 group-hover:opacity-100">↗</span>
            </Link>
        ) : (
            <span>{name}</span>
        );
    };

    return (
        <AnimatedList className="space-y-6">
            {/* BATTING CARD */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500/10 to-transparent p-4 border-b border-orange-500/10">
                    <h3 className="text-orange-600 dark:text-orange-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                        <span>🏏</span> Orange Cap (Runs)
                    </h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="text-gray-400 text-[10px] uppercase bg-gray-50/50 dark:bg-gray-800/30">
                        <tr>
                            <th className="px-4 py-3">Player</th>
                            <th className="px-2 py-3 text-right">Runs</th>
                            <th className="px-4 py-3 text-right">HS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                        {batting.slice(0, 5).map((p, i) => (
                            <tr key={p.teamId} className="hover:bg-white/40 dark:hover:bg-gray-800/40 transition">
                                <td className="px-4 py-3 font-medium flex items-center gap-3">
                                    <span className="text-gray-300 font-mono text-xs w-3">{i+1}</span>
                                    <PlayerLink teamId={p.teamId} name={p.name} />
                                </td>
                                <td className="px-2 py-3 text-right font-black">{p.runs}</td>
                                <td className="px-4 py-3 text-right text-gray-500">{p.highestScore}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* BOWLING CARD */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500/10 to-transparent p-4 border-b border-purple-500/10">
                    <h3 className="text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                        <span>🥎</span> Purple Cap (Wickets)
                    </h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="text-gray-400 text-[10px] uppercase bg-gray-50/50 dark:bg-gray-800/30">
                        <tr>
                            <th className="px-4 py-3">Player</th>
                            <th className="px-2 py-3 text-right">Wkts</th>
                            <th className="px-4 py-3 text-right">Best</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                        {bowling.slice(0, 5).map((p, i) => (
                            <tr key={p.teamId} className="hover:bg-white/40 dark:hover:bg-gray-800/40 transition">
                                <td className="px-4 py-3 font-medium flex items-center gap-3">
                                    <span className="text-gray-300 font-mono text-xs w-3">{i+1}</span>
                                    <PlayerLink teamId={p.teamId} name={p.name} />
                                </td>
                                <td className="px-2 py-3 text-right font-black">{p.wickets}</td>
                                <td className="px-4 py-3 text-right text-gray-500">{p.bestFigures}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AnimatedList>
    );
}