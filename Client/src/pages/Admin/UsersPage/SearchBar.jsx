import React, { useMemo } from "react";
import { useI18n } from "../../../i18n";

const SearchBar = ({ search, setSearch, searchFilter, setSearchFilter }) => {
  const { t } = useI18n();

  const filterLabels = useMemo(
    () => ({
      "": t("usersPage.search.all"),
      name: t("usersPage.search.name"),
      period: t("usersPage.search.period"),
      username: t("usersPage.search.username"),
      role: t("usersPage.search.role"),
      job: t("usersPage.search.job"),
      province: t("usersPage.search.province"),
    }),
    [t]
  );

  const placeholderTarget = searchFilter ? filterLabels[searchFilter] : t("usersPage.search.all");

  return (
    <div className="admin-search-container">
      <select
        value={searchFilter}
        onChange={(e) => setSearchFilter(e.target.value)}
        className="admin-search-select"
      >
        <option value="">{t("usersPage.search.all")}</option>
        <option value="name">{t("usersPage.search.name")}</option>
        <option value="period">{t("usersPage.search.period")}</option>
        <option value="username">{t("usersPage.search.username")}</option>
        <option value="role">{t("usersPage.search.role")}</option>
        <option value="job">{t("usersPage.search.job")}</option>
        <option value="province">{t("usersPage.search.province")}</option>
      </select>

      <input
        type="text"
        placeholder={t("usersPage.search.placeholder", { target: placeholderTarget })}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="admin-search-input"
      />
    </div>
  );
};

export default SearchBar;
