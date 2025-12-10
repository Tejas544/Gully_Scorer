'use client';
import { useEffect, useState } from 'react';
import { useMatchStore } from '@/store/matchStore';

export default function WicketOverlay() {
  const ballsHistory = useMatchStore(state => state.ballsHistory);
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (ballsHistory.length === 0) return;
    
    const lastBall = ballsHistory[ballsHistory.length - 1];
    
    if (lastBall.is_wicket) {
      setText("WICKET!");
      setShow(true);
      setTimeout(() => setShow(false), 2000);
    } 
    else if (lastBall.runs_batter === 1 && !lastBall.is_wide && !lastBall.is_no_ball) {
        // Optional: Animate runs if you want
    }

  }, [ballsHistory.length]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-600/20 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
        <div className="bg-red-600 text-white text-6xl font-black italic transform -rotate-6 border-4 border-white p-6 shadow-2xl tracking-tighter">
            {text}
        </div>
    </div>
  );
}