import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, LoaderCircle, Printer } from "lucide-react";
import { DataGrid } from "@mui/x-data-grid";
import * as XLSX from "xlsx";
import { useNotification } from "../../../context/NotificationContext";
import { ALLOCATION_REASON_LABELS, buildAllocationSheets } from "../../../utils/allocationExport";

const reason = (code) => ALLOCATION_REASON_LABELS[code] || code || "-";
const percent = (value) => Math.round((Number(value) <= 1 ? Number(value) * 100 : Number(value)) * 100) / 100 || 0;
const escapeCsv = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const candidateColumns = [
  { field: "row", headerName: "ردیف", width: 70 },
  { field: "name", headerName: "نام و نام خانوادگی", flex: 1, minWidth: 170 },
  { field: "top1", headerName: "پیشنهاد اول سیستم", flex: 1, minWidth: 170 },
  { field: "top2", headerName: "پیشنهاد دوم سیستم", flex: 1, minWidth: 170 },
  { field: "top3", headerName: "پیشنهاد سوم سیستم", flex: 1, minWidth: 170 },
  { field: "allocation", headerName: "تخصیص نهایی", flex: 1, minWidth: 170 },
  { field: "completeness", headerName: "تکمیل اطلاعات", width: 125 },
  { field: "status", headerName: "وضعیت", width: 125 },
  { field: "reason", headerName: "علت", flex: 1, minWidth: 220 },
];

