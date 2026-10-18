import type { Dict } from "../translate";

// Hindi for the redesign (part b2: finding a doctor and booking). Keys are the English strings used on screen.
const dict: Dict = {
  // Doctors list
  "Every doctor here is registered in India and checked by our team, so you can book a video consultation with confidence.":
    "यहाँ हर डॉक्टर भारत में पंजीकृत है और हमारी टीम ने उनकी जाँच की है, इसलिए आप भरोसे के साथ वीडियो परामर्श बुक कर सकते हैं।",
  All: "सभी",
  "No doctors to show": "दिखाने के लिए कोई डॉक्टर नहीं",
  "Doctors with the soonest free time are shown first.": "जिन डॉक्टरों के पास सबसे जल्दी खाली समय है, वे पहले दिखाए गए हैं।",
  "No {specialty} doctors are available right now": "अभी कोई {specialty} डॉक्टर उपलब्ध नहीं है",
  "Our doctors will be listed here soon": "हमारे डॉक्टर जल्द ही यहाँ दिखेंगे",
  "See all doctors": "सभी डॉक्टर देखें",
  "Ask us for help": "हमसे मदद लें",
  "New times are added every week. Please look again soon, or choose a doctor from another specialty.":
    "हर हफ़्ते नए समय जोड़े जाते हैं। कृपया जल्द ही फिर से देखें, या किसी दूसरी विशेषज्ञता का डॉक्टर चुनें।",
  "Please look again soon. If you need a consultation now, our team will help you find a doctor.":
    "कृपया जल्द ही फिर से देखें। अगर आपको अभी परामर्श चाहिए, तो हमारी टीम डॉक्टर ढूँढने में आपकी मदद करेगी।",
  "{count} doctor": "{count} डॉक्टर",
  "{count} doctors": "{count} डॉक्टर",

  // Doctor card
  "Book video consultation": "वीडियो परामर्श बुक करें",
  "Book consultation": "परामर्श बुक करें",
  "Book video consultation with {name}": "{name} के साथ वीडियो परामर्श बुक करें",
  "Book consultation with {name}": "{name} के साथ परामर्श बुक करें",
  "View profile": "प्रोफ़ाइल देखें",
  "View profile of {name}": "{name} की प्रोफ़ाइल देखें",
  "Speaks {languages}": "भाषाएँ: {languages}",
  "Registration verified": "पंजीकरण की जाँच हो चुकी है",
  "Last checked on {date}": "आख़िरी जाँच {date} को",
  "Video consultation fee": "वीडियो परामर्श फ़ीस",
  "Consultation fee": "परामर्श फ़ीस",
  "No free times at the moment": "अभी कोई खाली समय नहीं है",
  "{count} review": "{count} समीक्षा",
  "{count} reviews": "{count} समीक्षाएँ",

  // Doctor profile
  India: "भारत",
  "{from} to {to}": "{from} से {to} तक",
  "Since {year}": "{year} से",
  "{council}, registration number {number}.": "{council}, पंजीकरण संख्या {number}।",
  "Last checked on {date}.": "आख़िरी जाँच {date} को हुई।",
  "Video consultation": "वीडियो परामर्श",
  "{n} minute consultation": "{n} मिनट का परामर्श",
  "Full refund if the doctor does not join within 10 minutes.": "अगर डॉक्टर 10 मिनट के अंदर नहीं जुड़ते, तो पूरा पैसा वापस।",
  "You see the full price before you pay.": "भुगतान से पहले आपको पूरी क़ीमत दिखाई जाती है।",
  "{patient} consulted {doctor} on {date}. Book a follow up consultation to keep your care in one place.":
    "{patient} ने {date} को {doctor} से परामर्श लिया था। अपना इलाज एक ही जगह रखने के लिए फ़ॉलो अप परामर्श बुक करें।",
  "Book a follow up": "फ़ॉलो अप बुक करें",
  "Available times": "उपलब्ध समय",
  "About {name}": "{name} के बारे में",
  "Treatments and procedures": "इलाज और प्रक्रियाएँ",
  Education: "शिक्षा",
  Experience: "अनुभव",
  Registration: "पंजीकरण",
  "Registration number": "पंजीकरण संख्या",
  "Last checked": "आख़िरी जाँच",
  "We check every doctor's registration before they are listed, and again every 12 months.":
    "हम हर डॉक्टर का पंजीकरण उन्हें यहाँ दिखाने से पहले जाँचते हैं, और फिर हर 12 महीने में दोबारा जाँचते हैं।",
  "You can check a doctor's registration on the Indian Medical Register of the National Medical Commission.":
    "आप राष्ट्रीय आयुर्विज्ञान आयोग (नेशनल मेडिकल कमीशन) के इंडियन मेडिकल रजिस्टर पर डॉक्टर का पंजीकरण ख़ुद देख सकते हैं।",
  "You can check a psychologist's registration on the Central Rehabilitation Register of the Rehabilitation Council of India.":
    "आप भारतीय पुनर्वास परिषद (रिहैबिलिटेशन काउंसिल ऑफ़ इंडिया) के सेंट्रल रिहैबिलिटेशन रजिस्टर पर मनोवैज्ञानिक का पंजीकरण ख़ुद देख सकते हैं।",
  "Only patients who have had a consultation with this doctor can leave a review.": "सिर्फ़ वही मरीज़ समीक्षा लिख सकते हैं जिन्होंने इस डॉक्टर से परामर्श लिया है।",
  "Verified consultation": "पुष्टि किया गया परामर्श",

  // Booking: choose a time
  "Book a consultation with {name}": "{name} के साथ परामर्श बुक करें",
  "How would you like to talk to the doctor?": "आप डॉक्टर से कैसे बात करना चाहेंगे?",
  "For a first consultation, some medicines can only be prescribed after a video call. Choose video if you may need a prescription.":
    "पहले परामर्श में कुछ दवाएँ सिर्फ़ वीडियो कॉल के बाद ही लिखी जा सकती हैं। अगर आपको पर्चे की ज़रूरत पड़ सकती है, तो वीडियो चुनें।",
  "Times are in your local time ({zone}).": "समय आपके स्थानीय समय ({zone}) में दिखाए गए हैं।",
  "This doctor has no free times in the next 2 weeks. Please choose another doctor, or look again in a few days.":
    "अगले 2 हफ़्तों में इस डॉक्टर के पास कोई खाली समय नहीं है। कृपया कोई दूसरा डॉक्टर चुनें, या कुछ दिन बाद फिर से देखें।",
  "Choose a time to continue.": "आगे बढ़ने के लिए समय चुनें।",

  // Booking: who is it for
  "Please choose a time first": "कृपया पहले समय चुनें",
  "Chat consultation": "चैट परामर्श",
  "{mode} with {doctor}": "{doctor} के साथ {mode}",
  "your local time, {zone}": "आपका स्थानीय समय, {zone}",
  "Someone has just booked this time": "यह समय अभी किसी और ने बुक कर लिया है",
  "Choose another time": "कोई दूसरा समय चुनें",
  "Who is the consultation for?": "परामर्श किसके लिए है?",
  "A parent or guardian must be with {name} for the whole consultation.": "पूरे परामर्श के दौरान माता, पिता या अभिभावक का {name} के साथ होना ज़रूरी है।",
  "Does the patient have any of these right now? Tick any that apply.": "क्या मरीज़ को अभी इनमें से कुछ हो रहा है? जो लागू हो, उस पर निशान लगाएँ।",
  "Please get urgent care now": "कृपया अभी तुरंत इलाज लें",
  "An online consultation is not safe for this. Go to the nearest hospital or call your local emergency number now.":
    "इसके लिए ऑनलाइन परामर्श सुरक्षित नहीं है। अभी नज़दीकी अस्पताल जाएँ या अपने यहाँ का आपातकालीन नंबर मिलाएँ।",
  "If you are thinking about harming yourself, please also tell someone you trust now.": "अगर आप ख़ुद को नुकसान पहुँचाने के बारे में सोच रहे हैं, तो कृपया अभी किसी भरोसेमंद व्यक्ति को भी बताएँ।",
  "Do you need an interpreter? (optional)": "क्या आपको दुभाषिए की ज़रूरत है? (वैकल्पिक)",
  "Our care team will arrange a medical interpreter to join the call.": "हमारी केयर टीम कॉल में जुड़ने के लिए एक मेडिकल दुभाषिए का इंतज़ाम करेगी।",
  "{name} knows about this consultation and agrees to it.": "{name} को इस परामर्श के बारे में पता है और वे इसके लिए सहमत हैं।",
  "India's telemedicine rules ask for this when a family member books for someone else. The doctor will also confirm it at the start.":
    "जब परिवार का कोई सदस्य किसी और के लिए बुक करता है, तो भारत के टेलीमेडिसिन नियमों के अनुसार यह ज़रूरी है। डॉक्टर भी शुरुआत में इसकी पुष्टि करेंगे।",
  "Holding your time…": "आपका समय रोका जा रहा है…",

  // Booking: review and pay
  "This booking has expired": "इस बुकिंग का समय ख़त्म हो गया है",
  "We can hold a time for 15 minutes only.": "हम कोई समय सिर्फ़ 15 मिनट के लिए रोक सकते हैं।",
  "The payment was cancelled. No money was taken.": "भुगतान रद्द हो गया। कोई पैसा नहीं कटा।",
  Consultation: "परामर्श",
  "Follow up": "फ़ॉलो अप",
  "Date and time": "तारीख़ और समय",
  "Change the time or type of consultation": "समय या परामर्श का प्रकार बदलें",
  "This consultation is already paid for.": "इस परामर्श का भुगतान पहले ही हो चुका है।",
  "Clinic visit fee": "क्लिनिक विज़िट फ़ीस",
  "Credit from your online consultation": "आपके ऑनलाइन परामर्श का क्रेडिट",
  minus: "घटाकर",
  "Total to pay": "कुल भुगतान",
  "A doctor's consultation is exempt from GST. GST applies only to the platform fee. You will get a GST invoice.":
    "डॉक्टर के परामर्श पर GST नहीं लगता। GST सिर्फ़ प्लेटफ़ॉर्म फ़ीस पर लगता है। आपको GST इनवॉइस मिलेगा।",
  "You pay in {currency}. The price uses the exchange rate of {date}.": "आप {currency} में भुगतान करेंगे। क़ीमत {date} की विनिमय दर से तय की गई है।",
  "Your payment is held safely. The doctor is paid only after the consultation.": "आपका भुगतान सुरक्षित रखा जाता है। डॉक्टर को पैसा परामर्श के बाद ही मिलता है।",
  "We will remind you 24 hours, 1 hour and 10 minutes before the consultation.": "हम आपको परामर्श से 24 घंटे, 1 घंटा और 10 मिनट पहले याद दिलाएँगे।",
  "If your doctor feels you need to be seen in person, they will tell you what to do next.": "अगर डॉक्टर को लगे कि आपको आमने सामने दिखाना ज़रूरी है, तो वे आपको बताएँगे कि आगे क्या करना है।",
  "Refund and cancellation policy": "रिफ़ंड और रद्द करने की नीति",
  "Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor.":
    "आपके डॉक्टर भारत में पंजीकृत हैं। अगर आप भारत के बाहर रहते हैं, तो हो सकता है कि आपके देश की फ़ार्मेसी भारतीय डॉक्टर का पर्चा न मानें। आपके डॉक्टर आपको इलाज की लिखित योजना देंगे, जिसे आप अपने स्थानीय डॉक्टर को दिखा सकते हैं।",
  "Online payment is not connected yet. The next page is a test payment that does not take any money.":
    "ऑनलाइन भुगतान अभी जुड़ा नहीं है। अगला पेज एक टेस्ट भुगतान है, जिसमें कोई पैसा नहीं कटता।",
  "Pay at the reception desk on the day. Your time is confirmed now.": "उसी दिन रिसेप्शन पर भुगतान करें। आपका समय अभी पक्का हो गया है।",
  UPI: "UPI",
  "We could not open the payment window. Please check your connection and try again.": "हम भुगतान की विंडो नहीं खोल सके। कृपया अपना इंटरनेट कनेक्शन जाँचें और फिर से कोशिश करें।",
  "We could not confirm the payment. If any money was taken, it will be refunded to you automatically.": "हम भुगतान की पुष्टि नहीं कर सके। अगर कोई पैसा कटा है, तो वह अपने आप आपको वापस मिल जाएगा।",
  "The hold on this time has ended. You can still try to pay. If someone else has booked it, we will ask you to choose another time.":
    "इस समय को रोकने की अवधि ख़त्म हो गई है। आप अब भी भुगतान की कोशिश कर सकते हैं। अगर किसी और ने इसे बुक कर लिया है, तो हम आपसे कोई दूसरा समय चुनने को कहेंगे।",
  "We are holding this time for you for {time}.": "हम यह समय आपके लिए {time} तक रोक कर रख रहे हैं।",
  "Payments are processed by a PCI DSS compliant payment gateway. We never see or store your card details.":
    "भुगतान PCI DSS मानकों का पालन करने वाले पेमेंट गेटवे से होता है। हम आपके कार्ड की जानकारी न देखते हैं, न रखते हैं।",

  // Test payment page
  "Online payment is not connected yet. This test payment does not take any money.": "ऑनलाइन भुगतान अभी जुड़ा नहीं है। इस टेस्ट भुगतान में कोई पैसा नहीं कटता।",
  "The payment was declined and no money was taken. Please try again or choose another way to pay.":
    "भुगतान अस्वीकार हो गया और कोई पैसा नहीं कटा। कृपया फिर से कोशिश करें या भुगतान का कोई दूसरा तरीका चुनें।",
  "This has already been paid.": "इसका भुगतान पहले ही हो चुका है।",

  // Booking done and health form
  "Your clinic visit is booked": "आपकी क्लिनिक विज़िट बुक हो गई है",
  "Your consultation is booked": "आपका परामर्श बुक हो गया है",
  "With {doctor} on {date}": "{doctor} के साथ, {date} को",
  "For {name}, this is {time}.": "{name} के लिए यह समय {time} है।",
  "Your booking reference is {ref}. We have sent you the details.": "आपकी बुकिंग का रेफ़रेंस नंबर {ref} है। हमने आपको पूरी जानकारी भेज दी है।",
  "Test your camera and microphone": "अपना कैमरा और माइक्रोफ़ोन जाँचें",
  "Health form before your consultation": "परामर्श से पहले का स्वास्थ्य फ़ॉर्म",
  "Tell {doctor} about the problem so the consultation can start straight away. It takes about 2 minutes. You can also fill it in later from My consultations.":
    "{doctor} को अपनी समस्या के बारे में बताएँ, ताकि परामर्श तुरंत शुरू हो सके। इसमें लगभग 2 मिनट लगते हैं। आप इसे बाद में मेरे परामर्श से भी भर सकते हैं।",
  "Fill it in later": "बाद में भरें",
  "Thank you. {doctor} will read this before the consultation.": "धन्यवाद। {doctor} परामर्श से पहले इसे पढ़ेंगे।",
  "Include tablets, syrups, creams and supplements.": "गोलियाँ, सिरप, क्रीम और सप्लीमेंट सब लिखें।",
  "To medicines or food. Write None if there are none.": "दवाओं या खाने से। अगर कोई नहीं है, तो कोई नहीं लिखें।",
  "It is easy to forget during the call, so write them here.": "कॉल के दौरान भूलना आसान है, इसलिए उन्हें यहाँ लिख लें।",
  "Lab reports, earlier prescriptions or a photo of the problem area. Photos are made smaller so they upload quickly on a slow connection.":
    "लैब रिपोर्ट, पुराने पर्चे या समस्या वाली जगह की फ़ोटो। फ़ोटो छोटी कर दी जाती हैं, ताकि धीमे कनेक्शन पर भी जल्दी अपलोड हो जाएँ।",
  "Do not wait for the online consultation. Go to the nearest hospital or call your local emergency number now.":
    "ऑनलाइन परामर्श का इंतज़ार न करें। अभी नज़दीकी अस्पताल जाएँ या अपने यहाँ का आपातकालीन नंबर मिलाएँ।",
  "Only for 30 days. You can stop sharing at any time in Settings.": "सिर्फ़ 30 दिनों के लिए। आप सेटिंग्स में कभी भी शेयर करना बंद कर सकते हैं।",
  "I agree to this teleconsultation and understand that the doctor may advise a visit in person.":
    "मैं इस टेलीपरामर्श के लिए सहमत हूँ और समझता/समझती हूँ कि डॉक्टर आमने सामने मिलने की सलाह दे सकते हैं।",

  // Clinic visit after an online consultation
  "There are no clinic times in the next 2 weeks. Ask for a call back and our team will arrange one for you.":
    "अगले 2 हफ़्तों में क्लिनिक का कोई समय खाली नहीं है। कॉल बैक माँगें, हमारी टीम आपके लिए समय तय करेगी।",
};

export default dict;
