'use client';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
      
      {/* Background Gradient Blob (Visual Flare) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />

      <div className="max-w-3xl z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* LOGO / BADGE */}
        <div className="inline-block bg-gray-900 border border-gray-800 rounded-full px-4 py-1 text-sm font-medium text-gray-400 mb-4">
          🏏 The Ultimate Gully Cricket Scorer
        </div>

        {/* HERO TITLE */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
          LEVEL UP YOUR <br />
          <span className="text-white">GULLY LEAGUE</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Create tournaments, track NRR automatically, and view detailed player stats. 
          The professional scoring experience for your backyard matches.
        </p>

        {/* CTA BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <button 
    onClick={() => router.push('/login')}
    className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition transform hover:scale-105 active:scale-95 text-lg w-full sm:w-auto shadow-lg shadow-white/10"
  >
    Start Scoring (Admin)
  </button>
  <button 
     onClick={() => router.push('/tournament')}
     className="px-8 py-4 bg-gray-900 text-white font-bold rounded-xl border border-gray-800 hover:bg-gray-800 transition w-full sm:w-auto flex items-center justify-center gap-2"
  >
    <span>👀</span> View Live Scores
  </button>
        </div>

        {/* FEATURE GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 text-left">
          <FeatureCard title="🏆 Tournaments" desc="Auto-Fixtures & Finals" />
          <FeatureCard title="📊 Live NRR" desc="Real-time Points Table" />
          <FeatureCard title="👑 Player Stats" desc="Orange & Purple Caps" />
          <FeatureCard title="⚡ Super Over" desc="Tie-Breaker Logic" />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800/50">
      <h3 className="font-bold text-white">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  )
}