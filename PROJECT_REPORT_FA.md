# گزارش فنی پروژه Web_Exams برای GPT و آماده‌سازی تحویل

تاریخ بررسی: 2026-09-04  
مسیر پروژه: `E:\cOOci Developer\Clients\Jenab Molavi\Web_Exams`  
هدف گزارش: توضیح ساختار، جریان کار، قراردادهای داده و نقاط پرریسک پروژه برای دیباگ، رفع باگ و آماده‌سازی تحویل به مشتری.

## 1. خلاصه پروژه

`Web_Exams` یک سامانه فارسی برای ثبت‌نام/ورود کاربران، تکمیل پروفایل، اجرای چند آزمون روان‌سنجی/شغلی، ذخیره نتایج، تحلیل نتایج توسط ادمین، ثبت بازخورد و اولویت‌بندی کاربران برای رسته‌های شغلی دریایی است.

پروژه دو بخش اصلی دارد:

- `Client`: رابط کاربری React با Vite.
- `Server`: API مبتنی بر Node.js, Express و MongoDB/Mongoose.

نقش‌های اصلی:

- `user`: تکمیل پروفایل، انجام آزمون، دیدن نتایج منتشرشده/ذخیره‌شده.
- `admin`: مشاهده کاربران، دیدن نتایج، اجرای تحلیل، حذف نتیجه/تحلیل، ثبت بازخورد، اولویت‌بندی شغلی.

آزمون‌های پشتیبانی‌شده:

- `MBTI`
- `DISC`
- `HOLLAND`
- `GARDNER`
- `CLIFTON`
- `GHQ`
- `PERSONAL_FAVORITES`

## 2. تکنولوژی‌ها

### Client

- React 18
- Vite 5
- React Router DOM 7
- Axios
- MUI و MUI X Data Grid
- Chart.js, react-chartjs-2, Recharts
- jsPDF, html2pdf.js, xlsx برای خروجی گزارش/PDF/Excel
- i18n دستی با فایل‌های `fa.json` و `en.json`
- localStorage برای token، theme، زبان، تب فعال و قفل/پیش‌نویس آزمون‌ها

### Server

- Node.js با ESM
- Express 5
- Mongoose/MongoDB
- JWT
- bcryptjs
- cookie-parser
- cors
- helmet
- express-rate-limit
- اسکریپت‌های seed، backup و export برای MongoDB

## 3. ساختار پوشه‌ها

### ریشه پروژه

- `Client/`: اپلیکیشن React.
- `Server/`: API و منطق backend.
- `README.md`: توضیح بسیار کوتاه پروژه.
- `structure.txt`: خروجی ساختار پروژه.
- `.gitignore`: `node_modules`, `dist`, `.env`, backup/exportها و لاگ‌ها را ignore می‌کند.

### Client

- `src/App.jsx`: تعریف routeهای اصلی و محافظت routeها.
- `src/main.jsx`: نقطه ورود React.
- `src/context/AuthContext.jsx`: وضعیت login/signup/logout و کاربر فعلی.
- `src/context/ThemeContext.jsx`: theme روشن/تاریک.
- `src/i18n/`: فایل‌های ترجمه و تابع `t`.
- `src/services/api.jsx`: wrapper اصلی Axios برای API.
- `src/services/dummyData.js`: metadata تست‌ها و `jobRequirements` سمت کلاینت.
- `src/services/storage.js`: localStorage با TTL.
- `src/pages/Public/`: صفحات login/signup/test list.
- `src/pages/User/`: داشبورد کاربر، تکمیل پروفایل، صفحه شروع آزمون.
- `src/pages/Admin/`: داشبورد ادمین، کاربران، وضعیت آزمون‌ها، مدیریت تست‌ها.
- `src/components/Tests/`: اجرای هر آزمون.
- `src/components/Common/analysis/`: نمایش تحلیل هر آزمون.
- `src/print/`: ساخت گزارش چاپ/PDF.
- `src/styles/`: CSSهای اصلی.
- `public/`: فونت، لوگو، آیکن تست‌ها و فایل‌های متنی سوالات/منابع.

### Server

- `server.js`: راه‌اندازی Express، CORS، Helmet، rate limit و routeها.
- `config/db.js`: اتصال MongoDB.
- `config/dummyData.js`: بانک سوال‌ها، کارت تست‌ها و job requirements سمت سرور.
- `models/User.js`: schema کاربر و summary نتایج.
- `models/Result.js`: schema کامل نتیجه آزمون.
- `routes/`: مسیرهای auth, users, tests, results.
- `controllers/`: منطق HTTP routeها.
- `middleware/authMiddleware.js`: `protect` و `admin`.
- `middleware/errorMiddleware.js`: هندل خطاهای Mongoose/JWT/duplicate key.
- `utils/normalizeAnswers.js`: نرمال‌سازی شکل پاسخ‌ها برای همه آزمون‌ها.
- `utils/testAnalyzer.js`: تحلیل همه آزمون‌ها و استانداردسازی خروجی.
- `services/jobPrioritizer.js`: الگوریتم تخصیص و اولویت‌بندی شغلی.
- `seedAdmin.js`, `seedUser.js`, `backupMongo.js`, `exportCollections.mjs`: ابزارهای عملیاتی.

