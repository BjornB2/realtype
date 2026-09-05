export type WordResult = { typed: string; target: string };
export type TestStatus = 'idle' | 'running' | 'finished';
export type EngineState = {
  words: string[];
  index: number;
  current: string;
  pendingSpace: boolean;
  results: WordResult[];
  keystrokes: number;
  startedAt: number | null;
  finishedAt: number | null;
  status: TestStatus;
};

export function createEngine(words: string[]): EngineState {
  return { words, index: 0, current: '', pendingSpace: false, results: [], keystrokes: 0, startedAt: null, finishedAt: null, status: 'idle' };
}

const begin = (state: EngineState, now: number) => state.status === 'idle' ? { ...state, status: 'running' as const, startedAt: now } : state;

export function typeKey(previous: EngineState, key: string, now = Date.now()): EngineState {
  if (previous.status === 'finished' || previous.words.length === 0) return previous;
  if (key === 'Backspace') {
    if (previous.pendingSpace) return { ...previous, pendingSpace: false };
    return { ...previous, current: previous.current.slice(0, -1) };
  }
  if (key === ' ') {
    if (!previous.current || previous.pendingSpace) return previous;
    const state = begin(previous, now);
    if (state.index === state.words.length - 1) {
      return finishEngine({ ...state, keystrokes: state.keystrokes + 1 }, now);
    }
    return { ...state, pendingSpace: true, keystrokes: state.keystrokes + 1 };
  }
  if (key.length !== 1 || key === '\n' || key === '\t') return previous;
  let state = begin(previous, now);
  if (state.pendingSpace) {
    const result = { typed: state.current, target: state.words[state.index] };
    state = { ...state, index: state.index + 1, current: '', pendingSpace: false, results: [...state.results, result] };
  }
  return { ...state, current: state.current + key, keystrokes: state.keystrokes + 1 };
}

export function finishEngine(previous: EngineState, now = Date.now()): EngineState {
  if (previous.status === 'finished') return previous;
  const results = previous.current
    ? [...previous.results, { typed: previous.current, target: previous.words[previous.index] }]
    : previous.results;
  return { ...previous, results, status: 'finished', finishedAt: now, pendingSpace: false };
}

export function getStats(state: EngineState, now = Date.now()) {
  const end = state.finishedAt ?? now;
  const elapsedMs = state.startedAt ? Math.max(end - state.startedAt, 1) : 0;
  const observed = state.status === 'finished' || !state.current
    ? state.results
    : [...state.results, { typed: state.current, target: state.words[state.index] }];
  let correctChars = 0;
  let assessedChars = 0;
  let correctWords = 0;
  observed.forEach(({ typed, target }, i) => {
    for (let p = 0; p < typed.length; p++) if (typed[p] === target[p]) correctChars++;
    assessedChars += state.results[i] ? Math.max(typed.length, target.length) : typed.length;
    if (typed === target && state.results[i]) correctWords++;
  });
  const minutes = elapsedMs / 60000;
  return {
    elapsedMs,
    cpm: minutes ? Math.round(state.keystrokes / minutes) : 0,
    wpm: minutes ? Math.round((correctChars / 5) / minutes) : 0,
    accuracy: assessedChars ? Math.round((correctChars / assessedChars) * 100) : 100,
    correctWords,
    incorrectWords: state.results.length - correctWords,
  };
}
