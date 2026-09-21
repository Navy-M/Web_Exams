import test from "node:test";
import assert from "node:assert/strict";
import { buildChartModel, normalizeChartValue } from "../src/utils/chartAdapters.js";

test("normalizes only explicitly declared fractional values", () => {
  assert.equal(normalizeChartValue(0.72, "fraction"), 72);
  assert.equal(normalizeChartValue("72%", "percent"), 72);
  assert.equal(normalizeChartValue(undefined, "percent"), 0);
  assert.equal(normalizeChartValue(Number.NaN, "percent"), 0);
});

const cases = [
  ["DISC", { D: 71, I: 62, S: 54, C: 83 }, 4],
  ["HOLLAND", { R: 51, I: 77, A: 68, S: 61, E: 48, C: 59 }, 6],
  ["GARDNER", { L: 72, M: 81, S: 64, B: 58, Mu: 47, I: 76, In: 69, N: 55 }, 8],
  ["GHQ", { Stress: 64, Mood: 48, Function: 73, Social: 59 }, 4],
];

for (const [testType, normalizedScores, count] of cases) {
  test(`${testType} adapter creates a finite 0..100 dataset`, () => {
    const model = buildChartModel(testType, { normalizedScores });
    assert.equal(model.labels.length, count);
    assert.equal(model.values.length, count);
    assert.ok(model.values.every((value) => Number.isFinite(value) && value >= 0 && value <= 100));
  });
}

test("MBTI adapter returns four dimensions whose pairs total 100", () => {
  const model = buildChartModel("MBTI", {
    normalizedScores: { EI: { E: 72, I: 48 }, SN: { S: 42, N: 78 }, TF: { T: 66, F: 54 }, JP: { J: 81, P: 39 } },
  });
  assert.equal(model.labels.length, 4);
  Object.values(model.scores).forEach((pair) => {
    assert.equal(Math.round(Object.values(pair).reduce((sum, value) => sum + value, 0)), 100);
  });
});

test("dynamic Clifton and personal-favorites adapters preserve labels and values", () => {
  for (const testType of ["CLIFTON", "PERSONAL_FAVORITES"]) {
    const model = buildChartModel(testType, { normalizedScores: { first: 72, second: "81%" } });
    assert.deepEqual(model.labels, ["first", "second"]);
    assert.deepEqual(model.values, [72, 81]);
  }
});

test("legacy chartData is accepted only as an indexed fallback", () => {
  const model = buildChartModel("DISC", { chartData: { datasets: [{ data: [12, 34, 56, 78] }] } });
  assert.deepEqual(model.values, [12, 34, 56, 78]);
});
