# راهنمای جامع مدیریت خطا و احراز هویت در Node.js و TypeScript

## مقدمه

این جزوه آموزشی، راهنمای گام‌به‌گام و معماری‌محور برای پیاده‌سازی سیستم مدیریت خطای سراسری و احراز هویت (Authentication) با استفاده از JSON Web Token (JWT) در فریم‌ورک Express و محیط TypeScript است. مطالب این جزوه با رویکرد مهندسی نرم‌افزار و توجه به اصول امنیتی تنظیم شده است و شما را از مفاهیم پایه تا پیاده‌سازی‌های پیشرفته همراهی می‌کند.

---

## فصل اول: مدیریت جامع خطاها در Express

در برنامه‌های توسعه‌یافته با Express، مدیریت خطاها نباید به صورت پراکنده در کنترلرهای مختلف انجام شود. بهترین الگو، ایجاد یک مسیر متمرکز و یک «میدل‌ور مدیریت خطای سراسری» (Global Error Handler) است.

### ساختار میدل‌ور مدیریت خطا

این میدل‌ور، تمامی خطاهایی که در طول چرخه حیات درخواست رخ می‌دهند را دریافت کرده و بر اساس محیط توسعه (Development) یا تولید (Production) پاسخ مناسبی را به کاربر ارسال می‌کند.

در محیط تولید، تنها خطاهای عملیاتی (Operational) که توسط خود برنامه‌نویس پیش‌بینی شده‌اند به کاربر نمایش داده می‌شوند و خطاهای سیستمی و باگ‌ها به منظور حفظ امنیت، مخفی می‌مانند.

```typescript
import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";
import { AppError } from "../utils/AppError";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (config.nodeEnv === "development") {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Something went wrong",
      });
    }
  }
};
```

> **نکته:** در پروژه‌های TypeScript، نوع متغیر `err` در میدل‌ور خطای سراسری معمولاً به جای کلاس `AppError` برابر با `any` در نظر گرفته می‌شود. دلیل این امر این است که ممکن است خطاهای خارجی (مانند خطاهای ارتباط با پایگاه داده Mongoose یا خطاهای استاندارد جاوااسکریپت) وارد این تابع شوند که از کلاس `AppError` ارث‌بری نکرده‌اند و فیلدهایی نظیر `statusCode` در آن‌ها وجود ندارد.

### اتصال مدیریت خطا به جریان اصلی برنامه

برای فعال‌سازی این سیستم، باید میدل‌ور خطا را به عنوان **آخرین ایستگاه** در جریان برنامه (فایل `app.ts`) ثبت کنید. همچنین باید مسیریابی پیش‌فرض برای درخواست‌هایی که به هیچ روت مشخصی متصل نمی‌شوند (مدیریت خطای 404) تعبیه گردد.

```typescript
import express, { Express } from "express";
import userRouter from "./routes/user.routes";
import { config } from "./config/env";
import morgan from "morgan";
import { AppError } from "./utils/AppError";
import { globalErrorHandler } from "./middlewares/errorHandler";

const app: Express = express();

if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}

app.use(express.json());

app.use("/api/v2/users", userRouter);

// مدیریت مسیرهای یافت‌نشده
app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl}`, 404));
});

// ثبت میدل‌ور خطای سراسری در انتهای زنجیره
app.use(globalErrorHandler);

