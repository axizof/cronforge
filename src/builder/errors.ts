import type { FieldName } from '../ast/dialect.js';

/** Structured error returned by `buildResult()`. */
export interface BuildError {
  readonly code: string;
  readonly message: string;
  readonly field?: FieldName;
}

export function makeBuildError(args: BuildError): BuildError {
  const value: BuildError =
    args.field !== undefined
      ? { code: args.code, message: args.message, field: args.field }
      : { code: args.code, message: args.message };
  return Object.freeze(value);
}