## 4. نحوه اجرای پروژه

### Server

فایل env موردنیاز:

```env
PORT=5000
MONGO_URI=mongodb://...
JWT_SECRET=...
FRONTEND_URL=https://tipnama.ir,https://www.tipnama.ir
NODE_ENV=production
MONGO_TIMEOUT_MS=30000
```

دستورها:

```bash
cd Server
npm install
npm run dev
# یا
npm start
```

نکته production:

- کلاینت به صورت پیش‌فرض API را از `/api` می‌خواند.
- در production باید reverse proxy مسیر `/api` را به سرور Express وصل کند.
- `FRONTEND_URL` حتما باید تنظیم شود. اگر خالی بماند، طبق منطق فعلی CORS همه originها را قبول می‌کند.

### Client

فایل env اختیاری:

```env
VITE_API_URL=/api
```

دستورها:

```bash
cd Client
npm install
npm run dev
npm run build
```

وضعیت بررسی‌شده:

- Node: `v20.19.0`
- npm: `10.8.2`
- بعد از `npm install`، دستور `npm run build` موفق شد.
- خروجی build در `Client/dist` ساخته شد و طبق `.gitignore` ignored است.

## 5. جریان کلی داده

جریان اصلی:

```text
React UI
  -> src/services/api.jsx
  -> Express routes
  -> Controllers
  -> Mongoose models
  -> MongoDB
```

جریان آزمون:

```text
User login
  -> Dashboard
  -> Start test
  -> POST /api/tests/getquestions
  -> Test component collects answers
  -> POST /api/results/submitUInfo
  -> Result document saved
  -> User.testsAssigned summary updated
  -> Admin analyzes result
  -> POST /api/results/analyze
  -> Result.analysis and score saved
  -> User.testsAssigned score/analyzedAt updated
  -> Admin submits feedback
  -> result.adminFeedback updated
  -> User.testsAssigned entry gets isPublic=true
```

## 6. Auth و session

ورود:

- `POST /api/auth/login`
- سرور username/password را چک می‌کند.
- JWT با payload `{ id, role }` می‌سازد.
- JWT در cookie `token` و همچنین body پاسخ برمی‌گردد.
- کلاینت token را در `localStorage` ذخیره می‌کند و در header `Authorization: Bearer ...` می‌فرستد.

ثبت‌نام:

- `POST /api/auth/register`
- کاربر جدید می‌سازد.
- اگر درخواست از یک admin لاگین‌شده باشد، cookie admin را overwrite نمی‌کند.

خواندن پروفایل:

- کلاینت از `POST /api/auth/profile` استفاده می‌کند.
- `authController.getProfile` فقط `req.cookies.token` را می‌خواند و Bearer token را قبول نمی‌کند.
- `authMiddleware.protect` در routeهای دیگر هم cookie و هم Bearer را قبول می‌کند.

ریسک مهم:

- مدل فعلی هم cookie httpOnly دارد، هم token در localStorage. اگر XSS رخ دهد، token داخل localStorage قابل سرقت است.
- اگر cookie در deployment cross-origin درست ارسال نشود، `auth/profile` با وجود token در localStorage هم fail می‌شود، چون Bearer را نمی‌خواند.

## 7. مدل‌های دیتابیس

### User

فایل: `Server/models/User.js`

فیلدهای اصلی:

- `username`: اجباری و unique.
- `period`: دوره/گروه کاربر.
- `password`: hash رمز.
- `role`: فقط `user` یا `admin`.
- `email`: اختیاری.
- `profile`: اطلاعات فردی شامل نام، کد ملی، سن، جنسیت، رشته، معدل، شهر، استان، تلفن و غیره.
- `testsAssigned`: summary نتایج انجام‌شده شامل `resultId`, `testType`, `completedAt`, `score`, `adminFeedback`, `duration`, `isPublic`, `analyzedAt`.

### Result

فایل: `Server/models/Result.js`

فیلدهای اصلی:

- `user`: ref به User.
- `testType`: یکی از 7 نوع آزمون.
- `answers`: آرایه آزاد.
- `score`: عدد کلی.
- `analysis`: Mixed object.
- `adminFeedback`: متن نظر ادمین.
- `startedAt`, `submittedAt`, `durationInSeconds`, `duration`.

نکته consistency:

- اطلاعات نتیجه هم در `Result` ذخیره می‌شود، هم خلاصه‌اش در `User.testsAssigned`.
- هر تغییری مثل حذف نتیجه، تحلیل، feedback و score باید هر دو جا را هم‌زمان درست نگه دارد.

