'use client';
import { useRouter } from 'next/navigation';
// import Spline from '@splinetool/react-spline'; <--- Commented out to stop crash

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden relative text-gray-900 dark:text-white bg-white dark:bg-black transition-colors duration-500">
      
      {/* --- REPLACEMENT BACKGROUND (No 3D for now) --- */}
      <div className="absolute inset-0 z-0">
         {/* Beautiful Gradient Blob instead of broken 3D scene */}
         <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[1px]" />
      </div>
      
      {/* --- CONTENT --- */}
      <div className="max-w-4xl z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        <div className="inline-block glass-card px-4 py-1.5 rounded-full mb-4 border border-white/20 shadow-xl backdrop-blur-xl">
          <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            🚀 The Future of Gully Cricket
          </span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter drop-shadow-2xl">
          LEVEL UP YOUR <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-white dark:to-gray-400">
            LEAGUE
          </span>
        </h1>

        <p className="text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-md">
          Professional scoring, live NRR calculations, and premium match highlights. 
          Experience cricket like never before.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <button 
            onClick={() => router.push('/login')}
            className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition shadow-2xl hover:shadow-purple-500/20"
          >
            Start Scoring (Admin)
          </button>
          <button 
             onClick={() => router.push('/tournament')}
             className="px-8 py-4 glass-card text-black dark:text-white font-bold rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition flex items-center justify-center gap-2"
          >
            <span>👀</span> View Live Scores
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 text-left">
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
    <div className="glass-card p-5 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
      <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{desc}</p>
    </div>
  )
}