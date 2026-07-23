import assert from "node:assert/strict";
import test from "node:test";
import { parseGlobalOptions, validateServerUrl } from "../src/commands/options.js";

test("parses global options without leaking them into MCP tool arguments", () => {
  assert.deepEqual(
    parseGlobalOptions([
      "--agent=codex",
      "call",
      "read_creed",
      "--server",
      "https://strap.bvdm.ai/mcp",
      "--json",
    ]),
    {
      agent: "codex",
      server: "https://strap.bvdm.ai/mcp",
      json: true,
      quiet: false,
      args: ["call", "read_creed"],
    },
  );
});

test("rejects missing and unsupported agent attribution values", () => {
  assert.throws(() => parseGlobalOptions(["--agent"]), /requires a value/);
  assert.throws(
    () => parseGlobalOptions(["--agent", "call", "read_creed"]),
    /Unsupported --agent ID: call/,
  );
});

test("requires HTTPS except on explicit loopback servers", () => {
  assert.equal(validateServerUrl("https://strap.bvdm.ai/mcp"), "https://strap.bvdm.ai/mcp");
  assert.equal(validateServerUrl("http://127.0.0.1:3000/mcp"), "http://127.0.0.1:3000/mcp");
  assert.equal(validateServerUrl("http://[::1]:3000/mcp"), "http://[::1]:3000/mcp");
  assert.throws(() => validateServerUrl("http://example.com/mcp"), /requires HTTPS/);
  assert.throws(() => validateServerUrl("not a URL"), /Invalid Strap MCP URL/);
});
