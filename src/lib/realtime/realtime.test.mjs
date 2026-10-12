import test from "node:test";
import assert from "node:assert";
import { SSEParser } from "./sse-parser.ts";
import { RealtimeStreamClient } from "./realtime-stream-client.ts";
import { createSyncExecutor } from "./sync-executor.ts";

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

test("RealtimeStreamClient (admin production class): 401 refreshes token and reconnects, caps backoff at 30s", async () => {
  let token = "stale-admin-token";
  let refreshCalled = false;
  let fetchCallCount = 0;

  const mockFetch = async (url, init) => {
    fetchCallCount++;
    if (fetchCallCount === 1) {
      assert.strictEqual(init.headers.Authorization, "Bearer stale-admin-token");
      return {
        ok: false,
        status: 401,
      };
    }
    assert.strictEqual(init.headers.Authorization, "Bearer fresh-admin-token");
    return {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    };
  };

  const client = new RealtimeStreamClient({
    streamUrl: "http://localhost:3000/api/v1/admin/events/stream",
    getAccessToken: () => token,
    refreshAccessToken: async () => {
      refreshCalled = true;
      token = "fresh-admin-token";
      return "fresh-admin-token";
    },
    onEvents: () => {},
    fetchFn: mockFetch,
  });

  await client.connect();

  assert.strictEqual(refreshCalled, true);
  assert.strictEqual(fetchCallCount, 2);
  assert.strictEqual(client.getIsHealthy(), true);

  const backoffHigh = client.computeBackoff(12);
  assert.strictEqual(backoffHigh <= 30000, true);
  assert.strictEqual(backoffHigh >= 20000, true);

  client.disconnect();
  assert.strictEqual(client.getIsHealthy(), false);
});

test("RealtimeStreamClient (admin production class): marks stream down after 2 network failures", async () => {
  const mockFailFetch = async () => ({
    ok: false,
    status: 502,
  });

  const client = new RealtimeStreamClient({
    streamUrl: "http://localhost:3000/api/v1/admin/events/stream",
    getAccessToken: () => "valid-admin-token",
    refreshAccessToken: async () => null,
    onEvents: () => {},
    fetchFn: mockFailFetch,
  });

  await client.connect();
  assert.strictEqual(client.getFailedAttempts(), 1);
  assert.strictEqual(client.getIsHealthy(), false);

  await client.connect();
  assert.strictEqual(client.getFailedAttempts(), 2);
  assert.strictEqual(client.getIsHealthy(), false);

  client.disconnect();
});

test("RealtimeStreamClient (admin production class): streams SSE chunks into onEvents handler", async () => {
  const receivedEvents = [];
  const encoder = new TextEncoder();
  const chunks = [
    encoder.encode("event: ready\n\n"),
    encoder.encode(": ping\n\n"),
    encoder.encode("event: sync\ndata: {\"v\":1,\"types\":[\"admin.payments.updated\",\"admin.wallets.updated\"]}\nid: 5\n\n"),
  ];
  let chunkIdx = 0;

  const mockStreamFetch = async () => ({
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => {
          if (chunkIdx < chunks.length) {
            return { done: false, value: chunks[chunkIdx++] };
          }
          return { done: true, value: undefined };
        },
      }),
    },
  });

  let connectedCalled = false;
  const client = new RealtimeStreamClient({
    streamUrl: "http://localhost:3000/api/v1/admin/events/stream",
    getAccessToken: () => "valid-admin-token",
    refreshAccessToken: async () => null,
    createParser: () => new SSEParser(),
    onEvents: (types) => receivedEvents.push(...types),
    onConnected: () => { connectedCalled = true; },
    fetchFn: mockStreamFetch,
  });

  await client.connect();

  assert.strictEqual(connectedCalled, true);
  assert.deepStrictEqual(receivedEvents, ["admin.payments.updated", "admin.wallets.updated"]);
  assert.strictEqual(client.getIsHealthy(), true);

  client.disconnect();
});

test("createSyncExecutor (admin production class): coalesces rapid triggers and executes trailing refresh when in flight", async () => {
  let executionCount = 0;

  const executor = createSyncExecutor(async () => {
    executionCount++;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }, 20);

  const p1 = executor.executeRefresh();
  assert.strictEqual(executor.isInFlight(), true);
  assert.strictEqual(executionCount, 1);

  await executor.executeRefresh();
  await executor.executeRefresh();

  assert.strictEqual(executor.isTrailingNeeded(), true);

  await p1;
  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.strictEqual(executionCount, 2);
  assert.strictEqual(executor.isInFlight(), false);
  assert.strictEqual(executor.isTrailingNeeded(), false);
});
