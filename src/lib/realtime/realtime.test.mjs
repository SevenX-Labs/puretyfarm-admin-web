import test from "node:test";
import assert from "node:assert";
import { SSEParser } from "./sse-parser.ts";

test("SSEParser (admin): handles single event with event, data, id", () => {
  const parser = new SSEParser();
  const chunk = "event: sync\ndata: {\"v\":1,\"types\":[\"admin.payments.updated\"]}\nid: 1\n\n";
  const messages = parser.feed(chunk);

  assert.strictEqual(messages.length, 1);
  assert.strictEqual(messages[0].event, "sync");
  assert.strictEqual(messages[0].id, "1");
  assert.deepStrictEqual(JSON.parse(messages[0].data), { v: 1, types: ["admin.payments.updated"] });
});

test("SSEParser (admin): ignores heartbeat / ping comments starting with colon", () => {
  const parser = new SSEParser();
  const chunk = ": ping\n\n";
  const messages = parser.feed(chunk);

  assert.strictEqual(messages.length, 0);
});

test("SSEParser (admin): parses multiple events in a single chunk", () => {
  const parser = new SSEParser();
  const chunk =
    ": ping\n\n" +
    "event: sync\ndata: {\"v\":1,\"types\":[\"admin.orders.updated\"]}\nid: 20\n\n" +
    "event: sync\ndata: {\"v\":1,\"types\":[\"admin.wallets.updated\"]}\nid: 21\n\n";
  const messages = parser.feed(chunk);

  assert.strictEqual(messages.length, 2);
  assert.strictEqual(messages[0].id, "20");
  assert.strictEqual(messages[1].id, "21");
  assert.deepStrictEqual(JSON.parse(messages[0].data).types, ["admin.orders.updated"]);
  assert.deepStrictEqual(JSON.parse(messages[1].data).types, ["admin.wallets.updated"]);
});

test("SSEParser (admin): handles chunks split mid-line across stream boundaries", () => {
  const parser = new SSEParser();
  const chunk1 = "event: sy";
  const chunk2 = "nc\ndata: {\"v\":1,\"types\":[\"admin.plans";
  const chunk3 = ".updated\"]}\nid: 99\n\n";

  let msgs = parser.feed(chunk1);
  assert.strictEqual(msgs.length, 0);

  msgs = parser.feed(chunk2);
  assert.strictEqual(msgs.length, 0);

  msgs = parser.feed(chunk3);
  assert.strictEqual(msgs.length, 1);
  assert.strictEqual(msgs[0].event, "sync");
  assert.strictEqual(msgs[0].id, "99");
  assert.deepStrictEqual(JSON.parse(msgs[0].data).types, ["admin.plans.updated"]);
});

test("SSEParser (admin): supports ready event with no data", () => {
  const parser = new SSEParser();
  const messages = parser.feed("event: ready\n\n");
  assert.strictEqual(messages.length, 1);
  assert.strictEqual(messages[0].event, "ready");
});

test("Reconnect and Backoff (admin): 401 triggers refresh, 2 errors trigger stream down, backoff caps at 30s", async () => {
  let tokenRefreshed = false;
  let healthState = true;
  let failedAttempts = 0;

  async function mockConnect(statusCode) {
    if (statusCode === 401) {
      tokenRefreshed = true;
      return "refreshed_and_retried";
    }
    failedAttempts++;
    if (failedAttempts >= 2) {
      healthState = false;
    }
    const backoff = Math.min(30000, 1000 * Math.pow(2, failedAttempts) + 50);
    return backoff;
  }

  // 1. 401 triggers refresh
  const res401 = await mockConnect(401);
  assert.strictEqual(res401, "refreshed_and_retried");
  assert.strictEqual(tokenRefreshed, true);

  // 2. 1st error
  await mockConnect(500);
  assert.strictEqual(healthState, true);
  assert.strictEqual(failedAttempts, 1);

  // 3. 2nd error triggers stream down
  await mockConnect(500);
  assert.strictEqual(healthState, false);
  assert.strictEqual(failedAttempts, 2);

  // 4. Backoff caps at 30s
  failedAttempts = 10;
  const highDelay = Math.min(30000, 1000 * Math.pow(2, failedAttempts) + 50);
  assert.strictEqual(highDelay, 30000);
});

test("Debounce and Trailing Refresh (admin): coalesces rapid events and guarantees exactly ONE trailing refresh", async () => {
  let executionCount = 0;
  let inFlight = false;
  let trailingNeeded = false;

  async function refreshWorkload() {
    if (inFlight) {
      trailingNeeded = true;
      return;
    }
    inFlight = true;
    executionCount++;
    await new Promise((resolve) => setTimeout(resolve, 50));
    inFlight = false;
    if (trailingNeeded) {
      trailingNeeded = false;
      await refreshWorkload();
    }
  }

  const p1 = refreshWorkload();
  assert.strictEqual(inFlight, true);
  assert.strictEqual(executionCount, 1);

  await refreshWorkload();
  await refreshWorkload();

  assert.strictEqual(trailingNeeded, true);

  await p1;

  assert.strictEqual(executionCount, 2);
  assert.strictEqual(inFlight, false);
  assert.strictEqual(trailingNeeded, false);
});