## 8. API Map

### Auth

- `POST /api/auth/login`: public.
- `POST /api/auth/register`: public، اما فعلا role را از body قبول می‌کند.
- `POST /api/auth/logout`: cookie را پاک می‌کند.
- `POST /api/auth/profile`: public route ولی داخل controller با cookie auth می‌کند.

### Tests

- `POST /api/tests/getquestions`: سوال‌های یک testType را از `dummyData.js` می‌دهد.

### Users

- `DELETE /api/users/:id`: فقط `protect` دارد، admin اجباری نیست.
- `POST /api/users/completeProf`: فقط `protect` دارد، userId را از body می‌پذیرد.
- `GET /api/users/profile`: `protect` دارد ولی controller از `jwt` بدون import استفاده می‌کند.
- `GET /api/users`: `protect + admin`.
- `GET /api/users/:id`: فقط `protect` دارد، admin/ownership چک نمی‌شود.

### Results

- `POST /api/results`: `createResult`، public، duplicate check دارد ولی UI اصلی از آن استفاده نمی‌کند.
- `POST /api/results/submitUInfo`: public، endpoint اصلی ثبت آزمون در UI.
- `GET /api/results/:resultId`: public.
- `DELETE /api/results/:resultId/analysis`: `protect + admin`.
- `DELETE /api/results/:resultId`: `protect + admin`.
- `POST /api/results/analyze`: public.
- `POST /api/results/jobs/prioritize`: public.
- `GET /api/results`: public.
- `POST /api/results/submitfeedback`: public.
- `POST /api/results/:userId/userResult`: public و به اشتباه `getResults` را صدا می‌زند.
- `POST /api/results/list/:userId`: `protect + admin`.

## 9. شکل پاسخ‌های آزمون‌ها

همه کامپوننت‌های آزمون در نهایت `submitResult` را صدا می‌زنند که به `/api/results/submitUInfo` می‌فرستد.

قرارداد فعلی هر آزمون:

- MBTI: `{ questionId, value }`
- DISC: `{ questionId, selectedTrait }`
- HOLLAND: `{ questionId, answer }`
- GARDNER: `{ questionId, value }`
- CLIFTON: `{ questionId, choice }`
- GHQ: `{ questionId, value }`
- PERSONAL_FAVORITES: `{ questionId, value }`

سمت سرور:

- `normalizeAnswers(testType, answers)` شکل پاسخ‌ها را اصلاح/نرمال می‌کند.
- سپس raw answers در `Result.answers` ذخیره می‌شود.
- تحلیل به صورت جدا با route `/api/results/analyze` انجام می‌شود، نه هنگام submit کاربر.

## 10. منطق تحلیل آزمون‌ها

فایل اصلی: `Server/utils/testAnalyzer.js`

توابع مهم:

- `analyzeMBTI`
- `analyzeDISC`
- `analyzeHolland`
- `analyzeGardner`
- `analyzeClifton`
- `analyzeGHQ`
- `analyzePersonalFavorites`
- `getTestAnalysisUnified`
- `standardizeAnalysis`
- `computeOverallScore`

خروجی نهایی `analyze` در controller:

```js
{
  ok: true,
  resultId,
  analysis,
  score
}
```

خروجی ذخیره‌شده در DB فعلا معمولا این شکل را دارد:

```js
{
  test,
  scores,
  traits,
  summary,
  dataForUI,
  meta,
  analyzedAt
}
```

ریسک compatibility:

- چند کامپوننت تحلیل سمت کلاینت، مثل `DiscAnalysis`, `MbtiAnalysis`, `HollandAnalysis`, `GHQAnalysis`, فیلدهایی مثل `normalizedScores`, `rawScores`, `dominantTraits`, `riskLevel` را در سطح اول `analysis` انتظار دارند.
- `standardizeAnalysis` این فیلدها را به صورت کامل در سطح اول برنمی‌گرداند و بخشی را زیر `scores` یا `dataForUI` نگه می‌دارد.
- نتیجه: تحلیل در DB ذخیره می‌شود، اما UI ممکن است نمودار یا جدول را خالی/ناقص نشان دهد.

## 11. منطق اولویت‌بندی شغلی

دو مسیر برای اولویت‌بندی وجود دارد:

### مسیر API

Client:

- `TestsStatus.jsx` کاربران انتخابی و ظرفیت‌ها را از modal می‌گیرد.
- `prioritizeUsers` در `src/services/api.jsx` فقط `userIds`, `capacities`, `weights` را به سرور می‌فرستد.

Server:

- `resultsController.prioritizeJobs` ورودی را به `prioritizeCandidates` در `services/jobPrioritizer.js` می‌دهد.
- الگوریتم آخرین نتیجه هر کاربر برای هر testType را می‌گیرد.
- برای هر شغل، score ترکیبی می‌سازد.
- ظرفیت‌ها را global و بدون تکرار پر می‌کند.
- خروجی شامل `assignments`, `waitlist`, `unassigned`, `table`, `allocations`, `export` است.

