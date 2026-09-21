# Web Exams / Mind Test

سامانه مدیریت آزمون‌های شخصیت‌شناسی و ارزیابی کاربران با پنل کاربر و مدیریت، تحلیل نتایج، تاریخچه کارنامه، گزارش‌گیری و سیستم پیشنهاد و تخصیص رسته شغلی است.

آزمون‌های فعلی:

- MBTI
- DISC
- HOLLAND
- GARDNER
- CLIFTON
- GHQ
- PERSONAL_FAVORITES

## امکانات

### پنل کاربر

- ثبت‌نام و ورود
- تکمیل و ویرایش پروفایل
- اجرای آزمون با زمان‌سنج پایدار
- نگهداری draft پاسخ‌ها در refresh
- مشاهده تاریخچه آزمون‌ها و نتایج منتشرشده
- رابط روشن و تیره

### پنل مدیریت

- مدیریت کاربران، آزمون‌ها و وضعیت نتایج
- تحلیل تکی و گروهی نتایج و ثبت بازخورد
- مشاهده تاریخچه تحلیل
- محاسبه Match Score و پیشنهاد رسته
- تنظیم ظرفیت و وزن معیارهای رسته‌ها
- اجرای تخصیص نهایی و ثبت audit
- خروجی CSV و Excel و گزارش قابل چاپ

## فناوری‌ها

### Client

- React 18.2 و React Router 7.6
- Vite 5.2
- MUI 7 و MUI Data Grid 8
- Chart.js 4، React Chart.js 2 و Recharts 2
- Axios، date-fns، Lucide React، jsPDF، html2pdf.js و xlsx

### Server

- Node.js و Express 5
- MongoDB و Mongoose 8
- JWT، bcrypt، Helmet، CORS و rate limiting

### Tooling

- pnpm workspace با Client و Server به‌عنوان packageهای مستقل
- Node test runner و ESLint

نسخه دقیق dependencyها در `Client/package.json`، `Server/package.json` و `pnpm-lock.yaml` ثبت شده است.

## ساختار پروژه

```text
Web_Exams/
├─ Client/                     رابط React، صفحات، نمودارها و چاپ
├─ Server/                     API، مدل‌های MongoDB و منطق تحلیل/تخصیص
├─ scripts/                    runner توسعه و کنترل syntax سرور
├─ package.json                فرمان‌های اصلی workspace
├─ pnpm-workspace.yaml         تعریف packageهای Client و Server
├─ pnpm-lock.yaml              lockfile اصلی pnpm
├─ README.md                   راهنمای نصب و عملیات
├─ PROJECT_REPORT_FA.md        گزارش معماری و جریان‌های پروژه
└─ PROJECT_DELIVERY_REPORT_FA.md گزارش آماده‌سازی تحویل
```

فایل‌های `package-lock.json` داخل Client و Server برای سازگاری workflowهای قدیمی npm باقی مانده‌اند؛ workflow اصلی repository و lockfile مرجع، pnpm است.

## پیش‌نیازها

- Git
- Node.js نسخه `20.12.0` یا جدیدتر
- pnpm نسخه `10.25.0`؛ نسخه package manager در root قفل شده است
- MongoDB سازگار با Driver 6 و Mongoose 8؛ اعتبارسنجی نهایی روی MongoDB `8.0.3` انجام شده است
- Windows PowerShell برای دستورهای نمونه Windows

پروژه روی Windows و PowerShell اعتبارسنجی شده است. runner برای Linux/macOS نیز از Node استفاده می‌کند، اما تشخیص MongoDB Windows Service فقط روی Windows اجرا می‌شود.

## نصب روی سیستم جدید

```powershell
git clone https://github.com/Navy-M/Web_Exams.git
cd Web_Exams
pnpm install
```

اگر `pnpm` در دسترس نیست:

```powershell
corepack enable
corepack prepare pnpm@10.25.0 --activate
```

## تنظیم Environment

فایل نمونه سرور را کپی کنید:

```powershell
Copy-Item Server/.env.example Server/.env
```

مقادیر ضروری `Server/.env`:

| متغیر | کاربرد |
| --- | --- |
| `PORT` | پورت API؛ runner محلی مقدار 5000 را انتظار دارد |
| `NODE_ENV` | در توسعه `development` |
| `LOCAL_MONGO_URI` | اتصال MongoDB محلی و انتخاب اول در development |
| `MONGO_URI` | اتصال production یا fallback؛ در توسعه اختیاری است |
| `MONGO_TIMEOUT_MS` | timeout انتخاب سرور MongoDB |
| `JWT_SECRET` | کلید خصوصی و طولانی برای امضای token |
| `FRONTEND_URL` | originهای مجاز، با کاما قابل جداسازی |

