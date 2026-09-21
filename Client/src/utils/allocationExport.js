export const ALLOCATION_REASON_LABELS = {
  TOP_RECOMMENDATION: "تخصیص مطابق پیشنهاد اول سیستم",
  CAPACITY_FULL: "ظرفیت پیشنهادهای بالاتر تکمیل شده است",
  INSUFFICIENT_DATA: "اطلاعات کافی برای تخصیص وجود ندارد",
  LOW_MATCH_SCORE: "امتیاز تطابق کمتر از حداقل تعیین‌شده است",
  NO_ELIGIBLE_JOB: "رشته واجد شرایطی یافت نشد",
  ASSIGNED_ELSEWHERE: "فرد در رشته دیگری تخصیص یافته است",
  HARD_REQUIREMENT_FAILED: "الزامات قطعی رشته تأمین نشده است",
};

const percent = (value) => Math.round((Number(value) <= 1 ? Number(value) * 100 : Number(value)) * 100) / 100 || 0;
const score = (value) => Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 100) / 100));
const reason = (code) => ALLOCATION_REASON_LABELS[code] || code || "-";

export function buildAllocationSheets(result = {}, selectedUsers = []) {
  const userMap = new Map(selectedUsers.map((user) => [String(user._id || user.id), user]));
  const candidates = result.candidates || [];
  const jobs = result.jobs || [];

  const summary = candidates.map((candidate, index) => {
    const user = userMap.get(String(candidate.userId)) || {};
    const profile = user.profile || {};
    const rec = candidate.recommendations || [];
    return {
      "ردیف": index + 1,
      "نام و نام خانوادگی": candidate.fullName || profile.fullName || candidate.username,
      "نام کاربری": candidate.username || user.username,
      "رشته تحصیلی": candidate.field || profile.field || profile.major || "-",
      "دوره": user.period || "-",
      "تکمیل اطلاعات (%)": percent(candidate.dataCompleteness),
      "پیشنهاد اول سیستم": rec[0]?.job || "-",
      "امتیاز پیشنهاد اول": score(rec[0]?.matchScore),
      "پیشنهاد دوم سیستم": rec[1]?.job || "-",
      "امتیاز پیشنهاد دوم": score(rec[1]?.matchScore),
      "پیشنهاد سوم سیستم": rec[2]?.job || "-",
      "امتیاز پیشنهاد سوم": score(rec[2]?.matchScore),
      "تخصیص نهایی": candidate.finalAllocation?.job || "-",
      "امتیاز تخصیص": score(candidate.finalAllocation?.matchScore),
      "وضعیت": candidate.status === "ASSIGNED" ? "تخصیص‌یافته" : "بدون تخصیص",
      "دلیل": reason(candidate.finalAllocation?.reasonCode || candidate.reasonCode),
    };
  });

  const rankings = jobs.flatMap((job) => (job.ranking || []).map((entry) => ({
    "رشته": job.job,
    "رتبه فرد در رشته": entry.rank,
    "نام": entry.fullName || entry.username,
    "امتیاز تطابق": score(entry.matchScore),
    "تکمیل اطلاعات (%)": percent(entry.dataCompleteness),
    "واجد شرایط": entry.eligible ? "بله" : "خیر",
    "تخصیص نهایی": entry.finalAssignment || "-",
  })));

  const waitlist = jobs.flatMap((job) => (job.waitlist || []).map((entry, index) => ({
    "رشته": job.job,
    "رتبه انتظار": index + 1,
    "رتبه فرد در رشته": entry.rank,
    "نام": entry.fullName || entry.username,
    "امتیاز تطابق": score(entry.matchScore),
    "تکمیل اطلاعات (%)": percent(entry.dataCompleteness),
    "دلیل": reason(entry.reasonCode),
  })));

  const unassigned = candidates.filter((candidate) => !candidate.finalAllocation).map((candidate) => ({
    "نام": candidate.fullName || candidate.username,
    "پیشنهاد اول سیستم": candidate.recommendations?.[0]?.job || "-",
    "امتیاز": score(candidate.recommendations?.[0]?.matchScore),
    "تکمیل اطلاعات (%)": percent(candidate.dataCompleteness),
    "دلیل": reason(candidate.reasonCode),
  }));

  const details = candidates.flatMap((candidate) => (candidate.recommendations || []).flatMap((recommendation) =>
    (recommendation.components || []).map((component) => ({
      "فرد": candidate.fullName || candidate.username,
      "رشته": recommendation.job,
      "رتبه پیشنهاد": recommendation.rank,
      "امتیاز نهایی تطابق": score(recommendation.matchScore),
      "مولفه": component.label || component.key,
      "امتیاز خام": component.rawScore ?? 0,
      "امتیاز نرمال": score(component.normalizedScore ?? component.score),
      "وزن": component.weight ?? 0,
      "سهم وزنی": score(component.weightedContribution ?? component.contribution),
    }))
  ));

  return [
    ["خلاصه تخصیص نهایی", summary],
    ["رتبه‌بندی رشته‌ها", rankings],
    ["لیست انتظار", waitlist],
    ["بدون تخصیص", unassigned],
    ["جزئیات امتیاز", details],
  ];
}
