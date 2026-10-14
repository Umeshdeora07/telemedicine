import type { Dict } from "../translate";
import app1 from "./hi-app-1";
import app2 from "./hi-app-2";
import app3 from "./hi-app-3";
import app4 from "./hi-app-4";
import app5 from "./hi-app-5";
import app6 from "./hi-app-6";
import app7 from "./hi-app-7";

// Hindi. Keys are the English strings used on screen. Plain, everyday Hindi
// (not overly formal) so it is easy for older users to read.
const dict: Dict = {
  // Navigation and common
  "Skip to main content": "मुख्य सामग्री पर जाएं",
  Home: "होम",
  Search: "खोजें",
  Consults: "परामर्श",
  Records: "रिकॉर्ड",
  Profile: "प्रोफ़ाइल",
  Main: "मुख्य",
  Primary: "मुख्य मेनू",
  "Find a doctor": "डॉक्टर खोजें",
  Specialties: "विशेषज्ञता",
  Hospitals: "अस्पताल",
  "International patients": "विदेशी मरीज़",
  Help: "मदद",
  Emergency: "आपातकाल",
  "Emergency help": "आपातकालीन मदद",
  "Log in": "लॉग इन",
  "Log out": "लॉग आउट",
  "Consult now": "अभी परामर्श करें",
  "Book clinic visit": "क्लिनिक विज़िट बुक करें",
  Dashboard: "डैशबोर्ड",
  "My consults": "मेरे परामर्श",
  "Health records": "स्वास्थ्य रिकॉर्ड",
  "Family members": "परिवार के सदस्य",
  Settings: "सेटिंग्स",
  "My portal": "मेरा पोर्टल",
  You: "आप",
  Notifications: "सूचनाएं",
  "Notifications ({count} new)": "सूचनाएं ({count} नई)",
  "Account menu for {name}": "{name} का अकाउंट मेनू",
  Patient: "मरीज़",
  "Family member / caregiver": "परिवार का सदस्य / देखभालकर्ता",
  Doctor: "डॉक्टर",
  "Language and currency": "भाषा और मुद्रा",
  Language: "भाषा",
  "Show prices in": "कीमतें दिखाएं",
  Display: "डिस्प्ले",
  "Display settings": "डिस्प्ले सेटिंग्स",
  "Text size": "अक्षरों का आकार",
  Normal: "सामान्य",
  Large: "बड़ा",
  "Extra large": "बहुत बड़ा",
  Contrast: "कंट्रास्ट",
  "High contrast": "ज़्यादा कंट्रास्ट",
  Appearance: "रूप",
  "Same as device": "फ़ोन जैसा",
  Light: "हल्का",
  Dark: "गहरा",
  Motion: "एनिमेशन",
  "Reduce motion": "एनिमेशन कम करें",
  Cookies: "कुकीज़",
  "Cookie policy": "कुकी नीति",
  "Essential only": "सिर्फ़ ज़रूरी",
  "Allow analytics": "एनालिटिक्स की अनुमति दें",
  "We use essential cookies to keep you signed in and remember your language. With your permission we'd also use anonymous analytics to improve the service.":
    "हम ज़रूरी कुकीज़ का उपयोग आपको लॉग इन रखने और आपकी भाषा याद रखने के लिए करते हैं। आपकी अनुमति से हम सेवा बेहतर करने के लिए गुमनाम एनालिटिक्स भी इस्तेमाल करेंगे।",
  "Demo version: doctors, clinics and patients are fictional. Do not use for real medical care.":
    "डेमो संस्करण: डॉक्टर, क्लिनिक और मरीज़ काल्पनिक हैं। असली इलाज के लिए उपयोग न करें।",
  "You'll be logged out soon": "आप जल्द ही लॉग आउट हो जाएंगे",
  "Stay logged in": "लॉग इन रहें",

  // Footer
  Patients: "मरीज़",
  Partners: "पार्टनर",
  Company: "कंपनी",
  Legal: "कानूनी",
  "Check your symptoms": "अपने लक्षण जांचें",
  "Second opinion": "दूसरी राय",
  "Pricing and plans": "कीमतें और प्लान",
  "Health library": "स्वास्थ्य जानकारी",
  "For doctors (join us)": "डॉक्टरों के लिए (हमसे जुड़ें)",
  "For clinics and hospitals": "क्लिनिक और अस्पतालों के लिए",
  "Hospitals and clinics": "अस्पताल और क्लिनिक",
  "About us": "हमारे बारे में",
  "How it works": "यह कैसे काम करता है",
  Contact: "संपर्क",
  "Help centre": "सहायता केंद्र",
  "Grievance officer": "शिकायत अधिकारी",
  "Terms of use": "उपयोग की शर्तें",
  "Privacy policy": "गोपनीयता नीति",
  "Telemedicine consent": "टेलीमेडिसिन सहमति",
  "Refund and cancellation": "रिफ़ंड और रद्द करना",
  "Medical disclaimer": "चिकित्सा अस्वीकरण",
  "Trusted doctors, online and in clinic. For you, your family in India, and patients from around the world.":
    "भरोसेमंद डॉक्टर, ऑनलाइन और क्लिनिक में। आपके लिए, भारत में आपके परिवार के लिए, और दुनिया भर के मरीज़ों के लिए।",
  "Every doctor's licence verified": "हर डॉक्टर का लाइसेंस जांचा गया",
  "Encrypted calls and records": "एन्क्रिप्टेड कॉल और रिकॉर्ड",
  "Full refund if the doctor doesn't join": "डॉक्टर न आएं तो पूरा पैसा वापस",
  "Not for emergencies: call 112 in India.": "आपातकाल के लिए नहीं: भारत में 112 पर कॉल करें।",
  "Consult verified doctors online and in clinic": "सत्यापित डॉक्टरों से ऑनलाइन और क्लिनिक में परामर्श",
  // Demo account notes on the login page
  "Patient, 62, prefers Hindi": "मरीज़, 62 वर्ष, हिंदी पसंद करती हैं",
  "Patient with wife and son": "मरीज़, पत्नी और बेटे के साथ",
  "Diabetes care plan, home readings and medicine reminders": "डायबिटीज़ केयर प्लान, घर की रीडिंग और दवा रिमाइंडर",
  "Son in London, parents in Kochi": "बेटा लंदन में, माता-पिता कोच्चि में",
  "International patient, Dhaka": "अंतरराष्ट्रीय मरीज़, ढाका",
  "Patient in New York": "न्यूयॉर्क में मरीज़",
  "Needs a clinic visit": "क्लिनिक विज़िट की ज़रूरत",
  "Doctor (general physician)": "डॉक्टर (जनरल फ़िज़िशियन)",
  "Doctor (cardiology, licensed in NY/NJ)": "डॉक्टर (हृदय रोग, NY/NJ में लाइसेंस)",
  "Hospital coordinator, Sunrise Valley": "अस्पताल कोऑर्डिनेटर, सनराइज़ वैली",
  "Care coordinator": "केयर कोऑर्डिनेटर",
  "Super admin": "सुपर एडमिन",
};

// Patient-facing screens are translated in hi-app-*.ts; this file wins on overlap.
export default { ...app1, ...app2, ...app3, ...app4, ...app5, ...app6, ...app7, ...dict } as Dict;
