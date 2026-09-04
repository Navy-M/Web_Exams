import React, { useMemo } from "react";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { DataGrid } from "@mui/x-data-grid";
import * as XLSX from "xlsx";

const EMPTY = "—";
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const display = (value, fallback = EMPTY) => value || fallback;

const escapeCSV = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const escapeHTML = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const personId = (person = {}) => String(person.userId || person.id || person._id || "");

function normalizeRows({ selectedUsers = [], assignmentResult = {} }) {
  const usersById = new Map(selectedUsers.map((user) => [String(user._id || user.id), user]));
  const rows = [];

  const addRow = (person = {}, status, job = EMPTY, index = 0) => {
    const id = personId(person);
    const user = usersById.get(id) || {};
    const profile = user.profile || {};
    rows.push({
      id: `${status}-${job}-${id || index}`,
      userId: id,
      username: display(person.username || user.username),
      name: display(person.fullName || profile.fullName || user.username),
      phone: display(person.phone || profile.phone || user.phone),
      field: display(person.field || profile.field || profile.highSchoolMajor || profile.major),
      job: display(person.job || person.assignedJob || job),
      score: round2(person.finalScore ?? person.score),
      dataCompleteness: round2(person.dataCompleteness),
      rank: person.rank || index + 1,
      status,
      reason: display(person.reason || (person.failedRequirements || []).join("، ")),
      strengths: display((person.strengths || []).join("، ")),
      gaps: display((person.gaps || []).join("، ")),
      breakdown: display(
        (person.components || [])
          .map((component) => `${component.label || component.key}: ${round2(component.score)}`)
          .join(" | ")
      ),
    });
  };

  (assignmentResult.assignments || []).forEach((assignment) => {
    (assignment.slots || []).forEach((person, index) => {
      addRow({ ...person, job: assignment.job }, "تخصیص‌یافته", assignment.job, index);
    });
  });

  if (!rows.length) {
    Object.entries(assignmentResult.allocations || {}).forEach(([job, allocation]) => {
      (allocation?.persons || []).forEach((person, index) => {
        addRow(person, "تخصیص‌یافته", allocation?.name || job, index);
      });
    });
  }

  (assignmentResult.waitlist || []).forEach((entry) => {
    (entry.queue || []).forEach((person, index) => {
      addRow({ ...person, job: entry.job, reason: person.reason || person.status }, "لیست انتظار", entry.job, index);
    });
  });

  (assignmentResult.unassigned || []).forEach((person, index) => {
    addRow(person, "بدون تخصیص", person.bestJob || EMPTY, index);
  });

  if (!rows.length) {
    selectedUsers.forEach((user, index) => {
      const profile = user.profile || {};
      addRow(
        {
          id: user._id || user.id,
          username: user.username,
          fullName: profile.fullName,
          phone: profile.phone,
          field: profile.field,
        },
        "کاندید",
        EMPTY,
        index
      );
    });
  }

  return rows
    .filter((row, index, all) => {
      const key = `${row.status}-${row.job}-${row.userId}`;
      return all.findIndex((item) => `${item.status}-${item.job}-${item.userId}` === key) === index;
    })
    .map((row, index) => ({ ...row, id: row.id || index + 1, rowNumber: index + 1 }));
}

const columns = [
  { field: "rowNumber", headerName: "ردیف", width: 70 },
  { field: "name", headerName: "نام و نام خانوادگی", flex: 1, minWidth: 170 },
  { field: "job", headerName: "رسته / شغل", flex: 1, minWidth: 180 },
  { field: "field", headerName: "رشته", flex: 1, minWidth: 130 },
  { field: "phone", headerName: "شماره تماس", flex: 1, minWidth: 130 },
  { field: "score", headerName: "امتیاز", width: 100, type: "number" },
  { field: "dataCompleteness", headerName: "تکمیل داده", width: 120, type: "number" },
  { field: "rank", headerName: "اولویت", width: 95 },
  { field: "status", headerName: "وضعیت", width: 120 },
  { field: "reason", headerName: "دلیل / نیاز", flex: 1, minWidth: 170 },
  { field: "breakdown", headerName: "جزئیات امتیاز", flex: 1, minWidth: 240 },
];

const csvHeaders = [
  "ردیف",
  "نام و نام خانوادگی",
  "نام کاربری",
  "رسته / شغل",
  "رشته",
  "شماره تماس",
  "امتیاز",
  "تکمیل داده",
  "اولویت",
  "وضعیت",
  "دلیل / نیاز",
  "نقاط قوت",
  "گپ‌ها",
  "جزئیات امتیاز",
];

