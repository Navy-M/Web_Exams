export const Test_Cards = [
  {
    id: "DISC",
    icon: "/icons/disc.png",
    name: "آزمون DISC",
    description: "شخصیت خود را از طریق مدل DISC بشناسید.",
    type: "personality",
    questionFormat: "multipleChoiceTrait", // Options with associated traits
    createdAt: "2025-05-29T11:11:16.374+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 8, to: 9 },
  },

  {
    id: "HOLLAND",
    icon: "/icons/holland.png",
    name: "آزمون هالند",
    description: "تیپ شغلی خود را با آزمون هالند شناسایی کنید.",
    type: "interest",
    questionFormat: "yesNo",
    createdAt: "2025-05-13T04:14:16.374+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 11, to: 12 },
  },

  {
    id: "GARDNER",
    icon: "/icons/gardner.png",
    name: "آزمون هوش‌های چندگانه گاردنر",
    description: "سطح هوش‌های مختلف خود را ارزیابی کنید.",
    type: "intelligence",
    questionFormat: "likert",
    createdAt: "2025-05-05T16:11:16.374+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 13, to: 14 },
  },

  {
    id: "MBTI",
    icon: "/icons/mbti.png",
    name: "آزمون MBTI",
    description: "با شاخص تیپ‌های مایرز-بریگز، تیپ شخصیتی خود را بشناسید.",
    type: "personality",
    questionFormat: "eitherOr",
    createdAt: "2025-05-20T23:12:16.374+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 16, to: 17 },
  },

  {
    id: "CLIFTON",
    icon: "/icons/clifton.png",
    name: "آزمون نقاط قوت کلیفتون",
    description:
      "نقاط قوت غالب خود را با استفاده از ارزیابی کلیفتون شناسایی کنید.",
    type: "strengths",
    questionFormat: "pairedStatementChoice", // Two statements per question, choose one
    createdAt: "2025-06-03T11:11:16.374+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 14, to: 15 }, // Typically takes a bit longer than DISC
  },
  {
    id: "GHQ",
    icon: "/icons/ghq.png",
    name: "آزمون سلامت عمومی (GHQ)",
    description:
      "سلامت روان و عمومی خود را با پرسشنامه سلامت عمومی ارزیابی کنید.",
    type: "psychological",
    questionFormat: "likert", // Likert-scale questions for health assessment
    createdAt: "2025-07-01T10:00:00.000+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 2, to: 3 },
  },
  {
    id: "PERSONAL_FAVORITES",
    icon: "/icons/personal_favorites.png",
    name: "آزمون اولویت‌های شخصی",
    description: "علایق و اولویت‌های شخصی خود را شناسایی کنید.",
    type: "interest",
    questionFormat: "multipleChoice", // Choose from a list of preferences
    createdAt: "2025-07-10T14:30:00.000+00:00",
    deadline: "2025-10-20T17:30:00Z",
    duration: { from: 2, to: 3 },
  },
];

// export const jobRequirements = {
//   "ناوبری و فرماندهی کشتی": {
//     disc: ["High D", "High C"],
//     mbti: ["INTJ", "ENTJ", "ISTJ"],
//     holland: ["I", "C", "E"],
//     gardner: ["S", "M", "L"],
//     clifton: ["Responsibility", "Command", "Analytical", "Context"],
//   },
//   "مهندسی مکانیک و موتور دریایی": {
//     disc: ["High C", "High S"],
//     mbti: ["ISTP", "ESTJ", "INTJ"],
//     holland: ["R", "I"],
//     gardner: ["M", "B"],
//     clifton: ["Executing", "Restorative", "Deliberative", "Thinking"],
//   },
//   "مهندسی برق و الکترونیک دریایی": {
//     disc: ["High C", "High D"],
//     mbti: ["INTP", "ENTJ"],
//     holland: ["C", "I"],
//     gardner: ["S", "M"],
//     clifton: ["Executing", "Discpline", "Ideation", "Thinking"],
//   },
//   "تفنگدار دریایی": {
//     disc: ["High D", "High I"],
//     mbti: ["ISTP", "ESTP"],
//     holland: ["R", "E"],
//     gardner: ["I", "B"],
//     clifton: ["Executing", "Achiever", "Consistency"],
//   },
//   "کمیسر دریایی": {
//     disc: ["High I", "High S"],
//     mbti: ["ESFJ", "ESTJ"],
//     holland: ["E", "C"],
//     gardner: ["L", "I"],
//     clifton: ["Influencing", "Relator", "Connectedness", "Adaptability"],
//   },
// };


// jobRequirements.v2.js

/** پیش‌فرض‌های تفسیر "High/Low" در DISC */
export const DISC_THRESHOLDS = {
  high: 65, // ≥ 65% یعنی High
  low: 35,  // ≤ 35% یعنی Low (فعلاً استفاده نمی‌کنیم اما نگه دارید)
};