مشکل مهم:

- کلاینت `jobRequirements` و `quotas` را به API نمی‌فرستد، با اینکه سرور دریافت آن را پشتیبانی می‌کند.
- سرور وقتی `jobRequirements` خالی باشد، بیشتر بر overall score و major fallback تکیه می‌کند.
- در `jobPrioritizer.js` فیلد رشته برای major match از `profile.highSchoolMajor` یا `profile.major` خوانده می‌شود، درحالی‌که schema و فرم کلاینت `profile.field` را ذخیره می‌کنند.
- بنابراین API ممکن است تخصیص‌هایی بدهد که معیارهای تخصصی jobRequirements را واقعا لحاظ نکرده‌اند.

### fallback کلاینت

- اگر API fail شود، `TestsStatus.jsx` نتایج را می‌گیرد و با `Client/src/utils/jobRanking.ts` رتبه‌بندی local انجام می‌دهد.
- این مسیر از `jobRequirements` سمت کلاینت و `profile.field` استفاده می‌کند.
- چون فقط در حالت failure اجرا می‌شود، در حالت عادی ممکن است مسیر دقیق‌تر اصلا استفاده نشود.

## 12. وضعیت build, lint, audit

### Build

بعد از اجرای `npm install` در `Client`:

```text
npm run build
✓ built in 36.85s
```

هشدارهای build:

- `TestsStatus.jsx` به exportهای قدیمی/ناموجود از `jobRanking.ts` اشاره می‌کند:
  - `rankJobsForUserRICH`
  - `rankJobsForUser_Advanced`
  - `rankJobsForUser`
  - `rankJobs`
  - `default`
- build موفق است چون کد با namespace import کار می‌کند، اما warning باید تمیز شود.
- یک chunk بزرگ حدود `2,077 kB` و gzip حدود `636 kB` تولید شده است. بهتر است code splitting برای گزارش‌ها، chartها، MUI DataGrid و PDF انجام شود.

### Lint

`npm run lint` فعلا fail می‌شود:

```text
Invalid option '--ext'
```

علت: پروژه از `eslint.config.js` flat config استفاده می‌کند و flag قدیمی `--ext` با این حالت سازگار نیست.

اجرای مستقیم:

```bash
npx eslint .
```

هم fail شد:

```text
Global "AudioWorkletGlobalScope " has leading or trailing whitespace.
```

علت احتمالی: مشکل version/داده package `globals` یا نیاز به sanitize کردن keys. ضمن اینکه `globals` در `package.json` به صورت direct dependency ثبت نشده و فقط transitively آمده است.

### Server syntax check

این دستور روی فایل‌های خود پروژه بدون خطای نحوی تمام شد:

```powershell
rg --files -g "*.js" -g "*.mjs" -g "!node_modules/**" | ForEach-Object { node --check $_ }
```

این فقط syntax را چک می‌کند و خطاهایی مثل import نشدن `jwt` در runtime را نمی‌گیرد.

### Audit

در `Client` بعد از `npm install`:

```text
27 vulnerabilities
1 low, 6 moderate, 17 high, 3 critical
```

موارد direct مهم:

- `axios`
- `react-router-dom`
- `vite`/ابزار build و dev server
- `xlsx`، با گزارش audit که fix آماده مستقیم ندارد

Audit سرور به دلیل timeout/عدم پاسخ رجیستری npm کامل نشد و باید در محیط پایدار تکرار شود.

## 13. باگ‌ها و ریسک‌های اولویت‌دار

### Critical - امنیت API

1. ثبت‌نام عمومی می‌تواند role بگیرد.
   - فایل: `Server/controllers/authController.js:74`, `Server/controllers/authController.js:100`
   - مشکل: `role` از body گرفته می‌شود و `role: role || "user"` ذخیره می‌شود.
   - اثر: هر کسی می‌تواند با ارسال `role: "admin"` ادمین بسازد.
   - پیشنهاد: public register همیشه `role: "user"` بسازد. ساخت admin فقط از route محافظت‌شده admin یا seed انجام شود.

2. routeهای نتایج عمدتا public هستند.
   - فایل: `Server/routes/resultsRoutes.js:19`, `21`, `26`, `28`, `30`, `32`
   - مشکل: ثبت نتیجه، گرفتن نتیجه با id، تحلیل، اولویت‌بندی، گرفتن همه نتایج و ثبت feedback محافظت نشده‌اند.
   - اثر: دستکاری نتیجه، تحلیل غیرمجاز، مشاهده اطلاعات حساس، publish/feedback غیرمجاز.
   - پیشنهاد: حداقل `submitUInfo` باید `protect` داشته باشد و userId از token گرفته شود. analyze/prioritize/getAll/feedback باید `protect + admin` باشند.

