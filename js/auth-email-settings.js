// Shared destination after Firebase email actions. The custom action handler itself
// is configured in Firebase Authentication > Templates.
import { auth } from "./config.js";

// Keep Firebase authentication emails localized in Arabic.
auth.languageCode = "ar";

export const emailActionSettings = {
  url: "https://bawabet-altamreed.com/login?emailAction=complete"
};
