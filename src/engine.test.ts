import { describe, expect, it } from 'vitest';
import { alignWord, createEngine, finishEngine, getStats, typeKey } from './engine';

const type = (keys: string[], words = ['hello', 'world']) => keys.reduce((state, key, i) => typeKey(state, key, 1000 + i * 100), createEngine(words));

describe('typing engine', () => {
  it('realigns after a skipped letter', () => {
    expect(alignWord('helo', 'hello').states).toEqual(['correct', 'correct', 'missing', 'correct', 'correct']);
  });

  it('realigns after an extra letter', () => {
    const alignment = alignWord('helllo', 'hello');
    expect(alignment.states).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    expect(alignment.extras).toBe(1);
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
