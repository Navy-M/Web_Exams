import React from "react";
import { useI18n } from "../../../i18n";

const UserProfileCard = ({ user }) => {
  const { t } = useI18n();
  const p = user?.profile || {};

  const maritalLabel = !p.age
    ? t("usersPage.profile.missing")
    : p.single
    ? t("usersPage.profile.single")
    : t("usersPage.profile.married");

  return (
    <div className="user-profile-card card">
      <div className="user-profile-header">
        <h3>{t("usersPage.profile.title")}</h3>
        <span className="badge">
          {user?.period
            ? t("usersPage.profile.period", { period: user.period })
            : t("usersPage.profile.periodMissing")}
        </span>
      </div>
      <ul className="user-profile-list">
        <li>
          <strong>{t("usersPage.profile.username")}:</strong> {user?.username || t("usersPage.profile.missing")}
        </li>
        <li>
          <strong>{t("usersPage.profile.age")}:</strong> {p.age ?? t("usersPage.profile.missing")}
        </li>
        <li>
          <strong>{t("usersPage.profile.fathersJob")}:</strong> {p.fathersJob || t("usersPage.profile.missing")}
        </li>
        <li>
          <strong>{t("usersPage.profile.maritalStatus")}:</strong> {maritalLabel}
        </li>
        <li>
          <strong>{t("usersPage.profile.education")}:</strong> {p.education || t("usersPage.profile.missing")}
        </li>
        <li>
          <strong>{t("usersPage.profile.diplomaAverage")}:</strong> {p.diplomaAverage || t("usersPage.profile.missing")}
        </li>
        <li>
          <strong>{t("usersPage.profile.field")}:</strong> {p.field || t("usersPage.profile.missing")}
        </li>
        <li>
          <strong>{t("usersPage.profile.phone")}:</strong> {p.phone || t("usersPage.profile.missing")}
        </li>
        <li>
          <strong>{t("usersPage.profile.city")}:</strong> {p.city || t("usersPage.profile.missing")}
        </li>
        <li>
          <strong>{t("usersPage.profile.province")}:</strong> {p.province || t("usersPage.profile.missing")}
        </li>
      </ul>
    </div>
  );
};

export default UserProfileCard;
