import { useEffect, useMemo, useState } from "react";
import * as API from "../../services/api";
import { useNavigate } from "react-router-dom";
import "../../styles/CompleteProfilePage.css";
import { useAuth } from "../../context/AuthContext";

// Persian/Arabic digits -> English
const toEnDigits = (str = "") =>
  String(str).replace(/[۰-۹٠-٩]/g, d => "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(d) % 10);

// trim + collapse spaces
const cleanText = (s = "") => toEnDigits(s).replace(/\s+/g, " ").trim();

const isEmpty = (v) => v === null || v === undefined || String(v).trim() === "";

// Iran National ID validation
const isValidIranNationalId = (raw) => {
  const s = toEnDigits(raw).replace(/\D/g, "");
  if (!/^\d{10}$/.test(s)) return false;
  const check = +s[9];
  const sum =
    s.slice(0, 9).split("").reduce((acc, n, i) => acc + (+n * (10 - i)), 0) % 11;
  return (sum < 2 && check === sum) || (sum >= 2 && check === 11 - sum);
};

// Iranian mobile format
const isValidIranMobile = (raw) => {
  const s = toEnDigits(raw).replace(/\s|-/g, "");
  return /^09\d{9}$/.test(s) || /^\+989\d{9}$/.test(s);
};

// username: 3–30 [a-z0-9._], start/end alnum
const isValidUsername = (u) =>
  /^[a-z0-9](?:[a-z0-9._]{1,28})[a-z0-9]$/i.test(u);

// age: 10–100
const isValidAge = (a) => {
  const n = Number(toEnDigits(a));
  return Number.isInteger(n) && n >= 10 && n <= 100;
};

// GPA 0–20 (2 decimals allowed)
const isValidGPA20 = (v) => {
  const n = Number(toEnDigits(v));
  return Number.isFinite(n) && n >= 0 && n <= 20;
};

const CompleteProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initial = useMemo(() => ({
    userId: user?._id || user?.id || "",
    fullName: user?.profile?.fullName || "",
    nationalId: "",
    username: user?.username || "",
    age: "",
    fathersJob: "",
    gender: "مرد",
    single: true,               // boolean in state
    education: "",
    diplomaAverage: "",
    field: "",
    fieldOther: "",             // for "دیگر"
    phone: "",
    city: "",
    province: "",
    jobPosition: "دانشجو",
  }), [user]);

  const [formData, setFormData] = useState(initial);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData(initial);
    setErrors({});
    setTouched({});
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "single") {
      setFormData((p) => ({ ...p, single: value === "true" }));
      return;
    }
    if (name === "age") {
      const v = toEnDigits(value).replace(/[^\d]/g, "");
      setFormData((p) => ({ ...p, age: v }));
      return;
    }
    if (name === "diplomaAverage") {
      const v = toEnDigits(value).replace(/[^.\d]/g, "");
      setFormData((p) => ({ ...p, diplomaAverage: v }));
      return;
    }
    if (name === "nationalId") {
      const v = toEnDigits(value).replace(/[^\d]/g, "").slice(0, 10);
      setFormData((p) => ({ ...p, nationalId: v }));
      return;
    }
    if (name === "phone") {
      const v = toEnDigits(value).replace(/[^+\d]/g, "").replace(/(?!^)\+/g, "");
      setFormData((p) => ({ ...p, phone: v }));
      return;
    }
    if (name === "field") {
      setFormData((p) => ({ ...p, field: value, fieldOther: value === "دیگر" ? p.fieldOther : "" }));
      return;
    }
    if (name === "fieldOther") {
      setFormData((p) => ({ ...p, fieldOther: cleanText(value) }));
      return;
    }

    setFormData((p) => ({ ...p, [name]: cleanText(value) }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors(validate({ ...formData }));
  };

  const validate = (data) => {
    const err = {};

    if (isEmpty(data.fullName) || data.fullName.length < 3) {
      err.fullName = "نام و نام خانوادگی را کامل وارد کنید.";
    }
    if (isEmpty(data.username) || !isValidUsername(data.username)) {
      err.username = "نام کاربری ۳ تا ۳۰ کاراکتر (حروف/عدد/نقطه/زیرخط) و با حرف/عدد شروع/تمام شود.";
    }
    if (isEmpty(data.nationalId) || !isValidIranNationalId(data.nationalId)) {
      err.nationalId = "کد ملی معتبر نیست.";
    }
    if (isEmpty(data.age) || !isValidAge(data.age)) {
      err.age = "سن باید عددی بین 10 تا 100 باشد.";
    }
    if (isEmpty(data.fathersJob) || data.fathersJob.length < 2) {
      err.fathersJob = "شغل پدر را وارد کنید.";
    }
    if (!["مرد", "زن", "دیگر"].includes(data.gender)) {
      err.gender = "جنسیت را انتخاب کنید.";
    }
    if (isEmpty(data.education)) {
      err.education = "میزان تحصیلات را انتخاب کنید.";
    }
    if (isEmpty(data.field)) {
      err.field = "رشته تحصیلی را انتخاب کنید.";
    } else if (data.field === "دیگر" && isEmpty(data.fieldOther)) {
      err.fieldOther = "رشته تحصیلی را بنویسید.";
    }
    if (isEmpty(data.diplomaAverage) || !isValidGPA20(data.diplomaAverage)) {
      err.diplomaAverage = "معدل دیپلم باید بین 0 تا 20 باشد.";
    }
    if (isEmpty(data.phone) || !isValidIranMobile(data.phone)) {
      err.phone = "شماره تماس معتبر وارد کنید (مثال: 0912xxxxxxx یا +98912xxxxxxx).";
    }
    if (isEmpty(data.province)) err.province = "استان را وارد کنید.";
    if (isEmpty(data.city)) err.city = "شهر را وارد کنید.";

    return err;
  };

  const isFormValid = useMemo(() => {
    const e = validate(formData);
    return Object.keys(e).length === 0;
  }, [formData]);

  const buildPayload = () => {
    const fieldFinal = formData.field === "دیگر" ? formData.fieldOther : formData.field;
    return {
      // keep API contract the same
      userId: formData.userId || user?._id || user?.id,
      username: cleanText(formData.username),
      profile: {
        fullName: cleanText(formData.fullName),
        nationalId: toEnDigits(formData.nationalId),
        age: formData.age ? Number(toEnDigits(formData.age)) : null,
        fathersJob: cleanText(formData.fathersJob),
        gender: formData.gender,
        single: !!formData.single,
        education: formData.education,
        diplomaAverage: formData.diplomaAverage === "" ? null : Number(toEnDigits(formData.diplomaAverage)),
        field: fieldFinal,
        phone: toEnDigits(formData.phone),
        city: cleanText(formData.city),
        province: cleanText(formData.province),
        jobPosition: cleanText(formData.jobPosition || "دانشجو"),
      },
    };
  };

  const alertErrors = (errs) => {
    const lines = Object.values(errs);
    if (lines.length) {
      alert("لطفاً موارد زیر را اصلاح کنید:\n\n- " + lines.join("\n- "));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const eMap = validate(formData);
    setErrors(eMap);
    setTouched(Object.keys(formData).reduce((a, k) => (a[k] = true, a), {}));

    if (Object.keys(eMap).length > 0) {
      alertErrors(eMap);            // 🔔 show all messages
      return;
    }

    const payload = buildPayload();
    // console.log("[completeProfile] payload →", payload);

    try {
      setSubmitting(true);
      const response = await API.completeProfile(payload); // ✅ API call unchanged

      const status = response?.message?.status || response?.status || "";
      if (String(status).toLowerCase() === "success") {
        alert("پروفایل شما با موفقیت تکمیل شد.");
        navigate("/dashboard");
        window.location.reload();
      } else {
        alert(response?.message?.text || "خطا در ارسال اطلاعات.");
        console.warn("Server response:", response);
      }
    } catch (error) {
      console.error("Submit failed:", {
        msg: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });
      alert("مشکلی در برقراری ارتباط با سرور پیش آمده است.");
    } finally {
      setSubmitting(false);
    }
  };

  const FieldError = ({ name }) =>
    touched[name] && errors[name] ? (
      <small className="field-error" id={`${name}-error`}>{errors[name]}</small>
    ) : null;

  return (
    <div className="profile-container" dir="rtl">
      <h2>تکمیل اطلاعات فردی</h2>

      <form className="profile-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="fullName">نام و نام خانوادگی</label>
          <input
            id="fullName" type="text" name="fullName"
            value={formData.fullName} onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.fullName} aria-describedby="fullName-error"
            autoComplete="name" required
          />
          <FieldError name="fullName" />
        </div>

        <div className="form-group">
          <label htmlFor="username">نام کاربری</label>
          <input
            id="username" type="text" name="username"
            value={formData.username} onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.username} aria-describedby="username-error"
            inputMode="latin" autoComplete="username" required
            placeholder="english_only (3-30)"
          />
          <FieldError name="username" />
        </div>

        <div className="form-group">
          <label htmlFor="nationalId">کد ملی</label>
          <input
            id="nationalId" type="text" name="nationalId"
            value={formData.nationalId} onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.nationalId} aria-describedby="nationalId-error"
            inputMode="numeric" pattern="\d{10}" placeholder="۱۰ رقمی" required
          />
          <FieldError name="nationalId" />
        </div>

        <div className="form-group">
          <label htmlFor="age">سن</label>
          <input
            id="age" type="number" name="age"
            value={formData.age} onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.age} aria-describedby="age-error"
            inputMode="numeric" min={10} max={100} step={1} required
          />
          <FieldError name="age" />
        </div>

        <div className="form-group">
          <label htmlFor="fathersJob">شغل پدر</label>
          <input
            id="fathersJob" type="text" name="fathersJob"
            value={formData.fathersJob} onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.fathersJob} aria-describedby="fathersJob-error"
            required
          />
          <FieldError name="fathersJob" />
        </div>

        <div className="form-group">
          <label htmlFor="single">وضعیت تأهل</label>
          <select
            id="single" name="single" value={String(formData.single)}
            onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.single} aria-describedby="single-error" required
          >
            <option value="true">مجرد</option>
            <option value="false">متأهل</option>
          </select>
          <FieldError name="single" />
        </div>

        <div className="form-group">
          <label htmlFor="gender">جنسیت</label>
          <select
            id="gender" name="gender" value={formData.gender}
            onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.gender} aria-describedby="gender-error" required
          >
            <option value="مرد">مرد</option>
            <option value="زن">زن</option>
            <option value="دیگر">دیگر</option>
          </select>
          <FieldError name="gender" />
        </div>

        <div className="form-group">
          <label htmlFor="education">میزان تحصیلات</label>
          <select
            id="education" name="education" value={formData.education}
            onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.education} aria-describedby="education-error" required
          >
            <option value="" disabled>انتخاب کنید</option>
            <option value="دیپلم">دیپلم</option>
            <option value="کارشناسی">کارشناسی</option>
            <option value="کارشناسی ارشد">کارشناسی ارشد</option>
            <option value="دکتری">دکتری</option>
            <option value="دیگر">دیگر</option>
          </select>
          <FieldError name="education" />
        </div>

        <div className="form-group">
          <label htmlFor="field">رشته تحصیلی در دوره دوم متوسطه</label>
          <select
            id="field" name="field" value={formData.field}
            onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.field} aria-describedby="field-error" required
          >
            <option value="" disabled>انتخاب کنید</option>
            <option value="ریاضی فیزیک">ریاضی فیزیک</option>
            <option value="علوم تجربی">علوم تجربی</option>
            <option value="انسانی">انسانی</option>
            <option value="دیگر">دیگر</option>
          </select>
          <FieldError name="field" />

          {formData.field === "دیگر" && (
            <div className="form-group" style={{ marginTop: 8 }}>
              <label htmlFor="fieldOther">رشته تحصیلی خود را وارد کنید</label>
              <input
                id="fieldOther" type="text" name="fieldOther"
                value={formData.fieldOther} onChange={handleChange} onBlur={handleBlur}
                aria-invalid={!!errors.fieldOther} aria-describedby="fieldOther-error" required
              />
              <FieldError name="fieldOther" />
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="diplomaAverage">معدل دیپلم (۰ تا ۲۰)</label>
          <input
            id="diplomaAverage" type="number" inputMode="decimal" name="diplomaAverage"
            value={formData.diplomaAverage} onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.diplomaAverage} aria-describedby="diplomaAverage-error"
            min={0} max={20} step={0.01} placeholder="مثلاً 18.25" required
          />
          <FieldError name="diplomaAverage" />
        </div>

        <div className="form-group">
          <label htmlFor="phone">شماره تماس</label>
          <input
            id="phone" type="tel" name="phone"
            value={formData.phone} onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.phone} aria-describedby="phone-error"
            inputMode="tel" placeholder="0912xxxxxxx یا +98912" required
          />
          <FieldError name="phone" />
        </div>

        <div className="form-group">
          <label htmlFor="province">استان</label>
          <input
            id="province" type="text" name="province"
            value={formData.province} onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.province} aria-describedby="province-error"
            required
          />
          <FieldError name="province" />
        </div>

        <div className="form-group">
          <label htmlFor="city">شهر</label>
          <input
            id="city" type="text" name="city"
            value={formData.city} onChange={handleChange} onBlur={handleBlur}
            aria-invalid={!!errors.city} aria-describedby="city-error"
            required
          />
          <FieldError name="city" />
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={!isFormValid || submitting}
          aria-disabled={!isFormValid || submitting}
        >
          {submitting ? "در حال ارسال..." : "ثبت اطلاعات"}
        </button>
      </form>
    </div>
  );
};

export default CompleteProfilePage;
