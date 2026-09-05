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

export type LetterState = 'correct' | 'incorrect' | 'missing' | '';

export function alignWord(typed: string, target: string, finalized = false) {
  let comparedTarget = target;
  if (!finalized) {
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestLength = 0;
    for (let length = 0; length <= target.length; length++) {
      const distance = editDistance(typed, target.slice(0, length));
      if (distance < bestDistance || (distance === bestDistance && length > bestLength)) {
        bestDistance = distance;
        bestLength = length;
      }
    }
    comparedTarget = target.slice(0, bestLength);
  }
  const rows = typed.length + 1;
  const cols = comparedTarget.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) for (let j = 1; j < cols; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (typed[i - 1] === comparedTarget[j - 1] ? 0 : 1));
  }
  const states: LetterState[] = Array(target.length).fill('');
  let correct = 0;
  let extras = 0;
  let i = typed.length;
  let j = comparedTarget.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (typed[i - 1] === comparedTarget[j - 1] ? 0 : 1)) {
      states[j - 1] = typed[i - 1] === comparedTarget[j - 1] ? 'correct' : 'incorrect';
      if (states[j - 1] === 'correct') correct++;
      i--; j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      states[j - 1] = 'missing';
      j--;
    } else {
      extras++;
      i--;
    }
  }
  if (finalized) for (let p = comparedTarget.length; p < target.length; p++) states[p] = 'missing';
  return { states, correct, extras, cursor: comparedTarget.length, errors: dp[typed.length][comparedTarget.length] + (finalized ? target.length - comparedTarget.length : 0) };
}

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[b.length];
}

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
    correctChars += alignWord(typed, target, Boolean(state.results[i])).correct;
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
