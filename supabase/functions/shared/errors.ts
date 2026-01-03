export class BadInputError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "BadInputError";
  }
}

export class ParseError extends Error {
  readonly status = 422;
  constructor(
    message: string,
    public readonly line?: number,
    public readonly raw?: string
  ) {
    super(message);
    this.name = "ParseError";
  }
}

export class UpstreamFailError extends Error {
  readonly status = 500;
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "UpstreamFailError";
  }
}
