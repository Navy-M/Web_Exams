import React, { useEffect, useMemo, useState, useCallback } from "react";
import { getUsers, prioritizeUsers } from "../../services/api";
import "../../styles/TestsStatus.css";

import ControlsBar from "./TestStatus/ControlsBar";
import UsersTable from "./TestStatus/UsersTable";
import BulkActionsBar from "./TestStatus/BulkActionsBar";
import JobQuotaModal from "./TestStatus/JobQuotaModal";

// adjust if your path differs
import AllocationReport from "./TestStatus/AllocationReport";

const DEFAULT_QUOTAS = {
  job1: { name: "ناوبری و فرماندهی کشتی", tableCount: 0 },
  job2: { name: "مهندسی مکانیک و موتور دریایی", tableCount: 0 },
  job3: { name: "مهندسی برق و الکترونیک دریایی", tableCount: 0 },
  job4: { name: "تفنگدار دریایی", tableCount: 0 },
  job5: { name: "کمیسر دریایی", tableCount: 0 },
};

const TestsStatus = () => {
  // data
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignmentResult, setAssignmentResult] = useState(null);

  // filters
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState(""); // '', name, email, role, job, province
  const [visibleCount, setVisibleCount] = useState(10);

  // selection
  const [selected, setSelected] = useState(() => new Set());

  // prioritization modal & quotas
  const [showPrioritizationModal, setShowPrioritizationModal] = useState(false);
  const [jobQuotas, setJobQuotas] = useState(DEFAULT_QUOTAS);

  // fetch users
  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        setLoading(true);
        const data = await getUsers();
        if (!ignore) {
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error fetching users", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, []);

  // helpers
  const lc = (v) => (v ?? "").toString().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = lc(search);
    return users.filter((u) => {
      if (searchFilter === "name")
        return lc(u.profile?.fullName).includes(q);
      if (searchFilter === "email")
        return lc(u.email).includes(q);
      if (searchFilter === "role")
        return lc(u.role).includes(q);
      if (searchFilter === "job")
        return lc(u.profile?.jobPosition).includes(q);
      if (searchFilter === "province")
        return lc(u.profile?.province).includes(q);

      // default: any
      return (
        lc(u.profile?.fullName).includes(q) ||
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

  // derived
  const visibleIds = useMemo(
    () => new Set(visibleUsers.map((u) => u._id)),
    [visibleUsers]
  );
  const isAllVisibleSelected = useMemo(
    () => visibleUsers.length > 0 && visibleUsers.every((u) => selected.has(u._id)),
    [visibleUsers, selected]
  );

  // selection handlers
  const toggleUser = useCallback((id) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
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

  // keep selection valid when filters / visibleCount change
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set();
      prev.forEach((id) => {
        if (filteredUsers.some((u) => u._id === id)) next.add(id);
      });
      return next;
    });
  }, [filteredUsers, visibleCount]);

  // prioritization flow
  const handleStartPrioritization = () => {
    if (selected.size === 0) return alert("ابتدا چند کاربر را انتخاب کنید");
    setShowPrioritizationModal(true);
  };

  const submitPrioritization = async () => {
    const people = Array.from(selected);
    if (!people.length) return;

    try {
      const payload = {
        people,
        quotas: jobQuotas,
        weights: { DISC: 1, CLIFTON: 1, HOLLAND: 1, MBTI: 1, GARDNER: 1, GHQ: 1 },
      };
      const res = await prioritizeUsers(payload);
      setAssignmentResult(res);
      setShowPrioritizationModal(false);
    } catch (err) {
      console.error("Error submitting prioritization:", err);
      alert("خطا در ارسال اولویت‌بندی");
    }
  };

  // bulk demo actions
  const handleBulkDeleteFromView = () => {
    if (!selected.size) return;
    if (!window.confirm("حذف از جدول نمایش (نه از سرور)؟")) return;
    setUsers((prev) => prev.filter((u) => !selected.has(u._id)));
    setSelected(new Set());
  };

  const handleBulkMakeGroup = () => {
    if (!selected.size) return;
    console.log("Make group of IDs:", Array.from(selected));
    alert("ساخت گروه (دمو) — می‌تونیم اینو به API وصل کنیم.");
  };

  // render: allocation report
  if (assignmentResult) {
    const selectedUsers = users.filter((u) => selected.has(u._id));
    return (
      <section className="tests-status card" dir="rtl">
        <AllocationReport
          selectedUsers={selectedUsers}
          assignmentResult={assignmentResult}
        />
        <div className="footer-actions">
          <button className="btn ghost" onClick={() => setAssignmentResult(null)}>
            بازگشت
          </button>
        </div>
      </section>
    );
  }

  // render: main
  return (
    <section className="tests-status card" dir="rtl">
      <header className="ts-head">
        <h2>وضعیت آزمون‌های کاربران</h2>
        <span className="muted">
          {filteredUsers.length} نتیجه • نمایش {visibleUsers.length}
        </span>
      </header>

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
          setJobQuotas((q) => ({ ...q, [key]: { ...q[key], tableCount: next } }))
        }
        onClose={() => setShowPrioritizationModal(false)}
        onSubmit={submitPrioritization}
      />
    </section>
  );
};

export default TestsStatus;
