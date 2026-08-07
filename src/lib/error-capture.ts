// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

// Client disconnects (navigation away, closed tab) surface as AbortError from the
// HTTP adapter. They are not application errors, so never record/report them.
function isAbort(error: unknown) {
  const name = (error as any)?.name;
  const code = (error as any)?.code;
  const msg = String((error as any)?.message ?? "").trim();
  return (
    name === "AbortError" ||
    code === "ECONNRESET" ||
    code === "ERR_STREAM_PREMATURE_CLOSE" ||
    /^aborted$/i.test(msg) ||
    /operation was aborted|aborted without reason|socket hang up|premature close/i.test(msg)
  );
}


function record(error: unknown) {
  if (isAbort(error)) return;
  lastCapturedError = { error, at: Date.now() };
}


if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
