import type { MacroName, SourcePosition } from '../ast/dialect.js';
import { isRecognisedMacro } from '../parser/macros.js';

export interface RawFieldToken {
  readonly lexeme: string;
  readonly position: SourcePosition;
}

export type TokenizeResult =
  | {
      readonly kind: 'macro';
      readonly macro: MacroName;
      readonly position: SourcePosition;
      readonly fields: ReadonlyArray<RawFieldToken>;
    }
  | {
      readonly kind: 'unknown-macro';
      readonly lexeme: string;
      readonly position: SourcePosition;
    }
  | { readonly kind: 'fields'; readonly fields: ReadonlyArray<RawFieldToken> }
  | { readonly kind: 'empty' };

export function tokenize(source: string): TokenizeResult {
  if (source.length === 0 || /^\s*$/u.test(source)) return { kind: 'empty' };

  const tokens: RawFieldToken[] = [];
  let i = 0;
  while (i < source.length) {
    while (i < source.length && isWhitespace(source.charCodeAt(i))) i++;
    if (i >= source.length) break;
    const start = i;
    while (i < source.length && !isWhitespace(source.charCodeAt(i))) i++;
    tokens.push({ lexeme: source.slice(start, i), position: { start, end: i } });
  }

  const first = tokens[0];
  if (first !== undefined && first.lexeme.startsWith('@')) {
    if (isRecognisedMacro(first.lexeme)) {
      return {
        kind: 'macro',
        macro: first.lexeme,
        position: first.position,
        fields: tokens.slice(1),
      };
    }
    return { kind: 'unknown-macro', lexeme: first.lexeme, position: first.position };
  }

  return { kind: 'fields', fields: tokens };
}

function isWhitespace(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}