export default app;
```

> **خلاصه فصل اول:** مدیریت متمرکز خطاها به کمک یک میدل‌ور اختصاصی در انتهای زنجیره درخواست‌های Express انجام می‌شود. این الگو، امکان تفکیک پاسخ‌های خطا در محیط‌های توسعه و تولید را فراهم کرده و امنیت برنامه را افزایش می‌دهد.

**ادامه مسیر یادگیری:** پس از ایمن‌سازی سرور در برابر خطاها، گام بعدی ایمن‌سازی دسترسی‌ها و شناخت مفاهیم احراز هویت است.

---

## فصل دوم: مبانی احراز هویت و JSON Web Token (JWT)

پروتکل HTTP ذاتاً «بدون وضعیت» (Stateless) است؛ به این معنا که هیچ حافظه‌ای برای به خاطر سپردن کاربران در درخواست‌های متوالی ندارد. بنابراین، نیازمند سازوکاری هستیم تا کاربران پس از ورود، هویت خود را در درخواست‌های بعدی اثبات کنند.

### تقابل معماری Stateful و Stateless

1. **روش قدیمی (Stateful):** سرور پس از ورود کاربر، اطلاعات او را در حافظه (Session) ذخیره کرده و یک شناسه (Cookie) به کاربر می‌دهد. این روش با افزایش تعداد کاربران، منابع سرور را به شدت درگیر کرده و در سیستم‌های توزیع‌شده (Microservices) چالش‌برانگیز است.
2. **روش مدرن (Stateless):** سرور با استفاده از JWT یک «پاسپورت رمزنگاری‌شده» تولید می‌کند. اطلاعات وضعیت کاربر درون این توکن قرار دارد و سرور نیازی به ذخیره اطلاعات در حافظه خود ندارد. این رویکرد مقیاس‌پذیری بالایی به همراه دارد.

### کالبدشکافی ساختار JWT

یک توکن JWT از سه بخش مجزا تشکیل می‌شود که با نقطه (`.`) از یکدیگر جدا می‌گردند:

1. **سربرگ (Header):** نوع توکن و الگوریتم رمزنگاری (مانند HS256) را مشخص می‌کند.
2. **بار مفید (Payload):** داده‌هایی که قصد انتقال آن‌ها را داریم (مانند ID کاربر، تاریخ صدور و تاریخ انقضا). این بخش رمزنگاری نمی‌شود و با فرمت Base64 کدگذاری می‌گردد؛ در نتیجه برای همگان قابل خواندن است و هرگز نباید حاوی اطلاعات حساس مانند رمز عبور باشد.
3. **امضای دیجیتال (Signature):** قلب تپنده و عامل امنیت توکن است. سرور با استفاده از یک کلید محرمانه (Secret Key)، بخش‌های Header و Payload را با یکدیگر ترکیب کرده و امضا را می‌سازد.

> **نکته امنیتی (Cryptographic Verification):** اگر فردی سعی کند داده‌های درون Payload را تغییر دهد (مثلاً سطح دسترسی خود را به ادمین ارتقا دهد)، از آنجایی که کلید محرمانه سرور را در اختیار ندارد، نمی‌تواند امضای دیجیتال معتبری برای داده‌های جدید بسازد. در نتیجه، سرور در کسری از ثانیه متوجه دستکاری شدن توکن شده و آن را رد می‌کند.

> **خلاصه فصل دوم:** ساختار بدون وضعیت JWT مشکل مقیاس‌پذیری را در سیستم‌های مبتنی بر HTTP برطرف می‌کند. امنیت این توکن‌ها صرفاً متکی به مخفی ماندن و قدرت کلید محرمانه (Secret Key) است.

**ادامه مسیر یادگیری:** با درک تئوری JWT، اکنون آماده پیاده‌سازی فرآیند ثبت‌نام و تولید اولین توکن در سیستم هستیم.

---

## فصل سوم: پیاده‌سازی ثبت‌نام و تولید توکن

فرآیند استاندارد در سیستم‌های مدرن این است که پس از ثبت‌نام موفقیت‌آمیز، کاربر فوراً احراز هویت شده و نیازی به ورود مجدد نداشته باشد. برای این منظور، سرور باید همزمان با ثبت کاربر در پایگاه داده، یک توکن معتبر صادر نماید.

### متغیرهای محیطی

پیش از آغاز کدنویسی، باید کلید محرمانه و زمان انقضای توکن در متغیرهای محیطی سیستم تعریف شوند. استفاده از زمان انقضا ضروری است، زیرا توکن‌های بدون انقضا در صورت افشا شدن، همواره خطرساز خواهند بود.

### پیاده‌سازی تابع تولید توکن

بر اساس اصل DRY (تکرار پرهیز)، فرآیند تولید توکن باید در یک تابع کمکی متمرکز شود تا هم در زمان ثبت‌نام و هم در زمان ورود قابل استفاده باشد.

> **توجه:** درون Payload توکن تنها شناسه یکتای کاربر (`_id`) قرار داده می‌شود. استفاده از داده‌های متغیر (مانند نام یا ایمیل) توصیه نمی‌شود؛ زیرا در صورت تغییر این اطلاعات توسط کاربر، توکنِ صادر شده حاوی اطلاعات منسوخ خواهد بود. علاوه بر این، کاهش داده‌های Payload باعث کاهش حجم توکن و افزایش سرعت شبکه می‌شود.

```typescript
import jwt from "jsonwebtoken";
import { config } from "../config/env";

