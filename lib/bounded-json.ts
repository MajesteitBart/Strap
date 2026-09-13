export class JsonBodyLimitError extends Error {
  constructor() {
    super("The JSON request body is too large.");
  }
}

/** Bound streamed requests even when Content-Length is absent or inaccurate. */
export async function readBoundedJson(
  request: Request,
  limit: number,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("A JSON body is required.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new JsonBodyLimitError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
