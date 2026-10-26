import { useEffect, useRef } from "react";
import { useFocusStore } from "@/store/focus";
import { useFocusSettingsStore } from "@/store/focus-settings";
import { phaseEndsAt } from "./focus-timer";
import { type NoiseSound, startNoiseSound } from "./noise-sound";

// Only the tab that holds this lock plays, so two open tabs do not double
// the noise. When that tab closes, the next one takes over.
const NOISE_LOCK = "kaneo-focus-noise";

// Plays the chosen noise while focus time runs, overtime included. It stops
// on pause, during breaks, and at the end of a phase that moves on by itself.
export function useNoiseSound() {
  const noise = useFocusSettingsStore((state) => state.settings.noise);
  const volume = useFocusSettingsStore((state) => state.settings.noiseVolume);
  const focusRuns = useFocusStore(
    (state) =>
      state.session?.phase === "focus" && state.session.runningSince !== null,
  );
  const autoStartNext = useFocusSettingsStore(
    (state) => state.settings.autoStartNext,
  );
  // A Pomodoro focus phase runs into overtime instead of ending, so the
  // noise plays on through it.
  const endsAt = useFocusStore((state) =>
    state.session && !(state.session.mode === "pomodoro" && !autoStartNext)
      ? phaseEndsAt(state.session)
      : null,
  );
  const sound = useRef<NoiseSound | null>(null);
  const volumeNow = useRef(volume);
  volumeNow.current = volume;

  useEffect(() => {
    if (noise === "off" || !focusRuns) return;
    // A phase that ended while the page slept leaves the noise off until
    // the store moves on.
    if (endsAt !== null && endsAt <= Date.now()) return;

    const done = new AbortController();
    const play = () => {
      // Chrome can grant a request after its signal aborted, for example
      // after React's double effect run in development. Release it at once.
      if (done.signal.aborted) return;
      sound.current = startNoiseSound(noise, volumeNow.current, endsAt);
      return new Promise<void>((resolve) => {
        done.signal.addEventListener("abort", () => resolve());
      });
    };
    if (navigator.locks) {
      // Aborting while this tab waits rejects the request; nothing to do.
      navigator.locks
        .request(NOISE_LOCK, { signal: done.signal }, play)
        .catch(() => {});
    } else {
      void play();
    }

    return () => {
      done.abort();
      sound.current?.stop();
      sound.current = null;
    };
  }, [noise, focusRuns, endsAt]);

  useEffect(() => {
    sound.current?.setVolume(volume);
  }, [volume]);
}
