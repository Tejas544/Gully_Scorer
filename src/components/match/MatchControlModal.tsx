'use client';
import { useState } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { useRouter } from 'next/navigation';
import { createSuperOver } from '@/lib/tournament';
import { createClient } from '@/utils/supabase/client';

export default function MatchControlModal() {
  const store = useMatchStore();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [bowlOutScore, setBowlOutScore] = useState<{ a: number, b: number }>({ a: 0, b: 0 });
  const [bowlOutMode, setBowlOutMode] = useState(false);

  if (store.inningsStatus !== 'completed') return null;

  const isMatchOver = !!store.matchResult;
  // It is a "Critical Tie" only if it's a Tie AND it's a Final/Super Over (Round >= 100)
  const isCriticalTie = isMatchOver && !store.matchResult?.winnerId && store.roundNumber >= 100;

  // --- SUPER OVER HANDLER ---
  const handleSuperOver = async () => {
    if (!store.seasonId || !store.teamIds) return;
    setLoading(true);
    try {
        const newMatchId = await createSuperOver(store.seasonId, store.teamIds.batting, store.teamIds.bowling);
        window.location.href = `/match/${newMatchId}`;
    } catch (err) {
        alert("Failed to start Super Over");
        setLoading(false);
    }
  };

  // --- BOWL OUT HANDLER ---
  const handleBowlOutFinish = async () => {
      if (!store.matchId || !store.teamIds) return;
      setLoading(true);

      let winnerId = null;
      let note = "Bowl Out Tied";
      
      if (bowlOutScore.a > bowlOutScore.b) {
          winnerId = store.teamIds.batting;
          note = "Won by Bowl Out";
      } else if (bowlOutScore.b > bowlOutScore.a) {
          winnerId = store.teamIds.bowling;
          note = "Won by Bowl Out";
      }

      await supabase.from('matches').update({
          winner_id: winnerId,
          is_completed: true,
          result_note: note
      }).eq('id', store.matchId);

      router.push(`/tournament/${store.seasonId}`);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-sm text-center border border-gray-700 shadow-2xl animate-in zoom-in-95">
        
        {/* --- BOWL OUT UI --- */}
        {bowlOutMode ? (
            <div>
                <h2 className="text-3xl font-bold mb-4 text-purple-500">🎳 BOWL OUT</h2>
                <div className="flex justify-between items-center mb-8 px-4">
                    <div className="text-center">
                        <div className="font-bold text-xl mb-2">Team A</div>
                        <div className="text-4xl font-black">{bowlOutScore.a}</div>
                        <div className="flex gap-1 mt-2">
                            <button onClick={() => setBowlOutScore(p => ({...p, a: p.a + 1}))} className="bg-green-600 w-8 h-8 rounded text-sm">+</button>
                            <button onClick={() => setBowlOutScore(p => ({...p, a: Math.max(0, p.a - 1)}))} className="bg-red-600 w-8 h-8 rounded text-sm">-</button>
                        </div>
                    </div>
                    <div className="text-gray-500 font-bold">VS</div>
                    <div className="text-center">
                        <div className="font-bold text-xl mb-2">Team B</div>
                        <div className="text-4xl font-black">{bowlOutScore.b}</div>
                        <div className="flex gap-1 mt-2">
                            <button onClick={() => setBowlOutScore(p => ({...p, b: p.b + 1}))} className="bg-green-600 w-8 h-8 rounded text-sm">+</button>
                            <button onClick={() => setBowlOutScore(p => ({...p, b: Math.max(0, p.b - 1)}))} className="bg-red-600 w-8 h-8 rounded text-sm">-</button>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleBowlOutFinish}
                    disabled={bowlOutScore.a === bowlOutScore.b}
                    className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-500 disabled:opacity-50"
                >
                    Declare Winner
                </button>
            </div>
        ) : isMatchOver ? (
          // --- MATCH OVER UI ---
          <>
            <h2 className="text-3xl font-bold mb-2">
                {!store.matchResult?.winnerId ? "😲 MATCH TIED!" : "🏆 Match Finished"}
            </h2>
            <div className="text-xl text-yellow-400 mb-6">
              {store.matchResult?.message}
            </div>

            {/* ONLY SHOW SUPER OVER OPTIONS IF IT IS A 'CRITICAL TIE' (Finals) */}
            {isCriticalTie ? (
                <div className="space-y-3">
                    <p className="text-gray-400 text-sm">A tie in the finals cannot stand!</p>
                    
                    {store.roundNumber === 101 ? ( 
                        <button
                            onClick={() => setBowlOutMode(true)}
                            className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg animate-pulse"
                        >
                            Start Bowl Out 🎳
                        </button>
                    ) : (
                        <button
                            onClick={handleSuperOver}
                            disabled={loading}
                            className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg animate-pulse"
                        >
                            {loading ? 'Setting up...' : 'Start Super Over 🏏'}
                        </button>
                    )}
                </div>
            ) : (
                // STANDARD BACK BUTTON (For Wins OR League Ties)
                <button
                onClick={() => router.push(`/tournament/${store.seasonId}`)}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-500"
                >
                Back to Tournament
                </button>
            )}
          </>
        ) : (
          // --- INNINGS BREAK UI ---
          <>
            <h2 className="text-2xl font-bold mb-2">Innings Break</h2>
            <p className="text-gray-400 mb-6">
              Target to win: <span className="text-white font-bold text-xl">{store.totalRuns + 1}</span>
            </p>
            <button
              onClick={() => store.startSecondInnings()}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-500"
            >
              Start 2nd Innings
            </button>
          </>
        )}
      </div>
    </div>
  );
}