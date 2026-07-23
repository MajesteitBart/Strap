#!/usr/bin/env node
import { run } from "./app.js";
import { CliError, errorMessage } from "./errors.js";

process.on("unhandledRejection", (error) => {
  process.stderr.write(`${errorMessage(error)}\n`);
  process.exitCode = 1;
});

try {
  await run(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${errorMessage(error)}\n`);
  process.exitCode = error instanceof CliError ? error.exitCode : 1;
}
