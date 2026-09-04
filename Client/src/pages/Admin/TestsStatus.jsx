import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getUsers, prioritizeUsers } from "../../services/api";
import "../../styles/TestsStatus.css";

import ControlsBar from "./TestStatus/ControlsBar";
import UsersTable from "./TestStatus/UsersTable";
import BulkActionsBar from "./TestStatus/BulkActionsBar";
import JobQuotaModal from "./TestStatus/JobQuotaModal";
import AllocationReport from "./TestStatus/AllocationReport";

import { jobRequirements, Test_Cards } from "../../services/dummyData";

const DEFAULT_QUOTAS = {
  job1: { name: "ناوبری و فرماندهی کشتی", tableCount: 0 },
  job2: { name: "مهندسی مکانیک و موتور دریایی", tableCount: 0 },
  job3: { name: "مهندسی برق و الکترونیک دریایی", tableCount: 0 },
  job4: { name: "تفنگدار دریایی", tableCount: 0 },
  job5: { name: "کمیسر دریایی", tableCount: 0 },
};

const lc = (value) => (value ?? "").toString().toLowerCase();

const TestsStatus = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [prioritizing, setPrioritizing] = useState(false);

  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const [selected, setSelected] = useState(() => new Set());

  const [showPrioritizationModal, setShowPrioritizationModal] = useState(false);
  const [jobQuotas, setJobQuotas] = useState(DEFAULT_QUOTAS);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getUsers();
        if (!ignore) setUsers(Array.isArray(data) ? data.filter((u) => u.role !== "admin") : []);
      } catch (err) {
        console.error("Error fetching users", err);
        if (!ignore) setError("خطا در دریافت فهرست کاربران");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = lc(search);
    return users.filter((u) => {
      if (searchFilter === "name") return lc(u.profile?.fullName).includes(q);
      if (searchFilter === "period") return lc(u.period).includes(q);
      if (searchFilter === "role") return lc(u.role).includes(q);
      if (searchFilter === "job") return lc(u.profile?.jobPosition).includes(q);
      if (searchFilter === "province") return lc(u.profile?.province).includes(q);
      return (
        lc(u.profile?.fullName).includes(q) ||
        lc(u.username).includes(q) ||
        lc(u.email).includes(q) ||
        lc(u.role).includes(q) ||
        lc(u.profile?.jobPosition).includes(q) ||
        lc(u.profile?.province).includes(q)
      );
    });
  }, [users, search, searchFilter]);

  const visibleUsers = useMemo(
    () => filteredUsers.slice(0, visibleCount),
    [filteredUsers, visibleCount]
  );

  const isAllVisibleSelected = useMemo(
    () => visibleUsers.length > 0 && visibleUsers.every((u) => selected.has(u._id)),
    [visibleUsers, selected]
  );

  const selectedUsers = useMemo(
    () => users.filter((u) => selected.has(u._id)),
    [users, selected]
  );

  const toggleUser = useCallback((id) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }, []);

  const toggleAllVisible = useCallback(() => {
    setSelected((prev) => {
      const copy = new Set(prev);
      const allSelected = visibleUsers.every((u) => copy.has(u._id));
      visibleUsers.forEach((u) => {
        if (allSelected) copy.delete(u._id);
        else copy.add(u._id);
      });
      return copy;
    });
  }, [visibleUsers]);

  useEffect(() => {
    setSelected((prev) => {
      const valid = new Set(filteredUsers.map((u) => u._id));
      return new Set([...prev].filter((id) => valid.has(id)));
    });
  }, [filteredUsers]);

  const handleStartPrioritization = () => {
    if (selected.size === 0) {
      alert("ابتدا حداقل یک کاربر را انتخاب کنید.");
      return;
    }
    setShowPrioritizationModal(true);
  };

  const submitPrioritization = async (modalPayload) => {
    if (prioritizing) return;
    const userIds = Array.from(selected);
    if (!userIds.length) {
      alert("ابتدا حداقل یک کاربر را انتخاب کنید.");
      return;
    }

    setPrioritizing(true);
    try {
      const res = await prioritizeUsers({
        userIds,
        capacities: modalPayload?.capacities,
        weights: modalPayload?.serverWeights,
        jobRequirements,
        quotas: modalPayload?.quotas || jobQuotas,
      });

      if (!res?.ok) {
        throw new Error(res?.error || "PRIORITIZATION_FAILED");
      }

      setAssignmentResult({
        ...res,
        quotas: modalPayload?.quotas || jobQuotas,
        meta: { ...(res.meta || {}), source: "api", serverOnly: true },
      });
      setShowPrioritizationModal(false);
    } catch (err) {
      console.error("prioritizeUsers API failed:", err);
      alert("خطا در اولویت‌بندی سروری. منبع تخصیص فقط API سرور است؛ لطفاً اتصال سرور و MongoDB را بررسی کنید.");
    } finally {
      setPrioritizing(false);
    }
  };

  const handleBulkDeleteFromView = () => {
    if (!selected.size) return;
    if (!window.confirm("کاربران انتخاب‌شده فقط از نمای فعلی حذف شوند؟ این عملیات داده سرور را حذف نمی‌کند.")) return;
    setUsers((prev) => prev.filter((u) => !selected.has(u._id)));
    setSelected(new Set());
  };

  const handleBulkMakeGroup = () => {
    if (!selected.size) return;
    alert("دسته‌بندی گروهی هنوز به API متصل نشده است.");
  };

  if (assignmentResult) {
    return (
      <section className="tests-status card" dir="rtl">
        <header className="ts-head">
          <h2>گزارش تخصیص و اولویت‌بندی</h2>
          <span className="muted">{selectedUsers.length} کاربر انتخاب‌شده</span>
        </header>

        <AllocationReport
          selectedUsers={selectedUsers}
          assignmentResult={assignmentResult}
        />

        <div className="footer-actions" style={{ textAlign: "center", marginTop: "1rem" }}>
          <button className="btn ghost" onClick={() => setAssignmentResult(null)}>
            بازگشت به فهرست آزمون‌ها
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="tests-status card" dir="rtl">
      <header className="ts-head">
        <h2>وضعیت آزمون‌های کاربران</h2>
        <span className="muted">
          {loading ? "در حال بارگذاری..." : `${filteredUsers.length} نتیجه - نمایش ${visibleUsers.length}`}
        </span>
      </header>

      {error && <p className="error">{error}</p>}

      <ControlsBar
        search={search}
        setSearch={setSearch}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        visibleCount={visibleCount}
        setVisibleCount={setVisibleCount}
      />

      <UsersTable
        users={visibleUsers}
        selected={selected}
        onToggleUser={toggleUser}
        onToggleAll={toggleAllVisible}
        allVisibleSelected={isAllVisibleSelected}
      />

      {selected.size > 0 && (
        <BulkActionsBar
          count={selected.size}
          onStartPrioritization={handleStartPrioritization}
          onDeleteFromView={handleBulkDeleteFromView}
          onMakeGroup={handleBulkMakeGroup}
        />
      )}

      <JobQuotaModal
        open={showPrioritizationModal}
        quotas={jobQuotas}
        onChange={(key, next) =>
          setJobQuotas((current) => ({
            ...current,
            [key]: { ...current[key], tableCount: Math.max(0, Number(next) || 0) },
          }))
        }
        onClose={() => setShowPrioritizationModal(false)}
        onSubmit={submitPrioritization}
        submitting={prioritizing}
        jobRequirements={jobRequirements}
        tests={Test_Cards}
      />
    </section>
  );
};

export default TestsStatus;
