import React from "react";
import { useI18n } from "../../../i18n";

const UsersTable = ({
  users,
  onView,
  onDelete,
  showAddRow,
  setShowAddRow,
  newUser,
  setNewUser,
  onSubmitNew,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
}) => {
  const { t } = useI18n();
  const selectionEnabled =
    typeof onToggleSelect === "function" &&
    typeof onToggleSelectAll === "function";

  const selectAllLabel = t("usersPage.table.selectAll") || "Select all";
  const selectUserLabel = t("usersPage.table.selectUser") || "Select user";
  const columnSpan = selectionEnabled ? 6 : 5;

  const allSelected =
    selectionEnabled &&
    users.length > 0 &&
    users.every((user) => {
      const id = user?._id || user?.id;
      return id && selectedIds.includes(id);
    });

  const handleSelectAll = () => {
    if (!selectionEnabled) return;
    onToggleSelectAll();
  };

  const renderSelectionCell = (user, idx) => {
    if (!selectionEnabled) return null;
    const id = user?._id || user?.id;
    const isChecked = id ? selectedIds.includes(id) : false;

    return (
      <td
        className="center select-cell"
        data-label={selectUserLabel}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => id && onToggleSelect(id)}
          aria-label={`${selectUserLabel}: ${
            user?.profile?.fullName || user?.username || idx + 1
          }`}
          disabled={!id}
        />
      </td>
    );
  };

  return (
    <div className="table-wrap">
      <table className="admin-users-table">
        <thead>
          <tr>
            {selectionEnabled && (
              <th className="center select-cell">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  aria-label={selectAllLabel}
                />
              </th>
            )}
            <th>{t("usersPage.tableHeaders.index")}</th>
            <th>{t("usersPage.tableHeaders.fullName")}</th>
            <th>{t("usersPage.tableHeaders.username")}</th>
            <th>{t("usersPage.tableHeaders.completedProf")}</th>
            <th>{t("usersPage.tableHeaders.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => {
            const id = u?._id || u?.id;
            return (
              <tr key={id || idx}>
                {renderSelectionCell(u, idx)}
                <td className="center" data-label={t("usersPage.tableHeaders.index")}>
                  {idx + 1}
                </td>
                <td data-label={t("usersPage.tableHeaders.fullName")}>
                  {u.profile?.fullName || t("usersPage.profile.missing")}
                </td>
                <td data-label={t("usersPage.tableHeaders.username")}>
                  {u.username || t("usersPage.profile.missing")}
                </td>
                <td data-label={t("usersPage.tableHeaders.completedProf")}>
                  {u.profile?.age
                    ? t("usersPage.profile.isCompleted")
                    : t("usersPage.profile.missing")}
                </td>
                <td className="actions" data-label={t("usersPage.tableHeaders.actions")}>
                  <button
                    style={{ color: "var(--text)" }}
                    className="btn ghost"
                    onClick={() => onView(u)}
                  >
                    {t("usersPage.table.view")}
                  </button>
                  <button
                    style={{ color: "var(--text)" }}
                    className="btn danger"
                    onClick={() => onDelete(id)}
                  >
                    {t("common.buttons.delete")}
                  </button>
                </td>
              </tr>
            );
          })}

          {showAddRow && (
            <tr className="add-user-row">
              <td colSpan={columnSpan}>
                <div className="add-user-form">
                  <input
                    type="text"
                    placeholder={t("usersPage.table.placeholders.fullName")}
                    value={newUser.fullName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, fullName: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder={t("usersPage.table.placeholders.period")}
                    value={newUser.period}
                    onChange={(e) =>
                      setNewUser({ ...newUser, period: e.target.value })
                    }
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                  >
                    <option value="user">{t("usersPage.table.roleUser")}</option>
                    <option value="admin">{t("usersPage.table.roleAdmin")}</option>
                  </select>
                  <input
                    type="text"
                    placeholder={t("usersPage.table.placeholders.username")}
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                  />
                  <input
                    type="password"
                    placeholder={t("usersPage.table.placeholders.password")}
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                  />
                  <button className="btn primary" onClick={onSubmitNew}>
                    {t("common.buttons.submit")}
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={columnSpan}>
              <button
                className="btn outline"
                onClick={() => setShowAddRow((v) => !v)}
              >
                {showAddRow
                  ? t("usersPage.table.hideForm")
                  : t("usersPage.table.showForm")}
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default UsersTable;