function buildAllocationHTML(rows, summary, meta = {}) {
  const rowsHTML = rows
    .map(
      (row) => `<tr>
        <td>${escapeHTML(row.rowNumber)}</td>
        <td>${escapeHTML(row.name)}</td>
        <td>${escapeHTML(row.job)}</td>
        <td>${escapeHTML(row.field)}</td>
        <td>${escapeHTML(row.phone)}</td>
        <td>${escapeHTML(row.score)}</td>
        <td>${escapeHTML(row.dataCompleteness)}%</td>
        <td>${escapeHTML(row.rank)}</td>
        <td>${escapeHTML(row.status)}</td>
        <td>${escapeHTML(row.reason)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
    <style>
      @font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Variable.woff2') format('woff2');font-weight:100 900}
      @page{size:A4;margin:14mm}
      body{font-family:Vazirmatn,Arial,sans-serif;color:#111827;direction:rtl}
      h1{font-size:18pt;margin:0 0 8mm}
      .meta{font-size:10pt;color:#64748b;margin-bottom:6mm}
      table{width:100%;border-collapse:collapse;font-size:9pt}
      th,td{border:1px solid #d1d5db;padding:6px;text-align:right;vertical-align:top}
      th{background:#f3f4f6}
      tr{break-inside:avoid}
      .footer{position:fixed;bottom:6mm;left:0;right:0;text-align:center;font-size:9pt;color:#94a3b8}
      .footer:after{content:"صفحه " counter(page)}
    </style></head><body>
    <h1>گزارش تخصیص و اولویت‌بندی</h1>
    <div class="meta">
      نسخه الگوریتم: ${escapeHTML(meta.algorithmVersion || "-")} |
      تخصیص‌یافته: ${summary.assigned} |
      لیست انتظار: ${summary.waitlist} |
      بدون تخصیص: ${summary.unassigned}
    </div>
    <table>
      <thead><tr>
        <th>ردیف</th><th>نام</th><th>رسته</th><th>رشته</th><th>تماس</th>
        <th>امتیاز</th><th>تکمیل داده</th><th>اولویت</th><th>وضعیت</th><th>دلیل</th>
      </tr></thead>
      <tbody>${rowsHTML}</tbody>
    </table>
    <div class="footer"></div>
  </body></html>`;
}

const AllocationReport = ({ selectedUsers = [], assignmentResult = {} }) => {
  const rows = useMemo(
    () => normalizeRows({ selectedUsers, assignmentResult }),
    [assignmentResult, selectedUsers]
  );

  const summary = useMemo(() => {
    const assigned = rows.filter((row) => row.status === "تخصیص‌یافته").length;
    const waitlist = rows.filter((row) => row.status === "لیست انتظار").length;
    const unassigned = rows.filter((row) => row.status === "بدون تخصیص").length;
    return { assigned, waitlist, unassigned };
  }, [rows]);

  const exportRows = rows.map((row) => ({
    "ردیف": row.rowNumber,
    "نام و نام خانوادگی": row.name,
    "نام کاربری": row.username,
    "رسته / شغل": row.job,
    "رشته": row.field,
    "شماره تماس": row.phone,
    "امتیاز": row.score,
    "تکمیل داده": row.dataCompleteness,
    "اولویت": row.rank,
    "وضعیت": row.status,
    "دلیل / نیاز": row.reason,
    "نقاط قوت": row.strengths,
    "گپ‌ها": row.gaps,
    "جزئیات امتیاز": row.breakdown,
  }));

  const fileDate = new Date().toISOString().slice(0, 10);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Allocation");
    XLSX.writeFile(workbook, `allocation-report-${fileDate}.xlsx`);
  };

  const downloadCSV = () => {
    const lines = [
      csvHeaders.map(escapeCSV).join(","),
      ...exportRows.map((row) => csvHeaders.map((header) => escapeCSV(row[header])).join(",")),
    ];
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }), `allocation-report-${fileDate}.csv`);
  };

  const downloadPDF = async () => {
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "0";
    host.style.top = "0";
    host.style.width = "794px";
    host.style.background = "#ffffff";
    host.style.zIndex = "-1";
    host.innerHTML = buildAllocationHTML(rows, summary, assignmentResult.meta);
    document.body.appendChild(host);

    try {
      const mod = await import("html2pdf.js");
      const html2pdf = mod.default || mod;
      await html2pdf()
        .set({
          margin: 0,
          filename: `allocation-report-${fileDate}.pdf`,
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 794 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(host)
        .save();
    } finally {
      host.remove();
    }
  };

  return (
    <section className="allocation-report space-y-6" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            گزارش نهایی اولویت‌بندی و تخصیص کاربران
          </h2>
          <div className="text-sm text-gray-600">
            نسخه الگوریتم: {assignmentResult.meta?.algorithmVersion || "-"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={downloadCSV} type="button">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button className="btn" onClick={exportToExcel} type="button">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button className="btn" onClick={downloadPDF} type="button">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button className="btn" onClick={() => window.print()} type="button">
            <Printer className="w-4 h-4" /> چاپ
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-3">
        {summary.assigned} تخصیص‌یافته، {summary.waitlist} در لیست انتظار، {summary.unassigned} بدون تخصیص
      </div>

      <div style={{ height: 560, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          sx={{
            fontFamily: "Vazirmatn, iransans, sans-serif",
            direction: "rtl",
            "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f7f7f7" },
            "& .MuiDataGrid-row:nth-of-type(even)": { backgroundColor: "#fafafa" },
          }}
        />
      </div>
    </section>
  );
};

export default AllocationReport;
