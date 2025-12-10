'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { calculateStats, TeamStats, PlayerBattingStats, PlayerBowlingStats } from '@/lib/stats';

export default function TournamentDashboard() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  // Data State
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonName, setSeasonName] = useState("");
  const [user, setUser] = useState<any>(null); // Track User for Admin Controls
  
  // UI State
  const [activeTab, setActiveTab] = useState<'fixtures' | 'table' | 'stats'>('fixtures');

  // 1. Initial Fetch & Auth Check
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Check Auth
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Fetch Data
        const [seasonRes, matchRes, teamRes] = await Promise.all([
           supabase.from('seasons').select('name').eq('id', id).maybeSingle(),
           supabase.from('matches')
             .select('*, innings(*), team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)')
             .eq('season_id', id)
             .order('round_number'),
           supabase.from('teams').select('*').eq('season_id', id)
        ]);

        if (seasonRes.data) setSeasonName(seasonRes.data.name);
        if (matchRes.data) setMatches(matchRes.data);
        if (teamRes.data) setTeams(teamRes.data);
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // 2. Realtime Listener & Polling (Same as before)
  useEffect(() => {
    const channel = supabase.channel('tournament-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches', filter: `season_id=eq.${id}` }, 
        async (payload) => {
          const { data: newMatch } = await supabase.from('matches').select('*, innings(*), team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)').eq('id', payload.new.id).single();
          if (newMatch) setMatches(prev => [...prev, newMatch]);
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `season_id=eq.${id}` },
        (payload) => setMatches(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
      )
      .subscribe();

    // Fallback polling for Final generation race conditions
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

  // Calculate Stats
  const { standings, batting, bowling } = calculateStats(matches, teams);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Tournament...</div>;

  return (
    <div key={id as string} className="min-h-screen bg-black text-white p-4 pb-safe flex flex-col">
      
      {/* HEADER */}
      <header className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/tournament')}
              className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition text-sm"
              title="Back to All Seasons"
            >
              🏠
            </button>
            <div>
              <h1 className="text-2xl font-bold">{seasonName || "Tournament Schedule"}</h1>
              <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">ID: {id?.toString().slice(0,8)}</p>
            </div>
          </div>
          
          {/* HIDE BUTTON IF GUEST */}
          {user && (
            <button 
                onClick={() => router.push('/admin/create')}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded border border-gray-700 transition"
            >
                + New Season
            </button>
          )}
      </header>
      
      {/* TABS */}
      <div className="flex bg-gray-900 p-1 rounded-lg mb-6 border border-gray-800">
        {(['fixtures', 'table', 'stats'] as const).map(tab => (
            <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-bold rounded-md transition capitalize ${activeTab === tab ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
            {tab}
            </button>
        ))}
      </div>
      
      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'fixtures' && (
            <FixturesView matches={matches} onMatchClick={handleMatchClick} />
        )}

        {activeTab === 'table' && (
            <PointsTableView standings={standings} />
        )}

        {activeTab === 'stats' && (
            <StatsView batting={batting} bowling={bowling} />
        )}
      </div>
    </div>
  );
}

// --- SUB COMPONENTS (UNCHANGED) ---
// (Keep the FixturesView, PointsTableView, and StatsView functions exactly as they were in the previous file. 
// I have omitted them here for brevity, but you must keep them in the file.)

function FixturesView({ matches, onMatchClick }: { matches: any[], onMatchClick: (id: string) => void }) {
    if (matches.length === 0) return <div className="text-gray-500 text-center mt-10">No matches scheduled.</div>;
    return (
        <div className="space-y-3">
            {matches.map(match => (
                <div 
                    key={match.id}
                    onClick={() => onMatchClick(match.id)}
                    className={`p-4 rounded-xl border flex justify-between items-center cursor-pointer transition active:scale-95 ${
                        match.is_completed 
                        ? 'bg-gray-900 border-gray-800 opacity-60' 
                        : 'bg-gray-800 border-gray-700 hover:border-blue-500/50'
                    }`}
                >
                        <div>
                        <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${match.round_number === 100 ? 'text-yellow-500 animate-pulse' : 'text-gray-400'}`}>
                            {match.round_number === 100 ? "🏆 GRAND FINAL" : match.round_number === 101 ? "⚡ SUPER OVER" : `Round ${match.round_number}`}
                        </div>
                        <div className="font-bold text-lg">
                            {match.team_a?.name} <span className="text-gray-600 text-sm">vs</span> {match.team_b?.name}
                        </div>
                        {match.is_completed && (
                            <div className="text-green-400 text-xs mt-1 font-medium">{match.result_note}</div>
                        )}
                        </div>
                        <div className="ml-4">
                        {match.is_completed ? (
                            <div className="bg-green-900/20 text-green-600 text-[10px] font-black px-2 py-1 rounded border border-green-900/30">DONE</div>
                        ) : (
                            <div className={`text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg ${match.round_number === 100 ? 'bg-yellow-600 shadow-yellow-900/50' : 'bg-blue-600 shadow-blue-900/50'}`}>
                                PLAY
                            </div>
                        )}
                        </div>
                </div>
            ))}
        </div>
    );
}

function PointsTableView({ standings }: { standings: TeamStats[] }) {
    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-800 text-gray-400 uppercase text-[10px] tracking-wider">
                    <tr>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-2 py-3 text-center">P</th>
                        <th className="px-2 py-3 text-center">W</th>
                        <th className="px-2 py-3 text-center">L</th>
                        <th className="px-2 py-3 text-center hidden sm:table-cell">NRR</th>
                        <th className="px-4 py-3 text-right">Pts</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((team, idx) => (
                        <tr key={team.teamId} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                            <td className="px-4 py-3 font-bold flex items-center gap-3">
                                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${idx < 2 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-700 text-gray-400'}`}>
                                    {idx + 1}
                                </span>
                                {team.name}
                            </td>
                            <td className="px-2 py-3 text-center text-gray-300">{team.played}</td>
                            <td className="px-2 py-3 text-center text-green-500 font-bold">{team.won}</td>
                            <td className="px-2 py-3 text-center text-red-500">{team.lost}</td>
                            <td className="px-2 py-3 text-center text-gray-400 font-mono text-xs hidden sm:table-cell">
                                {team.nrr > 0 ? '+' : ''}{team.nrr}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-white text-lg">{team.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function StatsView({ batting, bowling }: { batting: PlayerBattingStats[], bowling: PlayerBowlingStats[] }) {
    return (
        <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="bg-orange-900/20 border-b border-orange-900/30 p-3">
                    <h3 className="text-orange-500 font-bold text-sm uppercase tracking-wider">Orange Cap (Runs)</h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 text-[10px] uppercase">
                        <tr>
                            <th className="px-4 py-2">Player</th>
                            <th className="px-2 py-2 text-right">Runs</th>
                            <th className="px-4 py-2 text-right">HS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batting.slice(0, 5).map((p, i) => (
                            <tr key={p.teamId} className="border-b border-gray-800 last:border-0">
                                <td className="px-4 py-2 font-medium">{i+1}. {p.name}</td>
                                <td className="px-2 py-2 text-right font-bold text-white">{p.runs}</td>
                                <td className="px-4 py-2 text-right text-gray-400">{p.highestScore}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="bg-purple-900/20 border-b border-purple-900/30 p-3">
                    <h3 className="text-purple-500 font-bold text-sm uppercase tracking-wider">Purple Cap (Wickets)</h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 text-[10px] uppercase">
                        <tr>
                            <th className="px-4 py-2">Player</th>
                            <th className="px-2 py-2 text-right">Wkts</th>
                            <th className="px-4 py-2 text-right">Best</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bowling.slice(0, 5).map((p, i) => (
                            <tr key={p.teamId} className="border-b border-gray-800 last:border-0">
                                <td className="px-4 py-2 font-medium">{i+1}. {p.name}</td>
                                <td className="px-2 py-2 text-right font-bold text-white">{p.wickets}</td>
                                <td className="px-4 py-2 text-right text-gray-400">{p.bestFigures}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}