'use client';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    // REMOVED 'bg-black'. Added 'text-gray-900 dark:text-white'
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden relative text-gray-900 dark:text-white">
      
      {/* Background Gradient Blob (Only visible in Dark Mode for effect) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] hidden dark:block" />
      
      <div className="max-w-3xl z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="inline-block bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-4 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
          🏏 The Ultimate Gully Cricket Scorer
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter">
          LEVEL UP YOUR <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-white dark:to-gray-500">
            GULLY LEAGUE
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Create tournaments, track NRR automatically, and view detailed player stats. 
          The professional scoring experience for your backyard matches.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <button 
            onClick={() => router.push('/login')}
            className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-80 transition transform hover:scale-105 active:scale-95 text-lg w-full sm:w-auto shadow-lg"
          >
            Start Scoring (Admin)
          </button>
          <button 
             onClick={() => router.push('/tournament')}
             className="px-8 py-4 bg-gray-100 dark:bg-gray-900 text-black dark:text-white font-bold rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 transition w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <span>👀</span> View Live Scores
          </button>
        </div>

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
    // CARD STYLING: White in Light Mode, Gray-900 in Dark Mode
    <div className="bg-white dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none">
      <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  )
}