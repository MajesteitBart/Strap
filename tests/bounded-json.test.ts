import test from "node:test";
import assert from "node:assert/strict";
import { JsonBodyLimitError, readBoundedJson } from "../lib/bounded-json.ts";

test("JSON request limits count streamed bytes and cancel oversized bodies regardless of headers", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"a":"'));
      controller.enqueue(new Uint8Array(40));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("http://localhost", {
    method: "POST",
    body: stream,
    headers: { "Content-Length": "1" },
    duplex: "half",
  } as RequestInit);
  await assert.rejects(readBoundedJson(request, 20), JsonBodyLimitError);
  assert.equal(cancelled, true);
});

test("bounded JSON preserves MCP batches and rejects missing or malformed input", async () => {
  assert.deepEqual(
    await readBoundedJson(
      new Request("http://localhost", { method: "POST", body: '[{"id":1}]' }),
      100,
    ),
    [{ id: 1 }],
  );
  await assert.rejects(
    readBoundedJson(new Request("http://localhost"), 100),
    SyntaxError,
  );
  await assert.rejects(
    readBoundedJson(
      new Request("http://localhost", { method: "POST", body: "{" }),
      100,
    ),
    SyntaxError,
  );
});
