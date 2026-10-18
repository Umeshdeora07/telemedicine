import type { Dict } from "../translate";

// Hindi for the redesign (part a1: site shell, header, footer, settings, photos).
// Keys are the English strings used on screen.
const dict: Dict = {
  // Page title and description
  "Online consultation with Indian specialists and treatment in India": "भारतीय विशेषज्ञ डॉक्टरों से ऑनलाइन परामर्श और भारत में इलाज",
  "See a doctor registered in India by video, wherever you live. Or plan your treatment in India with a free review of your reports, a written cost estimate and help with your visa, travel and stay.":
    "आप कहीं भी रहते हों, भारत में पंजीकृत डॉक्टर से वीडियो पर मिलें। या भारत में अपने इलाज की योजना बनाएं: आपकी रिपोर्ट की मुफ़्त जांच, खर्च का लिखित अनुमान, और वीज़ा, यात्रा व ठहरने में मदद।",

  // Header
  "Online consultation": "ऑनलाइन परामर्श",
  "Treatment in India": "भारत में इलाज",
  "Our doctors": "हमारे डॉक्टर",
  "About us": "हमारे बारे में",
  Contact: "संपर्क",
  "Book a consultation": "परामर्श बुक करें",
  Menu: "मेनू",
  "Close menu": "मेनू बंद करें",
  "Main menu": "मुख्य मेनू",
  "Dark mode": "डार्क मोड",
  "Switch to light mode": "लाइट मोड चालू करें",
  "Switch to dark mode": "डार्क मोड चालू करें",
  "Change language:": "भाषा बदलें:",
  "My consultations": "मेरे परामर्श",
  "My treatment plans": "मेरी इलाज योजनाएं",

  // Footer
  "For patients": "मरीज़ों के लिए",
  "Request a call back": "कॉल बैक का अनुरोध करें",
  Orthopaedics: "हड्डी रोग (ऑर्थोपेडिक्स)",
  Dermatology: "त्वचा रोग (डर्मेटोलॉजी)",
  "General Physician": "जनरल फिजिशियन",
  Psychology: "मनोविज्ञान (साइकोलॉजी)",
  Complaints: "शिकायतें",
  "Refunds and cancellation": "रिफ़ंड और रद्द करना",
  WhatsApp: "व्हाट्सऐप",
  GSTIN: "जीएसटीआईएन",
  "Consult doctors registered in India from anywhere in the world, and plan your treatment in India with a team that helps at every step.":
    "दुनिया में कहीं से भी भारत में पंजीकृत डॉक्टरों से परामर्श लें, और भारत में अपने इलाज की योजना ऐसी टीम के साथ बनाएं जो हर कदम पर आपकी मदद करती है।",
  "Every doctor's registration is checked before they are listed": "सूची में आने से पहले हर डॉक्टर का पंजीकरण जांचा जाता है",
  "Encrypted video calls and secure records": "एन्क्रिप्टेड वीडियो कॉल और सुरक्षित रिकॉर्ड",
  "Full refund if the doctor does not join within 10 minutes": "डॉक्टर 10 मिनट में न जुड़ें तो पूरा पैसा वापस",
  "This service is not for emergencies. In an emergency, go to the nearest hospital or call your local emergency number.":
    "यह सेवा आपातकाल के लिए नहीं है। आपातकाल में नज़दीकी अस्पताल जाएं या अपने देश का आपातकालीन नंबर डायल करें।",
  "Prices shown in": "दाम इस मुद्रा में दिखें",
  "US dollar": "अमेरिकी डॉलर",
  "UAE dirham": "यूएई दिरहम",

  // Cookie banner
  "We use essential cookies to keep you signed in and to remember your language and theme. With your permission, we would also use anonymous analytics to improve the service.":
    "हम ज़रूरी कुकीज़ का इस्तेमाल करते हैं ताकि आप साइन इन रहें और आपकी भाषा व थीम याद रहे। आपकी अनुमति से, हम सेवा बेहतर बनाने के लिए गुमनाम एनालिटिक्स का भी इस्तेमाल करेंगे।",

  // Settings
  "Language, appearance and privacy.": "भाषा, रूप और गोपनीयता।",
  Theme: "थीम",
  "Occasional emails about our services and offers.": "हमारी सेवाओं और ऑफ़र के बारे में कभी कभी ईमेल।",

  // Photo descriptions (src/config/images.ts)
  "A doctor talking with a patient on a video call": "वीडियो कॉल पर मरीज़ से बात करते हुए डॉक्टर",
  "A doctor giving an online consultation at a desk": "डेस्क पर बैठकर ऑनलाइन परामर्श देते हुए डॉक्टर",
  "A woman at home looking at her laptop during an online consultation": "ऑनलाइन परामर्श के दौरान घर पर अपना लैपटॉप देखती हुई महिला",
  "A doctor in a white coat with a stethoscope": "सफ़ेद कोट और स्टेथोस्कोप के साथ डॉक्टर",
  "A doctor with a stethoscope standing in a clinic corridor": "क्लिनिक के गलियारे में स्टेथोस्कोप के साथ खड़े डॉक्टर",
  "A clean, modern hospital corridor with a row of chairs": "कुर्सियों की कतार वाला साफ़ और आधुनिक अस्पताल का गलियारा",
  "A team of doctors and nurses standing together": "एक साथ खड़े डॉक्टरों और नर्सों की टीम",
  "A smiling traveller with a suitcase walking through an airport": "सूटकेस के साथ हवाई अड्डे से गुज़रता मुस्कुराता यात्री",
  "A doctor explaining a foot X-ray to a patient": "मरीज़ को पैर का एक्स रे समझाते हुए डॉक्टर",
  "A doctor looking closely at an X-ray": "एक्स रे को ध्यान से देखते हुए डॉक्टर",
  "A dermatologist examining skin with a magnifying glass": "आवर्धक लेंस से त्वचा की जांच करते हुए त्वचा रोग विशेषज्ञ",
  "A health worker measuring a patient's blood pressure": "मरीज़ का ब्लड प्रेशर नापते हुए स्वास्थ्यकर्मी",
  "A man talking with a therapist during a counselling session": "काउंसलिंग सत्र में थेरेपिस्ट से बात करता हुआ एक व्यक्ति",
  "A smiling woman from the support team wearing a headset": "हेडसेट पहने सहायता टीम की मुस्कुराती हुई सदस्य",
};

export default dict;