const jobColumns = [
  { field: "job", headerName: "رشته", flex: 1, minWidth: 180 },
  { field: "rank", headerName: "رتبه در رشته", width: 120 },
  { field: "name", headerName: "نام", flex: 1, minWidth: 170 },
  { field: "score", headerName: "امتیاز تطابق", width: 130 },
  { field: "completeness", headerName: "تکمیل اطلاعات", width: 125 },
  { field: "eligibility", headerName: "واجد شرایط", width: 110 },
  { field: "allocation", headerName: "تخصیص نهایی", flex: 1, minWidth: 160 },
  { field: "reason", headerName: "علت", flex: 1, minWidth: 190 },
];

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AllocationReport({ selectedUsers = [], assignmentResult = {} }) {
  const { notify } = useNotification();
  const [activeView, setActiveView] = useState("candidates");
  const [exporting, setExporting] = useState("");
  const candidates = useMemo(() => assignmentResult.candidates || [], [assignmentResult.candidates]);
  const jobs = useMemo(() => assignmentResult.jobs || [], [assignmentResult.jobs]);
  const sheets = useMemo(() => buildAllocationSheets(assignmentResult, selectedUsers), [assignmentResult, selectedUsers]);

  const candidateRows = useMemo(() => candidates.map((candidate, index) => ({
    id: candidate.userId,
    row: index + 1,
    name: candidate.fullName || candidate.username,
    top1: candidate.recommendations?.[0] ? `${candidate.recommendations[0].job} (${candidate.recommendations[0].matchScore}٪)` : "-",
    top2: candidate.recommendations?.[1] ? `${candidate.recommendations[1].job} (${candidate.recommendations[1].matchScore}٪)` : "-",
    top3: candidate.recommendations?.[2] ? `${candidate.recommendations[2].job} (${candidate.recommendations[2].matchScore}٪)` : "-",
    allocation: candidate.finalAllocation?.job || "-",
    completeness: `${percent(candidate.dataCompleteness)}٪`,
    status: candidate.status === "ASSIGNED" ? "تخصیص‌یافته" : "بدون تخصیص",
    reason: reason(candidate.finalAllocation?.reasonCode || candidate.reasonCode),
  })), [candidates]);

  const jobRows = useMemo(() => jobs.flatMap((job) => (job.ranking || []).map((entry) => ({
    id: `${job.jobId}-${entry.userId}`,
    job: job.job,
    rank: entry.rank,
    name: entry.fullName || entry.username,
    score: `${entry.matchScore}٪`,
    completeness: `${percent(entry.dataCompleteness)}٪`,
    eligibility: entry.eligible ? "بله" : "خیر",
    allocation: entry.finalAssignment || "-",
    reason: reason(entry.reasonCode),
  }))), [jobs]);

  const waitlistRows = useMemo(() => jobs.flatMap((job) => (job.waitlist || []).map((entry) => ({
    id: `wait-${job.jobId}-${entry.userId}`,
    job: job.job,
    rank: entry.rank,
    name: entry.fullName || entry.username,
    score: `${entry.matchScore}٪`,
    completeness: `${percent(entry.dataCompleteness)}٪`,
    eligibility: entry.reasonCode === "CAPACITY_FULL" || entry.reasonCode === "ASSIGNED_ELSEWHERE" ? "بله" : "خیر",
    allocation: "-",
    reason: reason(entry.reasonCode),
  }))), [jobs]);

  const exportExcel = () => {
    if (exporting) return;
    setExporting("excel");
    try {
      const workbook = XLSX.utils.book_new();
      for (const [name, rows] of sheets) {
        const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "بدون داده": "-" }]);
        worksheet["!cols"] = Object.keys(rows[0] || { "بدون داده": "" }).map((key) => ({ wch: Math.max(14, Math.min(40, key.length + 8)) }));
        XLSX.utils.book_append_sheet(workbook, worksheet, name);
      }
      XLSX.writeFile(workbook, `allocation-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
      notify("فایل Excel پنج‌بخشی آماده شد.", { type: "success" });
    } catch (error) {
      console.error("Excel export failed", error);
      notify("تولید فایل Excel انجام نشد.", { type: "error" });
    } finally {
      setExporting("");
    }
  };

  const exportCsv = () => {
    if (exporting) return;
    setExporting("csv");
    try {
      const rows = sheets[0][1];
      const headers = Object.keys(rows[0] || {});
      const csv = [headers, ...rows.map((row) => headers.map((header) => row[header]))].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
      downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `allocation-candidates-${new Date().toISOString().slice(0, 10)}.csv`);
      notify("CSV فردمحور آماده شد.", { type: "success" });
    } finally {
      setExporting("");
    }
  };

  const printReport = () => {
    const popup = window.open("", "_blank");
    if (!popup) return notify("مرورگر پنجره چاپ را مسدود کرده است.", { type: "error" });
    const rows = sheets[0][1];
    const headers = Object.keys(rows[0] || {});
    popup.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #bbb;padding:6px;text-align:right}th{background:#eee}</style></head><body><h1>گزارش تطابق و تخصیص نهایی</h1><table><thead><tr>${headers.map((item) => `<th>${item}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((key) => `<td>${row[key] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const rows = activeView === "candidates" ? candidateRows : activeView === "jobs" ? jobRows : waitlistRows;
  const columns = activeView === "candidates" ? candidateColumns : jobColumns;
  const assignedCount = candidates.filter((item) => item.finalAllocation).length;

  return (
    <section className="allocation-report" dir="rtl">
      <header className="allocation-header">
        <div><h2 className="allocation-title">گزارش تطابق و تخصیص</h2><p className="allocation-sub">{assignedCount} تخصیص از {candidates.length} نفر، الگوریتم {assignmentResult.meta?.algorithmVersion || "-"}</p></div>
        <div className="allocation-actions">
          <button className="btn" type="button" onClick={exportCsv} disabled={Boolean(exporting)}><Download size={16} /> CSV فردمحور</button>
          <button className="btn" type="button" onClick={exportExcel} disabled={Boolean(exporting)}>{exporting === "excel" ? <LoaderCircle size={16} className="spin" /> : <FileSpreadsheet size={16} />} Excel</button>
          <button className="btn" type="button" onClick={printReport} disabled={Boolean(exporting)}><Printer size={16} /> چاپ</button>
        </div>
      </header>
      <div className="allocation-tabs" role="tablist" aria-label="نوع نمایش گزارش">
        <button type="button" className={activeView === "candidates" ? "active" : ""} onClick={() => setActiveView("candidates")}>نمای فردمحور</button>
        <button type="button" className={activeView === "jobs" ? "active" : ""} onClick={() => setActiveView("jobs")}>رتبه‌بندی رشته‌ها</button>
        <button type="button" className={activeView === "waitlist" ? "active" : ""} onClick={() => setActiveView("waitlist")}>لیست انتظار رشته‌ها</button>
      </div>
      <div style={{ height: 560, width: "100%" }}><DataGrid rows={rows} columns={columns} disableRowSelectionOnClick pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} /></div>
    </section>
  );
}