export const signToken = (id: string): string => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });
};
```

### کنترلر ثبت‌نام (Signup)

مراحل پیاده‌سازی کنترلر ثبت‌نام:

1. دریافت اطلاعات از درخواست.
2. ایجاد کاربر جدید در دیتابیس.
3. تولید توکن برای کاربر جدید.
4. پاک‌سازی رمز عبور از شیء پاسخ (برای جلوگیری از افشای آن).
5. ارسال توکن و اطلاعات کاربر به عنوان پاسخ موفقیت‌آمیز.

```typescript
import { Request, Response, NextFunction } from "express";
import User from "../models/userModel";
import { signToken } from "../utils/auth"; // مسیر تابع کمکی

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, password, email } = req.body;
  const newUser = await User.create({ name, password, email });

  newUser.password = undefined;
  const token = signToken(newUser._id.toString());

  res.status(201).json({
    status: "success",
    message: "user signup successfully",
    token,
    data: {
      user: newUser,
    },
  });
};
```

> **خلاصه فصل سوم:** صدور توکن پس از ثبت‌نام باعث بهبود تجربه کاربری می‌شود. قرار دادن حداقل اطلاعات ممکن (مانند شناسه کاربر) در توکن، پایداری داده‌ها و بهینگی حجم ترافیک شبکه را تضمین می‌کند.

**ادامه مسیر یادگیری:** پس از پیاده‌سازی ثبت‌نام، باید فرآیند پیچیده‌ترِ ورود (Login) و مقایسه امن رمزهای عبور را در سمت پایگاه داده بررسی کنیم.

---

## فصل چهارم: ورود به سیستم (Login) و متدهای Mongoose

فرآیند ورود نیازمند دریافت اطلاعات از کاربر، جستجو در دیتابیس و بررسی صحت رمز عبور است.

### اصول امنیتی ورود

1. **جلوگیری از تشخیص کاربران (User Enumeration Prevention):** در صورت اشتباه بودن ایمیل یا رمز عبور، همواره باید یک پیام خطای عمومی و یکسان (مانند "ایمیل یا رمز عبور اشتباه است") ارسال شود تا هکرها نتوانند از روی نوع خطای بازگشتی، آدرس‌های ایمیلِ ثبت‌شده در سیستم را شناسایی کنند.
2. **استفاده از توابع Async در بررسی رمز:** مقایسه رمزها توسط الگوریتم Bcrypt نیازمند پردازش سنگین است تا در برابر حملات Brute-Force مقاومت کند. استفاده از ساختار ناهمگام (Async) از مسدود شدن پردازشگر اصلی Node.js جلوگیری می‌کند.

### توسعه Model با متدهای اختصاصی (Instance Methods)

برای جلوگیری از پراکندگی منطق برنامه، عملیات مربوط به پایگاه داده باید درون خود مدل‌ها صورت گیرد. ما یک متد برای مقایسه رمز عبور ورودی با رمز عبور هش‌شده در دیتابیس می‌نویسیم.

```typescript
import { Schema, model, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUserMethods extends Document {
  correctPassword(
    candidatePassword: string,
    userPassword: string,
  ): Promise<boolean>;
  changedPasswordAfter(JWTTimestamp: number): boolean;
}

const userSchema = new Schema<
  IUser,
  Model<IUser, {}, IUserMethods>,
  IUserMethods
>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    // سایر فیلدها...
  },
  { timestamps: true },
);

