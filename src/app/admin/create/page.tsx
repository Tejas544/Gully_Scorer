'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { generateFixtures } from '@/lib/tournament';
import { useRouter } from 'next/navigation';

export default function CreateTournament() {
  const router = useRouter();
  const supabase = createClient();
  
  const [seasonName, setSeasonName] = useState('');
  const [teamCount, setTeamCount] = useState(3);
  const [teamNames, setTeamNames] = useState<string[]>(['Not', 'Tejas', 'Aditya']);
  const [isCreating, setIsCreating] = useState(false);

  // Sync team names array size
  useEffect(() => {
    setTeamNames(prev => {
      const newNames = [...prev];
      if (teamCount > newNames.length) {
        for (let i = newNames.length; i < teamCount; i++) newNames.push(`Player ${i + 1}`);
      } else {
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
    if (!seasonName.trim() || teamNames.some(n => !n.trim())) {
        alert("Please fill all fields");
        return;
    }

    setIsCreating(true);
    
    try {
      // 1. Create Season
      const { data: season, error: seasonError } = await supabase
        .from('seasons')
        .insert({ name: seasonName }).select().single();
      if (seasonError) throw seasonError;

      // 2. Process Players (Find or Create) & Create Teams
      const teamIds = [];

      for (const name of teamNames) {
        const cleanName = name.trim();
        
        // A. Find existing Global Player
        let playerId;
        const { data: existingPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('name', cleanName)
            .maybeSingle();

        if (existingPlayer) {
            playerId = existingPlayer.id;
        } else {
            // B. Create New Global Player
            const { data: newPlayer, error: pError } = await supabase
                .from('players')
                .insert({ name: cleanName })
                .select()
                .single();
            if (pError) throw pError;
            playerId = newPlayer.id;
        }

        // C. Create Season Team
        const { data: newTeam, error: tError } = await supabase
            .from('teams')
            .insert({ season_id: season.id, name: cleanName })
            .select()
            .single();
        if (tError) throw tError;

        // D. Link Team to Player (Vital for Career Stats)
        await supabase.from('team_players').insert({
            team_id: newTeam.id,
            player_id: playerId
        });

        teamIds.push(newTeam.id);
      }

      // 3. Generate Fixtures
      const schedule = generateFixtures(teamIds);
      const matchInserts = schedule.map(fixture => ({
        season_id: season.id,
        round_number: fixture.round,
        team_a_id: fixture.homeTeamId,
        team_b_id: fixture.awayTeamId
      }));

      const { error: matchError } = await supabase.from('matches').insert(matchInserts);
      if (matchError) throw matchError;

      router.push(`/tournament/${season.id}`);

    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-safe flex flex-col items-center">
      <div className="w-full max-w-lg space-y-8">
        <header>
            <h1 className="text-3xl font-bold">New Tournament</h1>
            <p className="text-gray-400 mt-2">Names entered here will link to existing Career Profiles automatically.</p>
        </header>

        <div className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Tournament Name</label>
                <input 
                    className="w-full bg-gray-900 p-4 rounded-xl border border-gray-800 focus:border-blue-600 outline-none"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    placeholder="e.g. Summer Cup 2025"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Number of Players</label>
                <div className="flex items-center gap-4 bg-gray-900 p-2 rounded-xl border border-gray-800">
                    <button onClick={() => setTeamCount(Math.max(2, teamCount - 1))} className="w-12 h-12 bg-gray-800 rounded-lg font-bold text-xl">-</button>
                    <div className="flex-1 text-center font-bold text-xl">{teamCount} Players</div>
                    <button onClick={() => setTeamCount(Math.min(10, teamCount + 1))} className="w-12 h-12 bg-gray-800 rounded-lg font-bold text-xl">+</button>
                </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {teamNames.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <span className="text-gray-600 font-mono w-6 text-right">{idx + 1}.</span>
                        <input 
                            className="flex-1 bg-gray-900 p-3 rounded-lg border border-gray-800 focus:border-green-600 outline-none"
                            value={name}
                            onChange={(e) => handleNameChange(idx, e.target.value)}
                            placeholder={`Player Name`}
                        />
                    </div>
                ))}
            </div>

            <button 
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-500 disabled:opacity-50"
            >
                {isCreating ? 'Setting up V2 Season...' : '🚀 Start Tournament'}
            </button>
        </div>
      </div>
    </div>
  );
}