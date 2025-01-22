export const languages = [
  "Autodetected",
  "English",
  "Vietnamese",
  "Japanese",
  "Korean",
  "French",
  "Chinese (Traditional)",
  "Chinese (Simplified)",
  "Spanish",
  "Thai",
  "Russian",
];

export const popularLanguages = [
  { name: "Vietnamese", code: "vi" },
  { name: "English", code: "en" },
  { name: "Spanish", code: "es" },
  { name: "Mandarin Chinese", code: "zh" },
  { name: "Hindi", code: "hi" },
  { name: "Arabic", code: "ar" },
  { name: "Portuguese", code: "pt" },
  { name: "Bengali", code: "bn" },
  { name: "Russian", code: "ru" },
  { name: "Japanese", code: "ja" },
  { name: "German", code: "de" },
  { name: "French", code: "fr" },
  { name: "Korean", code: "ko" },
  { name: "Javanese", code: "jv" },
  { name: "Italian", code: "it" },
  { name: "Thai", code: "th" },
  { name: "Tamil", code: "ta" },
  { name: "Polish", code: "pl" },
  { name: "Marathi", code: "mr" },
  { name: "Telugu", code: "te" },
  { name: "Turkish", code: "tr" },
  { name: "Urdu", code: "ur" },
  { name: "Ukrainian", code: "uk" },
  { name: "Malaysian", code: "ms" },
  { name: "Persian (Farsi)", code: "fa" },
  { name: "Sunda", code: "su" },
  { name: "Gujarati", code: "gu" },
  { name: "Wu Chinese", code: "wuu" },
  { name: "Kannada", code: "kn" },
  { name: "Min Nan Chinese", code: "nan" },
  { name: "Azerbaijani", code: "az" },
  { name: "Romanian", code: "ro" },
  { name: "Dutch", code: "nl" },
  { name: "Greek", code: "el" },
  { name: "Czech", code: "cs" },
  { name: "Hungarian", code: "hu" },
  { name: "Catalan", code: "ca" },
  { name: "Slovak", code: "sk" },
  { name: "Hebrew", code: "he" },
  { name: "Swedish", code: "sv" },
  { name: "Finnish", code: "fi" },
  { name: "Bulgarian", code: "bg" },
  { name: "Danish", code: "da" },
  { name: "Norwegian Bokmål", code: "nb" },
  { name: "Serbian", code: "sr" },
  { name: "Croatian", code: "hr" },
  { name: "Armenian", code: "hy" },
  { name: "Basque", code: "eu" },
  { name: "Kazakh", code: "kk" },
  { name: "Slovene", code: "sl" },
  { name: "Albanian", code: "sq" },
  { name: "Macedonian", code: "mk" },
  { name: "Belarusian", code: "be" },
  { name: "Georgian", code: "ka" },
  { name: "Sinhala", code: "si" },
  { name: "Malayalam", code: "ml" },
  { name: "Afrikaans", code: "af" },
];

export function getLanguageNameByCode(code: string): string | undefined {
  const language = popularLanguages.find((lang) => lang.code === code);
  return language ? language.name : undefined;
}

export function getLanguageCodeByName(name: string): string | undefined {
  const language = popularLanguages.find((lang) => lang.name === name);
  return language ? language.code : undefined;
}
