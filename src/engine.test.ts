import { describe, expect, it } from 'vitest';
import { alignWord, createEngine, finishEngine, getSpeedRank, getStats, typeKey } from './engine';
import { makeWords } from './content';

const type = (keys: string[], words = ['hello', 'world']) => keys.reduce((state, key, i) => typeKey(state, key, 1000 + i * 100), createEngine(words));

describe('typing engine', () => {
  it('classifies typing speed from calm to extreme', () => {
    expect(getSpeedRank(19)).toBe('calm');
    expect(getSpeedRank(35)).toBe('fluent');
    expect(getSpeedRank(70)).toBe('veryFast');
    expect(getSpeedRank(90)).toBe('extreme');
  });
  it('can produce different text selections', () => {
    const early = makeWords('nl', 20, () => 0.05).join(' ');
    const late = makeWords('nl', 20, () => 0.95).join(' ');
    expect(early).not.toBe(late);
  });

  it('always starts at the beginning of a sentence', () => {
    for (const random of [0.01, 0.25, 0.55, 0.99]) {
      expect(makeWords('nl', 20, () => random)[0]).toMatch(/^[A-ZÀ-Ý]/);
      expect(makeWords('en', 20, () => random)[0]).toMatch(/^[A-Z]/);
    }
  });

  it('does not include accented or non-ASCII characters in test text', () => {
    const isPlainAscii = (text: string) => [...text].every(character => character.charCodeAt(0) <= 127);
    expect(isPlainAscii(makeWords('nl', 500, () => 0.4).join(' '))).toBe(true);
    expect(isPlainAscii(makeWords('en', 500, () => 0.4).join(' '))).toBe(true);
  });

  it('realigns after a skipped letter', () => {
    const alignment = alignWord('helo', 'hello');
    expect(alignment.states).toEqual(['correct', 'correct', 'missing', 'correct', 'correct']);
    expect(alignment.displayChars).toEqual(['h', 'e', 'l', 'l', 'o']);
  });

  it('realigns after an extra letter', () => {
    const alignment = alignWord('helllo', 'hello');
    expect(alignment.states).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    expect(alignment.extras).toBe(1);
  });

  it('reports where an extra letter was inserted', () => {
    expect(alignWord('rtafels', 'tafels').extraPositions).toEqual([0]);
    expect(alignWord('rtafels', 'tafels').extrasByPosition[0]).toBe('r');
    expect(alignWord('taffels', 'tafels').extraPositions).toEqual([2]);
  });

  it('shows the typed character for a replacement', () => {
    const alignment = alignWord('taxels', 'tafels');
    expect(alignment.states[2]).toBe('incorrect');
    expect(alignment.displayChars[2]).toBe('x');
  });

  it('does not resync beyond two positions', () => {
    const alignment = alignWord('tafrjkels', 'tafels');
    expect(alignment.extrasByPosition[3]).toBe('');
    expect(alignment.states.slice(3)).toContain('incorrect');
  });

  it('never aligns characters across whitespace', () => {
    const alignment = alignWord('helo world', 'hello');
    expect(alignment.states).toEqual(['correct', 'correct', 'missing', 'correct', 'correct']);
    expect(alignment.extrasByPosition.every(extra => extra === '')).toBe(true);
  });

  it('still resyncs up to two extra letters', () => {
    expect(alignWord('tafrjels', 'tafels').extrasByPosition[3]).toBe('rj');
  });

  it('starts only on a printable key', () => {
    expect(typeKey(createEngine(['hello']), 'Backspace', 1000).status).toBe('idle');
    expect(typeKey(createEngine(['hello']), 'h', 1000).startedAt).toBe(1000);
  });

  it('keeps a word editable after space', () => {
    const state = type(['h','e','l','o',' ','Backspace','Backspace','l','o']);
    expect(state.index).toBe(0);
    expect(state.current).toBe('hello');
    expect(state.results).toHaveLength(0);
    expect(state.pendingSpace).toBe(false);
  });

  it('commits the previous word on the first character of the next word', () => {
    const state = type(['h','e','l','l','o',' ','w']);
    expect(state.results).toEqual([{ typed: 'hello', target: 'hello' }]);
    expect(state.index).toBe(1);
    expect(state.current).toBe('w');
  });

  it('can cross at most one word boundary per keystroke', () => {
    let state = createEngine(['one', 'two', 'three', 'four']);
    for (const key of ['x', ' ', 'y', 'z', ' ', 'q', ' ', 'r']) {
      const previousIndex = state.index;
      state = typeKey(state, key, 1000);
      expect(state.index - previousIndex).toBeLessThanOrEqual(1);
    }
  });

  it('keeps every typed word paired with exactly one target word', () => {
    const state = type(['a', ' ', 'b', ' ', 'c'], ['alpha', 'beta', 'gamma']);
    expect(state.results).toEqual([
      { typed: 'a', target: 'alpha' },
      { typed: 'b', target: 'beta' },
    ]);
    expect(state.index).toBe(2);
    expect(state.current).toBe('c');
  });

  it('does not move backwards after the next word has started', () => {
    const state = type(['h','i',' ','w','Backspace']);
    expect(state.results[0]).toEqual({ typed: 'hi', target: 'hello' });
    expect(state.index).toBe(1);
    expect(state.current).toBe('');
  });

  it('ignores repeated and leading spaces', () => {
    const state = type([' ','h','i',' ',' ']);
    expect(state.keystrokes).toBe(3);
    expect(state.pendingSpace).toBe(true);
  });

  it('finishes a word-count test when the final word is submitted', () => {
    const state = type(['o','k',' '], ['ok']);
    expect(state.status).toBe('finished');
    expect(state.results).toEqual([{ typed: 'ok', target: 'ok' }]);
  });

  it('assesses the current word when time expires', () => {
    const state = finishEngine(type(['h','e','l']), 61000);
    const stats = getStats(state, 61000);
    expect(state.results).toHaveLength(1);
    expect(stats.accuracy).toBe(60);
    expect(stats.wpm).toBe(1);
  });
});