// متد مقایسه رمز عبور
userSchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// متد بررسی تغییر رمز عبور (پایه برای مراحل بعدی)
userSchema.methods.changedPasswordAfter = function (
  JWTTimestamp: number,
): boolean {
  return false;
};

const User = model<IUser, Model<IUser, {}, IUserMethods>>("User", userSchema);
export default User;
```

### پیاده‌سازی کنترلر ورود (Login)

از آنجا که فیلد `password` در مدل با ویژگی `select: false` تعریف شده است، باید هنگام جستجوی کاربر برای ورود، درخواست واکشی این فیلد را به صورت صریح با `select('+password')` به Mongoose اعلام کنیم.

```typescript
import { Request, Response, NextFunction } from "express";
import User from "../models/userModel";
import { AppError } from "../utils/AppError";
import { signToken } from "../utils/auth";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // آوردن صریح پسورد همراه با شیء کاربر
  const user = await User.findOne({ email }).select("+password");

  if (
    !user ||
    !(await user.correctPassword(password, user.password as string))
  ) {
    return next(new AppError("Incorrect email or password", 401));
  }

  const token = signToken(user._id.toString());

  res.status(200).json({
    status: "success",
    token,
  });
};
```

> **خلاصه فصل چهارم:** منطق اعتبارسنجی رمز عبور باید در سطح Model قرار گیرد. ترکیب صحیح شرایط عدم وجود کاربر و عدم تطابق رمز عبور در یک ساختار شرطی واحد (`if`)، ضمن تمیز کردن کد، از نشت اطلاعات امنیتی جلوگیری می‌کند.

**ادامه مسیر یادگیری:** تولید توکن تنها نیمی از مسیر است. اکنون باید از این توکن برای محافظت از مسیرهای خصوصی سیستم استفاده کنیم.

---

## فصل پنجم: محافظت از مسیرها (Route Protection)

مهم‌ترین لایه امنیتی در احراز هویت توکن‌محور، ساخت میدل‌وری است که به عنوان «نگهبان» پیش از دسترسی به روت‌های محافظت‌شده اجرا شود.

### کلمه کلیدی Bearer

کلاینت برای اثبات هویت خود، باید توکن را از طریق هدر `Authorization` ارسال کند. بر اساس استاندارد جهانی HTTP، پیش از مقدار توکن باید کلمه `Bearer` به معنای «حامل» درج شود. مفهوم این کلمه در امنیت این است: «هر سیستمی که حامل این توکن باشد، اجازه ورود و دسترسی دارد».

### معماری میدل‌ور محافظت

یک میدل‌ور احراز هویت قدرتمند، ۴ مرحله بررسی قطعی انجام می‌دهد:

1. بررسی ارسال توکن در هدر `Authorization`.
2. اعتبارسنجی امضا و انقضای توکن.
3. تایید وجود کاربرِ مرتبط با توکن در دیتابیس فعلی.
4. بررسی عدم تغییر رمز عبور توسط کاربر پس از صدور توکن (مقایسه فیلد `iat` از توکن با زمان آخرین تغییر رمز).

### رفع چالش‌های تایپ‌اسکریپت (گسترش نوع Request)

در مرحله پایانی اعتبارسنجی، اطلاعات کاربرِ تاییدشده بر روی شیء `req` قرار داده می‌شود (`req.user = currentUser`) تا سایر کنترلرها نیازی به واکشی مجدد از دیتابیس نداشته باشند (مفهوم State-Passing).
از آنجایی که شیء `Request` در Express به طور پیش‌فرض فاقد ویژگی `user` است، توسعه‌دهندگان در TypeScript با خطای `Property 'user' does not exist on type 'Request'` مواجه می‌شوند.

**راه‌حل:** گسترش رابط `Request` از طریق Declaration Merging.
ابتدا فایلی به نام `express.d.ts` در مسیر `src/types/` ایجاد کنید:

```typescript
import { IUser } from "../models/userModel";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
```

سپس در فایل `tsconfig.json` پیکربندی خواندن انواع را مشخص نمایید:

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"]
  },
  "include": ["src/**/*"]
}
```

