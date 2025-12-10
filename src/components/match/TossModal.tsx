'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type TossModalProps = {
  matchId: string;
  teamA: { id: string; name: string };
  teamB: { id: string; name: string };
  onTossComplete: () => void;
};

export default function TossModal({ matchId, teamA, teamB, onTossComplete }: TossModalProps) {
  const supabase = createClient();
  const [tossWinner, setTossWinner] = useState<string | null>(null);
  const [decision, setDecision] = useState<'bat' | 'bowl' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartMatch = async () => {
    if (!tossWinner || !decision) return;
    setIsSubmitting(true);

    try {
      // 1. Determine who bats first
      let battingTeamId, bowlingTeamId;
      
      if (decision === 'bat') {
        battingTeamId = tossWinner;
        bowlingTeamId = tossWinner === teamA.id ? teamB.id : teamA.id;
      } else {
        bowlingTeamId = tossWinner;
        battingTeamId = tossWinner === teamA.id ? teamB.id : teamA.id;
      }

      // 2. Update Match with Toss Info
      const { error: matchError } = await supabase
        .from('matches')
        .update({ 
          // toss_winner_id: tossWinner, // Add this column to DB if you want to track stats later
          // toss_decision: decision 
          // For now, we just proceed to create innings
        })
        .eq('id', matchId);

      // 3. Create the First Innings
      const { error: inningsError } = await supabase
        .from('innings')
        .insert({
          match_id: matchId,
          batting_team_id: battingTeamId,
          innings_number: 1,
          total_runs: 0,
          total_wickets: 0,
          legal_balls_bowled: 0
        });

      if (inningsError) throw inningsError;

      onTossComplete(); // Trigger page reload/update

    } catch (err) {
      console.error('Toss Error:', err);
      alert('Failed to start match');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm border border-gray-700">
        <h2 className="text-2xl font-bold text-center mb-6">🪙 Toss Time</h2>

        {/* Step 1: Who Won? */}
        <div className="mb-6">
          <p className="text-gray-400 mb-2 text-center">Who won the toss?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTossWinner(teamA.id)}
              className={`p-4 rounded-lg font-bold border ${
                tossWinner === teamA.id ? 'bg-green-600 border-green-500' : 'bg-gray-700 border-gray-600'
              }`}
            >
              {teamA.name}
            </button>
            <button
              onClick={() => setTossWinner(teamB.id)}
              className={`p-4 rounded-lg font-bold border ${
                tossWinner === teamB.id ? 'bg-green-600 border-green-500' : 'bg-gray-700 border-gray-600'
              }`}
            >
              {teamB.name}
            </button>
          </div>
        </div>

        {/* Step 2: Decision */}
        {tossWinner && (
          <div className="mb-8">
            <p className="text-gray-400 mb-2 text-center">They elected to...</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDecision('bat')}
                className={`p-4 rounded-lg font-bold border ${
                  decision === 'bat' ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 border-gray-600'
                }`}
              >
                BAT 🏏
              </button>
              <button
                onClick={() => setDecision('bowl')}
                className={`p-4 rounded-lg font-bold border ${
                  decision === 'bowl' ? 'bg-blue-600 border-blue-500' : 'bg-gray-700 border-gray-600'
                }`}
              >
                BOWL 🥎
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleStartMatch}
          disabled={!tossWinner || !decision || isSubmitting}
          className="w-full bg-white text-black font-bold py-4 rounded-lg disabled:opacity-50"
        >
          {isSubmitting ? 'Starting...' : 'Start Match'}
        </button>
      </div>
    </div>
  );
}