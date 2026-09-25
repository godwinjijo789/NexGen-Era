import { useCallback } from 'react';
import { Sound } from '../services/sound';

export function useSound() {
  const playClick = useCallback(() => {
    Sound.playClick();
  }, []);

  const playSuccess = useCallback(() => {
    Sound.playSuccess();
  }, []);

  const playError = useCallback(() => {
    Sound.playError();
  }, []);

  const playVictory = useCallback(() => {
    Sound.playVictory();
  }, []);

  return {
    playClick,
    playSuccess,
    playError,
    playVictory
  };
}