### پیاده‌سازی نهایی میدل‌ور Protect

```typescript
import { Request, Response, NextFunction } from "express";
import { promisify } from "util";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/userModel";
import { AppError } from "../utils/AppError";
import { config } from "../config/env";

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // ۱) بررسی حضور توکن
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401),
    );
  }

  // ۲) تایید اعتبار توکن
  const decoded = (await (promisify(jwt.verify) as any)(
    token,
    config.jwtSecret,
  )) as JwtPayload;

  // ۳) تایید وجود کاربر در دیتابیس
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401,
      ),
    );
  }

  // ۴) بررسی تغییر رمز عبور پس از صدور توکن
  if (currentUser.changedPasswordAfter(decoded.iat as number)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401),
    );
  }

  // قرار دادن کاربر تاییدشده در شیء Request جهت استفاده در کنترلرهای بعدی
  req.user = currentUser;

  next();
};
```

> **نکته:** در محیط Postman، تنظیمات تب Authorization روی `Bearer Token` به طور خودکار کلمه `Bearer` را قبل از توکن تزریق می‌کند. کپی کردن کلمه `Bearer` به همراه توکن در این کادر باعث ایجاد خطای `jwt malformed` خواهد شد.

> **خلاصه فصل پنجم:** میدل‌ور `protect` با عبور دادن درخواست از چهار لایه اعتبارسنجی دقیق، امنیت سیستم را تضمین کرده و با قرار دادن اطلاعات کاربر درون درخواست، مسیر دسترسی آسان به داده‌ها را برای سایر کنترلرهای سیستم باز می‌کند. استفاده از Declaration Merging برای تطبیق تایپ‌اسکریپت در این فرآیند الزامی است.

## فصل ششم: مدیریت انقضای توکن در صورت تغییر رمز عبور

یکی از آسیب‌پذیری‌های رایج در سیستم‌های مبتنی بر JWT، اعتبار داشتن توکن‌های قدیمی پس از تغییر رمز عبور توسط کاربر است. برای رفع این مشکل، باید تاریخ صدور توکن (فیلد `iat`) را با تاریخ آخرین تغییر رمز عبور مقایسه کنیم.

### به‌روزرسانی مدل داده (Model)

ابتدا باید فیلد جدیدی به نام `passwordChangedAt` از نوع `Date` به Schema و Interface کاربر اضافه شود تا زمان دقیق تغییر رمز عبور در پایگاه داده ثبت گردد.

### پیاده‌سازی متد اعتبارسنجی تغییر رمز

این منطق به عنوان یک Instance Method به نام `changedPasswordAfter` به `userSchema` اضافه می‌شود.

**چالش فنی:** زمان ذخیره‌شده در توکن (JWT Timestamp) بر حسب ثانیه محاسبه می‌شود، در حالی که شیء `Date` در جاوااسکریپت بر حسب میلی‌ثانیه کار می‌کند. برای مقایسه صحیح، باید زمان جاوااسکریپت با تقسیم بر ۱۰۰۰ به ثانیه تبدیل شود.

