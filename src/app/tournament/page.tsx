'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type SeasonSummary = {
  id: string;
  name: string;
  created_at: string;
  match_count: number;
  champion?: string;
};

export default function SeasonsListPage() {
  const supabase = createClient();
  const router = useRouter();
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const { data: seasonsData, error } = await supabase
          .from('seasons')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && seasonsData) {
          const enhancedSeasons = await Promise.all(
            seasonsData.map(async (season) => {
              // 1. Get Match Count
              const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('season_id', season.id);
              
              // 2. Determine Champion Logic
              // First, check the Grand Final (Round 100)
              let { data: finalMatch } = await supabase
                .from('matches')
                .select('id, winner_id, round_number, is_completed, teams!matches_winner_id_fkey(name)')
                .eq('season_id', season.id)
                .eq('round_number', 100)
                .maybeSingle();

              // CRITICAL FIX: If Final was a TIE (winner_id is null) but completed, check Bowl Out (Round 101)
              if (finalMatch?.is_completed && !finalMatch.winner_id) {
                 const { data: bowlOut } = await supabase
                    .from('matches')
                    .select('winner_id, teams!matches_winner_id_fkey(name)')
                    .eq('season_id', season.id)
                    .eq('round_number', 101)
                    .eq('is_completed', true)
                    .maybeSingle();
                 
                 if (bowlOut) {
                    finalMatch = { ...finalMatch, ...bowlOut }; // Override with Bowl Out winner
                 }
              }

              let championName = null;
              if (finalMatch && finalMatch.teams) { // @ts-ignore
                 championName = finalMatch.teams.name; 
              }
              return { id: season.id, name: season.name, created_at: season.created_at, match_count: count || 0, champion: championName };
            })
          );
          setSeasons(enhancedSeasons as SeasonSummary[]);
        }
      } catch (error) { console.error("Init failed:", error); } finally { setLoading(false); }
    };
    initPage();
  }, []);

  const handleDelete = async (e: React.MouseEvent, seasonId: string, seasonName: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm(`Delete "${seasonName}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('seasons').delete().eq('id', seasonId);
    if (!error) setSeasons(prev => prev.filter(s => s.id !== seasonId));
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      window.location.href = '/login';
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Archives...</div>;

  return (
    <div className="min-h-screen p-4 pb-safe text-gray-900 dark:text-white">
      <header className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
            <h1 className="text-3xl font-bold">All Seasons</h1>
            {user ? (
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-green-600 dark:text-green-500 font-mono">Admin Active</span>
                    <span className="text-gray-400 text-xs">|</span>
                    <button onClick={handleLogout} className="text-xs text-red-500 hover:underline">Log Out</button>
                </div>
            ) : (
                <Link href="/login" className="text-xs text-blue-500 hover:underline mt-1 flex items-center gap-1">
                    <span>🔐</span> Admin Login
                </Link>
            )}
        </div>
        
        {user && (
            <button
            onClick={() => router.push('/admin/create')}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded text-sm transition shadow-lg shadow-green-900/20"
            >
            + Start New
            </button>
        )}
      </header>

      <div className="grid gap-4">
        {seasons.length === 0 ? (
            <div className="text-gray-500 text-center py-10 border border-dashed border-gray-300 dark:border-gray-800 rounded-xl">
               No seasons found.
            </div>
        ) : (
            seasons.map((season) => (
                <div key={season.id} className="relative group">
                    <Link 
                    href={`/tournament/${season.id}`}
                    className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-xl hover:border-blue-400 dark:hover:border-gray-600 shadow-sm hover:shadow-md transition"
                    >
                    <div className="flex justify-between items-start pr-12">
                        <div>
                        <h2 className="text-xl font-bold group-hover:text-blue-500 transition">{season.name}</h2>
                        <p className="text-gray-500 text-xs mt-1">Created: {new Date(season.created_at).toLocaleDateString()}</p>
                        </div>
                        {season.champion && (
                            <div className="text-right">
                                <div className="text-[10px] text-yellow-600 dark:text-yellow-500 font-bold uppercase">Champion</div>
                                <div className="text-yellow-600 dark:text-yellow-400 font-bold text-lg">👑 {season.champion}</div>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">🏏 {season.match_count} Matches</span>
                        {season.champion ? <span className="text-green-600 dark:text-green-500 font-bold">Completed</span> : <span className="text-blue-600 dark:text-blue-500 font-bold animate-pulse">In Progress</span>}
                    </div>
                    </Link>

                    {user && (
                        <button
                            onClick={(e) => handleDelete(e, season.id, season.name)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition z-20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                    )}
                </div>
            ))
        )}
      </div>
    </div>
  );
}