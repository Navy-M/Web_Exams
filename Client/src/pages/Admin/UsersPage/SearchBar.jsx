import React from "react";

const SearchBar = ({ search, setSearch, searchFilter, setSearchFilter }) => {
  const findFilterName = (value) => {
    switch (value) {
      case "name": return "نام";
      case "period": return "دوره";
      case "username": return "نام کاربری";
      case "job": return "شماره دانشجویی";
      case "role": return "نقش";
      case "province": return "استان";
      default: return "";
    }
  };

  return (
    <div className="admin-search-container">
      <select
        value={searchFilter}
        onChange={(e) => setSearchFilter(e.target.value)}
        className="admin-search-select"
      >
        <option value="">فیلتر بر اساس همه</option>
        <option value="name">نام</option>
        <option value="period">دوره</option>
        <option value="username">نام کاربری</option>
        <option value="role">نقش</option>
        <option value="job">شماره دانشجویی</option>
        <option value="province">استان</option>
      </select>

      <input
        type="text"
        placeholder={`جستجو${searchFilter ? "ی " + findFilterName(searchFilter) : ""} ... `}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="admin-search-input"
      />
    </div>
  );
};

export default SearchBar;