برای توسعه Client، مقادیر پیش‌فرض امن در `Client/.env.development` قرار دارند. `Client/.env.example` نیز قرارداد متغیرهای `VITE_API_URL` و `VITE_DEV_API_TARGET` را نشان می‌دهد. در حالت معمول نیازی به ساخت `Client/.env` نیست.

فایل‌های `.env` واقعی ignore شده‌اند و نباید commit شوند.

## MongoDB محلی

مقدار پیش‌فرض پیشنهادی:

```dotenv
LOCAL_MONGO_URI=mongodb://127.0.0.1:27017/web_exams
```

بررسی اتصال با shell:

```powershell
mongosh "mongodb://127.0.0.1:27017/web_exams"
```

بررسی serviceهای احتمالی MongoDB در Windows، بدون تغییر آن‌ها:

```powershell
Get-Service | Where-Object { $_.Name -match 'mongo' -or $_.DisplayName -match 'mongo' }
```

`pnpm dev` خودش اتصال و `ping` پایگاه داده را بررسی می‌کند. runner هیچ service سیستمی را ایجاد، start، stop یا reconfigure نمی‌کند.

## اجرای پروژه

از ریشه repository:

```powershell
pnpm dev
```

runner ابتدا env، آزاد بودن پورت‌ها و MongoDB را بررسی می‌کند و سپس Server و Client را اجرا می‌کند:

- Client: <http://127.0.0.1:5174>
- API: <http://127.0.0.1:5000>
- Health: <http://127.0.0.1:5000/api/health>
- Proxy: درخواست‌های `/api` در Vite به `http://127.0.0.1:5000` ارسال می‌شوند

با `Ctrl+C` فقط child processهایی که همین runner ساخته است بسته می‌شوند.

## اولین اجرا و ساخت Admin

ثبت‌نام عمومی همیشه کاربر با role برابر `user` می‌سازد و امکان ساخت Admin عمومی وجود ندارد. برای seed کردن Admin، ابتدا این مقادیر را فقط در `Server/.env` تنظیم کنید:

```dotenv
SEED_ADMIN_USERNAME=admin@example.test
SEED_ADMIN_PASSWORD=REPLACE_WITH_A_STRONG_PASSWORD
SEED_ADMIN_FULL_NAME=System Administrator
```

سپس اجرا کنید:

```powershell
pnpm --filter server run seedDBAdmin
```

seed idempotent است و اگر همان username موجود باشد تغییری ایجاد نمی‌کند. هیچ نام کاربری یا رمز پیش‌فرضی در repository وجود ندارد.

## فرمان‌های توسعه

| فرمان | توضیح |
| --- | --- |
| `pnpm dev` | preflight Mongo/ports و اجرای هم‌زمان API و Vite |
| `pnpm build` | build تولیدی Client |
| `pnpm lint` | ESLint کل Client |
| `pnpm test` | تست منطق تخصیص، timer، export، chart adapter و theme |
| `pnpm check` | lint، build، syntax سرور و تمام تست‌ها |
| `pnpm smoke` | smoke testهای API روی stack در حال اجرا؛ داده‌های موقت ساخته و پاک می‌شوند |

`pnpm smoke` به MongoDB و stack روشن روی پورت‌های استاندارد نیاز دارد و روی دیتابیس production نباید اجرا شود.

## جریان برنامه

جریان کاربر:

```text
Register/Login -> Profile -> Assigned Tests -> Submit -> Admin Analysis -> Publish -> Result History
```

جریان مدیر:

```text
Users -> Analysis/Feedback -> Job Prioritization -> Final Allocation -> Export/Report
```

## Job Matching و تخصیص

- **Match Score** امتیاز سازگاری هر فرد با هر رسته بر اساس معیارهای مجاز و داده‌های موجود است.
- **Recommendation** بهترین پیشنهاد فرد است و مستقل از ظرفیت رسته محاسبه می‌شود.
- **Final Allocation** خروجی رقابتی و ظرفیت‌محور است و ممکن است با پیشنهاد اول فرد متفاوت باشد.

