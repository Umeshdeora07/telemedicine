import type { Dict } from "../translate";

// Hindi for the redesign (part c2). Keys are the English strings used on screen.
const dict: Dict = {
  // Doctor portal
  "3. Medical registration": "3. चिकित्सा पंजीकरण",
  "Add your Indian registration with the National Medical Commission or your State Medical Council. Psychologists add their Rehabilitation Council of India registration. Patients see you only after we verify it.":
    "राष्ट्रीय चिकित्सा आयोग या अपनी राज्य चिकित्सा परिषद में अपना भारतीय पंजीकरण जोड़ें। मनोवैज्ञानिक भारतीय पुनर्वास परिषद का अपना पंजीकरण जोड़ें। हमारे सत्यापन के बाद ही मरीज़ आपको देख पाएँगे।",
  "By submitting, you confirm the documents are genuine and you will follow the Telemedicine Practice Guidelines, 2020.":
    "जमा करके आप पुष्टि करते हैं कि दस्तावेज़ असली हैं और आप टेलीमेडिसिन प्रैक्टिस गाइडलाइंस, 2020 का पालन करेंगे।",
  "We check every doctor's registration with the medical council before patients can see them. This usually takes 1 or 2 working days.":
    "मरीज़ों को दिखने से पहले हम हर डॉक्टर का पंजीकरण मेडिकल काउंसिल से जाँचते हैं। इसमें आम तौर पर 1 या 2 कार्यदिवस लगते हैं।",
  "Finish steps 1 to 4 to submit.": "जमा करने के लिए चरण 1 से 4 पूरे करें।",
  Submitted: "जमा हो गया",
  "Write a short profile in plain words, set your fees and upload your signature. Your prescriptions carry this signature and your registration number.":
    "आसान शब्दों में छोटी सी प्रोफ़ाइल लिखें, अपनी फ़ीस तय करें और अपने हस्ताक्षर अपलोड करें। आपके पर्चों पर यही हस्ताक्षर और आपकी पंजीकरण संख्या होगी।",
  "About you (in plain words that patients understand)": "आपके बारे में (आसान शब्दों में, जो मरीज़ समझ सकें)",
  "Set your fees in INR. You can also set a fixed fee in another currency. Where you don't, patients see your INR fee converted to their currency.":
    "अपनी फ़ीस INR में तय करें। आप किसी दूसरी मुद्रा में भी तय फ़ीस रख सकते हैं। जहाँ आप नहीं रखते, वहाँ मरीज़ों को आपकी INR फ़ीस उनकी मुद्रा में बदलकर दिखती है।",
  "Free follow up chat (days)": "मुफ़्त फ़ॉलो अप चैट (दिन)",
  "Signature for digital prescriptions": "डिजिटल पर्चों के लिए हस्ताक्षर",
  "Patients can book you only while your Indian registration is verified and valid. We remind you 60 and 15 days before it expires, and hide your profile on the day it expires.":
    "मरीज़ आपको तभी बुक कर सकते हैं जब आपका भारतीय पंजीकरण सत्यापित और मान्य हो। इसकी अवधि खत्म होने से 60 और 15 दिन पहले हम आपको याद दिलाते हैं, और जिस दिन यह खत्म होता है उस दिन आपकी प्रोफ़ाइल छिपा देते हैं।",
  "Next yearly registration check: {date}": "पंजीकरण की अगली सालाना जाँच: {date}",
  "Expired. Patients can no longer see you.": "अवधि खत्म हो गई। अब मरीज़ आपको नहीं देख सकते।",
  "Yearly registration check due in {n} days": "पंजीकरण की सालाना जाँच {n} दिन में होनी है",
  "Our team will check your registration again. Make sure your documents are current.": "हमारी टीम आपका पंजीकरण फिर से जाँचेगी। ध्यान रखें कि आपके दस्तावेज़ नए और मान्य हों।",
  "age not given": "उम्र नहीं बताई गई",
  "Follow up chats": "फ़ॉलो अप चैट",
  "Follow up messages": "फ़ॉलो अप संदेश",
  "Follow up chats appear here after your consults.": "आपके परामर्श के बाद फ़ॉलो अप चैट यहाँ दिखेंगी।",
  "Reply in plain words. Don't prescribe new medicines in chat; book a follow up consult instead.":
    "आसान शब्दों में जवाब दें। चैट में नई दवा न लिखें, उसकी जगह फ़ॉलो अप परामर्श बुक करें।",
  "Follow up consult": "फ़ॉलो अप परामर्श",
  "follow up consult": "फ़ॉलो अप परामर्श",
  "Follow up date": "फ़ॉलो अप की तारीख",
  "Schedule follow up": "फ़ॉलो अप तय करें",
  "Recommend follow up": "फ़ॉलो अप की सलाह दें",
  "Follow up recommended": "फ़ॉलो अप की सलाह",
  "Follow up from home": "घर से फ़ॉलो अप",
  "The patient hasn't filled in the health form before the consult.": "मरीज़ ने परामर्श से पहले वाला स्वास्थ्य फ़ॉर्म नहीं भरा है।",
  "Not saved. Check your connection.": "सेव नहीं हुआ। अपना कनेक्शन जाँचें।",
  "The patient agreed to this teleconsultation. It was booked by a family member, so record explicit consent.":
    "मरीज़ इस टेलीपरामर्श के लिए सहमत है। इसे परिवार के किसी सदस्य ने बुक किया है, इसलिए साफ़ सहमति दर्ज करें।",
  "Sign and send digital prescription": "डिजिटल पर्चे पर हस्ताक्षर करके भेजें",
  "Needs a visit in person": "खुद आकर दिखाना ज़रूरी",
  "This ends the consult and tells the patient to go to the nearest hospital or call their local emergency number.":
    "इससे परामर्श खत्म हो जाएगा और मरीज़ को बताया जाएगा कि वे नज़दीकी अस्पताल जाएँ या अपने यहाँ का आपातकालीन नंबर मिलाएँ।",
  "Tests, treatment options, or whether a visit in person is needed. Don't prescribe; a second opinion is advice only.":
    "जाँचें, इलाज के विकल्प, या खुद आकर दिखाना ज़रूरी है या नहीं। दवा न लिखें, दूसरी राय सिर्फ़ सलाह है।",
  "Blocked. Tap to open.": "बंद है। खोलने के लिए टैप करें।",
  "Free. Tap to block.": "खाली है। बंद करने के लिए टैप करें।",
  to: "से",

  // Consult room
  "Looks good, done": "सब ठीक है, हो गया",
  "Microphone works. Say something.": "माइक काम कर रहा है। कुछ बोलिए।",
  "Weak network. Audio may work better.": "नेटवर्क कमज़ोर है। ऑडियो बेहतर चल सकता है।",

  // Coordinator portal
  "2. Choose the doctor": "2. डॉक्टर चुनें",
  "Every doctor shown is verified and registered in India.": "यहाँ दिखाया गया हर डॉक्टर सत्यापित है और भारत में पंजीकृत है।",
  "No doctors match this choice. Try another specialty or consult type.": "इस चुनाव से कोई डॉक्टर मेल नहीं खाता। कोई दूसरी विशेषज्ञता या परामर्श का प्रकार चुनें।",
  "We sent the patient a payment link by SMS, WhatsApp and in the app. The slot is held for 15 minutes, so stay on the call until they pay.":
    "हमने मरीज़ को SMS, WhatsApp और ऐप में भुगतान लिंक भेज दिया है। स्लॉट 15 मिनट तक रुका रहेगा, इसलिए भुगतान होने तक कॉल पर बने रहें।",
  "{name} is assigned. Send them this join link. It works only once:": "{name} को चुन लिया गया है। उन्हें यह जुड़ने का लिंक भेजें। यह सिर्फ़ एक बार काम करता है:",
  "Assign a medically trained interpreter and send them the join link, which works only once. They join the call as a third person, and the doctor sees who is present.":
    "चिकित्सा में प्रशिक्षित दुभाषिया चुनें और उन्हें जुड़ने का लिंक भेजें, जो सिर्फ़ एक बार काम करता है। वे तीसरे व्यक्ति के रूप में कॉल में जुड़ते हैं, और डॉक्टर देख सकते हैं कि कौन मौजूद है।",

  // Clinic portal
  "Clinic slots for the next 7 days. Tap a free slot to close it (for example, when the doctor is on leave) and tap again to reopen it. Booked slots can't be closed here. Cancel the visit instead.":
    "अगले 7 दिनों के क्लिनिक स्लॉट। किसी खाली स्लॉट को बंद करने के लिए टैप करें (जैसे जब डॉक्टर छुट्टी पर हों) और फिर से खोलने के लिए दोबारा टैप करें। बुक हो चुके स्लॉट यहाँ बंद नहीं हो सकते। उसकी जगह विज़िट रद्द करें।",
  None: "कोई नहीं",
  "Not yet": "अभी नहीं",
  "Checked in": "चेक इन हो गया",

  // Admin portal
  "No ratings yet": "अभी कोई रेटिंग नहीं",
  "refunded automatically": "अपने आप रिफ़ंड हुआ",
  "Consults by the patient's account country": "मरीज़ के खाते के देश के अनुसार परामर्श",
  "No name": "कोई नाम नहीं",
  Never: "कभी नहीं",
  "Last verified {date}.": "आखिरी सत्यापन {date} को।",
  "Last verified {date}. Next check due {due}.": "आखिरी सत्यापन {date} को। अगली जाँच {due} को होनी है।",
  "Check every registration against the official register (National Medical Commission, State Medical Council, or Rehabilitation Council of India for psychologists) before a doctor goes live. Record what you checked. It is kept in the audit log.":
    "किसी डॉक्टर को लाइव करने से पहले हर पंजीकरण को आधिकारिक रजिस्टर से मिलाएँ (राष्ट्रीय चिकित्सा आयोग, राज्य चिकित्सा परिषद, या मनोवैज्ञानिकों के लिए भारतीय पुनर्वास परिषद)। आपने क्या जाँचा, उसे दर्ज करें। यह ऑडिट लॉग में रखा जाता है।",
  "Yearly registration check due within 30 days: {names}": "30 दिनों के अंदर पंजीकरण की सालाना जाँच होनी है: {names}",
  "No GSTIN": "कोई GSTIN नहीं",
  "not yet": "अभी नहीं",
  "Approve and make the doctor live": "मंज़ूर करें और डॉक्टर को लाइव करें",
  "Refund issued. The patient gets it in 5 to 7 working days.": "रिफ़ंड जारी हो गया। मरीज़ को यह 5 से 7 कार्यदिवस में मिल जाएगा।",
  "Summary (1 or 2 sentences)": "सारांश (1 या 2 वाक्य)",
  "“Sign-ups open” lets people from that country create accounts for online consultations with doctors in India and for treatment in India.":
    "“Sign-ups open” चालू होने पर उस देश के लोग भारत के डॉक्टरों से ऑनलाइन परामर्श और भारत में इलाज के लिए खाता बना सकते हैं।",
  "Turn a country on once its legal review is done. Changes are logged.": "किसी देश की कानूनी जाँच पूरी होने के बाद ही उसे चालू करें। हर बदलाव दर्ज होता है।",
  "A permanent record of who viewed or changed what. Every view of health records is logged with the patient, so you can answer “who saw my records?” requests.":
    "किसने क्या देखा या बदला, इसका स्थायी रिकॉर्ड। स्वास्थ्य रिकॉर्ड को हर बार देखना मरीज़ के साथ दर्ज होता है, ताकि आप “मेरे रिकॉर्ड किसने देखे?” जैसे अनुरोधों का जवाब दे सकें।",
  "People download their data themselves in Settings. Deletion requests keep records the law requires (prescriptions, invoices, consult notes) for the retention period and erase the rest.":
    "लोग सेटिंग्स में अपना डेटा खुद डाउनलोड करते हैं। हटाने के अनुरोध पर कानून के अनुसार ज़रूरी रिकॉर्ड (पर्चे, इनवॉइस, परामर्श नोट्स) तय अवधि तक रखे जाते हैं और बाकी मिटा दिया जाता है।",

  // Charts and shared screens
  "No reading": "कोई रीडिंग नहीं",
  "None recorded": "कुछ दर्ज नहीं",

  // Booking, consult and notification messages
  "Some of your answers can be signs of an emergency. This service is not for emergencies. Please go to the nearest hospital now or call your local emergency number.":
    "आपके कुछ जवाब आपातकाल के लक्षण हो सकते हैं। यह सेवा आपातकाल के लिए नहीं है। कृपया अभी नज़दीकी अस्पताल जाएँ या अपने यहाँ का आपातकालीन नंबर मिलाएँ।",
  "Booking {ref} was cancelled. A refund of {amount} is on its way and reaches you in 5 to 7 working days.":
    "बुकिंग {ref} रद्द कर दी गई। {amount} का रिफ़ंड भेज दिया गया है और 5 से 7 कार्यदिवस में आप तक पहुँच जाएगा।",
  "Sorry, the doctor couldn't join": "माफ़ कीजिए, डॉक्टर जुड़ नहीं पाए",
  "Your digital prescription is ready": "आपका डिजिटल पर्चा तैयार है",
  "{doctor} sent you a prescription. You can open it in your account.": "{doctor} ने आपको पर्चा भेजा है। आप इसे अपने खाते में खोल सकते हैं।",
  "Your doctor recommends a visit in person. Book a clinic slot in one tap.": "आपके डॉक्टर की सलाह है कि आप खुद आकर दिखाएँ। एक टैप में क्लिनिक स्लॉट बुक करें।",
  "If the doctor doesn't join within 10 minutes of your time, you get a full refund automatically.":
    "अगर डॉक्टर आपके समय के 10 मिनट के अंदर नहीं जुड़ते, तो पूरा पैसा अपने आप वापस मिलता है।",
  "5. Profile photo, about you, fees and signature": "5. प्रोफ़ाइल फ़ोटो, आपके बारे में, फ़ीस और हस्ताक्षर",
  "6. Available times": "6. उपलब्ध समय",
  "A clear, recent photo of you with your face visible, in professional clothes. Patients see it once you are verified.": "आपकी हाल की साफ़ फ़ोटो, जिसमें चेहरा साफ़ दिखे और आप पेशेवर कपड़ों में हों। जांच पूरी होने के बाद मरीज़ इसे देखेंगे।",
  "A photo is on file. Upload a new one to replace it.": "फ़ोटो जमा है। बदलने के लिए नई फ़ोटो अपलोड करें।",
  "Add registration": "पंजीकरण जोड़ें",
  "Areas of special interest (separate with commas)": "विशेष रुचि के क्षेत्र (कॉमा से अलग करें)",
  "Available times with the same doctor": "इसी डॉक्टर के उपलब्ध समय",
  "Choose your council": "अपनी काउंसिल चुनें",
  "Continue with your Google or Apple account. You do not need a password.": "अपने Google या Apple खाते से आगे बढ़ें। पासवर्ड की ज़रूरत नहीं है।",
  "Council you are registered with": "आप जिस काउंसिल में पंजीकृत हैं",
  "Fees": "फ़ीस",
  "Follow up chat included (days)": "फ़ॉलो अप चैट शामिल (दिन)",
  "Follow up chat, included with your consultation. The doctor usually replies within a few hours.": "फ़ॉलो अप चैट, जो आपके परामर्श में शामिल है। डॉक्टर आमतौर पर कुछ घंटों में जवाब देते हैं।",
  "Indian registration with certificate": "प्रमाणपत्र के साथ भारतीय पंजीकरण",
  "Languages": "भाषाएं",
  "Logging in is not available yet. Please contact us if you need help.": "लॉग इन अभी उपलब्ध नहीं है। मदद चाहिए तो हमसे संपर्क करें।",
  "Next you will set up two step verification with an app on your phone. Then you fill in your details and upload your documents. Our team checks them before your profile goes live.": "आगे आप अपने फ़ोन के ऐप से दो चरण की पुष्टि सेट करेंगे। फिर अपनी जानकारी भरें और दस्तावेज़ अपलोड करें। आपकी प्रोफ़ाइल दिखने से पहले हमारी टीम इनकी जांच करती है।",
  "No available times at the moment": "अभी कोई समय उपलब्ध नहीं है",
  "No available times in the next 2 weeks.": "अगले 2 हफ़्तों में कोई समय उपलब्ध नहीं है।",
  "No profile photo": "प्रोफ़ाइल फ़ोटो नहीं है",
  "No profile text yet.": "अभी प्रोफ़ाइल में कुछ नहीं लिखा गया है।",
  "Open until {date}.": "{date} तक खुला है।",
  "Patients can change the time until (hours before)": "मरीज़ इतने घंटे पहले तक समय बदल सकते हैं",
  "Patients can message you for {n} days after a consult. Reply within {h} hours where you can; ask them to book a consult if a new problem needs assessment.": "परामर्श के बाद मरीज़ {n} दिनों तक आपको संदेश भेज सकते हैं। जहां हो सके {h} घंटों में जवाब दें; अगर नई समस्या की जांच ज़रूरी हो तो उनसे परामर्श बुक करने को कहें।",
  "Please choose your council, enter the registration number and upload the registration certificate.": "कृपया अपनी काउंसिल चुनें, पंजीकरण संख्या लिखें और पंजीकरण प्रमाणपत्र अपलोड करें।",
  "Please upload the registration certificate.": "कृपया पंजीकरण प्रमाणपत्र अपलोड करें।",
  "Profile photo": "प्रोफ़ाइल फ़ोटो",
  "Profile photo, about you and languages": "प्रोफ़ाइल फ़ोटो, आपके बारे में और भाषाएं",
  "Qualifications and registration are changed through verification:": "योग्यता और पंजीकरण जांच के ज़रिए बदले जाते हैं:",
  "Read {doctor}'s advice in simple words, and message them for {days} days.": "{doctor} की सलाह आसान शब्दों में पढ़ें, और {days} दिनों तक उन्हें संदेश भेजें।",
  "Registration added. Our team will check it with the council.": "पंजीकरण जोड़ दिया गया। हमारी टीम काउंसिल से इसकी जांच करेगी।",
  "See a doctor registered in India by video, wherever you live. Or plan your treatment in India with a review of your reports by a specialist, a written cost estimate and help with your visa, travel and stay.": "आप कहीं भी रहें, भारत में पंजीकृत डॉक्टर से वीडियो पर मिलें। या भारत में अपने इलाज की योजना बनाएं: विशेषज्ञ आपकी रिपोर्ट देखेंगे, लिखित खर्च का अनुमान देंगे और वीज़ा, यात्रा व ठहरने में मदद मिलेगी।",
  "Send your reports. A specialist reviews them and usually replies within 2 working days with a written treatment plan and a cost estimate in your currency. There is no obligation.": "अपनी रिपोर्ट भेजें। एक विशेषज्ञ उन्हें देखते हैं और आमतौर पर 2 कामकाजी दिनों में लिखित इलाज योजना और आपकी मुद्रा में खर्च का अनुमान भेजते हैं। कोई बाध्यता नहीं है।",
  "Set available times": "उपलब्ध समय सेट करें",
  "Set the days and hours when patients can book a video consultation with you.": "वे दिन और घंटे सेट करें जब मरीज़ आपसे वीडियो परामर्श बुक कर सकें।",
  "Signature for prescriptions": "पर्चे के लिए हस्ताक्षर",
  "The follow up chat closed on {date}. Book a follow up consultation to ask more.": "फ़ॉलो अप चैट {date} को बंद हो गई। और पूछने के लिए फ़ॉलो अप परामर्श बुक करें।",
  "Upload a clear photo, write a few lines about yourself in plain words, choose your languages, set your video consultation fee and upload your signature. Your prescriptions carry this signature and your registration number.": "एक साफ़ फ़ोटो अपलोड करें, आसान शब्दों में अपने बारे में कुछ पंक्तियां लिखें, अपनी भाषाएं चुनें, वीडियो परामर्श की फ़ीस तय करें और अपने हस्ताक्षर अपलोड करें। आपके पर्चों पर यही हस्ताक्षर और आपकी पंजीकरण संख्या होगी।",
  "Use your email. We will send you a one time code, so you do not need a password.": "अपना ईमेल इस्तेमाल करें। हम आपको एक बार का कोड भेजेंगे, इसलिए पासवर्ड की ज़रूरत नहीं है।",
  "Use your mobile number. We will send you a one time code, so you do not need a password.": "अपना मोबाइल नंबर इस्तेमाल करें। हम आपको एक बार का कोड भेजेंगे, इसलिए पासवर्ड की ज़रूरत नहीं है।",
  "What patients will see": "मरीज़ क्या देखेंगे",
  "a few lines about you (at least 80 characters)": "आपके बारे में कुछ पंक्तियां (कम से कम 80 अक्षर)",
  "languages you speak": "आपकी भाषाएं",
  "profile photo": "प्रोफ़ाइल फ़ोटो",
  "your Indian registration": "आपका भारतीय पंजीकरण",
  "your available times": "आपके उपलब्ध समय",
  "your signature": "आपके हस्ताक्षर",
  "your video consultation fee": "आपकी वीडियो परामर्श फ़ीस",
  "We check every doctor's registration with the medical council before patients can see them.": "मरीज़ों को दिखने से पहले हम हर डॉक्टर के पंजीकरण की जांच मेडिकल काउंसिल से करते हैं।",
};

export default dict;
