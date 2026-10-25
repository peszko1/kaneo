export class KaneoApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "KaneoApiError";
  }

  static async fromResponse(response: Response) {
    let message = `Kaneo returned ${response.status}`;
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string" && body.message) {
        message = body.message;
      }
    } catch {
      // Not JSON; keep the status message.
    }
    return new KaneoApiError(message, response.status);
  }
}
