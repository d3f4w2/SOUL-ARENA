declare module "node:sqlite" {
  export type RunResult = {
    changes?: number | bigint;
    lastInsertRowid?: number | bigint;
  };

  export class StatementSync<
    Row extends Record<string, unknown> = Record<string, unknown>,
  > {
    all(...params: unknown[]): Row[];
    get(...params: unknown[]): Row | undefined;
    run(...params: unknown[]): RunResult;
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare<Row extends Record<string, unknown> = Record<string, unknown>>(
      sql: string,
    ): StatementSync<Row>;
  }
}
