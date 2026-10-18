import type { Dict } from "../translate";

// Hindi for the redesign (part b3: login, patient portal, staff portal menus,
// about, contact, help, for doctors, legal and prescription check pages).
// Keys are the English strings used on screen.
const dict: Dict = {
  // Login, sign up and two step verification
  "Log in or create an account": "लॉग इन करें या नया अकाउंट बनाएं",
  "Use your mobile number or email. We will send you a one time code, so you do not need a password.":
    "अपना मोबाइल नंबर या ईमेल डालें। हम आपको एक बार इस्तेमाल होने वाला कोड भेजेंगे, इसलिए पासवर्ड की ज़रूरत नहीं है।",
  "That sign in option is not available. Please use your mobile number or email.": "लॉग इन का यह तरीका अभी उपलब्ध नहीं है। कृपया अपना मोबाइल नंबर या ईमेल इस्तेमाल करें।",
  "Signing in took too long. Please try again.": "लॉग इन में बहुत समय लग गया। कृपया फिर से कोशिश करें।",
  "We could not sign you in with that account. Please try again.": "उस अकाउंट से आपका लॉग इन नहीं हो सका। कृपया फिर से कोशिश करें।",
  "Test account not found. Run npm run db:reset.": "टेस्ट अकाउंट नहीं मिला। npm run db:reset चलाएं।",
  "By continuing you agree to the {brand} Terms of use and Privacy policy.": "आगे बढ़कर आप {brand} की उपयोग की शर्तों और गोपनीयता नीति से सहमत होते हैं।",
  "Your details are encrypted and never sold.": "आपकी जानकारी एन्क्रिप्ट रहती है और कभी बेची नहीं जाती।",
  "Test accounts": "टेस्ट अकाउंट",
  "For checking the site while it is being set up. Hidden when the site goes live.": "साइट तैयार होने के दौरान जांच के लिए। साइट शुरू होने पर यह छिपा दिया जाएगा।",
  "Enter the 6 digit code we sent to": "6 अंकों का वह कोड डालें जो हमने भेजा है",
  "Text messages are not connected yet, so here is your code:": "टेक्स्ट मैसेज अभी जुड़े नहीं हैं, इसलिए आपका कोड यह है:",
  "Emails are not connected yet, so here is your code:": "ईमेल अभी जुड़े नहीं हैं, इसलिए आपका कोड यह है:",
  "We will send a 6 digit code by text message.": "हम टेक्स्ट मैसेज से 6 अंकों का कोड भेजेंगे।",
  "We will email you a 6 digit code.": "हम आपको ईमेल से 6 अंकों का कोड भेजेंगे।",
  "Two step verification": "दो चरणों वाली पुष्टि",
  "Doctors and staff use two step verification. You need an authenticator app such as Google Authenticator, Microsoft Authenticator or Authy.":
    "डॉक्टर और स्टाफ़ दो चरणों वाली पुष्टि इस्तेमाल करते हैं। इसके लिए आपको Google Authenticator, Microsoft Authenticator या Authy जैसा ऑथेंटिकेटर ऐप चाहिए।",
  "Set up two step verification": "दो चरणों वाली पुष्टि सेट करें",
  "Cannot scan it? Enter this key:": "स्कैन नहीं हो रहा? यह की डालें:",
  "2. Enter the 6 digit code it shows.": "2. ऐप में दिख रहा 6 अंकों का कोड डालें।",
  "Open your authenticator app and enter the 6 digit code for {issuer}.": "अपना ऑथेंटिकेटर ऐप खोलें और {issuer} का 6 अंकों का कोड डालें।",
  "While the site is being set up, the current code is shown here:": "साइट तैयार होने तक मौजूदा कोड यहां दिखाया जाता है:",
  "I will book consultations for myself": "मैं अपने लिए परामर्श बुक करूंगा या करूंगी",
  "I understand that online consultations have limits, and the doctor may ask me to visit in person.":
    "मैं समझता या समझती हूं कि ऑनलाइन परामर्श की कुछ सीमाएं हैं, और डॉक्टर मुझे खुद आकर दिखाने को कह सकते हैं।",

  // Test account notes (login page)
  "Patient, 62, prefers Hindi": "मरीज़, 62 साल, हिन्दी पसंद करती हैं",
  "Patient with wife and son": "पत्नी और बेटे के साथ मरीज़",
  "Diabetes review with a general physician": "जनरल फिजिशियन से डायबिटीज़ की जांच",
  "Son in London, parents in Kochi": "बेटा लंदन में, माता पिता कोच्चि में",
  "Planning treatment in India, from Dhaka": "ढाका से, भारत में इलाज की योजना",
  "Online consultation from Nairobi": "नैरोबी से ऑनलाइन परामर्श",
  "Needs a clinic visit": "क्लिनिक जाकर दिखाना है",
  "Doctor (general physician)": "डॉक्टर (जनरल फिजिशियन)",
  "Doctor (orthopaedics, treatment in India cases)": "डॉक्टर (हड्डी रोग, भारत में इलाज के मामले)",
  "Clinical psychologist": "क्लिनिकल साइकोलॉजिस्ट",
  "Hospital coordinator, Sunrise Valley": "अस्पताल कोऑर्डिनेटर, सनराइज़ वैली",
  "Care coordinator": "केयर कोऑर्डिनेटर",
  "Super admin": "सुपर एडमिन",

  // Patient menu and dashboard
  "Records and prescriptions": "रिकॉर्ड और पर्चे",
  "Good morning, {name}": "सुप्रभात, {name}",
  "Good afternoon, {name}": "नमस्कार, {name}",
  "Good evening, {name}": "शुभ संध्या, {name}",
  "What would you like to do today?": "आज आप क्या करना चाहेंगे?",
  "Welcome to {brand}": "{brand} में आपका स्वागत है",
  "You can add family members at any time from your profile.": "आप कभी भी अपनी प्रोफ़ाइल से परिवार के सदस्य जोड़ सकते हैं।",
  "Start here": "यहां से शुरू करें",
  "See a verified doctor registered in India on a private video call, from wherever you are.": "आप जहां भी हों, भारत में पंजीकृत और जांचे गए डॉक्टर से निजी वीडियो कॉल पर मिलें।",
  "Get a free treatment plan in India": "भारत में इलाज की मुफ़्त योजना पाएं",
  "Send your reports. A specialist reviews them for free and sends you a written plan and cost estimate.":
    "अपनी रिपोर्ट भेजें। विशेषज्ञ उन्हें मुफ़्त में देखते हैं और आपको लिखित योजना और खर्च का अनुमान भेजते हैं।",
  "Follow up recommended": "फ़ॉलो अप की सलाह",
  "Follow up recommended by {date}": "{date} तक फ़ॉलो अप की सलाह",
  "Book a follow up": "फ़ॉलो अप बुक करें",
  "Upcoming consultations": "आने वाले परामर्श",
  "No consultations booked": "कोई परामर्श बुक नहीं है",
  "When you book a consultation, it appears here with the time and a link to join.": "परामर्श बुक करने पर वह यहां समय और जुड़ने के लिंक के साथ दिखेगा।",
  "No prescriptions yet. After a consultation, your doctor's prescription appears here.": "अभी कोई पर्चा नहीं है। परामर्श के बाद डॉक्टर का पर्चा यहां दिखेगा।",
  "Treatment plan status": "इलाज योजना की स्थिति",
  "You have not asked for a treatment plan yet. Send your reports and a specialist will review them for free.":
    "आपने अभी तक इलाज योजना नहीं मांगी है। अपनी रिपोर्ट भेजें, विशेषज्ञ उन्हें मुफ़्त में देखेंगे।",

  // Consultations
  "Consultations and clinic visits for you and your family. Times are shown in {zone}.": "आपके और आपके परिवार के परामर्श और क्लिनिक विज़िट। समय {zone} में दिखाया गया है।",
  "No upcoming consultations": "कोई आने वाला परामर्श नहीं",
  "Doctor did not join, refunded": "डॉक्टर नहीं जुड़े, पैसे वापस",
  "Video consultation": "वीडियो परामर्श",
  "Chat consultation": "चैट परामर्श",
  "Fill in the health form": "स्वास्थ्य फ़ॉर्म भरें",
  "Consultation details": "परामर्श का विवरण",
  "We refunded you in full automatically. We are sorry for the trouble.": "हमने आपके पूरे पैसे अपने आप लौटा दिए हैं। परेशानी के लिए हमें खेद है।",
  "Book another doctor": "दूसरा डॉक्टर बुक करें",
  "Notes, reports and payments carry over between the online consultation and the clinic visit.": "ऑनलाइन परामर्श और क्लिनिक विज़िट के बीच नोट्स, रिपोर्ट और भुगतान साथ रहते हैं।",
  "Before your consultation": "परामर्श से पहले",
  "Please fill in the health form before your consultation, so your doctor knows about the problem.": "कृपया परामर्श से पहले स्वास्थ्य फ़ॉर्म भरें, ताकि डॉक्टर को आपकी समस्या पता हो।",
  "Fill in the form (2 minutes)": "फ़ॉर्म भरें (2 मिनट)",
  "Family members can join from anywhere. Open the consultation and use “Invite family or interpreter”.": "परिवार के सदस्य कहीं से भी जुड़ सकते हैं। परामर्श खोलें और “परिवार या दुभाषिए को बुलाएं” इस्तेमाल करें।",
  "You will get a full refund of {amount}.": "आपको {amount} पूरे वापस मिलेंगे।",
  "You will get {amount} back. This is a {pct}% refund, because it is less than {h} hours before the start.": "आपको {amount} वापस मिलेंगे। यह {pct}% वापसी है, क्योंकि शुरू होने में {h} घंटे से कम समय बचा है।",
  "It is too late for a refund.": "अब पैसे वापस मिलने का समय निकल चुका है।",
  "In an emergency, go to the nearest hospital or call your local emergency number.": "आपात स्थिति में नज़दीकी अस्पताल जाएं या अपने इलाके का आपातकालीन नंबर मिलाएं।",
  "Digital prescription": "डिजिटल पर्चा",
  PDF: "PDF",
  "The free follow up chat closed on {date}. Book a follow up consultation to ask more.": "मुफ़्त फ़ॉलो अप चैट {date} को बंद हो गई। और पूछने के लिए फ़ॉलो अप परामर्श बुक करें।",
  "Insurance claim pack: invoice, prescription and summary": "बीमा क्लेम पैक: इनवॉइस, पर्चा और सारांश",
  "Something wrong with this consultation?": "इस परामर्श में कोई गड़बड़ी है?",
  "For {name}. You can update this at any time before the consultation.": "{name} के लिए। परामर्श से पहले आप इसे कभी भी बदल सकते हैं।",
  "Health form": "स्वास्थ्य फ़ॉर्म",
  "Your online consultation notes and reports are shared with the clinic, so you do not have to repeat everything.": "आपके ऑनलाइन परामर्श के नोट्स और रिपोर्ट क्लिनिक को भेजे जाते हैं, ताकि आपको सब कुछ दोबारा न बताना पड़े।",
  "The online consultation fee ({fee}) is taken off the clinic visit with the same doctor.": "उसी डॉक्टर की क्लिनिक विज़िट में ऑनलाइन परामर्श की फ़ीस ({fee}) घटा दी जाती है।",
  "You will get a visit pass with a QR code to show at reception. Times are shown in India time (IST).": "आपको QR कोड वाला विज़िट पास मिलेगा, जिसे रिसेप्शन पर दिखाना है। समय भारतीय समय (IST) में दिखाया गया है।",
  "Old reports and scans. The clinic can also see the ones you uploaded.": "पुरानी रिपोर्ट और स्कैन। आपकी अपलोड की हुई रिपोर्ट क्लिनिक भी देख सकता है।",
  "The clinic will see your online consultation notes when you check in.": "चेक इन करते समय क्लिनिक आपके ऑनलाइन परामर्श के नोट्स देखेगा।",
  "Free follow up chat. The doctor usually replies within a few hours.": "मुफ़्त फ़ॉलो अप चैट। डॉक्टर आमतौर पर कुछ घंटों में जवाब देते हैं।",
  "How was your consultation with {name}?": "{name} के साथ आपका परामर्श कैसा रहा?",
  "A partner pharmacy in India delivers the medicines on your digital prescription. You pay them on delivery.": "भारत की एक पार्टनर फ़ार्मेसी आपके डिजिटल पर्चे की दवाएं पहुंचाती है। आप डिलीवरी पर भुगतान करते हैं।",

  // Records, prescriptions, payments, notifications
  "Your reports, scans and prescriptions in one safe place. They are encrypted and shared only when you choose.": "आपकी रिपोर्ट, स्कैन और पर्चे एक सुरक्षित जगह पर। ये एन्क्रिप्ट रहते हैं और सिर्फ़ आपकी मर्ज़ी से साझा होते हैं।",
  "You, and the doctor during each consultation you book.": "आप, और आपके हर बुक किए परामर्श के दौरान डॉक्टर।",
  "You, family members you allow, and the doctor during each consultation you book.": "आप, परिवार के वे सदस्य जिन्हें आप अनुमति दें, और आपके हर बुक किए परामर्श के दौरान डॉक्टर।",
  "Your ABHA address looks like name@abdm.": "आपका ABHA पता name@abdm जैसा दिखता है।",
  "Dr. Rao, family doctor": "डॉ. राव, फ़ैमिली डॉक्टर",
  "Do not use it. Check your consultation for a new one.": "इसका इस्तेमाल न करें। नए पर्चे के लिए अपना परामर्श देखें।",
  "Follow up: {date}": "फ़ॉलो अप: {date}",
  "Every payment with its GST invoice. Useful for insurance claims and company reimbursements.": "हर भुगतान और उसका GST इनवॉइस। बीमा क्लेम और कंपनी से पैसे वापस लेने में काम आता है।",
  "Online consultation": "ऑनलाइन परामर्श",
  "Earlier care plan": "पुराना केयर प्लान",
  "Earlier report review": "पहले की रिपोर्ट समीक्षा",
  "Treatment deposit": "इलाज की जमा राशि",
  "Hospital bill": "अस्पताल का बिल",
  "Reminders and updates. You also get them by text message, email and WhatsApp if you turned it on.": "रिमाइंडर और अपडेट। ये आपको टेक्स्ट मैसेज, ईमेल और (अगर आपने चालू किया है तो) व्हाट्सऐप पर भी मिलते हैं।",

  // Profile, settings
  "Your doctor sees these before each consultation. Keep allergies and medicines up to date.": "हर परामर्श से पहले डॉक्टर यह जानकारी देखते हैं। एलर्जी और दवाओं की जानकारी अपडेट रखें।",
  "Saved. Your doctor will see this before your next consultation.": "सेव हो गया। अगले परामर्श से पहले डॉक्टर इसे देखेंगे।",
  "Ongoing health conditions": "लंबे समय से चल रही बीमारियां",
  "Language, appearance, notifications and privacy.": "भाषा, रूप, सूचनाएं और गोपनीयता।",
  "Language and appearance": "भाषा और रूप",
  "Prices and times": "कीमतें और समय",
  "We always send booking confirmations and reminders by text message and email. Choose what else you would like.": "बुकिंग की पुष्टि और रिमाइंडर हम हमेशा टेक्स्ट मैसेज और ईमेल से भेजते हैं। बाकी क्या चाहिए, आप चुनें।",
  "Consultation reminders and links on WhatsApp, as well as text messages.": "टेक्स्ट मैसेज के साथ व्हाट्सऐप पर भी परामर्श के रिमाइंडर और लिंक।",
  "You can change these at any time. Turning one off does not affect anything you agreed to before.": "आप इन्हें कभी भी बदल सकते हैं। किसी को बंद करने से पहले दी गई सहमति पर असर नहीं पड़ता।",
  "This browser cannot show notifications. You will still get reminders by text message, WhatsApp and email.": "यह ब्राउज़र सूचनाएं नहीं दिखा सकता। रिमाइंडर आपको टेक्स्ट मैसेज, व्हाट्सऐप और ईमेल से मिलते रहेंगे।",
  "Notifications on this device are not available yet. You will still get reminders by text message, WhatsApp and email.": "इस डिवाइस पर सूचनाएं अभी उपलब्ध नहीं हैं। रिमाइंडर आपको टेक्स्ट मैसेज, व्हाट्सऐप और ईमेल से मिलते रहेंगे।",
  "We will erase your account and health records within 30 days. Records the law requires us to keep, such as prescriptions, consultation notes and invoices, are locked and kept for the legal period, then erased. Download your data first if you want a copy.":
    "हम 30 दिनों में आपका अकाउंट और स्वास्थ्य रिकॉर्ड मिटा देंगे। जिन रिकॉर्ड को कानून के अनुसार रखना ज़रूरी है, जैसे पर्चे, परामर्श के नोट्स और इनवॉइस, वे कानूनी अवधि तक बंद करके रखे जाते हैं और फिर मिटा दिए जाते हैं। कॉपी चाहिए तो पहले अपना डेटा डाउनलोड कर लें।",
  "Online consultation consent": "ऑनलाइन परामर्श की सहमति",
  "Help improve care": "सेवा बेहतर बनाने में मदद",
  "Sharing records": "रिकॉर्ड साझा करना",
  "ABHA linking": "ABHA जोड़ना",
  "Storing my data in India": "मेरा डेटा भारत में रखना",
  "Reminders on WhatsApp": "व्हाट्सऐप पर रिमाइंडर",
  "Health tips and offers": "सेहत की सलाह और ऑफ़र",

  // Family
  "Book and join consultations for your parents, children or partner, even from abroad. Adults agree with a code sent to their phone.":
    "अपने माता पिता, बच्चों या जीवनसाथी के लिए परामर्श बुक करें और उनमें जुड़ें, विदेश से भी। बड़े सदस्य अपने फ़ोन पर आए कोड से सहमति देते हैं।",
  "Remove {name}? You will no longer see their consultations.": "{name} को हटाएं? इसके बाद आप उनके परामर्श नहीं देख पाएंगे।",
  "A parent or guardian must always be present at a child's consultation.": "बच्चे के परामर्श में माता पिता या अभिभावक का साथ होना हमेशा ज़रूरी है।",
  "We text them a code. They read it to you if they agree to let you book and see their consultations. India's data protection law requires this, and it is the right thing to do.":
    "हम उन्हें एक कोड मैसेज करते हैं। अगर वे आपको अपने परामर्श बुक करने और देखने देना चाहते हैं, तो वे आपको यह कोड बताते हैं। भारत का डेटा सुरक्षा कानून यह मांगता है, और यही सही तरीका है।",
  "Ask your family member to read you the 6 digit code from the text message. They should only share it if they agree.": "अपने परिवार के सदस्य से टेक्स्ट मैसेज में आया 6 अंकों का कोड पूछें। वे इसे तभी बताएं जब वे सहमत हों।",
  "Text messages are not connected yet, so here is the code: {code}": "टेक्स्ट मैसेज अभी जुड़े नहीं हैं, इसलिए कोड यह है: {code}",
  "Book consultations": "परामर्श बुक करें",

  // Treatment plans
  "Send your reports. A specialist reviews them for free and usually replies within 2 working days with a written treatment plan and a cost estimate in your currency. There is no obligation.":
    "अपनी रिपोर्ट भेजें। विशेषज्ञ उन्हें मुफ़्त में देखते हैं और आमतौर पर 2 कामकाजी दिनों में आपकी मुद्रा में लिखित इलाज योजना और खर्च का अनुमान भेजते हैं। कोई बाध्यता नहीं है।",
  "Follow your treatment in India in one place: your plan and cost estimate, visa letter, travel and follow up.": "भारत में अपने इलाज की पूरी जानकारी एक जगह देखें: योजना और खर्च का अनुमान, वीज़ा पत्र, यात्रा और फ़ॉलो अप।",
  "Your treatment plan": "आपकी इलाज योजना",
  "Reports received": "रिपोर्ट मिल गईं",
  "A care coordinator will check your reports and reply within 24 hours. You will get a message here and by text message and email.":
    "केयर कोऑर्डिनेटर आपकी रिपोर्ट देखकर 24 घंटे में जवाब देंगे। आपको यहां और टेक्स्ट मैसेज व ईमेल से संदेश मिलेगा।",
  "No treatment plans yet": "अभी कोई इलाज योजना नहीं",
  "{min} to {max}": "{min} से {max}",
  "Converted at 1 INR = {rate} {cur} on {date}. The hospital bills in rupees, and your card or bank sets the final exchange rate.":
    "{date} को 1 INR = {rate} {cur} की दर से बदला गया। अस्पताल रुपये में बिल देता है, और आखिरी विनिमय दर आपका कार्ड या बैंक तय करता है।",
  "About the request": "अनुरोध के बारे में",
  "A coordinator checks your reports within 24 hours. Then a specialist reviews them and writes your treatment plan and cost estimate, usually within 2 working days.":
    "कोऑर्डिनेटर 24 घंटे में आपकी रिपोर्ट देखते हैं। फिर विशेषज्ञ उन्हें जांचकर आमतौर पर 2 कामकाजी दिनों में आपकी इलाज योजना और खर्च का अनुमान लिखते हैं।",
  "Accepting does not charge you. The hospital then issues your visa letter, and you pay the deposit when you are ready.": "स्वीकार करने पर कोई पैसा नहीं कटता। इसके बाद अस्पताल आपका वीज़ा पत्र जारी करता है, और आप तैयार होने पर जमा राशि देते हैं।",
  "Visa letter issued. The patient can download it from their treatment plan page.": "वीज़ा पत्र जारी हो गया। मरीज़ इसे अपनी इलाज योजना वाले पेज से डाउनलोड कर सकते हैं।",
  "Service apartment with a kitchen": "रसोई वाला सर्विस अपार्टमेंट",

  // Staff portal menus
  Overview: "सारांश",
  Callbacks: "कॉल बैक",
  "Book for a patient": "मरीज़ के लिए बुक करें",
  "Care team": "केयर टीम",
  Availability: "उपलब्धता",
  Earnings: "कमाई",
  Reviews: "समीक्षाएं",
  "Profile and fees": "प्रोफ़ाइल और फ़ीस",
  Licences: "लाइसेंस",
  "Get verified": "सत्यापन कराएं",
  "Check in": "चेक इन",
  "Doctors and slots": "डॉक्टर और समय",
  "You're not linked to a clinic yet": "आप अभी किसी क्लिनिक से जुड़े नहीं हैं",
  "Ask the platform admin to add you to your clinic's staff.": "प्लेटफ़ॉर्म एडमिन से कहें कि आपको आपके क्लिनिक के स्टाफ़ में जोड़ दें।",
  Admin: "एडमिन",
  Verification: "सत्यापन",
  Users: "उपयोगकर्ता",
  Bookings: "बुकिंग",
  Articles: "लेख",
  "Countries, rates and offers": "देश, दरें और ऑफ़र",
  "Audit log": "ऑडिट लॉग",
  "Privacy and security": "गोपनीयता और सुरक्षा",

  // About
  "We connect patients around the world with trusted doctors in India, for online consultations and for treatment in India.":
    "हम दुनिया भर के मरीज़ों को भारत के भरोसेमंद डॉक्टरों से जोड़ते हैं, ऑनलाइन परामर्श के लिए भी और भारत में इलाज के लिए भी।",
  "Our mission is to connect patients around the world with trusted doctors in India.": "हमारा मकसद दुनिया भर के मरीज़ों को भारत के भरोसेमंद डॉक्टरों से जोड़ना है।",
  "Good doctors exist, but reaching the right one can be hard, especially when you live far away. We make it simple to see a verified doctor online, and to plan treatment in India with a clear plan and price.":
    "अच्छे डॉक्टर हैं, पर सही डॉक्टर तक पहुंचना मुश्किल हो सकता है, खासकर जब आप दूर रहते हों। हम जांचे गए डॉक्टर से ऑनलाइन मिलना, और साफ़ योजना और कीमत के साथ भारत में इलाज की योजना बनाना आसान बनाते हैं।",
  "What we do": "हम क्या करते हैं",
  "See a doctor registered in India on a private video call, wherever you live. Choose from Orthopaedics, Dermatology, General Physician and Psychology. You get a digital prescription or a written treatment plan.":
    "आप कहीं भी रहते हों, भारत में पंजीकृत डॉक्टर से निजी वीडियो कॉल पर मिलें। हड्डी रोग, त्वचा रोग, जनरल फिजिशियन और मनोविज्ञान में से चुनें। आपको डिजिटल पर्चा या लिखित इलाज योजना मिलती है।",
  "How online consultation works": "ऑनलाइन परामर्श कैसे होता है",
  "Send your reports and a specialist reviews them for free. You get a written treatment plan and cost estimate, help choosing a hospital, a medical visa letter, and a coordinator by your side until you are back home.":
    "अपनी रिपोर्ट भेजें, विशेषज्ञ उन्हें मुफ़्त में देखते हैं। आपको लिखित इलाज योजना और खर्च का अनुमान, अस्पताल चुनने में मदद, मेडिकल वीज़ा पत्र, और घर लौटने तक साथ रहने वाला कोऑर्डिनेटर मिलता है।",
  "How treatment in India works": "भारत में इलाज कैसे होता है",
  "How we check doctors": "हम डॉक्टरों की जांच कैसे करते हैं",
  "Every doctor on {brand} is registered in India and verified by our team before they can see patients.": "{brand} पर हर डॉक्टर भारत में पंजीकृत है, और मरीज़ देखने से पहले हमारी टीम उनकी जांच करती है।",
  "Registration checked": "पंजीकरण की जांच",
  "We check each doctor's registration on the official register of the National Medical Commission or their State Medical Council. Clinical psychologists must be registered with the Rehabilitation Council of India.":
    "हम हर डॉक्टर का पंजीकरण राष्ट्रीय चिकित्सा आयोग या उनकी राज्य चिकित्सा परिषद के आधिकारिक रजिस्टर पर जांचते हैं। क्लिनिकल साइकोलॉजिस्ट का भारतीय पुनर्वास परिषद में पंजीकरण ज़रूरी है।",
  "Degrees and identity checked": "डिग्री और पहचान की जांच",
  "We check their degree certificates and a government photo ID, and we call them if anything is unclear.": "हम उनके डिग्री प्रमाणपत्र और सरकारी फ़ोटो पहचान पत्र जांचते हैं, और कुछ साफ़ न हो तो उन्हें फ़ोन करते हैं।",
  "Checked again every year": "हर साल दोबारा जांच",
  "A doctor is listed only after these checks. We check every registration again every 12 months, and a doctor whose registration lapses is removed from the site.":
    "इन जांचों के बाद ही डॉक्टर को सूची में जोड़ा जाता है। हम हर 12 महीने में हर पंजीकरण दोबारा जांचते हैं, और जिस डॉक्टर का पंजीकरण खत्म हो जाए उसे साइट से हटा दिया जाता है।",
  "What we promise": "हमारा वादा",
  "Every doctor is verified and registered in India.": "हर डॉक्टर जांचा गया है और भारत में पंजीकृत है।",
  "You see the full price before you pay.": "भुगतान से पहले आपको पूरी कीमत दिखती है।",
  "If your doctor does not join within 10 minutes, you get a full refund automatically.": "अगर डॉक्टर 10 मिनट में नहीं जुड़ते, तो आपको पूरे पैसे अपने आप वापस मिल जाते हैं।",
  "Video calls are encrypted, and your records are stored securely.": "वीडियो कॉल एन्क्रिप्ट रहती हैं, और आपके रिकॉर्ड सुरक्षित रखे जाते हैं।",
  "Your records are yours. You decide who can see them.": "आपके रिकॉर्ड आपके हैं। उन्हें कौन देखे, यह आप तय करते हैं।",
  "A named grievance officer replies to every complaint within 24 hours.": "एक नामित शिकायत अधिकारी हर शिकायत का 24 घंटे में जवाब देते हैं।",
  "How we follow the rules": "हम नियमों का पालन कैसे करते हैं",
  "Online consultations follow India's Telemedicine Practice Guidelines, 2020. We protect personal data under India's Digital Personal Data Protection Act, 2023.":
    "ऑनलाइन परामर्श भारत के टेलीमेडिसिन प्रैक्टिस दिशानिर्देश, 2020 के अनुसार होते हैं। हम निजी डेटा की सुरक्षा भारत के डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के तहत करते हैं।",
  "Company details": "कंपनी का विवरण",
  "Ready when you are": "जब आप तैयार हों",
  "Book an online consultation, or send your reports for a free treatment plan in India.": "ऑनलाइन परामर्श बुक करें, या भारत में इलाज की मुफ़्त योजना के लिए अपनी रिपोर्ट भेजें।",
  "Monday to Saturday, 9 am to 6 pm IST": "सोमवार से शनिवार, सुबह 9 बजे से शाम 6 बजे तक (IST)",

  // Contact
  "Talk to our team about an online consultation or treatment in India. Ask for a call back and we will call you at a time that suits you.":
    "ऑनलाइन परामर्श या भारत में इलाज के बारे में हमारी टीम से बात करें। कॉल बैक मांगें, हम आपकी सुविधा के समय पर फ़ोन करेंगे।",
  "We can help you choose a doctor, book a consultation or plan your treatment in India.": "हम डॉक्टर चुनने, परामर्श बुक करने या भारत में इलाज की योजना बनाने में आपकी मदद कर सकते हैं।",
  "We reply to messages within one working day. Call backs are made between 8 am and 10 pm India time.": "हम संदेशों का जवाब एक कामकाजी दिन में देते हैं। कॉल बैक भारतीय समय से सुबह 8 बजे से रात 10 बजे के बीच किए जाते हैं।",
  "Write or call us": "हमें लिखें या फ़ोन करें",
  "Leave your number and tell us when to call. A member of our team will call you back.": "अपना नंबर दें और बताएं कि कब फ़ोन करें। हमारी टीम का कोई सदस्य आपको वापस फ़ोन करेगा।",
  "Raise a complaint. We acknowledge it within {h} hours and resolve it within {d} days.": "शिकायत दर्ज करें। हम {h} घंटे में उसकी पुष्टि करते हैं और {d} दिनों में उसका समाधान करते हैं।",
  "Need answers fast?": "जल्दी जवाब चाहिए?",
  "Read our help centre": "हमारा सहायता केंद्र देखें",

  // Help centre
  "Answers about online consultations, treatment in India, payments, refunds and privacy.": "ऑनलाइन परामर्श, भारत में इलाज, भुगतान, पैसे वापसी और गोपनीयता से जुड़े सवालों के जवाब।",
  "Find answers below, or talk to our team in English or Hindi.": "नीचे जवाब देखें, या हमारी टीम से अंग्रेज़ी या हिन्दी में बात करें।",
  Topics: "विषय",
  "How do I book an online consultation?": "मैं ऑनलाइन परामर्श कैसे बुक करूं?",
  "Choose a specialty and a doctor, pick a time and pay. You get a confirmation by text message and email with a link to join the video call.":
    "विशेषज्ञता और डॉक्टर चुनें, समय चुनें और भुगतान करें। आपको टेक्स्ट मैसेज और ईमेल से पुष्टि मिलती है, जिसमें वीडियो कॉल से जुड़ने का लिंक होता है।",
  "Yes. You can book from any country. Every doctor on our site is registered in India and consults under India's telemedicine rules, wherever you live.":
    "हां। आप किसी भी देश से बुक कर सकते हैं। हमारी साइट का हर डॉक्टर भारत में पंजीकृत है और आप कहीं भी रहते हों, भारत के टेलीमेडिसिन नियमों के तहत परामर्श देता है।",
  "No. The video call opens in the web browser on your phone, tablet or laptop. Use the camera and microphone check before the call. On a slow connection you can switch to audio only.":
    "नहीं। वीडियो कॉल आपके फ़ोन, टैबलेट या लैपटॉप के वेब ब्राउज़र में खुलती है। कॉल से पहले कैमरा और माइक्रोफ़ोन की जांच कर लें। धीमे इंटरनेट पर आप सिर्फ़ ऑडियो पर जा सकते हैं।",
  "Can a family member join the call?": "क्या परिवार का कोई सदस्य कॉल में जुड़ सकता है?",
  "Yes. Use “Invite family or interpreter” in the waiting room to send a one time link. You can also book for a family member from your profile.":
    "हां। वेटिंग रूम में “परिवार या दुभाषिए को बुलाएं” से एक बार चलने वाला लिंक भेजें। आप अपनी प्रोफ़ाइल से परिवार के सदस्य के लिए बुकिंग भी कर सकते हैं।",
  "No, unless you and your doctor both agree during the call. If you say no, the consultation continues normally.": "नहीं, जब तक आप और डॉक्टर दोनों कॉल के दौरान सहमत न हों। आप मना करें तो परामर्श सामान्य रूप से चलता रहता है।",
  "How do I get a treatment plan?": "मुझे इलाज योजना कैसे मिलेगी?",
  "Send your medical reports from the Treatment in India page. A specialist reviews them for free and usually replies within 2 working days with a written treatment plan and a cost estimate in your currency.":
    "भारत में इलाज वाले पेज से अपनी मेडिकल रिपोर्ट भेजें। विशेषज्ञ उन्हें मुफ़्त में देखते हैं और आमतौर पर 2 कामकाजी दिनों में आपकी मुद्रा में लिखित इलाज योजना और खर्च का अनुमान भेजते हैं।",
  "Do I have to choose a hospital myself?": "क्या मुझे अस्पताल खुद चुनना होगा?",
  "No. We help you choose a hospital that suits your treatment and budget. You can check its accreditation, such as NABH or JCI, yourself before you decide.":
    "नहीं। हम आपके इलाज और बजट के हिसाब से अस्पताल चुनने में मदद करते हैं। फ़ैसला करने से पहले आप उसकी मान्यता, जैसे NABH या JCI, खुद जांच सकते हैं।",
  "Can you help with the medical visa?": "क्या आप मेडिकल वीज़ा में मदद करते हैं?",
  "Yes. Once you accept the plan, the hospital issues a medical visa invitation letter for India's e-Medical visa. Up to two family members can apply for the e-Medical Attendant visa.":
    "हां। योजना स्वीकार करने के बाद अस्पताल भारत के e-Medical वीज़ा के लिए मेडिकल वीज़ा निमंत्रण पत्र जारी करता है। परिवार के दो सदस्य तक e-Medical Attendant वीज़ा के लिए आवेदन कर सकते हैं।",
  "What help do I get when I arrive?": "भारत पहुंचने पर मुझे क्या मदद मिलेगी?",
  "We can arrange airport pickup, a place to stay near the hospital and an interpreter on request. A coordinator stays in touch with you throughout, and you can have online follow up consultations after you return home.":
    "आपके कहने पर हम एयरपोर्ट से लाने, अस्पताल के पास ठहरने और दुभाषिए का इंतज़ाम कर सकते हैं। पूरे समय एक कोऑर्डिनेटर आपके संपर्क में रहते हैं, और घर लौटने के बाद आप ऑनलाइन फ़ॉलो अप परामर्श ले सकते हैं।",
  "When do I pay?": "मुझे भुगतान कब करना है?",
  "You pay when you book, and you see the full price in your currency before you pay. We release the fee to the doctor only after the consultation takes place.":
    "आप बुकिंग के समय भुगतान करते हैं, और भुगतान से पहले आपको अपनी मुद्रा में पूरी कीमत दिखती है। परामर्श होने के बाद ही हम फ़ीस डॉक्टर को देते हैं।",
  "What if the doctor does not join?": "अगर डॉक्टर न जुड़ें तो?",
  "If your doctor does not join within 10 minutes of the start time, you get a full refund automatically. Refunds go back to the same card, UPI or bank account, usually within 5 to 7 working days.":
    "अगर डॉक्टर शुरू होने के समय से 10 मिनट में नहीं जुड़ते, तो आपको पूरे पैसे अपने आप वापस मिल जाते हैं। पैसे उसी कार्ड, UPI या बैंक खाते में आमतौर पर 5 से 7 कामकाजी दिनों में लौटते हैं।",
  "Yes, from My consultations. You see the exact rules before you pay. If you cancel before the free cancellation time shown when you book, you get a full refund.":
    "हां, मेरे परामर्श पेज से। भुगतान से पहले आपको सारे नियम दिखते हैं। बुकिंग के समय दिखाए गए मुफ़्त रद्द करने के समय से पहले रद्द करने पर आपको पूरे पैसे वापस मिलते हैं।",
  "Do I get an invoice?": "क्या मुझे इनवॉइस मिलेगा?",
  "Yes. A GST invoice for every payment is under Payments in your account. It is useful for insurance claims.": "हां। हर भुगतान का GST इनवॉइस आपके अकाउंट में भुगतान वाले हिस्से में मिलता है। यह बीमा क्लेम में काम आता है।",
  "You, the family members you allow, and the doctors you consult. A doctor sees your past records only if you choose to share them. You can stop sharing at any time.":
    "आप, परिवार के वे सदस्य जिन्हें आप अनुमति दें, और वे डॉक्टर जिनसे आप परामर्श लेते हैं। डॉक्टर आपके पुराने रिकॉर्ड तभी देखते हैं जब आप उन्हें साझा करें। आप कभी भी साझा करना बंद कर सकते हैं।",
  "Is my data safe?": "क्या मेरा डेटा सुरक्षित है?",
  "Your records are encrypted and stored securely in India. We never sell your data, and we do not use health data for advertising.":
    "आपके रिकॉर्ड एन्क्रिप्ट करके भारत में सुरक्षित रखे जाते हैं। हम आपका डेटा कभी नहीं बेचते, और स्वास्थ्य डेटा का इस्तेमाल विज्ञापन के लिए नहीं करते।",
  "Yes. Go to Settings, then Privacy, to download a copy of your data or delete your account.": "हां। अपने डेटा की कॉपी डाउनलोड करने या अकाउंट मिटाने के लिए सेटिंग्स में गोपनीयता वाले हिस्से में जाएं।",
  "Talk to our team": "हमारी टीम से बात करें",
  "Tell us when to call and we will call you back.": "बताएं कि कब फ़ोन करें, हम आपको वापस फ़ोन करेंगे।",
  "Raise a complaint. We acknowledge it within {h} hours and resolve it within {d} days. Our grievance officer oversees every complaint.":
    "शिकायत दर्ज करें। हम {h} घंटे में उसकी पुष्टि करते हैं और {d} दिनों में उसका समाधान करते हैं। हर शिकायत पर हमारे शिकायत अधिकारी नज़र रखते हैं।",
  "Tell us when to call. We will help you choose a doctor, book a consultation or plan your treatment in India.": "बताएं कि कब फ़ोन करें। हम डॉक्टर चुनने, परामर्श बुक करने या भारत में इलाज की योजना बनाने में आपकी मदद करेंगे।",
  "Not resolved? Write to our grievance officer, {name}, at {email}. {hours}.": "समाधान नहीं हुआ? हमारे शिकायत अधिकारी {name} को {email} पर लिखें। {hours}।",
  "Not resolved? Write to our grievance officer at {email}. {hours}.": "समाधान नहीं हुआ? हमारे शिकायत अधिकारी को {email} पर लिखें। {hours}।",
  "Not resolved? Our grievance officer reviews every complaint that is not settled.": "समाधान नहीं हुआ? जिस शिकायत का निपटारा न हो, उसे हमारे शिकायत अधिकारी खुद देखते हैं।",

  // Support forms
  "Thank you. We will call you back.": "धन्यवाद। हम आपको वापस फ़ोन करेंगे।",
  "Usually within 30 minutes, between 8 am and 10 pm India time.": "आमतौर पर 30 मिनट में, भारतीय समय से सुबह 8 बजे से रात 10 बजे के बीच।",
  "Booking an online consultation": "ऑनलाइन परामर्श बुक करना",
  "A problem with the video call or website": "वीडियो कॉल या वेबसाइट में दिक्कत",
  "In the evening, after 6 pm": "शाम को, 6 बजे के बाद",
  "We will acknowledge it within 24 hours and resolve it within 15 days. Please keep this reference.": "हम 24 घंटे में इसकी पुष्टि करेंगे और 15 दिनों में समाधान करेंगे। कृपया यह रेफ़रेंस संभालकर रखें।",
  "A consultation": "कोई परामर्श",
  English: "अंग्रेज़ी",
  Hindi: "हिन्दी",
  "The website": "वेबसाइट",

  // For doctors
  "For doctors registered in India in four specialties: Orthopaedics, Dermatology, General Physician and Psychology. Consult patients from India and around the world, on your own hours.":
    "चार विशेषज्ञताओं में भारत में पंजीकृत डॉक्टरों के लिए: हड्डी रोग, त्वचा रोग, जनरल फिजिशियन और मनोविज्ञान। अपने समय पर भारत और दुनिया भर के मरीज़ों को परामर्श दें।",
  "Join {brand} as a doctor": "डॉक्टर के रूप में {brand} से जुड़ें",
  "We invite doctors registered in India in four specialties, Orthopaedics, Dermatology, General Physician and Psychology, to consult patients from India and around the world.":
    "हम चार विशेषज्ञताओं, हड्डी रोग, त्वचा रोग, जनरल फिजिशियन और मनोविज्ञान, में भारत में पंजीकृत डॉक्टरों को भारत और दुनिया भर के मरीज़ों को परामर्श देने के लिए आमंत्रित करते हैं।",
  "Specialties we are looking for": "हमें इन विशेषज्ञताओं के डॉक्टर चाहिए",
  "Orthopaedic surgeons for bones, joints, spine and sports injuries.": "हड्डियों, जोड़ों, रीढ़ और खेल की चोटों के लिए ऑर्थोपेडिक सर्जन।",
  "Dermatologists for skin, hair and nails.": "त्वचा, बालों और नाखूनों के लिए त्वचा रोग विशेषज्ञ।",
  "Physicians for everyday illness, diabetes, blood pressure, thyroid and check ups.": "रोज़मर्रा की बीमारियों, डायबिटीज़, ब्लड प्रेशर, थायराइड और जांच के लिए फिजिशियन।",
  "Clinical psychologists for counselling and therapy, and psychiatrists for care that may need medicine.": "काउंसलिंग और थेरेपी के लिए क्लिनिकल साइकोलॉजिस्ट, और जिस इलाज में दवा की ज़रूरत हो सकती है उसके लिए मनोचिकित्सक।",
  "Why doctors join": "डॉक्टर हमसे क्यों जुड़ते हैं",
  "Your hours, your fees": "आपका समय, आपकी फ़ीस",
  "Set your online hours, consultation length and fees. Add clinic hours too if you see patients in person.": "अपने ऑनलाइन घंटे, परामर्श की अवधि और फ़ीस तय करें। अगर आप क्लिनिक में भी मरीज़ देखते हैं तो क्लिनिक के घंटे भी जोड़ें।",
  "Patients from India and abroad": "भारत और विदेश के मरीज़",
  "Patients in India, and people living in other countries who want a doctor registered in India, book with you by video.": "भारत के मरीज़, और दूसरे देशों में रहने वाले वे लोग जो भारत में पंजीकृत डॉक्टर चाहते हैं, आपसे वीडियो परामर्श बुक करते हैं।",
  "Treatment in India requests": "भारत में इलाज के अनुरोध",
  "Review reports from patients abroad who are planning treatment in India, and help them with a clear treatment plan.": "भारत में इलाज की योजना बना रहे विदेशी मरीज़ों की रिपोर्ट देखें, और साफ़ इलाज योजना से उनकी मदद करें।",
  "Prescriptions done right": "सही तरीके से पर्चे",
  "Templates and quick buttons that follow the Telemedicine Practice Guidelines, 2020. Allergy and duplicate warnings are shown, and every prescription is digitally signed with a QR check.":
    "टेलीमेडिसिन प्रैक्टिस दिशानिर्देश, 2020 के अनुसार टेम्पलेट और झटपट बटन। एलर्जी और दोहरी दवा की चेतावनी दिखती है, और हर पर्चे पर QR जांच के साथ डिजिटल हस्ताक्षर होता है।",
  "A calm consultation room": "शांत परामर्श कक्ष",
  "The patient's health form, reports and history sit beside the video. Notes save automatically.": "मरीज़ का स्वास्थ्य फ़ॉर्म, रिपोर्ट और इतिहास वीडियो के बगल में दिखते हैं। नोट्स अपने आप सेव होते हैं।",
  "Paid every week": "हर हफ़्ते भुगतान",
  "Fees are released after each consultation and paid every Monday, with a clear statement. Platform commission is {p}%.": "हर परामर्श के बाद फ़ीस जारी होती है और हर सोमवार साफ़ स्टेटमेंट के साथ भुगतान होता है। प्लेटफ़ॉर्म कमीशन {p}% है।",
  "Who can apply": "कौन आवेदन कर सकता है",
  "Doctors registered with the National Medical Commission or a State Medical Council.": "राष्ट्रीय चिकित्सा आयोग या किसी राज्य चिकित्सा परिषद में पंजीकृत डॉक्टर।",
  "Clinical psychologists registered with the Rehabilitation Council of India.": "भारतीय पुनर्वास परिषद में पंजीकृत क्लिनिकल साइकोलॉजिस्ट।",
  "A valid degree in your specialty.": "अपनी विशेषज्ञता में मान्य डिग्री।",
  "Willing to follow the Telemedicine Practice Guidelines, 2020.": "टेलीमेडिसिन प्रैक्टिस दिशानिर्देश, 2020 का पालन करने को तैयार।",
  "Patient identity and consent are confirmed in every consultation. Records are encrypted and every access is logged.": "हर परामर्श में मरीज़ की पहचान और सहमति की पुष्टि होती है। रिकॉर्ड एन्क्रिप्ट रहते हैं और हर बार देखे जाने का रिकॉर्ड रखा जाता है।",
  "How verification works": "सत्यापन कैसे होता है",
  Apply: "आवेदन करें",
  "Sign in with your work email, choose your specialty and set up two step verification.": "अपने काम के ईमेल से लॉग इन करें, अपनी विशेषज्ञता चुनें और दो चरणों वाली पुष्टि सेट करें।",
  "Send your documents": "अपने दस्तावेज़ भेजें",
  "Upload your registration certificate, degree certificates, a government photo ID and a photo of yourself.": "अपना पंजीकरण प्रमाणपत्र, डिग्री प्रमाणपत्र, सरकारी फ़ोटो पहचान पत्र और अपनी एक फ़ोटो अपलोड करें।",
  "We verify you": "हम आपकी जांच करते हैं",
  "We check your registration on the official register and call you if anything is unclear. This usually takes 1 or 2 working days.": "हम आधिकारिक रजिस्टर पर आपका पंजीकरण जांचते हैं और कुछ साफ़ न हो तो आपको फ़ोन करते हैं। इसमें आमतौर पर 1 या 2 कामकाजी दिन लगते हैं।",
  "Start consulting": "परामर्श देना शुरू करें",
  "Set up your profile, fees and signature, and start seeing patients. We check your registration again every 12 months.": "अपनी प्रोफ़ाइल, फ़ीस और हस्ताक्षर सेट करें, और मरीज़ देखना शुरू करें। हम हर 12 महीने में आपका पंजीकरण दोबारा जांचते हैं।",
  "Ready to join?": "जुड़ने के लिए तैयार हैं?",
  "Keep your registration certificate and degree certificates ready before you start.": "शुरू करने से पहले अपना पंजीकरण प्रमाणपत्र और डिग्री प्रमाणपत्र तैयार रखें।",
  "Apply to join": "जुड़ने के लिए आवेदन करें",
  "Next you will set up two step verification, then upload your documents for verification.": "आगे आप दो चरणों वाली पुष्टि सेट करेंगे, फिर जांच के लिए अपने दस्तावेज़ अपलोड करेंगे।",

  // Legal pages
  "Terms of use": "उपयोग की शर्तें",
  "Privacy policy": "गोपनीयता नीति",
  "Telemedicine consent": "टेलीमेडिसिन सहमति",
  "Cancellation and refund policy": "रद्द करने और पैसे वापसी की नीति",
  "Grievance redressal": "शिकायत निवारण",
  "Cookie policy": "कुकी नीति",
  "Medical disclaimer": "चिकित्सा अस्वीकरण",
  "The rules for using our website and services.": "हमारी वेबसाइट और सेवाओं के इस्तेमाल के नियम।",
  "What we collect, why, who sees it, and your rights.": "हम क्या जानकारी लेते हैं, क्यों लेते हैं, उसे कौन देखता है, और आपके अधिकार।",
  "What you agree to when you book an online consultation.": "ऑनलाइन परामर्श बुक करते समय आप किन बातों पर सहमति देते हैं।",
  "When you get your money back, and how fast.": "आपको पैसे कब वापस मिलते हैं, और कितनी जल्दी।",
  "How to complain, and our promise on response times.": "शिकायत कैसे करें, और जवाब के समय को लेकर हमारा वादा।",
  "The small files we use, and your choices.": "हम कौन सी छोटी फ़ाइलें इस्तेमाल करते हैं, और आपके विकल्प।",
  "What the information on this website is and is not.": "इस वेबसाइट की जानकारी क्या है और क्या नहीं।",
  "This page is in English. If you need help understanding it, please contact us.": "यह पेज अंग्रेज़ी में है। इसे समझने में मदद चाहिए तो कृपया हमसे संपर्क करें।",

  // Prescription check
  "The signature does not match. Do not dispense.": "हस्ताक्षर मेल नहीं खाते। दवा न दें।",
  "Cancelled by the doctor. Do not dispense.": "डॉक्टर ने रद्द कर दिया है। दवा न दें।",
};

export default dict;