ظرفیت فقط بر Final Allocation اثر دارد و Recommendation اصلی را تغییر نمی‌دهد. GHQ وارد scoring شغلی نمی‌شود. جنسیت، سن، اطلاعات تماس و سایر ویژگی‌های حساس نیز نباید در امتیازدهی استفاده شوند. خروجی الگوریتم نسخه، اجزای امتیاز، کامل‌بودن داده و علت eligibility را نگهداری می‌کند.

## گزارش، چاپ و خروجی

- کارنامه شامل اطلاعات کاربر، تحلیل‌ها و نمودارهای آماده‌شده است.
- چاپ با پنجره استاندارد مرورگر انجام می‌شود و برای PDF می‌توان `Save as PDF` را انتخاب کرد.
- دکمه دانلود مستقیم PDF در مودال کارنامه فعلاً handler فعال ندارد و نمایش داده نمی‌شود؛ مسیر رسمی فعلی Browser Print است.
- گزارش تخصیص خروجی CSV فردمحور، workbook پنج‌بخشی Excel و چاپ دارد.
- نمودارهای Canvas پیش از چاپ به snapshot تبدیل می‌شوند تا PDF خالی تولید نشود.

## تم روشن و تیره

- Light و Dark در کل رابط، جدول‌ها، فرم‌ها، مودال‌ها و نمودارها پشتیبانی می‌شوند.
- انتخاب دستی در `localStorage` ذخیره می‌شود.
- پیش از انتخاب دستی، preference سیستم عامل استفاده می‌شود.
- تم پیش از mount شدن React اعمال می‌شود تا flash اولیه رخ ندهد.
- خروجی چاپ مستقل از تم صفحه و همیشه روشن است.

## تست و Quality Gate

پیش از commit یا تحویل اجرا کنید:

```powershell
pnpm check
git diff --check
```

`pnpm check` شامل Client lint، Client production build، syntax check فایل‌های Server و تست‌های خودکار Server/Client است.

## رفع اشکال

### `ECONNREFUSED` برای `/api`

ابتدا <http://127.0.0.1:5000/api/health> را باز کنید. سپس مطمئن شوید `pnpm dev` بدون خطا اجرا شده و `VITE_DEV_API_TARGET` به پورت 5000 اشاره می‌کند.

### خطای اتصال MongoDB

`LOCAL_MONGO_URI`، فعال بودن MongoDB و دسترسی به پورت 27017 را بررسی کنید. runner نام serviceهای MongoDB موجود در Windows را گزارش می‌کند ولی وضعیت آن‌ها را تغییر نمی‌دهد.

### اشغال بودن پورت 5174 یا 5000

پردازش را ابتدا شناسایی کنید و آن را کورکورانه terminate نکنید:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5000,5174 |
  Select-Object LocalPort, OwningProcess
Get-Process -Id <PID>
```

runner در صورت اشغال پورت، PID و نام پردازش را در حد امکان گزارش می‌کند و fail می‌شود.

### دستور `pnpm` پیدا نمی‌شود

Node.js را نصب و Corepack را با دستورهای بخش نصب فعال کنید. سپس `pnpm --version` باید `10.25.0` یا نسخه سازگار را نمایش دهد.

### رابط نسخه قدیمی را نشان می‌دهد

Vite را restart و صفحه را hard refresh کنید. در صورت باقی‌ماندن مشکل، cache مرورگر را برای origin محلی پاک کنید؛ `node_modules` را بدون دلیل حذف نکنید.

## امنیت

- `.env`، credential، dump دیتابیس و export واقعی را commit نکنید.
- برای production یک `JWT_SECRET` تصادفی و طولانی تنظیم و آن را دوره‌ای rotate کنید.
- ثبت‌نام عمومی Admin بسته است؛ endpoint ثبت‌نام role را از ورودی کاربر نمی‌پذیرد.
- `FRONTEND_URL` در production باید صریح و محدود باشد.
- MongoDB نباید مستقیماً روی اینترنت عمومی expose شود.
- seed و smoke test را با credential یا دیتابیس production اجرا نکنید.

## Production

محیط local development معادل deployment production نیست. استقرار production باید حداقل reverse proxy، HTTPS، process manager، MongoDB محافظت‌شده، secret management، backup/restore آزموده‌شده، monitoring و سیاست CORS محدود داشته باشد.

## مستندات تکمیلی

- [گزارش معماری و عملکرد پروژه](PROJECT_REPORT_FA.md)
- [گزارش آماده‌سازی تحویل](PROJECT_DELIVERY_REPORT_FA.md)
