import type { MacroName, SourcePosition } from '../ast/dialect.js';
import { isRecognisedMacro } from '../parser/macros.js';

/**
 * One whitespace-delimited token from a cron source string, with the
 * character offsets of the lexeme in the original input.
 */
export interface RawFieldToken {
  readonly lexeme: string;
  readonly position: SourcePosition;
}

/**
 * Tokenizer output. Either a macro (`@daily`, etc.) was recognised - in
 * which case `macro` is set and `fields` is empty - or whitespace-delimited
 * fields are returned.
 */
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
  | {
      readonly kind: 'fields';
      readonly fields: ReadonlyArray<RawFieldToken>;
    }
  | {
      readonly kind: 'empty';
    };

/**
 * Tokenize a raw cron source string into whitespace-delimited field tokens
 * (or a macro). Pure: never throws, never allocates outside its result.
 *
 * Behaviour (per spec Edge Cases):
 *   - Leading / trailing whitespace ignored.
 *   - Multiple internal whitespace characters collapse to a single delimiter.
 *   - An input starting with `@` is treated as a macro lexeme; if recognised,
 *     emitted as `{ kind: 'macro' }`; otherwise as `{ kind: 'unknown-macro' }`.
 *   - Empty / whitespace-only input yields `{ kind: 'empty' }`.
 *
 * @example
 * ```ts
 * tokenize('  *   *  *  *  *  ');
 * // -> { kind: 'fields', fields: [
 * //     { lexeme: '*', position: { start: 2,  end: 3  } },
 * //     { lexeme: '*', position: { start: 6,  end: 7  } },
 * //     { lexeme: '*', position: { start: 9,  end: 10 } },
 * //     { lexeme: '*', position: { start: 12, end: 13 } },
 * //     { lexeme: '*', position: { start: 15, end: 16 } },
 * //   ] }
 * ```
 */
export function tokenize(source: string): TokenizeResult {
  if (source.length === 0 || /^\s*$/u.test(source)) {
    return { kind: 'empty' };
  }

  const tokens: RawFieldToken[] = [];
  let i = 0;
  while (i < source.length) {
    while (i < source.length && isWhitespace(source.charCodeAt(i))) i++;
    if (i >= source.length) break;
    const start = i;
    while (i < source.length && !isWhitespace(source.charCodeAt(i))) i++;
    tokens.push({
      lexeme: source.slice(start, i),
      position: { start, end: i },
    });
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
    return {
      kind: 'unknown-macro',
      lexeme: first.lexeme,
      position: first.position,
    };
  }

  return { kind: 'fields', fields: tokens };
}

function isWhitespace(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}
