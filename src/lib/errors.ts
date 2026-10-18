/** An error whose message is safe and meant to be shown to the person (it is translated with t()). */
export class UserError extends Error {
  /** Values for {placeholders} in the message, filled in after translating it. */
  constructor(
    message: string,
    readonly params?: Record<string, string | number>,
  ) {
    super(message);
  }
}

/** The message to show for any caught error: user-facing ones as-is, everything else generic (and logged). */
export function publicMessage(e: unknown, fallback = "Something went wrong. Please try again.") {
  if (e instanceof UserError) return e.message;
  console.error(e);
  return fallback;
}