3. حذف کاربر admin-only نیست.
   - فایل: `Server/routes/userRoutes.js:13`
   - مشکل: فقط `protect` دارد.
   - اثر: هر user لاگین‌شده با دانستن id می‌تواند user دیگر را حذف کند.
   - پیشنهاد: `protect, admin` و ترجیحا جلوگیری از حذف خود admin اصلی.

4. دیدن user با id admin-only یا owner-only نیست.
   - فایل: `Server/routes/userRoutes.js:17`
   - اثر: هر user می‌تواند پروفایل user دیگر را ببیند.
   - پیشنهاد: اگر admin نیست، فقط `req.user._id === req.params.id` مجاز باشد.

5. تکمیل پروفایل userId را از body قبول می‌کند.
   - فایل: `Server/controllers/userController.js:59`, `116`
   - مشکل: کاربر محافظت‌شده می‌تواند `userId` کس دیگری را بفرستد.
   - اثر: تغییر پروفایل یا username دیگران.
   - پیشنهاد: برای user معمولی فقط `req.user._id` استفاده شود؛ override userId فقط برای admin.

6. CORS وقتی `FRONTEND_URL` خالی باشد همه originها را قبول می‌کند.
   - فایل: `Server/server.js:33`
   - پیشنهاد: در production اگر `allowedOrigins.length === 0` است، server بالا نیاید یا فقط originهای مشخص قبول شوند.

### Critical - عملکرد اصلی کاربر

7. deadline همه تست‌های کلاینت در گذشته است.
   - تاریخ بررسی: 2026-09-04
   - فایل: `Client/src/services/dummyData.js:10`, `22`, `34`, `46`, `59`, `71`, `82`
   - مقدار فعلی: `2025-10-20T17:30:00Z`
   - فایل dashboard: `Client/src/pages/User/Dashboard.jsx:89`, `102`, `214`
   - اثر: `getStatus` همه تست‌ها را `Expired` می‌کند و `pendingTests` خالی می‌شود. کاربر بعد از تکمیل پروفایل ممکن است هیچ آزمونی برای شروع نبیند.
   - نکته: deadlineهای سمت سرور هم `2026-07-11T20:30:00.000+00:00` هستند که در تاریخ 2026-09-04 گذشته‌اند.

8. قرارداد پاسخ ثبت آزمون با UI ناسازگار است.
   - سرور: `Server/controllers/resultsController.js:177` خروجی `{ ok: true, resultId }` می‌دهد.
   - کلاینت:
     - `MBTITest.jsx:63` فقط `result?.user` را success می‌داند.
     - `DISCTest.jsx:206` دنبال `result.user || result._id || result.id` است.
     - `HollandTest.jsx:92`, `GardnerTest.jsx:105`, `GHQTest.jsx:87`, `CliftonTest.jsx:126`, `PersonalFavoritesTest.jsx:87` هم `resultId` را success حساب نمی‌کنند.
   - اثر: نتیجه در DB ذخیره می‌شود اما UI ممکن است پیام خطا بدهد و done key/navigation انجام نشود.
   - پیشنهاد: یا سرور نتیجه کامل برگرداند، یا همه کامپوننت‌ها `res?.ok && res?.resultId` را success بدانند.

9. بعد از submit موفق، تست‌ها به `/` می‌روند.
   - نمونه‌ها: `MBTITest.jsx:67`, `DISCTest.jsx:210`, `HollandTest.jsx:96`, `GardnerTest.jsx:109`, `GHQTest.jsx:91`, `CliftonTest.jsx:131`, `PersonalFavoritesTest.jsx:91`
   - فایل route: `Client/src/App.jsx` route `/` ندارد و wildcard به `/login` می‌رود.
   - اثر: کاربر بعد از آزمون به login redirect می‌شود یا تجربه کاربری خراب می‌شود.
   - پیشنهاد: بعد از ثبت موفق، navigate به `/dashboard` و refresh کنترل‌شده state.

10. `submitUInfo` duplicate check ندارد.
    - فایل: `Server/controllers/resultsController.js:141` تا `177`
    - `createResult` duplicate check دارد، اما UI از `submitUInfo` استفاده می‌کند.
    - اثر: با refresh/API call می‌توان چند نتیجه از یک testType برای یک user ساخت.
    - پیشنهاد: unique index یا check اتمیک روی `(user, testType)`، یا سیاست versioning مشخص.

### High - نمایش تحلیل‌ها

