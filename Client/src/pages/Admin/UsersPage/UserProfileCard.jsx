import React from "react";

const UserProfileCard = ({ user }) => {
  const p = user?.profile || {};
  return (
    <div className="user-profile-card card">
      <div className="user-profile-header">
        <h3>🧾 اطلاعات فردی</h3>
        <span className="badge">{user?.period ? `دوره ${user.period}` : "دوره نامشخص"}</span>
      </div>
      <ul className="user-profile-list">
        <li><strong>📧 نام کاربری:</strong> {user?.username || "—"}</li>
        <li><strong>🎂 سن:</strong> {p.age ?? "—"}</li>
        <li><strong>👨‍💼 شغل پدر:</strong> {p.fathersJob || "—"}</li>
        <li><strong>💍 وضعیت تاهل:</strong> {p.age ? (p.single ? "مجرد" : "متاهل") : "نامشخص"}</li>
        <li><strong>🎓 تحصیلات:</strong> {p.education || "—"}</li>
        <li><strong>🅰️ معدل دیپلم:</strong> {p.diplomaAverage || "—"}</li>
        <li><strong>📚 رشته:</strong> {p.field || "—"}</li>
        <li><strong>📞 تلفن:</strong> {p.phone || "—"}</li>
        <li><strong>🏙️ شهر:</strong> {p.city || "—"}</li>
        <li><strong>🗺️ استان:</strong> {p.province || "—"}</li>
        {/* <li><strong>💼 شماره دانشجویی:</strong> {p.jobPosition || "—"}</li> */}
      </ul>
    </div>
  );
};

export default UserProfileCard;
