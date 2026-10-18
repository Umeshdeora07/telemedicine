import type { Dict } from "../translate";

// Hindi for the redesign (part a2). Keys are the English strings used on screen.
// Covers the demo data rendered through t() (specialties, symptoms, FAQs,
// doctors' specialties, conditions and procedures), the booking and consult
// room changes, and the test account notes on the login page.
const dict: Dict = {
  /* ----------------------------------------------------------- specialties */
  Orthopaedics: "हड्डी रोग (ऑर्थोपेडिक्स)",
  Dermatology: "त्वचा रोग (डर्मेटोलॉजी)",
  "General Physician": "जनरल फिजिशियन",
  Psychology: "मनोविज्ञान (साइकोलॉजी)",

  "Joint pain, back and neck pain, sports injuries, fractures and joint replacement.":
    "जोड़ों का दर्द, कमर और गर्दन का दर्द, खेल में लगी चोटें, फ्रैक्चर और जोड़ बदलने का ऑपरेशन।",
  "Acne, rashes, eczema, hair fall, pigmentation, fungal infections and nail problems.":
    "मुंहासे, चकत्ते, एक्ज़िमा, बाल झड़ना, पिगमेंटेशन, फंगल इन्फेक्शन और नाखूनों की समस्याएं।",
  "Fever, infections, stomach problems, diabetes, blood pressure, thyroid and health check ups.":
    "बुखार, संक्रमण, पेट की समस्याएं, डायबिटीज़, ब्लड प्रेशर, थायरॉइड और हेल्थ चेकअप।",
  "Stress, anxiety, low mood, sleep problems and relationship worries.": "तनाव, घबराहट, उदासी, नींद की समस्याएं और रिश्तों से जुड़ी चिंताएं।",

  "Orthopaedic doctors treat bones, joints, muscles, ligaments and the spine. In an online consultation you can show your X-ray or MRI, understand what it means and agree on a plan, such as exercises, medicines, physiotherapy or surgery. If you need an operation like a knee or hip replacement, we can help you plan your treatment in India.":
    "हड्डी रोग विशेषज्ञ हड्डियों, जोड़ों, मांसपेशियों, लिगामेंट और रीढ़ की हड्डी का इलाज करते हैं। ऑनलाइन परामर्श में आप अपना एक्सरे या MRI दिखा सकते हैं, समझ सकते हैं कि उसका क्या मतलब है, और इलाज की योजना तय कर सकते हैं, जैसे व्यायाम, दवाएं, फिजियोथेरेपी या सर्जरी। अगर आपको घुटना या कूल्हा बदलने जैसे ऑपरेशन की ज़रूरत है, तो हम भारत में आपके इलाज की योजना बनाने में मदद कर सकते हैं।",
  "Dermatologists treat problems of the skin, hair and nails. Many skin problems can be treated well in an online consultation, because the doctor can see your skin on video and in clear photos. You get a written plan and, when it is safe, a digital prescription.":
    "त्वचा रोग विशेषज्ञ त्वचा, बालों और नाखूनों की समस्याओं का इलाज करते हैं। त्वचा की कई समस्याओं का इलाज ऑनलाइन परामर्श में अच्छी तरह हो सकता है, क्योंकि डॉक्टर वीडियो पर और साफ़ फ़ोटो में आपकी त्वचा देख सकते हैं। आपको लिखित योजना मिलती है और, जब सुरक्षित हो, डिजिटल पर्चा भी।",
  "A general physician is the right first doctor for most health problems. They treat everyday illnesses such as fever, cough and stomach upsets, look after long term conditions like diabetes, high blood pressure and thyroid problems, review your medicines and reports, and tell you when you need a specialist.":
    "ज़्यादातर स्वास्थ्य समस्याओं में सबसे पहले जनरल फिजिशियन को दिखाना सही रहता है। वे बुखार, खांसी और पेट खराब जैसी रोज़ की बीमारियों का इलाज करते हैं, डायबिटीज़, हाई ब्लड प्रेशर और थायरॉइड जैसी लंबी बीमारियों की देखभाल करते हैं, आपकी दवाएं और रिपोर्ट देखते हैं, और बताते हैं कि कब आपको किसी विशेषज्ञ की ज़रूरत है।",
  "Our psychology team helps with stress, anxiety, low mood, sleep problems and difficulties in relationships. You can talk in private with a clinical psychologist, and a consultant psychiatrist is part of the team when medicine may help. Sessions are online, so you can join from home, in India or abroad.":
    "हमारी मनोविज्ञान टीम तनाव, घबराहट, उदासी, नींद की समस्याओं और रिश्तों की मुश्किलों में मदद करती है। आप किसी क्लिनिकल साइकोलॉजिस्ट से अकेले में बात कर सकते हैं, और जब दवा से मदद मिल सकती हो, तो टीम में एक कंसल्टेंट साइकियाट्रिस्ट भी हैं। सेशन ऑनलाइन होते हैं, इसलिए आप घर से जुड़ सकते हैं, चाहे भारत में हों या विदेश में।",

  // Symptoms and what each specialty treats
  "Knee pain": "घुटने का दर्द",
  "Back pain": "कमर दर्द",
  "Neck pain": "गर्दन का दर्द",
  "Shoulder pain": "कंधे का दर्द",
  "Joint swelling": "जोड़ों में सूजन",
  "Stiff joints": "जोड़ों में जकड़न",
  "Sports injury": "खेल में लगी चोट",
  Osteoarthritis: "ऑस्टियोआर्थराइटिस (जोड़ों का घिसना)",
  "Slipped disc": "स्लिप डिस्क",
  "Frozen shoulder": "फ्रोज़न शोल्डर (कंधे की जकड़न)",
  "Ligament tears": "लिगामेंट फटना",
  "Fracture care": "फ्रैक्चर का इलाज",
  "Knee and hip replacement": "घुटना और कूल्हा बदलना",
  Acne: "मुंहासे",
  Itching: "खुजली",
  Rash: "चकत्ते",
  "Hair fall": "बाल झड़ना",
  Dandruff: "रूसी",
  "Dark patches": "काले धब्बे",
  "Fungal infection": "फंगल इन्फेक्शन",
  "Nail problems": "नाखूनों की समस्याएं",
  "Acne and acne scars": "मुंहासे और उनके निशान",
  Eczema: "एक्ज़िमा",
  Psoriasis: "सोरायसिस",
  "Fungal infections": "फंगल इन्फेक्शन",
  "Hair loss": "बाल झड़ना",
  Pigmentation: "पिगमेंटेशन (त्वचा पर धब्बे)",
  Hives: "पित्ती",
  Fever: "बुखार",
  "Cough and cold": "खांसी और ज़ुकाम",
  "Sore throat": "गले में खराश",
  Acidity: "एसिडिटी",
  "Stomach upset": "पेट खराब",
  Headache: "सिरदर्द",
  Tiredness: "थकान",
  "Urine infection": "पेशाब का संक्रमण",
  "High sugar": "शुगर बढ़ना",
  "High blood pressure": "हाई ब्लड प्रेशर",
  "Viral fever": "वायरल बुखार",
  "Cold and flu": "ज़ुकाम और फ्लू",
  Gastritis: "गैस्ट्राइटिस (पेट में जलन)",
  "Urinary tract infection": "पेशाब की नली का संक्रमण (UTI)",
  "Type 2 diabetes": "टाइप 2 डायबिटीज़",
  "Thyroid problems": "थायरॉइड की समस्याएं",
  "Health check up review": "हेल्थ चेकअप रिपोर्ट देखना",
  Stress: "तनाव",
  "Worry and panic": "चिंता और घबराहट",
  "Feeling low": "मन उदास रहना",
  "Poor sleep": "नींद ठीक से न आना",
  "Loss of interest": "किसी चीज़ में मन न लगना",
  Anger: "गुस्सा",
  "Relationship problems": "रिश्तों की समस्याएं",
  "Exam or work pressure": "परीक्षा या काम का दबाव",
  Anxiety: "एंग्ज़ायटी (घबराहट)",
  Depression: "डिप्रेशन",
  Insomnia: "अनिद्रा",
  "Panic attacks": "पैनिक अटैक",
  OCD: "OCD",
  Grief: "किसी अपने को खोने का दुख",
  "Relationship and family issues": "रिश्ते और परिवार से जुड़ी बातें",
  "Work stress": "काम का तनाव",

  // Specialty FAQs
  "Can an orthopaedic doctor help me online?": "क्या हड्डी रोग विशेषज्ञ ऑनलाइन मेरी मदद कर सकते हैं?",
  "Yes, for many problems. The doctor can look at your X-ray or MRI, explain what it shows, suggest exercises and medicines, and tell you clearly if you need to be examined in person.":
    "हां, कई समस्याओं में। डॉक्टर आपका एक्सरे या MRI देख सकते हैं, समझा सकते हैं कि उसमें क्या दिख रहा है, व्यायाम और दवाएं बता सकते हैं, और साफ़ बताएंगे कि क्या आपको क्लिनिक में आकर जांच करानी होगी।",
  "Can I share my X-ray or MRI?": "क्या एक्सरे या MRI दिखाया जा सकता है?",
  "Yes. Upload the report and the images before your consultation, or show them during the video call.":
    "हां। परामर्श से पहले रिपोर्ट और तस्वीरें अपलोड करें, या वीडियो कॉल के दौरान दिखाएं।",
  "I have been advised a knee or hip replacement. Can I have it done in India?":
    "मुझे घुटना या कूल्हा बदलवाने की सलाह दी गई है। क्या यह भारत में करवाया जा सकता है?",
  "Yes. Send us your reports and a specialist will review them free of charge, usually within 2 working days. You will receive a written treatment plan and a cost estimate in your currency, and our team can help with the medical visa, travel and stay.":
    "हां। अपनी रिपोर्ट हमें भेजें। एक विशेषज्ञ उन्हें मुफ़्त में देखेंगे, आम तौर पर 2 कामकाजी दिनों के अंदर। आपको लिखित इलाज योजना और आपकी मुद्रा में खर्च का अनुमान मिलेगा, और हमारी टीम मेडिकल वीज़ा, यात्रा और रहने की व्यवस्था में मदद कर सकती है।",
  "Should I send photos?": "क्या मुझे फ़ोटो भेजनी चाहिए?",
  "Yes, please. Take clear photos in daylight, one close up and one from a little further away, and add them to the health form before your consultation.":
    "हां, ज़रूर। दिन की रोशनी में साफ़ फ़ोटो लें, एक पास से और एक थोड़ी दूर से, और उन्हें परामर्श से पहले भरे जाने वाले हेल्थ फ़ॉर्म में जोड़ दें।",
  "Can skin problems be treated online?": "क्या त्वचा की समस्याओं का इलाज ऑनलाइन हो सकता है?",
  "Many can, such as acne, eczema, fungal infections and hair fall. If the doctor needs a closer look or a small test, they will tell you and suggest a clinic visit.":
    "कई का हो सकता है, जैसे मुंहासे, एक्ज़िमा, फंगल इन्फेक्शन और बाल झड़ना। अगर डॉक्टर को पास से देखना हो या कोई छोटी जांच करनी हो, तो वे आपको बताएंगे और क्लिनिक आने की सलाह देंगे।",
  "How soon will I see results?": "असर कितने दिनों में दिखेगा?",
  "It depends on the problem. Treatment for acne and hair fall usually takes 6 to 12 weeks to show a clear change, so your doctor will plan a follow up consultation with you.":
    "यह समस्या पर निर्भर करता है। मुंहासों और बाल झड़ने के इलाज में साफ़ बदलाव दिखने में आम तौर पर 6 से 12 हफ़्ते लगते हैं, इसलिए डॉक्टर आपके साथ फ़ॉलो अप परामर्श तय करेंगे।",
  "Can a general physician treat me online?": "क्या जनरल फिजिशियन ऑनलाइन मेरा इलाज कर सकते हैं?",
  "Yes, for many common problems such as fever, cough, acidity, and diabetes or blood pressure reviews. If the doctor needs to examine you or order tests, they will tell you clearly.":
    "हां, कई आम समस्याओं में, जैसे बुखार, खांसी, एसिडिटी, और डायबिटीज़ या ब्लड प्रेशर की नियमित जांच। अगर डॉक्टर को आपकी जांच करनी हो या टेस्ट करवाने हों, तो वे आपको साफ़ बताएंगे।",
  "Will I get a prescription?": "क्या मुझे पर्चा मिलेगा?",
  "If it is safe to treat you online, your doctor will send a digital prescription after the consultation. Some medicines cannot be prescribed online under India's telemedicine rules.":
    "अगर ऑनलाइन इलाज करना सुरक्षित है, तो परामर्श के बाद डॉक्टर डिजिटल पर्चा भेजेंगे। भारत के टेलीमेडिसिन नियमों के तहत कुछ दवाएं ऑनलाइन नहीं लिखी जा सकतीं।",
  "I live outside India. Can I still consult?": "क्या भारत से बाहर रहकर भी परामर्श लिया जा सकता है?",
  "Yes. Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor.":
    "हां। आपके डॉक्टर भारत में पंजीकृत हैं। अगर आप भारत से बाहर रहते हैं, तो हो सकता है आपके देश की फ़ार्मेसी भारतीय डॉक्टर का पर्चा स्वीकार न करें। आपके डॉक्टर आपको लिखित इलाज योजना देंगे, जिसे आप अपने स्थानीय डॉक्टर को दिखा सकते हैं।",
  "Is it private?": "क्या यह निजी रहेगा?",
  "Yes. Your notes are seen only by your psychologist or doctor. Calls are encrypted and are not recorded unless you agree.":
    "हां। आपके नोट्स सिर्फ़ आपके साइकोलॉजिस्ट या डॉक्टर देखते हैं। कॉल एन्क्रिप्टेड होती हैं और आपकी सहमति के बिना रिकॉर्ड नहीं होतीं।",
  "What is the difference between a psychologist and a psychiatrist?": "साइकोलॉजिस्ट और साइकियाट्रिस्ट में क्या अंतर है?",
  "A clinical psychologist helps you through talking therapy, such as cognitive behavioural therapy. A psychiatrist is a medical doctor who can also prescribe medicine when it may help. You can start with either, and they work together when needed.":
    "क्लिनिकल साइकोलॉजिस्ट बातचीत पर आधारित थेरेपी से मदद करते हैं, जैसे कॉग्निटिव बिहेवियरल थेरेपी (CBT)। साइकियाट्रिस्ट मेडिकल डॉक्टर होते हैं, जो ज़रूरत पड़ने पर दवा भी लिख सकते हैं। आप किसी से भी शुरुआत कर सकते हैं, और ज़रूरत होने पर दोनों मिलकर काम करते हैं।",
  "Can a psychiatrist prescribe online?": "क्या साइकियाट्रिस्ट ऑनलाइन दवा लिख सकते हैं?",
  "Yes, for many medicines. Some medicines are controlled under Indian law and cannot be prescribed in an online consultation. Psychologists do not prescribe medicine.":
    "हां, कई दवाएं। कुछ दवाएं भारतीय कानून के तहत नियंत्रित हैं और ऑनलाइन परामर्श में नहीं लिखी जा सकतीं। साइकोलॉजिस्ट दवा नहीं लिखते।",
  "What if I am in crisis?": "अगर मैं संकट में हूं तो क्या करूं?",
  "Please do not wait for a booking. If you are thinking about harming yourself, call your local emergency number or go to the nearest hospital now. In India you can also call Tele-MANAS on 14416, free, at any time.":
    "बुकिंग का इंतज़ार न करें। अगर आपके मन में खुद को नुकसान पहुंचाने के विचार आ रहे हैं, तो अभी अपने यहां के इमरजेंसी नंबर पर कॉल करें या सबसे नज़दीकी अस्पताल जाएं। भारत में आप Tele-MANAS को 14416 पर भी किसी भी समय मुफ़्त कॉल कर सकते हैं।",

  /* -------------------------- doctors: specialties, conditions, procedures */
  "Joint replacement": "जोड़ बदलने की सर्जरी",
  Arthroscopy: "आर्थ्रोस्कोपी (दूरबीन से जोड़ की सर्जरी)",
  "Knee arthritis": "घुटने का आर्थराइटिस",
  "Hip arthritis": "कूल्हे का आर्थराइटिस",
  "Sports injuries": "खेल में लगी चोटें",
  "Total knee replacement": "पूरा घुटना बदलना",
  "Total hip replacement": "पूरा कूल्हा बदलना",
  "Keyhole ligament repair": "दूरबीन से लिगामेंट की मरम्मत",
  "Spine care": "रीढ़ की देखभाल",
  "Sports medicine": "स्पोर्ट्स मेडिसिन",
  Sprains: "मोच",
  Osteoporosis: "ऑस्टियोपोरोसिस (हड्डियों की कमज़ोरी)",
  "Joint injection": "जोड़ में इंजेक्शन",
  "Plaster and splint": "प्लास्टर और स्प्लिंट",
  "Shoulder and knee arthroscopy": "कंधे और घुटने की आर्थ्रोस्कोपी",
  "Rotator cuff tears": "रोटेटर कफ़ फटना",
  "Meniscus tears": "मेनिस्कस फटना",
  "Ankle sprains": "टखने की मोच",
  "Tennis elbow": "टेनिस एल्बो",
  "Keyhole shoulder repair": "दूरबीन से कंधे की मरम्मत",
  "Meniscus repair": "मेनिस्कस की मरम्मत",
  "Acne and scars": "मुंहासे और निशान",
  "Chemical peel": "केमिकल पील",
  "PRP for hair": "बालों के लिए PRP",
  "Skin biopsy": "त्वचा की बायोप्सी",
  "Skin allergies": "त्वचा की एलर्जी",
  "Skin care for children": "बच्चों की त्वचा की देखभाल",
  Melasma: "मेलास्मा (चेहरे पर भूरे धब्बे)",
  "Hair and scalp": "बाल और सिर की त्वचा",
  "Adult acne": "बड़ी उम्र में मुंहासे",
  "Scalp examination": "सिर की त्वचा की जांच",
  "Internal medicine": "इंटरनल मेडिसिन",
  "Preventive health": "बीमारियों से बचाव",
  Diabetes: "डायबिटीज़",
  Thyroid: "थायरॉइड",
  Infections: "संक्रमण",
  "Medicine review": "दवाओं की समीक्षा",
  "Care of older adults": "बुज़ुर्गों की देखभाल",
  "Memory problems": "याददाश्त की समस्याएं",
  Falls: "गिरने की समस्या",
  "Medicine reviews": "दवाओं की समीक्षा",
  "Medicine review for older adults": "बुज़ुर्गों की दवाओं की समीक्षा",
  "Family medicine": "फ़ैमिली मेडिसिन",
  "Skin infections": "त्वचा के संक्रमण",
  Psychiatry: "साइकियाट्री (मनोरोग चिकित्सा)",
  "Anxiety and depression": "एंग्ज़ायटी और डिप्रेशन",
  "Bipolar disorder": "बाइपोलर डिसऑर्डर",
  "Adult ADHD": "बड़ों में ADHD",
  Psychotherapy: "साइकोथेरेपी",
  "Clinical psychology": "क्लिनिकल साइकोलॉजी",
  "Cognitive behavioural therapy": "कॉग्निटिव बिहेवियरल थेरेपी (CBT)",
  "Low mood": "उदासी",
  "Exam and work stress": "परीक्षा और काम का तनाव",
  "Psychological assessment": "मनोवैज्ञानिक आकलन",
  "Couples and family therapy": "दंपती और परिवार के लिए थेरेपी",
  "Couples therapy": "दंपती थेरेपी",
  "Therapy for sleep problems": "नींद की समस्याओं के लिए थेरेपी",

  // Doctors' one line headlines (for when profiles translate them)
  "Knee and hip replacement surgeon in Gurugram": "गुरुग्राम में घुटना और कूल्हा बदलने वाले सर्जन",
  "Back, neck and sports injuries": "कमर, गर्दन और खेल में लगी चोटें",
  "Shoulder and knee problems and sports injuries": "कंधे और घुटने की समस्याएं और खेल में लगी चोटें",
  "Clear, honest advice for skin and hair": "त्वचा और बालों के लिए साफ़ और ईमानदार सलाह",
  "Skin care for the whole family, online": "पूरे परिवार की त्वचा की देखभाल, ऑनलाइन",
  "Hair loss, pigmentation and long term skin conditions": "बाल झड़ना, पिगमेंटेशन और त्वचा की लंबी बीमारियां",
  "Family physician who explains things in simple words": "फ़ैमिली फिजिशियन, जो हर बात आसान शब्दों में समझाती हैं",
  "Care for older adults and for families who live far apart": "बुज़ुर्गों की देखभाल, और उन परिवारों के लिए जो एक दूसरे से दूर रहते हैं",
  "Quick, careful help for common illnesses": "आम बीमारियों में जल्दी और सावधानी से मदद",
  "Consultant psychiatrist for anxiety, low mood and sleep problems": "घबराहट, उदासी और नींद की समस्याओं के लिए कंसल्टेंट साइकियाट्रिस्ट",
  "Clinical psychologist for anxiety, panic and low mood": "घबराहट, पैनिक और उदासी के लिए क्लिनिकल साइकोलॉजिस्ट",
  "Clinical psychologist for relationships, stress and sleep": "रिश्तों, तनाव और नींद के लिए क्लिनिकल साइकोलॉजिस्ट",
  "Awaiting verification": "जांच बाकी है",
  "Licence expired": "लाइसेंस की अवधि खत्म",
  Suspended: "निलंबित",
  "No Indian registration": "भारतीय पंजीकरण नहीं है",

  /* ------------------------------------------------------- doctors, booking */
  "Every doctor here is verified and registered in India.": "यहां हर डॉक्टर की जांच हो चुकी है और वे भारत में पंजीकृत हैं।",
  "Please choose who the consultation is for.": "कृपया चुनें कि परामर्श किसके लिए है।",
  "This doctor is not taking bookings at the moment": "ये डॉक्टर अभी बुकिंग नहीं ले रहे हैं",
  "This doctor is not taking bookings at the moment. Please choose another doctor.": "ये डॉक्टर अभी बुकिंग नहीं ले रहे हैं। कृपया कोई दूसरा डॉक्टर चुनें।",
  "No doctor is available in this specialty yet.": "इस विशेषज्ञता में अभी कोई डॉक्टर उपलब्ध नहीं है।",
  "Step {current} of {total}: who is it for": "{total} में से चरण {current}: परामर्श किसके लिए है",
  "Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor.":
    "आपके डॉक्टर भारत में पंजीकृत हैं। अगर आप भारत से बाहर रहते हैं, तो हो सकता है आपके देश की फ़ार्मेसी भारतीय डॉक्टर का पर्चा स्वीकार न करें। आपके डॉक्टर आपको लिखित इलाज योजना देंगे, जिसे आप अपने स्थानीय डॉक्टर को दिखा सकते हैं।",

  /* ------------------------------------------------------------ consult room */
  "Join consult": "परामर्श में जुड़ें",
  "This consult has ended.": "यह परामर्श खत्म हो चुका है।",
  "This is a clinic visit, so there is no online room.": "यह क्लिनिक विज़िट है, इसलिए इसका कोई ऑनलाइन रूम नहीं है।",
  "We couldn't connect you to the consult. Please try again.": "हम आपको परामर्श से नहीं जोड़ पाए। कृपया फिर से कोशिश करें।",
  "Your Indian registration is missing or has expired. Please update it before issuing a prescription.":
    "आपका भारतीय पंजीकरण नहीं मिला या उसकी अवधि खत्म हो चुकी है। पर्चा जारी करने से पहले कृपया इसे अपडेट करें।",
  "Clinical psychologists cannot prescribe medicines. Write your advice instead, or refer the patient to a psychiatrist.":
    "क्लिनिकल साइकोलॉजिस्ट दवाएं नहीं लिख सकते। इसकी जगह अपनी सलाह लिखें, या मरीज़ को साइकियाट्रिस्ट के पास भेजें।",

  /* ------------------------------------------------ login page test accounts */
  "Diabetes review with a general physician": "जनरल फिजिशियन से डायबिटीज़ की जांच",
  "Planning treatment in India, from Dhaka": "ढाका से, भारत में इलाज की योजना",
  "Online consultation from Nairobi": "नैरोबी से ऑनलाइन परामर्श",
  "Doctor (orthopaedics, treatment in India cases)": "डॉक्टर (हड्डी रोग, भारत में इलाज के केस)",
  "Clinical psychologist": "क्लिनिकल साइकोलॉजिस्ट",
};

export default dict;
