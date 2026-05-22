import { describe, it, expect } from 'vitest';
import { interpolate } from '../../../src/describer/render/interpolate.js';
import { ordinalSuffix, nthLabel } from '../../../src/describer/render/ordinals.js';
import { enLocale } from '../../../src/describer/locales/en.js';
import { frLocale } from '../../../src/describer/locales/fr.js';

describe('interpolate', () => {
  it('replaces a single placeholder', () => {
    expect(interpolate('hello {{name}}', { name: 'world' })).toBe('hello world');
  });

  it('replaces multiple placeholders', () => {
    expect(interpolate('{{a}}-{{b}}', { a: '1', b: '2' })).toBe('1-2');
  });

  it('leaves unresolved placeholders intact', () => {
    expect(interpolate('hi {{nope}}', {})).toBe('hi {{nope}}');
  });
});

describe('ordinalSuffix', () => {
  it('returns "st" for 1 in English', () => {
    expect(ordinalSuffix(1, enLocale)).toBe('st');
  });

  it('returns "nd" for 22 in English', () => {
    expect(ordinalSuffix(22, enLocale)).toBe('nd');
  });

  it('returns "th" for 7 in English (default)', () => {
    expect(ordinalSuffix(7, enLocale)).toBe('th');
  });

  it('returns "er" for 1 in French', () => {
    expect(ordinalSuffix(1, frLocale)).toBe('er');
  });

  it('returns empty default for 7 in French', () => {
    expect(ordinalSuffix(7, frLocale)).toBe('');
  });
});

describe('nthLabel', () => {
  it('returns "1st" for n=1 in English', () => {
    expect(nthLabel(1, enLocale)).toBe('1st');
  });

  it('returns "5th" for n=5 in English', () => {
    expect(nthLabel(5, enLocale)).toBe('5th');
  });

  it('returns "1er" for n=1 in French', () => {
    expect(nthLabel(1, frLocale)).toBe('1er');
  });
});
