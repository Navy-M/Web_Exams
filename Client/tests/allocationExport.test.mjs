import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { buildAllocationSheets } from "../src/utils/allocationExport.js";

test("allocation export builds five contract-based sheets", () => {
  const result = {
    candidates: [{
      userId: "u1", username: "user1", fullName: "Candidate One", dataCompleteness: 0.8,
      status: "ASSIGNED", reasonCode: null,
      recommendations: [
        { jobId: "j1", job: "Navigation", rank: 1, matchScore: 88, components: [{ key: "DISC", label: "DISC", rawScore: 4, normalizedScore: 80, weight: 2, weightedContribution: 53.33 }] },
        { jobId: "j2", job: "Mechanics", rank: 2, matchScore: 76, components: [] },
      ],
      finalAllocation: { jobId: "j2", job: "Mechanics", matchScore: 76, recommendationRank: 2, reasonCode: "CAPACITY_FULL" },
    }],
    jobs: [{
      jobId: "j1", job: "Navigation", capacity: 1, assignedCount: 0,
      ranking: [{ rank: 1, userId: "u1", fullName: "Candidate One", matchScore: 88, dataCompleteness: 0.8, eligible: true, finalAssignment: "j2" }],
      waitlist: [{ rank: 1, userId: "u1", fullName: "Candidate One", matchScore: 88, dataCompleteness: 0.8, reasonCode: "ASSIGNED_ELSEWHERE" }],
    }],
  };
  const sheets = buildAllocationSheets(result, [{ _id: "u1", period: "A", profile: { field: "Computer" } }]);
  assert.equal(sheets.length, 5);
  assert.deepEqual(sheets.map(([name]) => name), ["خلاصه تخصیص نهایی", "رتبه‌بندی رشته‌ها", "لیست انتظار", "بدون تخصیص", "جزئیات امتیاز"]);
  assert.equal(sheets[0][1].length, 1);
  assert.equal(sheets[1][1].length, 1);
  assert.equal(sheets[2][1].length, 1);
  assert.equal(sheets[3][1].length, 0);
  assert.equal(sheets[4][1][0]["امتیاز نرمال"], 80);

  const workbook = XLSX.utils.book_new();
  sheets.forEach(([name, rows]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ empty: true }]), name));
  const serialized = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const parsed = XLSX.read(serialized, { type: "buffer" });
  assert.deepEqual(parsed.SheetNames, sheets.map(([name]) => name));
});
