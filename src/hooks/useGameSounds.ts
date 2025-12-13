'use client';
import useSound from 'use-sound';

export const useGameSounds = () => {
  // Ensure you have these files in public/sounds/ or the hook will just fail silently (safe)
  const [playClick] = useSound('/sounds/click.mp3', { volume: 0.5 });
  const [playWicket] = useSound('/sounds/wicket.mp3', { volume: 0.6 });
  const [playWin] = useSound('/sounds/win.mp3', { volume: 0.8 });

  return { playClick, playWicket, playWin };
};