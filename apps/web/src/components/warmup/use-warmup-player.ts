import { useCallback, useEffect, useRef, useState } from "react";
import { useWarmupSettingsStore } from "@/store/warmup-settings";
import {
  startWarmup,
  type WarmupPlayer,
  type WarmupPosition,
} from "./warmup-player";
import { WARMUP_VOWELS } from "./warmup-plan";

export function useWarmupPlayer() {
  const settings = useWarmupSettingsStore((state) => state.settings);
  const player = useRef<WarmupPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState<WarmupPosition | null>(null);

  const stop = useCallback(() => {
    player.current?.stop();
    player.current = null;
    setPlaying(false);
    setPosition(null);
  }, []);

  const start = useCallback(
    (fromVowel = 0) => {
      player.current?.stop();
      player.current = startWarmup(settings, fromVowel, {
        onPosition: setPosition,
        onEnd: () => {
          player.current = null;
          setPlaying(false);
          setPosition(null);
        },
      });
      setPlaying(player.current !== null);
    },
    [settings],
  );

  const nextVowel = useCallback(() => {
    const vowels = WARMUP_VOWELS.filter((vowel) =>
      settings.vowels.includes(vowel),
    );
    const current = player.current?.vowel();
    const next = current ? vowels.indexOf(current) + 1 : 0;
    if (next < vowels.length) start(next);
    else stop();
  }, [settings, start, stop]);

  // Changing a setting mid-play adjusts the rounds still to come.
  useEffect(() => {
    player.current?.adjust(settings);
  }, [settings]);

  useEffect(() => () => player.current?.stop(), []);

  // Keep the screen on while singing, as the focus timer does.
  useEffect(() => {
    if (!playing || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock
      .request("screen")
      .then((sentinel) => {
        lock = sentinel;
      })
      .catch(() => {});
    return () => {
      void lock?.release();
    };
  }, [playing]);

  return { playing, position, start, stop, nextVowel };
}