/** وزن‌دهی کلی تست‌ها در محاسبه‌ی FitScore (قابل override per job) */
export const DEFAULT_WEIGHTS = {
  disc: 0.25,
  mbti: 0.15,
  holland: 0.20,
  gardner: 0.10,
  clifton: 0.25,
  pf: 0.05, // Personal Favorites
};



/* ===================== DATA ===================== */
export const jobRequirements = {
  "ناوبری و فرماندهی کشتی": {
    summary: "رهبری عملیات پل فرماندهی، ناوبری امن، تصمیم‌گیری سریع در شرایط بحرانی.",
    altTitles: ["افسر عرشه", "کاپیتان کشتی (آتی)", "افسر دوم/سوم عرشه"],
    environment: ["Bridge", "Open Sea", "Night Watch"],
    watchPattern: "۴/۸ (چهارساعت کار/هشت‌ساعت استراحت)",
    locationTypes: ["Ocean-going", "Coastal"],
    riskLevel: "High",
    travel: "High",
    physicalDemands: { fitness: "Medium", colorVision: true, seaSicknessTolerance: true },
    certifications: [
      "STCW II/1 OOW (Deck)",
      "GMDSS GOC",
      "BRM/BTM (Bridge Resource/Team Management)",
      "ECDIS",
      "Radar/ARPA",
      "Medical First Aid",
    ],
    education: ["انسانی", "تجربی"],
    experienceMinYears: 1,
    languages: [{ lang: "English", level: "B2+" }],
    tools: ["ECDIS", "ARPA", "AIS", "GMDSS"],
    hardSkills: [
      "ناوبری الکترونیک و کلاسیک",
      "مدیریت ترافیک دریایی و COLREG",
      "طرح‌ریزی سفر (Passage Planning)",
      "مدیریت ریسک و BRM/CRM",
    ],
    softSkills: ["تصمیم‌گیری", "رهبری", "هوشیاری موقعیتی", "ارتباط مؤثر"],
    mustHave: ["ECDIS", "GMDSS", "آشنایی با COLREG"],
    niceToHave: ["DP Awareness", "Polar Code Awareness"],

    // --- الزامات روان‌سنجی/ترجیحات ---
    disc: {
      require: ["High D"],      // الزامی
      prefer:  ["High C", "High D"],
      thresholds: { ...DISC_THRESHOLDS, high: 65 },
    },
    mbti: { prefer: ["INTJ", "ENTJ", "ISTJ"] },
    holland: { top3: ["I", "C", "E"] },
    gardner: { prefer: ["S", "M", "L"] }, // فضایی، منطقی-ریاضی، کلامی
    clifton: {
      domainsPrefer: ["Executing", "Influencing", "Strategic"],
      themesPrefer: ["Responsibility", "Command", "Analytical", "Context", "Discipline"],
      themesAvoid: ["Harmony"],
    },
    pf: {
      itemIdsPrefer: [3, 4, 12],
      keywords: ["ناوبری", "مسئولیت", "تصمیم‌گیری", "شیفت شب"],
    },

    weights: { ...DEFAULT_WEIGHTS, disc: 0.28, clifton: 0.27, holland: 0.2, mbti: 0.15, gardner: 0.07, pf: 0.03 },

    benchmark: {
      disc: { D: 72, I: 45, S: 48, C: 66 },
      mbti: ["INTJ", "ENTJ", "ISTJ"],
      holland: { R: 45, I: 70, A: 35, S: 40, E: 60, C: 68 },
      gardner: { L: 65, M: 78, S: 75, B: 55, Mu: 40, I: 58, In: 62, N: 45 },
      clifton: {
        themes: { Command: 80, Responsibility: 78, Context: 70, Analytical: 72, Discipline: 68 },
        domains: { Executing: 75, Influencing: 68, Strategic: 70, Relationship: 55 },
      },
    },
  },

  "مهندسی مکانیک و موتور دریایی": {
    summary: "نگهداشت و تعمیرات موتورخانه، سیستم‌های پیشرانش و کمکی، عیب‌یابی تحت فشار.",
    altTitles: ["افسر موتورخانه", "مهندس موتور دریایی"],
    environment: ["Engine Room", "Workshop", "Watchkeeping"],
    watchPattern: "۴/۸ یا UMS (بدون نگهبانی ثابت)",
    locationTypes: ["Ocean-going"],
    riskLevel: "High",
    travel: "High",
    physicalDemands: { fitness: "High", heatTolerance: true, hearingProtection: true },
    certifications: [
      "STCW III/1 OOW (Engine)",
      "ER Management (ERM)",
      "High Voltage (if applicable)",
      "Refrigeration/Air-Condition",
      "Medical First Aid",
    ],
    education: ["فنی حرفه ای", "ریاضی فیزیک", "علوم تجربی"],
    experienceMinYears: 1,
    languages: [{ lang: "English", level: "B1+" }],
    tools: ["CMMS", "Vibration Analysis", "Alignment Tools", "Boroscope"],
    hardSkills: [
      "PM/CM موتور اصلی و دیزل ژنراتور",
      "سیستم‌های سوخت/روغن/خنک‌کاری",
      "آشنایی P&ID و نقشه‌خوانی",
      "عیب‌یابی مکانیکی و پایش وضعیت",
    ],
    softSkills: ["دقت", "کار تیمی", "حل مسئله", "مدیریت زمان"],

    disc: { prefer: ["High C", "High S"], thresholds: DISC_THRESHOLDS },
    mbti: { prefer: ["ISTP", "ESTJ", "INTJ"] },
    holland: { top3: ["R", "I"] },
    gardner: { prefer: ["M", "B"] }, // منطقی-ریاضی، بدنی-جنبشی
    clifton: {
      domainsPrefer: ["Executing", "Strategic"],
      themesPrefer: ["Restorative", "Deliberative", "Discipline", "Analytical", "Responsibility"],
    },
    pf: { keywords: ["PM/CM", "Engine Room", "عیب‌یابی", "P&ID"], itemIdsPrefer: [] },

    weights: { ...DEFAULT_WEIGHTS, clifton: 0.28, disc: 0.23, holland: 0.22 },

    benchmark: {
      disc: { D: 48, I: 35, S: 62, C: 72 },
      holland: { R: 78, I: 70, A: 30, S: 45, E: 35, C: 65 },
      gardner: { M: 80, B: 72, S: 55, L: 50 },
      clifton: {
        themes: { Restorative: 80, Discipline: 74, Deliberative: 70, Analytical: 72, Responsibility: 68 },
        domains: { Executing: 76, Strategic: 64, Relationship: 48, Influencing: 42 },
      },
    },
  },

  "مهندسی برق و الکترونیک دریایی": {
    summary: "نگهداشت و عیب‌یابی سامانه‌های برق/الکترونیک کشتی، ناوبری و اتوماسیون.",
    altTitles: ["Electro-Technical Officer (ETO)"],
    environment: ["Engine Control Room", "Bridge/Radio Room", "Panels"],
    watchPattern: "Daywork + On-call",
    locationTypes: ["Ocean-going"],
    riskLevel: "Medium",
    travel: "High",
    physicalDemands: { fitness: "Medium", colorVision: true, fineMotor: true },
    certifications: [
      "STCW III/6 Electro-Technical Officer",
      "High Voltage",
      "GMDSS Maintenance (مزیت)",
      "Automation/PLC (مزیت)",
    ],
    education: ["فنی حرفه ای", "ریاضی فیزیک", "علوم تجربی"],
    experienceMinYears: 1,
    languages: [{ lang: "English", level: "B2+" }],
    tools: ["Multimeter", "Insulation Tester", "Oscilloscope", "PLC Software"],
    hardSkills: [
      "عیب‌یابی تابلوها، ژنراتورها و توزیع",
      "سنسورها/اکچویتورها و اتوماسیون",
      "شبکه‌ها و ارتباطات صنعتی",
      "NAV/COM basics (ECDIS/AIS/Radar) مزیت",
    ],
    softSkills: ["تفکر سیستمی", "دقت", "مستندسازی", "حل مسئله"],

    disc: { prefer: ["High C", "High D"], thresholds: DISC_THRESHOLDS },
    mbti: { prefer: ["INTP", "ENTJ", "ISTJ"] },
    holland: { top3: ["C", "I", "R"] },
    gardner: { prefer: ["S", "M"] }, // فضایی، منطقی-ریاضی
    clifton: {
      domainsPrefer: ["Executing", "Strategic"],
      themesPrefer: ["Analytical", "Context", "Discipline", "Restorative", "Learner", "Ideation"],
    },
    pf: { keywords: ["PLC", "HV", "Automation", "NAV/COM"], itemIdsPrefer: [] },

    weights: { ...DEFAULT_WEIGHTS, clifton: 0.28, holland: 0.22, disc: 0.22 },

    benchmark: {
      disc: { D: 55, I: 38, S: 52, C: 74 },
      holland: { R: 55, I: 72, A: 30, S: 40, E: 38, C: 78 },
      gardner: { M: 78, S: 76, L: 55 },
      clifton: {
        themes: { Analytical: 80, Discipline: 72, Learner: 70, Restorative: 66, Context: 64, Ideation: 60 },
        domains: { Executing: 72, Strategic: 70, Relationship: 50, Influencing: 42 },
      },
    },
  },

  "تفنگدار دریایی": {
    summary: "امنیت، عملیات تاکتیکی، واکنش سریع، حفاظت از کشتی و تأسیسات.",
    altTitles: ["Maritime Security", "Ship Security Guard"],
    environment: ["Deck", "Perimeter", "Boarding Ops"],
    watchPattern: "Shift/Patrol",
    locationTypes: ["Ocean-going", "Port Facilities"],
    riskLevel: "Very High",
    travel: "High",
    physicalDemands: { fitness: "Very High", swim: true, firearmsSafety: true },
    certifications: [
      "STCW VI/6 (Security Awareness/Designated Duties)",
      "SSO (مزیت)",
      "First Aid/TRAUMA",
      "Use of Force (شرکتی/محلی)",
    ],
    education: ["انسانی"],
    experienceMinYears: 0,
    languages: [{ lang: "English", level: "B1+" }],
    tools: ["Comms", "Non-lethal equipment", "Surveillance"],
    hardSkills: ["قوانین درگیری (ROE)", "پایش محیطی", "کنترل جمعیت", "کمک‌های اولیه"],
    softSkills: ["خودکنترلی", "شجاعت مسئولانه", "کار تیمی", "ارتباط"],

    disc: { prefer: ["High D", "High I"], thresholds: DISC_THRESHOLDS },
    mbti: { prefer: ["ISTP", "ESTP"] },
    holland: { top3: ["R", "E"] },
    gardner: { prefer: ["I", "B"] }, // میان‌فردی، بدنی-جنبشی
    clifton: {
      domainsPrefer: ["Executing", "Influencing"],
      themesPrefer: ["Achiever", "SelfAssurance", "Command", "Consistency", "Responsibility"],
      themesAvoid: ["Harmony"],
    },
    pf: { keywords: ["امنیت", "گشت", "واکنش سریع"], itemIdsPrefer: [] },

    weights: { ...DEFAULT_WEIGHTS, disc: 0.30, clifton: 0.27 },

    benchmark: {
      disc: { D: 78, I: 62, S: 42, C: 40 },
      holland: { R: 80, E: 70, S: 35, I: 35, A: 25, C: 30 },
      gardner: { B: 80, I: 68, In: 55 },
      clifton: {
        themes: { Achiever: 78, SelfAssurance: 72, Command: 70, Responsibility: 64, Consistency: 58 },
        domains: { Executing: 76, Influencing: 70, Relationship: 48, Strategic: 46 },
      },
    },
  },

  "کمیسر دریایی": {
    summary: "پشتیبانی خدمه/مسافران، تدارکات، امور اداری و هماهنگی خدمات روی کشتی.",
    altTitles: ["Purser", "Catering/Hotel Manager (Marine)"],
    environment: ["Accommodation", "Office", "Stores"],
    watchPattern: "Daywork + On-call",
    locationTypes: ["Ocean-going", "Cruise/Ferry"],
    riskLevel: "Medium",
    travel: "High",
    physicalDemands: { fitness: "Medium" },
    certifications: [
      "STCW I/VI Basic Safety",
      "Crowd Management (برای کشتی‌های مسافربری)",
      "Food Safety/HACCP (مزیت)",
    ],
    education: [],
    experienceMinYears: 1,
    languages: [{ lang: "English", level: "B2+" }],
    tools: ["Inventory/POS", "Crew Management Systems"],
    hardSkills: ["تدارکات و انبار", "برنامه‌ریزی شیفت", "خدمات مسافر", "گزارش‌دهی مالی پایه"],
    softSkills: ["روابط عمومی", "همدلی", "حل تعارض", "سازمان‌دهی"],

    disc: { prefer: ["High I", "High S"], thresholds: DISC_THRESHOLDS },
    mbti: { prefer: ["ESFJ", "ESTJ"] },
    holland: { top3: ["E", "C", "S"] },
    gardner: { prefer: ["L", "I"] }, // کلامی-زبانی، میان‌فردی
    clifton: {
      domainsPrefer: ["Relationship", "Influencing", "Executing"],
      themesPrefer: ["Relator", "Connectedness", "Adaptability", "Positivity", "Arranger", "Responsibility"],
    },
    pf: { keywords: ["تدارکات", "خدمات", "هماهنگی"], itemIdsPrefer: [] },

    weights: { ...DEFAULT_WEIGHTS, gardner: 0.12, clifton: 0.26, disc: 0.22, holland: 0.20 },

    benchmark: {
      disc: { D: 42, I: 72, S: 66, C: 55 },
      holland: { E: 72, C: 65, S: 60, R: 35, I: 40, A: 45 },
      gardner: { I: 78, L: 72, In: 60 },
      clifton: {
        themes: { Relator: 78, Connectedness: 72, Adaptability: 70, Positivity: 66, Arranger: 62, Responsibility: 60 },
        domains: { Relationship: 78, Influencing: 64, Executing: 58, Strategic: 48 },
      },
    },
  },
};
