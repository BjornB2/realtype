export type WordResult = { typed: string; target: string };
export type TestStatus = 'idle' | 'running' | 'finished';
export type SpeedRank = 'calm' | 'average' | 'fluent' | 'fast' | 'veryFast' | 'extreme';

export function getSpeedRank(wpm: number): SpeedRank {
  if (wpm < 20) return 'calm';
  if (wpm < 35) return 'average';
  if (wpm < 50) return 'fluent';
  if (wpm < 70) return 'fast';
  if (wpm < 90) return 'veryFast';
  return 'extreme';
}
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
const MAX_RESYNC_SHIFT = 2;

export function alignWord(typed: string, target: string, finalized = false) {
  typed = typed.match(/^\S*/)?.[0] ?? '';
  target = target.match(/^\S*/)?.[0] ?? '';
  let comparedTarget = target;
  if (!finalized) {
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestLength = 0;
    for (let length = 0; length <= target.length; length++) {
      const distance = editDistance(typed, target.slice(0, length), MAX_RESYNC_SHIFT);
      if (distance < bestDistance || (distance === bestDistance && length > bestLength)) {
        bestDistance = distance;
        bestLength = length;
      }
    }
    comparedTarget = target.slice(0, bestLength);
  }
  const rows = typed.length + 1;
  const cols = comparedTarget.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(Number.POSITIVE_INFINITY));
  for (let i = 0; i < rows && i <= MAX_RESYNC_SHIFT; i++) dp[i][0] = i;
  for (let j = 0; j < cols && j <= MAX_RESYNC_SHIFT; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) for (let j = 1; j < cols; j++) {
    if (Math.abs(i - j) > MAX_RESYNC_SHIFT) continue;
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (typed[i - 1] === comparedTarget[j - 1] ? 0 : 1));
  }
  if (!Number.isFinite(dp[typed.length][comparedTarget.length])) return positionalAlignment(typed, target, finalized);
  const states: LetterState[] = Array(target.length).fill('');
  const displayChars = [...target];
  const extrasByPosition: string[] = Array.from({ length: target.length + 1 }, () => '');
  let correct = 0;
  let extras = 0;
  const extraPositions: number[] = [];
  let i = typed.length;
  let j = comparedTarget.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (typed[i - 1] === comparedTarget[j - 1] ? 0 : 1)) {
      states[j - 1] = typed[i - 1] === comparedTarget[j - 1] ? 'correct' : 'incorrect';
      displayChars[j - 1] = typed[i - 1];
      if (states[j - 1] === 'correct') correct++;
      i--; j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      states[j - 1] = 'missing';
      j--;
    } else {
      extras++;
      extraPositions.push(j);
      extrasByPosition[j] = typed[i - 1] + extrasByPosition[j];
      i--;
    }
  }
  if (finalized) for (let p = comparedTarget.length; p < target.length; p++) states[p] = 'missing';
  return { states, displayChars, correct, extras, extrasByPosition, extraPositions, cursor: comparedTarget.length, errors: dp[typed.length][comparedTarget.length] + (finalized ? target.length - comparedTarget.length : 0) };
}

function editDistance(a: string, b: string, maxShift: number) {
  if (Math.abs(a.length - b.length) > maxShift) return Number.POSITIVE_INFINITY;
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(Number.POSITIVE_INFINITY));
  for (let i = 0; i <= Math.min(a.length, maxShift); i++) dp[i][0] = i;
  for (let j = 0; j <= Math.min(b.length, maxShift); j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    if (Math.abs(i - j) > maxShift) continue;
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return dp[a.length][b.length];
}

function positionalAlignment(typed: string, target: string, finalized: boolean) {
  const states: LetterState[] = target.split('').map((letter, index) => {
    if (typed[index] == null) return finalized ? 'missing' : '';
    return typed[index] === letter ? 'correct' : 'incorrect';
  });
  const displayChars = target.split('').map((letter, index) => typed[index] ?? letter);
  const overflow = typed.slice(target.length);
  const extrasByPosition = Array.from({ length: target.length + 1 }, () => '');
  extrasByPosition[target.length] = overflow;
  const correct = states.filter(state => state === 'correct').length;
  const missing = states.filter(state => state === 'missing').length;
  return { states, displayChars, correct, extras: overflow.length, extrasByPosition, extraPositions: Array(overflow.length).fill(target.length), cursor: Math.min(typed.length, target.length), errors: typed.length - correct + missing };
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