11. خروجی استاندارد تحلیل با کامپوننت‌های UI هم‌قرارداد نیست.
    - سرور: `Server/utils/testAnalyzer.js:1349` تا `1362`
    - کلاینت:
      - `DiscAnalysis.jsx` به `data.normalizedScores` و `data.rawScores` وابسته است.
      - `MbtiAnalysis.jsx` به `mbtiType`, `rawScores`, `normalizedScores`, `dimensions` در سطح اول نیاز دارد.
      - `HollandAnalysis.jsx` و `GHQAnalysis.jsx` هم انتظار سطح اول دارند.
    - اثر: تحلیل ذخیره می‌شود اما UI ممکن است داده را ناقص نشان دهد.
    - پیشنهاد: `standardizeAnalysis` فیلدهای اصلی raw analyzer را هم در سطح اول نگه دارد:

```js
{
  test,
  score,
  rawScores,
  normalizedScores,
  traits,
  summary,
  analyzedAt,
  dataForUI,
  meta,
  ...testSpecificFields
}
```

12. امتیاز کلی MBTI احتمالا صفر می‌شود.
    - سرور: `analyzeMBTI` normalizedScores را تو در تو برمی‌گرداند.
    - `computeOverallScore` در `Server/utils/testAnalyzer.js:1368` تا `1371` فقط valueهای عددی سطح اول را می‌گیرد.
    - اثر: برای MBTI که `scores` به شکل `{ EI: {E, I}, ... }` است، هیچ عدد سطح اول پیدا نمی‌شود و score کلی `0` می‌شود.
    - پیشنهاد: برای nested scores، همه عددهای تو در تو flatten شوند یا برای هر تست scorer اختصاصی تعریف شود.

### High - تخصیص شغلی

13. `jobRequirements` به API اولویت‌بندی ارسال نمی‌شود.
    - کلاینت: `Client/src/services/api.jsx:208` تا `212`
    - استفاده: `Client/src/pages/Admin/TestsStatus.jsx:366` تا `369`
    - سرور می‌تواند `jobRequirements` بگیرد اما دریافت نمی‌کند.
    - اثر: مسیر API نیازمندی واقعی شغل‌ها را لحاظ نمی‌کند.
    - پیشنهاد: `prioritizeUsers({ userIds, capacities, weights, jobRequirements, quotas })` و ارسال payload کامل از `TestsStatus`.

14. major match سرور `profile.field` را لحاظ نمی‌کند.
    - فایل: `Server/services/jobPrioritizer.js:450` تا `452`
    - schema/form فیلد رشته را در `profile.field` ذخیره می‌کنند.
    - اثر: امتیاز رشته در API معمولا fallback می‌شود و دقیق نیست.
    - پیشنهاد: `profile.field` در اولویت خواندن قرار بگیرد.

15. `JobQuotaModal` با `tests={[]}` همه آزمون‌ها را ناموجود می‌بیند.
    - فایل: `Client/src/pages/Admin/TestsStatus.jsx:516` تا `517`
    - فایل modal: `Client/src/pages/Admin/TestStatus/JobQuotaModal.jsx:51` تا `59`, `275`, `456` تا `469`
    - اثر: منابع آزمون در modal ممکن است disable شوند و `serverWeights` خالی شود.
    - پیشنهاد: `tests={Test_Cards}` یا حذف availability check وقتی لیست tests خالی است.

16. `AllocationReport` خروجی واقعی API را مصرف نمی‌کند.
    - فایل: `Client/src/pages/Admin/TestStatus/AllocationReport.jsx:30` تا `47`
    - کامپوننت دنبال `priorities/ranking` می‌گردد، ولی API خروجی `allocations/assignments` می‌دهد.
    - ستون `job` وجود دارد، اما `tableData` از `selectedUsers` ساخته می‌شود و `job` ندارد.
    - اثر: گزارش نهایی ممکن است رتبه و شغل تخصیص‌یافته را نشان ندهد.
    - پیشنهاد: rows از `assignmentResult.allocations` یا `assignmentResult.assignments` flatten شوند.

17. `downloadCSV` در `AllocationReport` به متغیرهای تعریف‌نشده وابسته است.
    - فایل: `Client/src/pages/Admin/TestStatus/AllocationReport.jsx:129` تا `156`
    - متغیرهایی مثل `jobKeys`, `capacities`, `assignedTotals`, `waitTotals`, `selectedByJob`, `waitlistByJob`, `unassigned`, `title` تعریف نشده‌اند.
    - اثر: اگر این تابع وصل/صدا زده شود runtime error می‌دهد.

### Medium - route و UX

18. routeهای مستقیم admin اشتباه هستند.
    - فایل: `Client/src/App.jsx:27`
    - `/admin/users` به `TestsPage` وصل شده، نه `UsersPage`.
    - `/admin/tests` هم به `TestsPage` ساده وصل شده و با tab داخلی admin dashboard هماهنگ نیست.
    - پیشنهاد: یا routeهای tab را حذف کنید و فقط `/admin?tab=...` بماند، یا هر route را به صفحه درست وصل کنید.

