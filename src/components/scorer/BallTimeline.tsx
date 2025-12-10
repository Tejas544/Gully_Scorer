'use client';
import { useMatchStore } from '@/store/matchStore';
import { useEffect, useRef } from 'react';

export default function BallTimeline() {
  const { ballsHistory, undoLastBall, inningsStatus } = useMatchStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new ball is added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ballsHistory.length]);

  if (ballsHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 italic">
        Match just started... waiting for first ball
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-4 no-scrollbar">
        {ballsHistory.map((ball, index) => {
          // Determine color based on event
          let bgColor = 'bg-gray-800';
          let textColor = 'text-white';
          let label = `${ball.runs_batter}`;

          if (ball.is_wicket) {
            bgColor = 'bg-red-900/50 border border-red-700';
            textColor = 'text-red-400 font-bold';
            label = `OUT (${ball.dismissal_kind?.replace('_', ' ')})`;
          } else if (ball.is_wide) {
            bgColor = 'bg-yellow-900/30 border border-yellow-700';
            textColor = 'text-yellow-400';
            label = 'WD + 1';
          } else if (ball.is_no_ball) {
            bgColor = 'bg-orange-900/30 border border-orange-700';
            textColor = 'text-orange-400';
            label = 'NB + 1';
          } else if (ball.runs_batter > 0) {
            bgColor = 'bg-blue-900/30 border border-blue-700';
            textColor = 'text-blue-400 font-bold';
          }

          // Calculate approximate over number for display (simplified)
          // Note: Accurate over calculation requires complex logic with extras, 
          // for Phase 4 we just list them sequentially.
          
          return (
            <div key={ball.id} className={`flex justify-between items-center p-3 rounded-lg ${bgColor}`}>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs font-mono">#{index + 1}</span>
                <span className={`${textColor} text-sm uppercase`}>{label}</span>
              </div>
              
              {/* Show delete button only on the VERY LAST ball */}
              {index === ballsHistory.length - 1 && inningsStatus !== 'completed' && (
                <button 
                  onClick={() => undoLastBall()}
                  className="text-xs text-red-500 hover:text-red-300 underline"
                >
                  Undo
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}