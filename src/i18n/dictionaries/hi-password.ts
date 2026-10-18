import type { Dict } from "../translate";

// Hindi for password login. Keys are the English strings used on screen.
const dict: Dict = {
  "Use your mobile number or email with a password. New here? Choose Create account.": "अपने मोबाइल नंबर या ईमेल और पासवर्ड से लॉग इन करें। पहली बार आए हैं? खाता बनाएँ चुनें।",
  "Create account": "खाता बनाएँ",
  "Creating your account…": "आपका खाता बन रहा है…",
  "Logging in…": "लॉग इन हो रहा है…",
  Password: "पासवर्ड",
  "Choose a password": "पासवर्ड चुनें",
  "At least 8 characters.": "कम से कम 8 अक्षर।",
  "Show password": "पासवर्ड दिखाएँ",
  "Forgot your password?": "पासवर्ड भूल गए?",
  "Log in with a one time code": "एक बार के कोड से लॉग इन करें",
  "Log in with a one time code instead. Then you can choose a new password under Password in your account menu.":
    "इसके बजाय एक बार के कोड से लॉग इन करें। फिर अपने खाते के मेन्यू में पासवर्ड में जाकर नया पासवर्ड चुन सकते हैं।",
  "Get a one time code": "एक बार का कोड पाएँ",
  "Log in with a password instead": "इसके बजाय पासवर्ड से लॉग इन करें",
  "Please contact us from the email or number on your account. We will send you a link to choose a new password.":
    "कृपया अपने खाते वाले ईमेल या नंबर से हमसे संपर्क करें। हम आपको नया पासवर्ड चुनने का लिंक भेजेंगे।",
  "Please enter your password.": "कृपया अपना पासवर्ड डालें।",
  "Logging in with a password is turned off on this site.": "इस साइट पर पासवर्ड से लॉग इन बंद है।",
  "This email or number is already used by another account. Please log in the way you set that account up, or contact us.":
    "यह ईमेल या नंबर पहले से किसी दूसरे खाते में है। कृपया उसी तरीके से लॉग इन करें जिससे वह खाता बनाया था, या हमसे संपर्क करें।",
  "Your new password is set. Please log in with it.": "आपका नया पासवर्ड सेट हो गया है। कृपया उससे लॉग इन करें।",

  // Checks on the password
  "Please use at least {n} characters.": "कृपया कम से कम {n} अक्षर इस्तेमाल करें।",
  "That password is too long.": "यह पासवर्ड बहुत लंबा है।",
  "That password is too easy to guess. Please choose another.": "इस पासवर्ड का अंदाज़ा लगाना बहुत आसान है। कृपया कोई दूसरा चुनें।",
  "Please don't use your email or number as the password.": "कृपया अपने ईमेल या नंबर को पासवर्ड न बनाएँ।",
  "An account with this email or number already exists. Please log in instead.": "इस ईमेल या नंबर से पहले से एक खाता है। कृपया लॉग इन करें।",
  "Too many wrong passwords. Please wait {n} minutes and try again.": "बहुत बार ग़लत पासवर्ड डाला गया। कृपया {n} मिनट रुककर फिर कोशिश करें।",
  "That email or number and password don't match. Please try again.": "यह ईमेल या नंबर और पासवर्ड मेल नहीं खाते। कृपया फिर कोशिश करें।",

  // Password page
  "Add a password": "पासवर्ड जोड़ें",
  "Change your password": "अपना पासवर्ड बदलें",
  "You log in with {contact} and this password.": "आप {contact} और इस पासवर्ड से लॉग इन करते हैं।",
  "Your account has no email or mobile number to log in with.": "आपके खाते में लॉग इन के लिए कोई ईमेल या मोबाइल नंबर नहीं है।",
  "Current password": "मौजूदा पासवर्ड",
  "New password": "नया पासवर्ड",
  "Save password": "पासवर्ड सहेजें",
  "Your current password is not right.": "आपका मौजूदा पासवर्ड सही नहीं है।",
  "Your password is saved. Other devices were logged out.": "आपका पासवर्ड सहेज लिया गया। दूसरे डिवाइस से लॉग आउट कर दिया गया।",

  // Reset links
  "Choose a new password": "नया पासवर्ड चुनें",
  "For the account {contact}. After this you log in with the new password.": "खाता {contact} के लिए। इसके बाद आप नए पासवर्ड से लॉग इन करेंगे।",
  "This link has expired or was already used. Please ask us for a new one.": "इस लिंक का समय ख़त्म हो गया है या यह पहले इस्तेमाल हो चुका है। कृपया हमसे नया लिंक माँगें।",
  "Go to log in": "लॉग इन पर जाएँ",
  "Password reset link": "पासवर्ड बदलने का लिंक",
  "Send this link to the person yourself, for example by WhatsApp. It works once, for 24 hours.":
    "यह लिंक उस व्यक्ति को ख़ुद भेजें, जैसे WhatsApp से। यह एक बार, 24 घंटे तक काम करता है।",
  "Search by name, phone or email. Suspending signs the person out everywhere. Someone who forgot their password can get a reset link from you.":
    "नाम, फ़ोन या ईमेल से खोजें। निलंबित करने पर व्यक्ति हर जगह से लॉग आउट हो जाता है। पासवर्ड भूलने वाले को आप पासवर्ड बदलने का लिंक दे सकते हैं।",
  "Admins change their own password under Password.": "एडमिन अपना पासवर्ड ख़ुद पासवर्ड में जाकर बदलते हैं।",
  "Not found.": "नहीं मिला।",
  "Mobile number or email": "मोबाइल नंबर या ईमेल",
  "Forgot it? Log out, log in with a one time code, then come back here within 15 minutes.":
    "भूल गए? लॉग आउट करें, एक बार के कोड से लॉग इन करें, फिर 15 मिनट के अंदर यहाँ वापस आएँ।",
  "Forgot it? Please contact us and we will send you a link to choose a new password.": "भूल गए? कृपया हमसे संपर्क करें, हम आपको नया पासवर्ड चुनने का लिंक भेजेंगे।",
  "The time to choose a new password without your old one has run out. Enter your current password, or log in again with a one time code.":
    "पुराने पासवर्ड के बिना नया पासवर्ड चुनने का समय ख़त्म हो गया है। अपना मौजूदा पासवर्ड डालें, या एक बार के कोड से फिर लॉग इन करें।",
};

export default dict;
