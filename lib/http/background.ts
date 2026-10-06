import { log } from "@/lib/observability";
import { AsyncLocalStorage } from "node:async_hooks";
import "server-only";

// Work that should finish after the response is sent, such as auth emails
// whose timing must not reveal whether an account exists. On Netlify the
// function wrapper passes the platform's waitUntil so the task survives the
// response; a long-running Node server simply keeps the promise alive.
type BackgroundScope = { waitUntil?: (promise: Promise<unknown>) => void };

const scope = new AsyncLocalStorage<BackgroundScope>();

export function withBackgroundScope<T>(waitUntil: BackgroundScope["waitUntil"], run: () => T): T {
  return scope.run({ waitUntil }, run);
}

export function runAfterResponse(task: () => Promise<unknown>) {
  const promise = Promise.resolve()
    .then(task)
    .catch((error) => log.error("background_task_failed", {}, error));
  scope.getStore()?.waitUntil?.(promise);
}
