'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion'; // <--- Import motion directly
import Link from 'next/link';

type PlayerSummary = {
  id: string;
  name: string;
  matches: number;
  runs: number;
  wickets: number;
  average: string;
};

export default function AllPlayersPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: allPlayers, error: pError } = await supabase.from('players').select('id, name').order('name');
        if (pError) throw pError;

        const { data: allStats, error: sError } = await supabase.from('match_player_stats').select('player_id, runs_scored, wickets_taken, is_out');
        if (sError) throw sError;

        const statsMap = new Map<string, { matches: number, runs: number, wickets: number, outs: number }>();

        allStats?.forEach(log => {
           const current = statsMap.get(log.player_id) || { matches: 0, runs: 0, wickets: 0, outs: 0 };
           current.matches += 1; 
           current.runs += log.runs_scored || 0;
           current.wickets += log.wickets_taken || 0;
           if (log.is_out) current.outs += 1;
           statsMap.set(log.player_id, current);
        });

        const summary: PlayerSummary[] = allPlayers.map(p => {
            const stat = statsMap.get(p.id) || { matches: 0, runs: 0, wickets: 0, outs: 0 };
            const avg = stat.outs > 0 ? (stat.runs / stat.outs).toFixed(1) : stat.runs > 0 ? "∞" : "0.0";

            return { id: p.id, name: p.name, matches: stat.matches, runs: stat.runs, wickets: stat.wickets, average: avg };
        });

        summary.sort((a, b) => b.runs - a.runs);
        setPlayers(summary);
        setFilteredPlayers(summary);

      } catch (err) { console.error("Error loading players:", err); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!search) { setFilteredPlayers(players); } 
    else { setFilteredPlayers(players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))); }
  }, [search, players]);

  // ANIMATION VARIANTS FOR TABLE
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <div className="min-h-screen p-4 pb-safe text-gray-900 dark:text-white bg-gradient-to-br from-gray-50 to-gray-200 dark:from-black dark:to-gray-900 transition-colors duration-500 flex flex-col">
      
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="glass-card p-3 rounded-full hover:scale-105 active:scale-95 transition">←</button>
        <h1 className="text-3xl font-black tracking-tight">Player Registry</h1>
      </div>

      <div className="mb-6 relative">
         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">🔍</div>
         <input 
            type="text" 
            placeholder="Search player name..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-4 rounded-xl glass-card bg-white/50 dark:bg-black/30 border-transparent focus:border-blue-500 focus:ring-0 transition outline-none placeholder-gray-500"
         />
      </div>

      {loading ? (
          <div className="text-center p-10 text-gray-500 animate-pulse">Scouting Players...</div>
      ) : (
          <div className="flex-1 overflow-y-auto rounded-2xl glass-card">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-md text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider sticky top-0 z-10">
                    <tr>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-2 py-3 text-center">Mat</th>
                        <th className="px-2 py-3 text-right">Runs</th>
                        <th className="px-4 py-3 text-right">Wkts</th>
                    </tr>
                </thead>
                {/* FIX: Use motion.tbody directly for valid HTML */}
                <motion.tbody 
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="divide-y divide-gray-200/50 dark:divide-gray-800/50"
                >
                    {filteredPlayers.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">No players found.</td></tr>
                    ) : (
                        filteredPlayers.map((player, idx) => (
                            <motion.tr 
                                key={player.id} 
                                variants={item} // Apply animation to ROW
                                onClick={() => router.push(`/player/${player.id}`)}
                                className="cursor-pointer hover:bg-white/60 dark:hover:bg-gray-800/60 transition duration-200"
                            >
                                <td className="px-4 py-3 font-bold flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${idx < 3 ? 'bg-gradient-to-br from-yellow-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                                        {player.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-900 dark:text-white">{player.name}</span>
                                        <span className="text-[10px] text-gray-500 font-normal">Avg: {player.average}</span>
                                    </div>
                                </td>
                                <td className="px-2 py-3 text-center text-gray-500 dark:text-gray-400 font-medium">{player.matches}</td>
                                <td className="px-2 py-3 text-right font-black text-gray-900 dark:text-white">{player.runs}</td>
                                <td className="px-4 py-3 text-right font-bold text-purple-600 dark:text-purple-400">{player.wickets}</td>
                            </motion.tr>
                        ))
                    )}
                </motion.tbody>
            </table>
          </div>
      )}
    </div>
  );
}