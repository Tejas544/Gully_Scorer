'use client';
import { useState } from 'react';

type KeypadProps = {
  onScore: (input: any) => void;
  disabled: boolean;
};

export default function Keypad({ onScore, disabled }: KeypadProps) {
  const [showWicketModal, setShowWicketModal] = useState(false);

  // Helper to standard score
  const handleInput = (type: 'runs' | 'wide' | 'no_ball', val?: 0 | 1) => {
    onScore({ type, value: val });
  };

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-900 text-white pb-safe">
      {/* Row 1: The Basics */}
      <button 
        onClick={() => handleInput('runs', 0)}
        className="h-16 bg-gray-700 rounded-lg text-xl font-bold active:scale-95 transition"
      >
        0 (Dot)
      </button>
      
      <button 
        onClick={() => handleInput('runs', 1)}
        className="h-16 bg-blue-600 rounded-lg text-xl font-bold active:scale-95 transition"
      >
        1 Run
      </button>
      
      <button 
        onClick={() => setShowWicketModal(true)}
        className="h-16 bg-red-600 rounded-lg text-xl font-bold active:scale-95 transition"
      >
        OUT
      </button>

      {/* Row 2: Extras */}
      <button 
        onClick={() => handleInput('wide')}
        className="h-14 bg-yellow-600 rounded-lg font-semibold"
      >
        Wide (+1)
      </button>
      
      <button 
        onClick={() => handleInput('no_ball')}
        className="h-14 bg-orange-600 rounded-lg font-semibold"
      >
        No Ball (+1)
      </button>

      {/* Wicket Modal (Simplified) */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80">
            <h3 className="text-lg font-bold mb-4">How was he out?</h3>
            <div className="grid grid-cols-2 gap-3">
              {['Bowled', 'Caught', 'Run Out', 'Hit Six Out'].map((wType) => (
                <button
                  key={wType}
                  onClick={() => {
                    onScore({ type: 'wicket', dismissal: wType.toLowerCase().replace(/ /g, '_') });
                    setShowWicketModal(false);
                  }}
                  className="p-3 bg-gray-700 rounded hover:bg-red-500"
                >
                  {wType}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowWicketModal(false)}
              className="mt-4 w-full py-2 text-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}