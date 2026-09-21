import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateRemainingSeconds,
  calculateServerOffset,
  createExpiryGuard,
  timerTone,
} from "../src/utils/examTimer.js";

const base = Date.parse("2026-09-21T10:00:00.000Z");
const deadline = new Date(base + 20 * 60 * 1000).toISOString();

test("normal countdown is derived from the deadline", () => {
  assert.equal(calculateRemainingSeconds(deadline, 0, base), 1200);
  assert.equal(calculateRemainingSeconds(deadline, 0, base + 1000), 1199);
});

test("refresh preserves remaining time because the deadline is stable", () => {
  const before = calculateRemainingSeconds(deadline, 0, base + 120000);
  const afterReload = calculateRemainingSeconds(deadline, 0, base + 120000);
  assert.equal(before, 1080);
  assert.equal(afterReload, before);
});

test("background tab and sleep jumps are reflected immediately", () => {
  assert.equal(calculateRemainingSeconds(deadline, 0, base + 2 * 60 * 1000), 1080);
  assert.equal(calculateRemainingSeconds(deadline, 0, base + 17 * 60 * 1000), 180);
});

test("reload near zero never resets the timer", () => {
  assert.equal(calculateRemainingSeconds(deadline, 0, base + 1199500), 1);
  assert.equal(calculateRemainingSeconds(deadline, 0, base + 1200000), 0);
});

test("server clock offset corrects a slow client clock", () => {
  const clientNow = base - 30000;
  const offset = calculateServerOffset(new Date(base).toISOString(), clientNow);
  assert.equal(offset, 30000);
  assert.equal(calculateRemainingSeconds(deadline, offset, clientNow), 1200);
});

test("expiry guard prevents duplicate submit across repeated renders", async () => {
  let submits = 0;
  const guard = createExpiryGuard(() => { submits += 1; });
  assert.equal(guard.trigger("session-1"), true);
  assert.equal(guard.trigger("session-1"), false);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(guard.trigger("session-1"), false);
  assert.equal(submits, 1);
});

test("a new session can expire after the guard is reset", () => {
  let submits = 0;
  const guard = createExpiryGuard(() => { submits += 1; });
  guard.trigger("session-1");
  guard.reset();
  guard.trigger("session-2");
  assert.equal(submits, 2);
});

test("timer visual state changes at 20 and 5 percent", () => {
  assert.equal(timerTone(201, 1000), "normal");
  assert.equal(timerTone(200, 1000), "warning");
  assert.equal(timerTone(50, 1000), "critical");
});

test("remaining time never becomes negative", () => {
  assert.equal(calculateRemainingSeconds(deadline, 0, base + 9999999), 0);
});
