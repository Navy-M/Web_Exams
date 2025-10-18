import React, { useMemo } from "react";
import { Download } from "lucide-react";
import { DataGrid } from "@mui/x-data-grid";
import * as XLSX from "xlsx";

/* Simple UI components */
const Button = ({ children, className = "", ...props }) => (
  <button
    className={`btn px-3 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${className}`}
    {...props}
  >
    {children}
  </button>
);
const Card = ({ children, className = "" }) => (
  <div className={`card bg-white border rounded-xl shadow-sm p-4 ${className}`}>
    {children}
  </div>
);
const CardHeader = ({ children }) => (
  <div className="flex items-center gap-2 mb-3">{children}</div>
);
const CardContent = ({ children }) => <div>{children}</div>;

/* ===================== AllocationReport ===================== */
const AllocationReport = ({ selectedUsers = [], assignmentResult }) => {
  // Extract prioritized user IDs from assignmentResult (if any)
  const prioritizedMap = useMemo(() => {
    const map = {};
    if (assignmentResult?.priorities || assignmentResult?.ranking) {
      const src = assignmentResult.priorities || assignmentResult.ranking;
      for (const [userId, rank] of Object.entries(src)) {
        map[userId] = rank;
      }
    }
    return map;
  }, [assignmentResult]);

  // Build and sort combined user list
  const tableData = useMemo(() => {
    return selectedUsers
      .map((u, i) => {
        const avgScore = Math.round(
          (u.testsAssigned?.reduce((a, t) => a + (t.score || 0), 0) || 0) /
            (u.testsAssigned?.length || 1)
        );
        const rank = prioritizedMap[u._id] || null;
        return {
          id: i + 1,
          name: u.profile?.fullName || "—",
          field: u.profile?.field || "—",
          score: avgScore,
          rank,
          isPrioritized: !!rank,
        };
      })
      .sort((a, b) => {
        if (a.isPrioritized && !b.isPrioritized) return -1;
        if (!a.isPrioritized && b.isPrioritized) return 1;
        if (a.rank && b.rank) return a.rank - b.rank;
        return b.score - a.score;
      });
  }, [selectedUsers, prioritizedMap]);

  // Excel export
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      tableData.map((r) => ({
        "نام و نام خانوادگی": r.name,
        "شغل / نیاز": r.job,
        "رشته تحصیلی": r.field,
        "میانگین نمره": r.score,
        "اولویت": r.rank || "—",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "گزارش اولویت‌بندی");
    XLSX.writeFile(wb, "allocation-report.xlsx");
  };

  const columns = [
    { field: "id", headerName: "ردیف", width: 70 },
    { field: "name", headerName: "نام و نام خانوادگی", flex: 1 },
    { field: "job", headerName: "شغل / نیاز", flex: 1 },
    { field: "field", headerName: "رشته تحصیلی", flex: 1 },
    {
      field: "score",
      headerName: "میانگین نمره",
      flex: 1,
      type: "number",
      renderCell: (params) => (
        <span
          className={`font-semibold ${
            params.value >= 80
              ? "text-emerald-600"
              : params.value >= 60
              ? "text-amber-600"
              : "text-rose-600"
          }`}
        >
          {params.value}
        </span>
      ),
    },
    {
      field: "rank",
      headerName: "اولویت",
      width: 120,
      renderCell: (params) =>
        params.value ? (
          <span
            className={`px-2 py-1 rounded-md font-bold ${
              params.value === 1
                ? "bg-yellow-100 text-yellow-700"
                : params.value <= 3
                ? "bg-amber-50 text-amber-600"
                : "text-gray-600"
            }`}
          >
            {params.value}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ];

  return (
    <section className="allocation-report space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          گزارش نهایی اولویت‌بندی و تخصیص کاربران
        </h2>
        <Button
          onClick={exportToExcel}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Download className="w-4 h-4" /> خروجی Excel
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-700">
            {tableData.filter((u) => u.isPrioritized).length} کاربر در اولویت •{" "}
            {tableData.filter((u) => !u.isPrioritized).length} کاربر خارج از
            اولویت
          </h3>
        </CardHeader>
        <CardContent>
          <div style={{ height: 500, width: "100%" }}>
            <DataGrid
              rows={tableData}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 20, 50]}
              disableSelectionOnClick
              sx={{
                fontFamily: "iransans, sans-serif",
                direction: "rtl",
                "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f7f7f7" },
                "& .MuiDataGrid-row:nth-of-type(even)": {
                  backgroundColor: "#fafafa",
                },
              }}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default AllocationReport;