19. `/users/tests` به صفحه مدیریت تست‌ها وصل است.
    - فایل: `Client/src/App.jsx:34`
    - اثر: کاربر عادی ممکن است صفحه‌ای ببیند که برای جریان واقعی تست طراحی نشده.
    - پیشنهاد: route حذف شود یا به dashboard/لیست تست کاربر وصل شود.

20. نوار progress بیرونی در `StarterTestPage` آپدیت نمی‌شود.
    - فایل: `Client/src/pages/User/StarterTestPage.jsx:29`, `159` تا `162`
    - `setProgress` استفاده نشده است.
    - اثر: progress bar بالای wrapper صفر می‌ماند، هرچند کامپوننت‌های داخلی progress خودشان را دارند.

21. `TestResultCardGrid` از state تازه `completed` استفاده نمی‌کند.
    - `Dashboard.jsx` در `50` نتایج تازه را در state `completed` می‌گذارد.
    - اما `TestResultCardGrid.jsx:8`, `22` دوباره از `AuthContext.user.testsAssigned` می‌خواند.
    - اثر: اگر پروفایل/نتایج تازه fetch شده باشند ولی context آپدیت نشده باشد، کارت‌های نتایج stale می‌مانند.
    - پیشنهاد: `completed` به عنوان prop پاس داده شود.

22. قفل 24 ساعته آزمون‌ها فقط localStorage و غیر user-specific است.
    - نمونه: `MBTITest.jsx:10`, `29`, `65`
    - سایر تست‌ها هم الگوی مشابه دارند.
    - اثر: کاربر دوم روی همان مرورگر ممکن است اشتباها blocked شود؛ همچنین با پاک کردن localStorage محدودیت دور زده می‌شود.
    - پیشنهاد: وضعیت انجام تست server-side کنترل شود و keyها شامل userId باشند.

23. `handleAnalyzeAll` خطاها را با state stale بررسی می‌کند.
    - فایل: `Client/src/pages/Admin/UsersPage.jsx:318`, `334`
    - `setBulkErrors` async است و بلافاصله بعد از loop مقدار قدیمی خوانده می‌شود.
    - اثر: ممکن است با وجود خطا پیام success نشان داده شود.
    - پیشنهاد: خطاها در array محلی جمع شوند و بعد state/alert تنظیم شود.

### Medium - نگهداری و کیفیت

24. `GET /api/users/profile` runtime error می‌دهد.
    - فایل: `Server/controllers/userController.js:138`, `143`
    - مشکل: `jwt` import نشده است.
    - پیشنهاد: یا import شود، یا چون `protect` قبلا `req.user` را دارد، controller از `req.user` استفاده کند.

25. `mongoSanitize` import شده ولی غیرفعال است.
    - فایل: `Server/server.js:8`, `69`
    - پیشنهاد: بعد از بررسی سازگاری با Express 5 فعال شود یا ورودی‌ها با validator/schema کنترل شوند.

26. `src/assets/api.ts` API wrapper قدیمی/بلااستفاده به نظر می‌رسد.
    - فایل: `Client/src/assets/api.ts:4`
    - baseURL آن `http://localhost:4000/api/v1` است، درحالی‌که API واقعی `/api` است.
    - پیشنهاد: حذف یا همسان‌سازی برای جلوگیری از استفاده اشتباه آینده.

27. dependencyهای legacy یا مستقیم اعلام‌نشده وجود دارند.
    - Server package شامل Prisma, PlanetScale, sqlite3, body-parser, express-session, express-validator, bcrypt و bcryptjs است، درحالی‌که مسیر فعلی عمدتا Mongoose و bcryptjs استفاده می‌کند.
    - Client از `prop-types` import مستقیم دارد، اما direct dependency نیست و transitively آمده است.
    - پیشنهاد: dependency audit و cleanup قبل از تحویل.

28. جلوگیری سراسری از right-click و drag در `App.jsx`.
    - فایل: `Client/src/App.jsx:13`, `16`
    - اثر: UX و accessibility را خراب می‌کند و امنیت واقعی ایجاد نمی‌کند.
    - پیشنهاد: حذف یا محدود کردن به بخش‌های خاص اگر واقعا نیاز محصولی دارد.

29. README برای تحویل کافی نیست.
    - `README.md` فقط یک خط توضیح دارد.
    - پیشنهاد: دستور نصب، env، seed، deploy، backup، user/admin demo و known limitations اضافه شود.

## 14. ترتیب پیشنهادی رفع باگ برای تحویل

1. قفل امنیت routeها:
   - register role
   - results routes
   - users delete/get/update
   - CORS empty config

2. اصلاح جریان انجام آزمون:
   - deadlineهای گذشته
   - submit response contract
   - navigate بعد از submit
   - duplicate prevention server-side

3. اصلاح قرارداد تحلیل:
   - خروجی `standardizeAnalysis`
   - نمایش تحلیل‌ها در کامپوننت‌ها
   - score کلی MBTI

