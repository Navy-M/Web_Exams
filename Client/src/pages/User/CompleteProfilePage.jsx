import { useState } from "react";
import * as API from "../../services/api"; // your axios setup
import { useNavigate } from "react-router-dom";
import "../../styles/CompleteProfilePage.css";

const CompleteProfilePage = () => {
  const [formData, setFormData] = useState({
    name: "",
    family: "",
    nationalId: "",
    age: "",
    gender: "",
    education: "",
    field: "",
    phone: "",
    city: "",
    province: "",
    organization: "",
    jobPosition: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("اطلاعات ارسال شد:", formData);
    // اینجا می‌تونی API برای ارسال به سرور بزنی
  };

  return (
    <div className="profile-container">
      <h2>تکمیل اطلاعات فردی</h2>
      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>نام</label>
          <input name="name" value={formData.name} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>نام خانوادگی</label>
          <input name="family" value={formData.family} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>کد ملی</label>
          <input name="nationalId" value={formData.nationalId} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>سن</label>
          <input type="number" name="age" value={formData.age} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>جنسیت</label>
          <select name="gender" value={formData.gender} onChange={handleChange}>
            <option value="">انتخاب کنید</option>
            <option value="مرد">مرد</option>
            <option value="زن">زن</option>
            <option value="دیگر">دیگر</option>
          </select>
        </div>
        <div className="form-group">
          <label>تحصیلات</label>
          <input name="education" value={formData.education} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>رشته تحصیلی</label>
          <input name="field" value={formData.field} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>شماره تماس</label>
          <input name="phone" value={formData.phone} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>استان</label>
          <input name="province" value={formData.province} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>شهر</label>
          <input name="city" value={formData.city} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>سازمان/شرکت</label>
          <input name="organization" value={formData.organization} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>سمت شغلی</label>
          <input name="jobPosition" value={formData.jobPosition} onChange={handleChange} />
        </div>
        <button type="submit" className="submit-button">ثبت اطلاعات</button>
      </form>
    </div>
  );
};

export default CompleteProfilePage;
