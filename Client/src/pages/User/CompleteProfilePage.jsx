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
    fullName: user.profile?.fullName || "",
    nationalId: "",
    username: user.username || "",
    age: 0,
    fathersJob: "",
    gender: "مرد",
    single: true,
    education: "",
    diplomaAverage: 0.0,
    field: "",
    phone: "",
    city: "",
    province: "",
    jobPosition: "دانشجو",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };
  
  const payload = {
  userId: formData.userId || user?._id || user?.id,
  username: formData.username,
  profile: {
    fullName: formData.fullName,
    nationalId: formData.nationalId,
    age: formData.age ? Number(formData.age) : null,
    fathersJob: formData.fathersJob,
    gender: formData.gender,
    single: String(formData.single) === 'true' || formData.single === true,
    education: formData.education,
    diplomaAverage: Number(formData.diplomaAverage) || null,
    field: formData.field,
    phone: formData.phone,
    city: formData.city,
    province: formData.province,
    jobPosition: formData.jobPosition,
  },
};


  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("[completeProfile] payload →", payload);


    const allRequiredFieldsFilled = Object.entries(formData)
      .filter(([key]) => key !== "jobPosition" && key !== "fullName") // exclude jobPosition
      .every(([_, value]) => value !== "");

    if (!allRequiredFieldsFilled) {
      alert("لطفاً همه فیلدهای الزامی را پر کنید.");
      return;
    }

    try {
      const response = await API.completeProfile(payload);
        
      if (response?.message?.status === "success") {
        alert("پروفایل شما با موفقیت تکمیل شد.");
        console.log("اطلاعات ارسال شد:", response);
        navigate("/dashboard");
        location.reload();
      } else {
        alert(response?.message.text || "خطا در ارسال اطلاعات.");
        console.warn("Server response:", response);
      }
    } catch (error) {
      // console.error("خطا در ارسال اطلاعات:", error);
      // Show useful details in console for mobile debugging
      console.error("Submit failed:", {
        msg: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });
      alert("مشکلی در برقراری ارتباط با سرور پیش آمده است.");
    }
  };

  return (
    <div className="profile-container">
      <h2>تکمیل اطلاعات فردی</h2>
      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>نام و نام خانوادگی</label>
          <input  type="text" name="fullName" value={formData.fullName} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>نام کاربری</label>
          <input  type="text" name="username" value={formData.username} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>کد ملی</label>
          <input  type="text" name="nationalId" value={formData.nationalId} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>سن</label>
          <input type="number" name="age" value={formData.age} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>شغل پدر</label>
          <input type="text" name="fathersJob" value={formData.fathersJob} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>وضعیت تاهل</label>
            <select
              type="boolean" 
              name="single"
              value={formData.single}
              onChange={handleChange}
            >
              <option value={true} >مجرد</option>
              <option value={false}>متاهل</option>
            </select>
        </div>
        <div className="form-group">
          <label>جنسیت</label>
          <select name="gender" value={formData.gender} onChange={handleChange}>
            <option value="مرد" >مرد</option>
            <option value="زن">زن</option>
            <option value="دیگر">دیگر</option>
          </select>
        </div>
          <div className="form-group">
          <label>میزان تحصیلات</label>
          <select name="education" value={formData.education} onChange={handleChange}>
            <option value="" disabled>انتخاب کنید</option>
            <option value="دیپلم">دیپلم</option>
            <option value="کارشناسی">کارشناسی</option>
            <option value="کارشناسی ارشد">کارشناسی ارشد</option>
            <option value="دکتری">دکتری</option>
            <option value="دیگر">دیگر</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>رشته تحصیلی در دوره دوم متوسطه</label>
          <select name="field" value={formData.field} onChange={handleChange}>
            <option value="" disabled>انتخاب کنید</option>
            <option value="ریاضی فیزیک">ریاضی فیزیک</option>
            <option value="علوم تجربی">علوم تجربی</option>
            <option value="انسانی">انسانی</option>
            <option value="دیگر">دیگر</option>
            
          </select>
            {formData.field === "دیگر" && 
              <div className="form-group">
                <label>رشته تحصیلی خود را اینجا وارد کنید</label>
                <input type="text" name="field" id="field" />
              </div>
            }
        </div>
        <div className="form-group">
          <label>معدل دیپلم</label>
          <input type="number" name="diplomaAverage" value={formData.diplomaAverage} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>شماره تماس</label>
          <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>استان</label>
          <input type="text" name="province" value={formData.province} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>شهر</label>
          <input type="text" name="city" value={formData.city} onChange={handleChange} />
        </div>
        {/* <div className="form-group">
          <label>شماره دانشجویی</label>
          <input type="text" name="jobPosition" value={formData.jobPosition} onChange={handleChange} />
        </div> */}
        <button  type="submit" className="submit-button">ثبت اطلاعات</button>
      </form>
    </div>
  );
};

export default CompleteProfilePage;
