import { useState } from "react";
import * as API from "../../services/api"; // your axios setup
import { useNavigate } from "react-router-dom";
import "../../styles/CompleteProfilePage.css";
import { useAuth } from "../../context/AuthContext";

const CompleteProfilePage = () => {
    const{ user} = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
    userId: user.id,
    fullName: user.profile.fullName,
    nationalId: "",
    age: "",
    gender: "",
    single: true,
    education: "",
    field: "",
    phone: "",
    city: "",
    province: "",
    jobPosition: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allRequiredFieldsFilled = Object.entries(formData)
      .filter(([key]) => key !== "jobPosition" && key !== "fullName") // exclude jobPosition
      .every(([_, value]) => value !== "");

    if (!allRequiredFieldsFilled) {
      alert("لطفاً همه فیلدهای الزامی را پر کنید.");
      return;
    }

    try {
      const response = await API.completeProfile(formData);
        
      if (response?.message?.status === "success") {
        alert("پروفایل شما با موفقیت تکمیل شد.");
        console.log("اطلاعات ارسال شد:", response);
        navigate("/dashboard");
      } else {
        alert(response?.message.text || "خطا در ارسال اطلاعات.");
        console.warn("Server response:", response);
      }
    } catch (error) {
      console.error("خطا در ارسال اطلاعات:", error);
      alert("مشکلی در برقراری ارتباط با سرور پیش آمده است.");
    }
  };

  return (
    <div className="profile-container">
      <h2>تکمیل اطلاعات فردی</h2>
      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>نام و نام خانوادگی</label>
          <input name="fullName" value={user.profile.fullName} onChange={handleChange} />
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
          <label>وضعیت تاهل</label>
          <input type="boolean" name="single" value={formData.single} onChange={handleChange} />
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
          <select name="education" value={formData.education} onChange={handleChange}>
            <option value="">انتخاب کنید</option>
            <option value="دیپلم">دیپلم</option>
            <option value="کارشناسی">کارشناسی</option>
            <option value="کارشناسی ارشد">کارشناسی ارشد</option>
            <option value="دکتری">دکتری</option>
            <option value="دیگر">دیگر</option>
          </select>
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
          <label>سمت شغلی</label>
          <input name="jobPosition" value={formData.jobPosition} onChange={handleChange} />
        </div>
        <button type="submit" className="submit-button">ثبت اطلاعات</button>
      </form>
    </div>
  );
};

export default CompleteProfilePage;
