import { useCallback, useState } from 'react';

const LIMIT = 200;

interface State<T> {
  past: T[];
  present: T;
  future: T[];
}

/** Undo/redo over immutable snapshots. `commit` is a no-op when the updater returns the same value. */
export function useHistory<T>(initial: T) {
  const [h, setH] = useState<State<T>>({ past: [], present: initial, future: [] });

  const commit = useCallback((update: (value: T) => T) => {
    setH((h) => {
      const next = update(h.present);
      return next === h.present ? h : { past: [...h.past, h.present].slice(-LIMIT), present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setH((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  }, []);

  const redo = useCallback(() => {
    setH((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
  }, []);

  const reset = useCallback((value: T) => setH({ past: [], present: value, future: [] }), []);

  return { value: h.present, canUndo: h.past.length > 0, canRedo: h.future.length > 0, commit, undo, redo, reset };
}
