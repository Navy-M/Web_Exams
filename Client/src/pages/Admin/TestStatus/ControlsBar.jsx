import React from "react";

const ControlsBar = ({
  search,
  setSearch,
  searchFilter,
  setSearchFilter,
  visibleCount,
  setVisibleCount,
}) => {
  return (
    <div className="ts-controls">
      <div className="ts-search">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو… (نام، دوره، نقش، استان)"
          aria-label="جستجو"
        />
      </div>

      <div className="ts-filters">
        <select
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          aria-label="فیلتر بر اساس"
        >
          <option value="">همه فیلدها</option>
          <option value="name">نام</option>
          <option value="period">دوره</option>
          <option value="role">نقش</option>
          <option value="job">شماره دانشجویی</option>
          <option value="province">استان</option>
        </select>

        <select
          value={String(visibleCount)}
          onChange={(e) => setVisibleCount(parseInt(e.target.value, 10))}
          aria-label="تعداد نمایش"
        >
          <option value="10">نمایش ۱۰</option>
          <option value="50">نمایش ۵۰</option>
          <option value="100">نمایش ۱۰۰</option>
          <option value="200">نمایش ۲۰۰</option>
          <option value="300">نمایش ۳۰۰</option>
        </select>
      </div>
    </div>
  );
};

export default ControlsBar;
