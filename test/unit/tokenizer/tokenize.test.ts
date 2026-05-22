import { describe, it, expect } from 'vitest';
import { tokenize } from '../../../src/tokenizer/tokenize.js';

describe('tokenize', () => {
  it('returns "empty" for an empty string', () => {
    expect(tokenize('')).toEqual({ kind: 'empty' });
  });

  it('returns "empty" for whitespace-only input', () => {
    expect(tokenize('   \t  ')).toEqual({ kind: 'empty' });
  });

  it('splits a basic 5-field expression and tracks positions', () => {
    const r = tokenize('* * * * *');
    expect(r.kind).toBe('fields');
    if (r.kind !== 'fields') throw new Error('unreachable');
    expect(r.fields).toHaveLength(5);
    expect(r.fields[0]).toEqual({ lexeme: '*', position: { start: 0, end: 1 } });
    expect(r.fields[4]).toEqual({ lexeme: '*', position: { start: 8, end: 9 } });
  });

  it('collapses multiple internal whitespace characters', () => {
    const r = tokenize('  *   *  *  *  *  ');
    expect(r.kind).toBe('fields');
    if (r.kind !== 'fields') throw new Error('unreachable');
    expect(r.fields.map((f) => f.lexeme)).toEqual(['*', '*', '*', '*', '*']);
  });

  it('treats tabs and newlines as whitespace', () => {
    const r = tokenize('*\t*\n*\r*\t*');
    expect(r.kind).toBe('fields');
    if (r.kind !== 'fields') throw new Error('unreachable');
    expect(r.fields).toHaveLength(5);
  });

  it('recognises a macro', () => {
    const r = tokenize('@daily');
    expect(r.kind).toBe('macro');
    if (r.kind !== 'macro') throw new Error('unreachable');
    expect(r.macro).toBe('@daily');
    expect(r.fields).toHaveLength(0);
  });

  it('flags an unknown macro', () => {
    const r = tokenize('@foo');
    expect(r.kind).toBe('unknown-macro');
    if (r.kind !== 'unknown-macro') throw new Error('unreachable');
    expect(r.lexeme).toBe('@foo');
  });

  it('preserves Quartz field syntax in lexemes', () => {
    const r = tokenize('0 0 12 ? * MON-FRI');
    expect(r.kind).toBe('fields');
    if (r.kind !== 'fields') throw new Error('unreachable');
    expect(r.fields.map((f) => f.lexeme)).toEqual(['0', '0', '12', '?', '*', 'MON-FRI']);
  });
});
