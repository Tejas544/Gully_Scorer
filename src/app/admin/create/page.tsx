'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { generateFixtures } from '@/lib/tournament';
import { useRouter } from 'next/navigation';

export default function CreateTournament() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [seasonName, setSeasonName] = useState('');
  const [teamCount, setTeamCount] = useState(3);
  const [teamNames, setTeamNames] = useState<string[]>(['Not', 'Tejas', 'Aditya']);
  const [isCreating, setIsCreating] = useState(false);

  // Sync teamNames array length when teamCount changes
  useEffect(() => {
    setTeamNames(prev => {
      const newNames = [...prev];
      if (teamCount > newNames.length) {
        // Add empty slots
        for (let i = newNames.length; i < teamCount; i++) {
          newNames.push(`Team ${i + 1}`);
        }
      } else {
        // Trim excess
        newNames.length = teamCount;
      }
      return newNames;
    });
  }, [teamCount]);

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...teamNames];
    newNames[index] = value;
    setTeamNames(newNames);
  };

  const handleCreate = async () => {
    if (!seasonName.trim()) {
        alert("Please enter a season name");
        return;
    }
    if (teamNames.some(name => !name.trim())) {
        alert("All team names must be filled");
        return;
    }

    setIsCreating(true);
    
    try {
      // 1. Create Season
      const { data: season, error: seasonError } = await supabase
        .from('seasons')
        .insert({ name: seasonName })
        .select()
        .single();
      
      if (seasonError) throw seasonError;

      // 2. Create Teams
      const teamInserts = teamNames.map(name => ({
        season_id: season.id,
        name: name.trim()
      }));
      
      const { data: createdTeams, error: teamError } = await supabase
        .from('teams')
        .insert(teamInserts)
        .select();

      if (teamError) throw teamError;

      // 3. Generate Fixtures (Algorithm handles any number of teams)
      const teamIds = createdTeams.map(t => t.id);
      const schedule = generateFixtures(teamIds);

      // 4. Create Matches
      const matchInserts = schedule.map(fixture => ({
        season_id: season.id,
        round_number: fixture.round,
        team_a_id: fixture.homeTeamId,
        team_b_id: fixture.awayTeamId,
        is_completed: false
      }));

      const { error: matchError } = await supabase
        .from('matches')
        .insert(matchInserts);

      if (matchError) throw matchError;

      router.push(`/tournament/${season.id}`);

    } catch (err) {
      console.error(err);
      alert('Failed to create tournament');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-safe flex flex-col items-center">
      <div className="w-full max-w-lg space-y-8">
        
        <header>
            <h1 className="text-3xl font-bold">New Tournament</h1>
            <p className="text-gray-400 mt-2">Configure teams and schedule.</p>
        </header>

        <div className="space-y-6">
            {/* SEASON NAME */}
            <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Tournament Name</label>
                <input 
                    className="w-full bg-gray-900 p-4 rounded-xl border border-gray-800 focus:border-blue-600 focus:outline-none transition font-semibold"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    placeholder="e.g. Winter Gully Cup 2025"
                />
            </div>

            {/* TEAM COUNT SELECTOR */}
            <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Number of Teams</label>
                <div className="flex items-center gap-4 bg-gray-900 p-2 rounded-xl border border-gray-800">
                    <button 
                        onClick={() => setTeamCount(Math.max(2, teamCount - 1))}
                        className="w-12 h-12 flex items-center justify-center bg-gray-800 rounded-lg hover:bg-gray-700 text-xl font-bold transition"
                    >
                        -
                    </button>
                    <div className="flex-1 text-center font-bold text-xl">
                        {teamCount} Teams
                    </div>
                    <button 
                        onClick={() => setTeamCount(Math.min(10, teamCount + 1))} // Cap at 10 for UI sanity
                        className="w-12 h-12 flex items-center justify-center bg-gray-800 rounded-lg hover:bg-gray-700 text-xl font-bold transition"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* TEAM NAMES LIST */}
            <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Team Names</label>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                    {teamNames.map((name, idx) => (
                        <div key={idx} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                            <span className="text-gray-600 font-mono w-6 text-right">{idx + 1}.</span>
                            <input 
                                className="flex-1 bg-gray-900 p-3 rounded-lg border border-gray-800 focus:border-green-600 focus:outline-none transition"
                                value={name}
                                onChange={(e) => handleNameChange(idx, e.target.value)}
                                placeholder={`Team ${idx + 1}`}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* SUMMARY */}
            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-900/30 text-center">
                <p className="text-blue-400 text-sm">
                    This will generate a <span className="font-bold text-white">Double Round Robin</span> schedule.
                    <br/>
                    Total Matches: <span className="font-bold text-white">{teamCount * (teamCount - 1)}</span>
                </p>
            </div>

            {/* ACTION */}
            <button 
                onClick={handleCreate}
                disabled={isCreating || !seasonName}
                className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95 shadow-lg shadow-green-900/20"
            >
                {isCreating ? 'Generating Schedule...' : '🚀 Start Tournament'}
            </button>
        </div>
      </div>
    </div>
  );
}