4. اصلاح اولویت‌بندی:
   - ارسال `jobRequirements/quotas`
   - خواندن `profile.field` در server
   - دادن `Test_Cards` به `JobQuotaModal`
   - بازنویسی `AllocationReport` براساس `allocations/assignments`

5. اصلاح ابزارهای کیفیت:
   - lint script
   - eslint config/globals
   - npm audit client/server
   - حذف dependencyهای اضافی

6. افزودن تست‌های حداقلی:
   - submit هر 7 آزمون
   - analyze هر 7 آزمون
   - auth role guard
   - duplicate result guard
   - prioritization contract
   - render analysis smoke test

## 15. قراردادهای پیشنهادی برای پایدارسازی

### Submit result

یک قرارداد واحد انتخاب شود. پیشنهاد:

```js
{
  ok: true,
  result: {
    _id,
    user,
    testType,
    submittedAt,
    durationInSeconds
  }
}
```

یا اگر سبک فعلی حفظ شود، کلاینت باید این را success بداند:

```js
res?.ok === true && !!res?.resultId
```

### Analysis

پیشنهاد خروجی ذخیره‌شده:

```js
{
  test: "DISC",
  score: 72,
  rawScores: {},
  normalizedScores: {},
  traits: {},
  summary: "",
  analyzedAt: "",
  dataForUI: {},
  meta: {}
}
```

برای تست‌های خاص مثل MBTI:

```js
{
  test: "MBTI",
  score: 68,
  mbtiType: "INTJ",
  typeName: "...",
  rawScores: { EI: { E: 10, I: 15 } },
  normalizedScores: { EI: { E: 40, I: 60 } },
  dimensions: [],
  summary: "",
  analyzedAt: "",
  dataForUI: {}
}
```

### Prioritization

پیشنهاد payload کلاینت به سرور:

```js
{
  userIds: [],
  capacities: { "نام رسته": 5 },
  weights: { MBTI: 1, DISC: 1, HOLLAND: 1, GARDNER: 1, CLIFTON: 1, GHQ: 1, PERSONAL_FAVORITES: 1 },
  jobRequirements,
  quotas
}
```

پیشنهاد خروجی مصرفی `AllocationReport`:

```js
{
  ok: true,
  allocations: {
    "نام رسته": {
      name: "نام رسته",
      persons: [{ id, rank, score, fullName, phone, field }]
    }
  },
  assignments: [],
  waitlist: [],
  unassigned: [],
  table: []
}
```

## 16. چک‌لیست آماده‌سازی تحویل

- `.env` تولیدی روی سرور تنظیم و در Git commit نشود.
- `JWT_SECRET` قوی و اختصاصی production باشد.
- `FRONTEND_URL` خالی نباشد.
- تمام routeهای حساس با `protect/admin/owner` محدود شوند.
- تاریخ deadline تست‌ها با تاریخ تحویل هماهنگ شود یا از پنل/DB قابل تنظیم شود.
- `npm run build` کلاینت در CI پاس شود.
- lint قابل اجرا شود.
- audit client/server بررسی و نسخه‌های آسیب‌پذیر ارتقا یابد.
- حداقل یک ادمین seed شود و ساخت admin عمومی بسته شود.
- ثبت آزمون برای هر 7 نوع تست دستی یا خودکار تست شود.
- تحلیل هر 7 نوع تست روی UI و PDF تست شود.
- report allocation با داده واقعی تست شود.
- backup/restore MongoDB روی دیتای تست اجرا شود.
- README کامل شود.

## 17. دستورهای پیشنهادی برای GPT بعدی

برای ادامه دیباگ می‌توان از این prompt استفاده کرد:

```text
این پروژه را براساس PROJECT_REPORT_FA.md بررسی کن. اولویت با رفع باگ‌های Critical و High است.
لطفا ابتدا امنیت routeها، سپس جریان submit آزمون، سپس خروجی analysis و در آخر prioritization را اصلاح کن.
بعد از هر مرحله build و smoke test مربوط را اجرا کن و تغییرات را خلاصه کن.
```

## 18. خلاصه وضعیت فعلی

- ساختار کلی پروژه قابل فهم و قابل تحویل است، اما چند قرارداد بین Client و Server ناهماهنگ هستند.
- production build کلاینت بعد از نصب dependencyها موفق شد.
- lint فعلا قابل اجرا نیست و باید اصلاح شود.
- مهم‌ترین blockerهای تحویل:
  - routeهای حساس public یا ناقص محافظت شده‌اند.
  - deadline تست‌ها در تاریخ 2026-09-04 گذشته است.
  - پاسخ submit آزمون با انتظار UI یکی نیست.
  - خروجی تحلیل با کامپوننت‌های نمایش تحلیل هم‌قرارداد نیست.
  - API اولویت‌بندی jobRequirements واقعی را دریافت نمی‌کند.
  - گزارش تخصیص خروجی API را درست مصرف نمی‌کند.

