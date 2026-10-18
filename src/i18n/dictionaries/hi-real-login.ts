import type { Dict } from "../translate";

// Hindi for login code messages (real SMS and email login). Keys are the English strings used on screen.
const dict: Dict = {
  "Signing in by text message isn't available yet. Please use your email address.": "टेक्स्ट मैसेज से लॉग इन अभी उपलब्ध नहीं है। कृपया अपना ईमेल पता इस्तेमाल करें।",
  "Signing in by email isn't available yet. Please use your mobile number.": "ईमेल से लॉग इन अभी उपलब्ध नहीं है। कृपया अपना मोबाइल नंबर इस्तेमाल करें।",
  "Too many codes requested. Please wait 15 minutes and try again.": "बहुत ज़्यादा कोड माँगे गए हैं। कृपया 15 मिनट रुककर फिर कोशिश करें।",
  "Please wait {n} seconds before asking for a new code.": "नया कोड माँगने से पहले कृपया {n} सेकंड रुकें।",
  "This code has expired. Please ask for a new one.": "इस कोड का समय ख़त्म हो गया है। कृपया नया कोड माँगें।",
  "Too many wrong attempts. Please ask for a new code.": "बहुत बार ग़लत कोड डाला गया। कृपया नया कोड माँगें।",
  "That code is not right. {n} tries left.": "यह कोड सही नहीं है। {n} कोशिशें बाकी हैं।",
  "We couldn't send a text message to this number. Please check the number, or log in with your email address.":
    "हम इस नंबर पर टेक्स्ट मैसेज नहीं भेज पाए। कृपया नंबर जाँचें, या अपने ईमेल पते से लॉग इन करें।",
  "We couldn't send an email to this address. Please check it, or log in another way.": "हम इस पते पर ईमेल नहीं भेज पाए। कृपया पता जाँचें, या किसी और तरीके से लॉग इन करें।",
  "We couldn't check the code just now. Please try again in a minute.": "हम अभी कोड नहीं जाँच पाए। कृपया एक मिनट बाद फिर कोशिश करें।",
};

export default dict;
