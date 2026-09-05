import { Injectable } from "@angular/core";

type VoiceLang = "en" | "hi";

@Injectable({
  providedIn: "root",
})
export class VoiceNotificationService {
  private readonly enabledKey = "notification_voice_enabled";
  private readonly spokenIdsKey = "spoken_notification_ids";
  private readonly languageKey = "notification_voice_language";

  private enabled = true;
  private language: VoiceLang = "en"; // default English

  private spokenNotificationIds = new Set<string>();

  // OLD: mp3-based playback state. No longer used — kept commented for reference.
  // private currentAudio: HTMLAudioElement | null = null;

  // Currently speaking utterance (TTS based)
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  // NEW: cached list of voices available in this browser, used to pick a
  // female, Indian-English-accented voice for announcements.
  private voices: SpeechSynthesisVoice[] = [];

  // OLD: Type -> audio "group" mapping (payin / payout). Not needed anymore
  // since we now speak a per-type template directly instead of playing a
  // pre-recorded payin/payout mp3.
  // private readonly typeToAudioGroup: Record<string, "payin" | "payout"> = {
  //   BANK_FUND_REJECT: "payin",
  //   UPI_FUND_REJECT: "payin",
  //   CRYPTO_FUND_REJECT: "payin",
  //   PAYOUT_FUND_REJECT: "payout",
  // };

  // OLD: group + language -> filename (files rakhe hain public folder me)
  // private readonly audioFileMap: Record<string, Record<VoiceLang, string>> = {
  //   payin: {
  //     en: "/payineng.mp3",
  //     hi: "/payinhindi.mp3",
  //   },
  //   payout: {
  //     en: "/payouteng.mp3",
  //     hi: "/payouthindi.mp3",
  //   },
  // };

  // NEW: hardcoded message templates per notification type. {amount} and
  // {currency} are filled in dynamically at announce-time from the socket
  // payload (e.g. notification.amount / notification.currency).
  private readonly messageTemplates: Record<string, Record<VoiceLang, string>> =
    {
      BANK_FUND_REJECT: {
        en: "Payin fund rejected. Amount is {amount} {currency}.",
        hi: "पेइन फंड रिजेक्ट हो गया है। अमाउंट है {amount} {currency}।",
      },
      AANI_FUND_REJECT: {
        en: "Payin fund rejected. Amount is {amount} {currency}.",
        hi: "पेइन फंड रिजेक्ट हो गया है। अमाउंट है {amount} {currency}।",
      },
      UPI_FUND_REJECT: {
        en: "UPI fund rejected. Amount is {amount} {currency}.",
        hi: "यूपीआई फंड रिजेक्ट हो गया है। अमाउंट है {amount} {currency}।",
      },
      CRYPTO_FUND_REJECT: {
        en: "Crypto fund rejected. Amount is {amount} {currency}.",
        hi: "क्रिप्टो फंड रिजेक्ट हो गया है। अमाउंट है {amount} {currency}।",
      },
      PAYOUT_FUND_REJECT: {
        en: "Payout fund rejected. Amount is {amount} {currency}.",
        hi: "पेआउट फंड रिजेक्ट हो गया है। अमाउंट है {amount} {currency}।",
      },
    };

  constructor() {
    this.loadSettings();
    this.loadLanguage();
    this.loadSpokenIds();
    this.loadVoices();
  }

  /**
   * Voices load asynchronously in most browsers (Chrome especially), so we
   * cache them once, and again whenever `onvoiceschanged` fires.
   */
  private loadVoices(): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const populate = () => {
      const list = window.speechSynthesis.getVoices();
      if (list && list.length) {
        this.voices = list;
      }
    };

