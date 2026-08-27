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

  private currentAudio: HTMLAudioElement | null = null;

  // Type -> audio "group" mapping (payin / payout)
  private readonly typeToAudioGroup: Record<string, "payin" | "payout"> = {
    BANK_FUND_REJECT: "payin",
    UPI_FUND_REJECT: "payin",
    CRYPTO_FUND_REJECT: "payin",
    PAYOUT_FUND_REJECT: "payout",
  };

  // group + language -> filename (files rakhe hain public folder me)
  private readonly audioFileMap: Record<string, Record<VoiceLang, string>> = {
    payin: {
      en: "/payineng.mp3",
      hi: "/payinhindi.mp3",
    },
    payout: {
      en: "/payouteng.mp3",
      hi: "/payouthindi.mp3",
    },
  };

  constructor() {
    this.loadSettings();
    this.loadLanguage();
    this.loadSpokenIds();
  }

  /**
   * Main method
   * Notification receive hote hi isi ko call karna hai
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

    if (this.spokenNotificationIds.has(id)) {
      return;
    }

    const group = this.typeToAudioGroup[type];

    // Sirf configured notification types ke liye audio
    if (!group) {
      return;
    }

    // Pehle mark karo so duplicate event se repeat na ho
    this.spokenNotificationIds.add(id);
    this.saveSpokenIds();

    this.playAudio(group);
  }

  /**
   * Actual audio file play call
   */
  private playAudio(group: "payin" | "payout"): void {
    const filePath = this.audioFileMap[group]?.[this.language];

    if (!filePath) return;

    // Agar pehle se koi audio baj raha hai to rok do
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    const audio = new Audio(filePath);
    audio.volume = 1;
    this.currentAudio = audio;

    audio.play().catch((err) => {
      console.error("Voice notification audio play failed:", err);
    });
  }

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
   * Currently playing audio stop
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Testing ke liye
   */
  testVoice(): void {
    this.playAudio("payin");
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
  private readonly payinStatusAudioMap: Record<VoiceLang, string> = {
    en: "/payinstatuseng.mp3",
    hi: "/payinstatushindi.mp3",
  };
  announcePayinOffStatus(): void {
    if (!this.enabled) return;

    const filePath = this.payinStatusAudioMap[this.language];
    if (!filePath) return;

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    const audio = new Audio(filePath);
    audio.volume = 1;
    this.currentAudio = audio;

    audio.play().catch((err) => {
      console.error("Payin status audio play failed:", err);
    });
  }
}
