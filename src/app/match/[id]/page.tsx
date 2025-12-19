'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useMatchStore } from '@/store/matchStore';
import { useGameSounds } from '@/hooks/useGameSounds';
import Keypad from '@/components/scorer/keypad'; 
import TossModal from '@/components/match/TossModal';
import MatchControlModal from '@/components/match/MatchControlModal';
import BallTimeline from '@/components/scorer/BallTimeline';
import WicketOverlay from '@/components/visuals/WicketOverlay';
import Celebration from '@/components/visuals/Celebration';

export default function MatchPage() {
  const { id } = useParams();
  const supabase = createClient();
  const store = useMatchStore();
  const { playWin } = useGameSounds();

  const [matchData, setMatchData] = useState<any>(null);
  const [currentInnings, setCurrentInnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // 1. Load Data
  const loadMatchState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select(`*, team_a:teams!team_a_id(id, name), team_b:teams!team_b_id(id, name)`)
        .eq('id', id)
        .single();
      
      if (matchError) throw matchError;
      setMatchData(match);

      const { data: innings } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', id)
        .order('innings_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (innings) {
        setCurrentInnings(innings);
        let previousRuns = 0;
        if (innings.innings_number === 2) {
          const { data: inn1 } = await supabase.from('innings').select('total_runs').eq('match_id', id).eq('innings_number', 1).single();
          if (inn1) previousRuns = inn1.total_runs;
        }

        store.initializeMatch(match.id, innings, match);
        useMatchStore.setState({
          totalRuns: innings.total_runs,
          totalWickets: innings.total_wickets,
          legalBallsBowled: innings.legal_balls_bowled,
          inningsStatus: innings.is_completed ? 'completed' : 'active',
          target: innings.innings_number === 2 ? previousRuns + 1 : null
        });
        store.fetchMatchHistory();
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // 2. Realtime
  useEffect(() => {
    loadMatchState();
    const channel = supabase.channel('live-score')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'balls', filter: `innings_id=eq.${store.inningsId}` }, 
        () => { store.fetchMatchHistory(); loadMatchState(); } 
    )
    .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, store.inningsId]);

  // --- CELEBRATION LOGIC ---
  const isMatchJustFinished = 
      (currentInnings?.innings_number === 2 || matchData?.round_number === 101) && 
      store.inningsStatus === 'completed';

  useEffect(() => {
    if (isMatchJustFinished) {
        playWin();
    }
  }, [isMatchJustFinished, playWin]);

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-white">Loading Match...</div>;

  if (!currentInnings) {
    if (user) {
        return <TossModal matchId={id as string} teamA={matchData.team_a} teamB={matchData.team_b} onTossComplete={() => loadMatchState()} />;
    } else {
        return <div className="p-10 text-center text-gray-500 dark:text-white">Match not started yet. Waiting for Toss...</div>;
    }
  }

  const battingTeamId = currentInnings.batting_team_id;
  const teamAName = matchData.team_a?.name || "Team A";
  const teamBName = matchData.team_b?.name || "Team B";
  const battingTeamName = battingTeamId === matchData.team_a_id ? teamAName : teamBName;
  const bowlingTeamName = battingTeamId === matchData.team_a_id ? teamBName : teamAName;

  return (
    <div className="h-[100dvh] w-full p-4 pb-safe flex flex-col relative text-gray-900 dark:text-white bg-gradient-to-br from-gray-50 to-gray-200 dark:from-black dark:to-gray-900 transition-colors duration-500 overflow-hidden">
       
       <Celebration active={isMatchJustFinished} />
       <WicketOverlay />

       {/* HEADER SECTION */}
       <div className="flex-none mb-4 text-center z-10">
        
        {/* DYNAMIC PLAYOFF BADGES */}
        {(() => {
            const r = matchData.round_number;
            let badgeText = "";
            let colorClass = "";
            
            // 4-Team Logic Badges
            if (r === 91) { badgeText = "QUALIFIER 1"; colorClass = "text-blue-600 dark:text-blue-400"; }
            else if (r === 92) { badgeText = "QUALIFIER 2"; colorClass = "text-purple-600 dark:text-purple-400"; }
            else if (r === 100) { badgeText = "🏆 GRAND FINAL"; colorClass = "text-yellow-600 dark:text-yellow-400"; }
            
            // Tie Breakers (Super Over ends in 01, Bowl Out ends in 02)
            else if (r > 9000 && r % 10 === 1) { badgeText = "⚡ SUPER OVER"; colorClass = "text-orange-500 animate-pulse"; }
            else if (r > 9000 && r % 10 === 2) { badgeText = "🎯 BOWL OUT"; colorClass = "text-red-500 animate-pulse"; }

            if (!badgeText) return null;

            return (
                <div className={`${colorClass} text-xs font-black uppercase tracking-widest mb-1`}>
                    {badgeText}
                </div>
            );
        })()}

        <h2 className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-widest font-bold">
            {battingTeamName} <span className="text-xs text-gray-400 font-normal">vs</span> {bowlingTeamName}
        </h2>
        
        <div className="mt-2 text-6xl font-black tracking-tighter">
          {store.totalRuns}<span className="text-3xl text-gray-400 dark:text-gray-600 font-bold">/{store.totalWickets}</span>
        </div>
        <div className="text-xl text-yellow-600 dark:text-yellow-500 mt-1 font-mono font-bold">
          Overs: {Math.floor(store.legalBallsBowled / 6)}.{store.legalBallsBowled % 6}
        </div>
      </div>

      {store.inningsStatus === 'completed' && (
        <div className="flex-none bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 text-center rounded-lg mb-4 font-bold animate-pulse border border-red-200 dark:border-red-900 backdrop-blur-sm z-10">
          {currentInnings.innings_number === 1 ? "INNINGS BREAK" : "MATCH ENDED"}
        </div>
      )}

      {store.inningsNumber === 2 && store.target !== null && (
        <div className="flex-none glass-card text-gray-800 dark:text-gray-200 text-xs py-1 px-3 rounded-full mx-auto w-fit mb-4 z-10">
           Target: <span className="font-bold">{store.target}</span> ({Math.max(0, store.target - store.totalRuns)} runs needed)
        </div>
      )}

       {/* TIMELINE CONTAINER */}
       <div className="flex-1 overflow-y-auto glass-card rounded-2xl mb-4 p-2 relative">
          <BallTimeline />
       </div>

       {/* KEYPAD CONTAINER */}
       {user ? (
           <div className="flex-none mt-auto z-20">
                <Keypad onScore={(input) => store.recordBall(input, input.dismissal)} disabled={store.inningsStatus === 'completed'} />
                <MatchControlModal />
           </div>
       ) : (
           <div className="flex-none mt-auto text-center text-gray-400 dark:text-gray-600 text-xs mt-2 pb-2">
               You are viewing as Guest. Updates are live.
           </div>
       )}
    </div>
  );
}