    populate();
    window.speechSynthesis.onvoiceschanged = populate;
  }

  /**
   * Picks the best available voice for a female, Indian-English-accented
   * announcement. Preference order:
   *  1. A voice whose lang is Indian (en-IN / hi-IN as relevant) AND whose
   *     name suggests a female voice (common vendor naming: "female",
   *     "Heera", "Veena", "Priya", "Lekha", "Kalpana", "Neerja", "Raveena",
   *     "Swara").
   *  2. Any Indian-locale voice (en-IN / hi-IN), regardless of gender hint.
   *  3. Any voice whose name suggests female, regardless of locale.
   *  4. Any voice matching the base language ("en" or "hi").
   *  5. null -> browser default voice is used.
   */
  private getPreferredVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
    if (!this.voices.length && "speechSynthesis" in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    if (!this.voices.length) return null;

    const targetLocale = lang === "hi" ? "hi-in" : "en-in";
    const baseLang = lang === "hi" ? "hi" : "en";

    const femaleNameHints = [
      "female",
      "heera",
      "veena",
      "priya",
      "lekha",
      "kalpana",
      "neerja",
      "raveena",
      "swara",
      "zira",
      "samantha",
    ];

    const isIndianLocale = (v: SpeechSynthesisVoice) =>
      v.lang?.toLowerCase() === targetLocale ||
      v.lang?.toLowerCase().startsWith(baseLang + "-in");

    const soundsFemale = (v: SpeechSynthesisVoice) =>
      femaleNameHints.some((hint) => v.name.toLowerCase().includes(hint));

    // 1. Indian locale + female-sounding name
    let match = this.voices.find((v) => isIndianLocale(v) && soundsFemale(v));
    if (match) return match;

    // 2. Any Indian locale voice
    match = this.voices.find((v) => isIndianLocale(v));
    if (match) return match;

    // 3. Any female-sounding voice
    match = this.voices.find((v) => soundsFemale(v));
    if (match) return match;

    // 4. Any voice matching the base language
    match = this.voices.find((v) => v.lang?.toLowerCase().startsWith(baseLang));
    if (match) return match;

    return null;
  }

  /**
   * Main method
   * Notification receive hote hi isi ko call karna hai.
   *
   * Dedup guarantee: for a given notification id, this will only ever
   * speak once — even if the same event arrives twice from the socket —
   * because we add the id to `spokenNotificationIds` BEFORE speaking, and
   * bail out immediately if the id has already been spoken.
   */
  announceNotification(notification: any): void {
    if (!this.enabled) return;
    if (!notification) return;

    const id = String(
      notification.id ||
        notification.notificationId ||
        notification.fundsId ||
        "",
    );

    const type = String(notification.type || "")
      .toUpperCase()
      .trim();

    if (!id || !type) return;

    // Already announced this exact notification -> never speak it again.
    if (this.spokenNotificationIds.has(id)) {
      return;
    }

    const template = this.messageTemplates[type];

    // Sirf configured notification types ke liye announcement.
    if (!template) {
      return;
    }

    // Pehle mark karo so duplicate event se repeat na ho (even if the
    // duplicate arrives while speechSynthesis is still speaking).
    this.spokenNotificationIds.add(id);
    this.saveSpokenIds();

    const text = this.buildMessage(template, notification);
    this.speak(text);
  }

  /**
   * Fills {amount} / {currency} placeholders in the template using the
   * actual values from the socket payload.
   */
  private buildMessage(
    template: Record<VoiceLang, string>,
    notification: any,
  ): string {
    const amount = this.formatAmount(notification.amount);
    const currency =
      notification.currency !== undefined && notification.currency !== null
        ? String(notification.currency)
        : "";

    return template[this.language]
      .replace("{amount}", amount)
      .replace("{currency}", currency);
  }

  private formatAmount(amount: any): string {
    if (amount === null || amount === undefined || amount === "") return "";
    const num = Number(amount);
    if (isNaN(num)) return String(amount);
    // 21.00 -> 21, 21.50 -> 21.5 (avoid reading out unnecessary ".00")
    return num % 1 === 0 ? String(num) : String(parseFloat(num.toFixed(2)));
  }

  /**
   * NEW: dynamic speech using the Web Speech API instead of pre-recorded
   * mp3 files.
   */
  private speak(text: string): void {
    if (!text) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    // Agar pehle se koi announcement bol raha hai to rok do, taaki do
    // announcements overlap na karein.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 1;
    utterance.volume = 1;

    // NEW: force a female, Indian-accented voice when one is available.
    const preferredVoice = this.getPreferredVoice(this.language);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      // Match the utterance lang to the chosen voice's own lang, so the
      // engine doesn't try to reconcile a mismatched lang/voice pair.
      utterance.lang = preferredVoice.lang;
    } else {
      // Fallback: no dedicated Indian/female voice found on this device —
      // nudge the pitch up slightly so the default voice sounds closer to
      // a female voice instead of forcing a mismatched one.
      utterance.pitch = 1.3;
    }

    this.currentUtterance = utterance;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      // Swallow — same as the old audio.play().catch(() => {})
    }
  }

  // OLD: mp3-based audio playback. Replaced by `speak()` above.
  // private playAudio(group: "payin" | "payout"): void {
  //   const filePath = this.audioFileMap[group]?.[this.language];
  //
  //   if (!filePath) return;
  //
  //   if (this.currentAudio) {
  //     this.currentAudio.pause();
  //     this.currentAudio.currentTime = 0;
  //   }
  //
  //   const audio = new Audio(filePath);
  //   audio.volume = 1;
  //   this.currentAudio = audio;
  //
  //   audio.play().catch((err) => {});
  // }

  /**
   * Voice ON / OFF
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem(this.enabledKey, String(enabled));

    if (!enabled) {
      this.stop();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Language toggle (en default, hi optional)
   */
  setLanguage(lang: VoiceLang): void {
    this.language = lang;
    localStorage.setItem(this.languageKey, lang);
  }

  getLanguage(): VoiceLang {
    return this.language;
  }

  /**
   * Currently playing/speaking announcement ko stop karo.
   */
  stop(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;

    // OLD mp3 stop logic:
    // if (this.currentAudio) {
    //   this.currentAudio.pause();
    //   this.currentAudio.currentTime = 0;
    //   this.currentAudio = null;
    // }
  }

  /**
   * Testing ke liye — bolke dikhata hai ek sample payout rejection.
   */
  testVoice(): void {
    const sample = this.buildMessage(
      this.messageTemplates["PAYOUT_FUND_REJECT"],
      { amount: 100, currency: "INR" },
    );
    this.speak(sample);
  }

  private loadSettings(): void {
    const saved = localStorage.getItem(this.enabledKey);
    this.enabled = saved !== "false";
  }

  private loadLanguage(): void {
    const saved = localStorage.getItem(this.languageKey);
    this.language = saved === "hi" ? "hi" : "en"; // default english
  }

  private loadSpokenIds(): void {
    try {
      const saved = localStorage.getItem(this.spokenIdsKey);
      if (!saved) return;

      const ids = JSON.parse(saved);
      if (Array.isArray(ids)) {
        this.spokenNotificationIds = new Set(ids.map((id) => String(id)));
      }
    } catch (error) {}
  }

  private saveSpokenIds(): void {
    try {
      localStorage.setItem(
        this.spokenIdsKey,
        JSON.stringify(Array.from(this.spokenNotificationIds)),
      );
    } catch (error) {}
  }

  // OLD: mp3-based "payin off" status announcement. Replaced with TTS below.
  // private readonly payinStatusAudioMap: Record<VoiceLang, string> = {
  //   en: "/payinstatuseng.mp3",
  //   hi: "/payinstatushindi.mp3",
  // };
  // announcePayinOffStatus(): void {
  //   if (!this.enabled) return;
  //
  //   const filePath = this.payinStatusAudioMap[this.language];
  //   if (!filePath) return;
  //
  //   if (this.currentAudio) {
  //     this.currentAudio.pause();
  //     this.currentAudio.currentTime = 0;
  //   }
  //
  //   const audio = new Audio(filePath);
  //   audio.volume = 1;
  //   this.currentAudio = audio;
  //
  //   audio.play().catch((err) => {});
  // }

  private readonly payinOffStatusText: Record<VoiceLang, string> = {
    en: "Payin has been turned off.",
    hi: "पेइन बंद कर दिया गया है।",
  };

  announcePayinOffStatus(): void {
    if (!this.enabled) return;
    this.speak(this.payinOffStatusText[this.language]);
  }
}
