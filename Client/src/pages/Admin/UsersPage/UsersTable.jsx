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
}) => {
  const { t } = useI18n();

  return (
    <div className="table-wrap">
      <table className="admin-users-table">
        <thead>
          <tr>
            <th>{t("usersPage.tableHeaders.index")}</th>
            <th>{t("usersPage.tableHeaders.fullName")}</th>
            <th>{t("usersPage.tableHeaders.username")}</th>
            <th>{t("usersPage.tableHeaders.completedProf")}</th>
            <th>{t("usersPage.tableHeaders.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr key={u._id}>
              <td className="center">{idx + 1}</td>
              <td>{u.profile?.fullName || t("usersPage.profile.missing")}</td>
              <td>{u.username || t("usersPage.profile.missing")}</td>
              <td>{u.profile?.age ? (t("usersPage.profile.isCompleted")) : (t("usersPage.profile.missing"))}</td>
              <td className="actions">
                <button style={{color: "var(--text)"}} className="btn ghost" onClick={() => onView(u)}>
                  {t("usersPage.table.view")}
                </button>
                <button style={{color: "var(--text)"}} className="btn danger" onClick={() => onDelete(u._id)}>
                  {t("common.buttons.delete")}
                </button>
              </td>
            </tr>
          ))}

          {showAddRow && (
            <tr className="add-user-row">
              <td colSpan="5">
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
            <td colSpan="5">
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
