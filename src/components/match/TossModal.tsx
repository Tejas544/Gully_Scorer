'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface TossModalProps {
  matchId: string;
  teamA: { id: string; name: string };
  teamB: { id: string; name: string };
  onTossComplete: () => void;
}

export default function TossModal({ matchId, teamA, teamB, onTossComplete }: TossModalProps) {
  const supabase = createClient();
  const [mode, setMode] = useState<'virtual' | 'manual'>('virtual');
  
  // Virtual Toss State
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinRotation, setCoinRotation] = useState(0); // Degrees
  const [tossWinner, setTossWinner] = useState<{ id: string, name: string } | null>(null);

  // Decision State
  const [decision, setDecision] = useState<'bat' | 'bowl' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // --- LOGIC: FLIP COIN ---
  const flipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTossWinner(null);

    // 1. Decide winner immediately (50/50 chance)
    const randomVal = Math.random();
    const winner = randomVal > 0.5 ? teamA : teamB;
    const isTeamA = winner.id === teamA.id;

    // 2. Calculate Rotation
    // We want at least 5 full spins (1800 degrees)
    // If Team A wins (Front side), land on multiple of 360 (0, 360, 720...)
    // If Team B wins (Back side), land on multiple of 180 (180, 540...)
    const baseSpins = 1800; // 5 spins
    const targetRotation = isTeamA 
        ? baseSpins + 360  // Land on Front (0/360)
        : baseSpins + 180; // Land on Back (180)

    setCoinRotation(targetRotation);

    // 3. Wait for animation to finish (3 seconds)
    setTimeout(() => {
      setIsFlipping(false);
      setTossWinner(winner);
    }, 3000); // Must match CSS duration
  };

  // --- LOGIC: SUBMIT TO DB ---
  const handleSubmit = async () => {
    if (!tossWinner || !decision) return;
    setSubmitting(true);

    try {
      // 1. Determine who bats first
      // If Winner chose BAT -> Winner Bats
      // If Winner chose BOWL -> Loser Bats
      const loser = tossWinner.id === teamA.id ? teamB : teamA;
      const battingTeamId = decision === 'bat' ? tossWinner.id : loser.id;

      // 2. Create the first Innings
      const { error } = await supabase.from('innings').insert({
        match_id: matchId,
        innings_number: 1,
        batting_team_id: battingTeamId,
        total_runs: 0,
        total_wickets: 0,
        legal_balls_bowled: 0,
        is_completed: false
      });

      if (error) throw error;
      onTossComplete(); // Refresh parent

    } catch (err) {
      console.error("Toss failed", err);
      alert("Failed to save toss. Check console.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">🪙 Match Toss</h2>
            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 text-xs font-bold">
                <button 
                    onClick={() => { setMode('virtual'); setTossWinner(null); }}
                    className={`px-3 py-1 rounded ${mode === 'virtual' ? 'bg-white dark:bg-gray-900 text-black dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    Virtual
                </button>
                <button 
                    onClick={() => { setMode('manual'); setTossWinner(null); }}
                    className={`px-3 py-1 rounded ${mode === 'manual' ? 'bg-white dark:bg-gray-900 text-black dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    Manual
                </button>
            </div>
        </div>

        <div className="p-6 flex flex-col items-center justify-center flex-1">
            
            {/* --- MODE 1: VIRTUAL COIN FLIP --- */}
            {mode === 'virtual' && !tossWinner && (
                <div className="py-8 perspective-1000">
                    <div 
                        className="relative w-40 h-40 transform-style-3d transition-transform duration-[3000ms] ease-out"
                        style={{ transform: `rotateY(${coinRotation}deg)` }}
                    >
                        {/* FRONT SIDE (Team A) */}
                        <div className="absolute inset-0 w-full h-full rounded-full bg-blue-600 border-4 border-white/20 shadow-xl flex items-center justify-center backface-hidden">
                            <div className="text-white font-bold text-center px-2">
                                <div className="text-xs uppercase opacity-75">Heads</div>
                                <div className="text-xl leading-tight">{teamA.name}</div>
                            </div>
                        </div>

                        {/* BACK SIDE (Team B) */}
                        <div className="absolute inset-0 w-full h-full rounded-full bg-purple-600 border-4 border-white/20 shadow-xl flex items-center justify-center backface-hidden rotate-y-180">
                            <div className="text-white font-bold text-center px-2">
                                <div className="text-xs uppercase opacity-75">Tails</div>
                                <div className="text-xl leading-tight">{teamB.name}</div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={flipCoin}
                        disabled={isFlipping}
                        className="mt-12 w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition disabled:opacity-50 disabled:scale-100"
                    >
                        {isFlipping ? "Flipping..." : "FLIP COIN"}
                    </button>
                </div>
            )}

            {/* --- MODE 2: MANUAL SELECTION --- */}
            {mode === 'manual' && !tossWinner && (
                <div className="w-full space-y-4">
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-4">Who won the physical toss?</p>
                    <button onClick={() => setTossWinner(teamA)} className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-bold text-left flex justify-between">
                        <span>{teamA.name}</span>
                        <span className="text-blue-500">Won</span>
                    </button>
                    <button onClick={() => setTossWinner(teamB)} className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition font-bold text-left flex justify-between">
                        <span>{teamB.name}</span>
                        <span className="text-purple-500">Won</span>
                    </button>
                </div>
            )}

            {/* --- RESULT & DECISION (Common for both) --- */}
            {tossWinner && (
                <div className="w-full text-center animate-in fade-in zoom-in duration-300">
                    <div className="text-4xl mb-2">🎉</div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                        {tossWinner.name} Won!
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">What did they choose to do?</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                            onClick={() => setDecision('bat')}
                            className={`p-4 rounded-xl border-2 font-bold transition ${decision === 'bat' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300'}`}
                        >
                            🏏 BAT
                        </button>
                        <button 
                            onClick={() => setDecision('bowl')}
                            className={`p-4 rounded-xl border-2 font-bold transition ${decision === 'bowl' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300'}`}
                        >
                            🥎 BOWL
                        </button>
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={!decision || submitting}
                        className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? "Starting Match..." : "START MATCH 🚀"}
                    </button>

                    <button onClick={() => { setTossWinner(null); setDecision(null); setIsFlipping(false); setCoinRotation(0); }} className="mt-4 text-xs text-gray-400 underline">
                        Reset Toss
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}