import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class VoiceNotificationService {
  private readonly enabledKey = "notification_voice_enabled";
  private readonly spokenIdsKey = "spoken_notification_ids";

  private enabled = true;

  private spokenNotificationIds = new Set<string>();

  private readonly voiceMessages: Record<string, string> = {
    BANK_FUND_REJECT: ". A bank fund has been rejected. .",

    UPI_FUND_REJECT: ". A U P I fund has been rejected. .",

    PAYOUT_FUND_REJECT: ". A payout fund has been rejected. .",

    CRYPTO_FUND_REJECT: ". A crypto fund has been rejected..",
  };

  constructor() {
    this.loadSettings();
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

    // Already spoken -> dobara nahi bolega
    if (this.spokenNotificationIds.has(id)) {
      return;
    }

    const message = this.voiceMessages[type];

    // Sirf configured notification types ke liye voice
    if (!message) {
      return;
    }

    // Pehle mark karo so duplicate event se repeat na ho
    this.spokenNotificationIds.add(id);
    this.saveSpokenIds();

    this.speak(message);
  }

  /**
   * Actual browser speaker call
   */
  private speak(message: string): void {
    if (!("speechSynthesis" in window)) {
      console.warn("Speech synthesis is not supported");
      return;
    }

    const synth = window.speechSynthesis;

    const speakWithFemaleVoice = () => {
      const voices = synth.getVoices();

      // Female / Indian-English voice ko prefer karo
      const femaleVoice =
        voices.find((v) => /female/i.test(v.name) && /en-IN/i.test(v.lang)) ||
        voices.find((v) => /female/i.test(v.name)) ||
        voices.find((v) => /en-IN/i.test(v.lang)) ||
        voices.find((v) => /en-US/i.test(v.lang));

      const utterance = new SpeechSynthesisUtterance(message);

      utterance.lang = femaleVoice?.lang || "en-IN";
      utterance.voice = femaleVoice || null;
      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      synth.cancel();
      synth.speak(utterance);
    };

    // Chrome me voices kabhi async load hoti hain
    const voices = synth.getVoices();

    if (voices.length > 0) {
      speakWithFemaleVoice();
    } else {
      synth.onvoiceschanged = () => {
        synth.onvoiceschanged = null;
        speakWithFemaleVoice();
      };
    }
  }

  /**
   * Voice ON / OFF
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    localStorage.setItem(this.enabledKey, String(enabled));

    if (!enabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Currently speaking voice stop
   */
  stop(): void {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Testing ke liye
   */
  testVoice(): void {
    this.speak("Voice notification system is active.");
  }

  private loadSettings(): void {
    const saved = localStorage.getItem(this.enabledKey);

    this.enabled = saved !== "false";
  }

  private loadSpokenIds(): void {
    try {
      const saved = localStorage.getItem(this.spokenIdsKey);

      if (!saved) return;

      const ids = JSON.parse(saved);

      if (Array.isArray(ids)) {
        this.spokenNotificationIds = new Set(ids.map((id) => String(id)));
      }
    } catch (error) {
      console.error("Failed to load spoken notification IDs", error);
    }
  }

  private saveSpokenIds(): void {
    try {
      localStorage.setItem(
        this.spokenIdsKey,
        JSON.stringify(Array.from(this.spokenNotificationIds)),
      );
    } catch (error) {
      console.error("Failed to save spoken notification IDs", error);
    }
  }
}
