import type { Dict } from "../translate";

// Arabic (partial, right-to-left). Missing strings fall back to English.
// Have a medical translator complete and review before switching Arabic on.
const dict: Dict = {
  "Skip to main content": "انتقل إلى المحتوى الرئيسي",
  Home: "الرئيسية",
  Search: "بحث",
  Consults: "الاستشارات",
  Records: "السجلات",
  Profile: "الملف الشخصي",
  "Find a doctor": "ابحث عن طبيب",
  Specialties: "التخصصات",
  Hospitals: "المستشفيات",
  "International patients": "المرضى الدوليون",
  Help: "مساعدة",
  Emergency: "طوارئ",
  "Emergency help": "مساعدة طارئة",
  "Log in": "تسجيل الدخول",
  "Log out": "تسجيل الخروج",
  "Consult now": "استشر الآن",
  "Book clinic visit": "احجز زيارة للعيادة",
  Language: "اللغة",
  "Language and currency": "اللغة والعملة",
  "Show prices in": "عرض الأسعار بـ",
  Display: "العرض",
  "Text size": "حجم النص",
  Normal: "عادي",
  Large: "كبير",
  "Extra large": "كبير جدًا",
  Contrast: "التباين",
  "High contrast": "تباين عالٍ",
  Appearance: "المظهر",
  Light: "فاتح",
  Dark: "داكن",
  "Consult verified doctors online and in clinic": "استشر أطباء موثّقين عبر الإنترنت وفي العيادة",
  "Demo version: doctors, clinics and patients are fictional. Do not use for real medical care.":
    "نسخة تجريبية: الأطباء والعيادات والمرضى غير حقيقيين. لا تستخدمها للرعاية الطبية الفعلية.",
  "How it works": "كيف يعمل",
  "Treatment in India": "العلاج في الهند",
};

export default dict;