```typescript
userSchema.methods.changedPasswordAfter = function (
  JWTTimestamp: number,
): boolean {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      (this.passwordChangedAt.getTime() / 1000).toString(),
      10,
    );

    // بازگشت مقدار True به معنای سوخته بودن توکن است
    return JWTTimestamp < changedTimestamp;
  }

  // مقدار False یعنی رمز عبور از زمان صدور توکن تا کنون تغییر نکرده است
  return false;
};
```

مستندات فصل هفتم تقدیم شما. می‌توانید این بخش را به جزوه آموزشی خود اضافه کنید:

````markdown
## فصل هفتم: سطوح دسترسی و احراز مجوز (Authorization)

پس از احراز هویت (Authentication) که تنها ورود موفقیت‌آمیز کاربر را بررسی می‌کند، نیازمند لایه‌ای برای اعطای دسترسی (Authorization) هستیم. در این لایه بررسی می‌شود که آیا کاربرِ واردشده، صلاحیت و مجوز لازم برای انجام یک عملیات خاص (مانند حذف داده‌ها یا مشاهده لیست کاربران) را دارد یا خیر.

### تفاوت ارورهای ۴۰۱ و ۴۰۳

- **ارور ۴۰۱ (Unauthorized):** به معنای «شما وارد سیستم نشده‌اید» (نقص در احراز هویت).
- **ارور ۴۰۳ (Forbidden):** به معنای «شما وارد شده‌اید، اما اجازه دسترسی به این منبع را ندارید» (نقص در احراز مجوز).

### توسعه مدل کاربر برای پشتیبانی از نقش‌ها

ابتدا باید فیلد `role` (نقش) به مدل پایگاه داده اضافه شود. استفاده از محدودیت `enum` در Mongoose تضمین می‌کند که این فیلد تنها مقادیر از پیش‌تعریف‌شده را دریافت کند.

```typescript
const userSchema = new Schema<IUser, IUserMethods Model<IUser, {},>, IUserMethods>(
  {
    // ... سایر فیلدها
    role: {
      type: String,
      enum: ['user', 'admin', 'guide'],
      default: 'user', // پیش‌فرض برای ثبت‌نام‌های جدید
    },
  }
);
```
````

### پیاده‌سازی میدل‌ور restrictTo با استفاده از Closure

در فریم‌ورک Express، توابع میدل‌ور تنها سه پارامتر ثابت (`req, res, next`) را می‌پذیرند. برای ارسال پارامترهای سفارشی (مانند لیست نقش‌های مجاز) به یک میدل‌ور، از الگوی توابع تودرتو (Closure) در جاوااسکریپت استفاده می‌شود. تابع بیرونی نقش‌ها را دریافت کرده و تابع درونی (میدل‌ور اصلی) را برمی‌گرداند.

```typescript
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // پیش‌نیاز: این میدل‌ور باید حتماً پس از میدل‌ور protect اجرا شود
    // تا شیء req.user در دسترس باشد
    if (!roles.includes(req.user?.role as string)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }

    next();
  };
};
```

### نحوه محافظت از مسیرها

برای اعمال این محدودیت، کافی است توابع `protect` و `restrictTo` را به صورت زنجیره‌ای قبل از کنترلر نهایی در سیستم روتر قرار دهیم.

```typescript
// دسترسی انحصاری برای مدیران
router.delete("/:id", protect, restrictTo("admin"), deleteUser);
```

> **نکته معماری:** ترتیب قرارگیری میدل‌ورها به شدت حیاتی است. میدل‌ور `restrictTo` کاملاً وابسته به خروجی میدل‌ور `protect` (یعنی استخراج `req.user`) است؛ بنابراین همیشه باید پس از آن فراخوانی شود.

> **خلاصه فصل هفتم:** با استفاده از مفهوم Closure در جاوااسکریپت، یک میدل‌ور پویای مدیریت دسترسی ساختیم که بر اساس نقشِ استخراج‌شده از پایگاه داده، از مسیرهای حساس سیستم در برابر کاربران فاقد صلاحیت محافظت می‌کند.

```

```
