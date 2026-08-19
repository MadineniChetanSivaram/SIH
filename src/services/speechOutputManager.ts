/**
 * SpeechOutputManager
 * Dedicated Text-to-Speech Output Service with Priority Queuing, Deduplication,
 * Preemption of Informational Messages on Critical Alerts, and Cooldown Control.
 */

import { SpeechPriority } from '../types';

export interface SpeakOptions {
  priority?: SpeechPriority;
  dedupKey?: string;
  cooldownMs?: number;
  isAlert?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

interface QueuedUtterance {
  id: string;
  text: string;
  priority: SpeechPriority;
  dedupKey?: string;
  isAlert?: boolean;
  timestamp: number;
}

const PRIORITY_RANK: Record<SpeechPriority, number> = {
  CRITICAL: 4,
  WARNING: 3,
  IMPORTANT: 2,
  INFORMATIONAL: 1,
};

type SpeechActivityListener = (isSpeaking: boolean) => void;

export class SpeechOutputManager {
  private synth: SpeechSynthesis | null = null;
  private currentPriority: SpeechPriority = 'INFORMATIONAL';
  private isSpeaking: boolean = false;
  private queue: QueuedUtterance[] = [];
  private alertCooldowns: Map<string, number> = new Map();
  private lastAlertText: string = '';
  private lastSpokenText: string = '';
  private rate: number = 1.05;
  private pitch: number = 1.0;
  private activityListeners: Set<SpeechActivityListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public subscribeActivity(listener: SpeechActivityListener): () => void {
    this.activityListeners.add(listener);
    listener(this.isSpeaking);
    return () => this.activityListeners.delete(listener);
  }

  private notifyActivity(speaking: boolean) {
    this.isSpeaking = speaking;
    this.activityListeners.forEach(fn => fn(speaking));
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking || (this.synth ? this.synth.speaking : false);
  }

  public setPreferences(rate: number, pitch: number) {
    this.rate = Math.max(0.7, Math.min(1.8, rate));
    this.pitch = Math.max(0.8, Math.min(1.3, pitch));
  }

  public isAvailable(): boolean {
    return !!this.synth;
  }

  /**
   * Speak text with safety priority
   */
  public speak(text: string, options?: SpeakOptions): boolean {
    const cleanText = text.trim();
    if (!cleanText) return false;

    const priority: SpeechPriority = options?.priority || 'INFORMATIONAL';
    const now = Date.now();

    // 1. Cooldown & Deduplication check
    if (options?.dedupKey) {
      const lastSpoken = this.alertCooldowns.get(options.dedupKey) || 0;
      const cooldown = options.cooldownMs ?? (priority === 'CRITICAL' ? 3500 : 7000);
      if (now - lastSpoken < cooldown && priority !== 'CRITICAL') {
        return false; // Suppress duplicate notification
      }
      this.alertCooldowns.set(options.dedupKey, now);
    }

    if (!this.synth) {
      console.log(`[TTS Offline / ${priority}]`, cleanText);
      this.lastSpokenText = cleanText;
      if (options?.isAlert) this.lastAlertText = cleanText;
      return true;
    }

    // 2. Preemption for Critical and Warning priority
    const priorityVal = PRIORITY_RANK[priority];
    const currentVal = PRIORITY_RANK[this.currentPriority];

    if (priorityVal >= 3 && (priorityVal > currentVal || this.isSpeaking)) {
      // High priority alert interrupts lower priority speech immediately
      try {
        this.synth.cancel();
        this.queue = []; // clear lower priority buffer
      } catch {}
    }

    this.lastSpokenText = cleanText;
    if (options?.isAlert || priority === 'CRITICAL' || priority === 'WARNING') {
      this.lastAlertText = cleanText;
    }

    // 3. Create speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    // Pick clearest available English voice
    try {
      const voices = this.synth.getVoices();
      const preferred = voices.find(
        v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Arthur')) && v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en'));

      if (preferred) {
        utterance.voice = preferred;
      }
    } catch {}

    utterance.onstart = () => {
      this.currentPriority = priority;
      this.notifyActivity(true);
      options?.onStart?.();
    };

    utterance.onend = () => {
      this.currentPriority = 'INFORMATIONAL';
      this.notifyActivity(false);
      options?.onEnd?.();
      this.processQueue();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      this.currentPriority = 'INFORMATIONAL';
      this.notifyActivity(false);
      options?.onEnd?.();
      this.processQueue();
    };

    try {
      this.synth.speak(utterance);
      return true;
    } catch (e) {
      console.warn('Speech synthesis speak exception:', e);
      return false;
    }
  }

  private processQueue() {
    if (!this.synth || this.queue.length === 0 || this.isSpeaking) return;
    const next = this.queue.shift();
    if (next) {
      this.speak(next.text, { priority: next.priority, isAlert: next.isAlert });
    }
  }

  public repeatLastAlert() {
    if (this.lastAlertText) {
      this.speak(`Repeating alert: ${this.lastAlertText}`, { priority: 'CRITICAL' });
    } else if (this.lastSpokenText) {
      this.speak(`Repeating: ${this.lastSpokenText}`, { priority: 'IMPORTANT' });
    } else {
      this.speak('No recent alerts to repeat.', { priority: 'INFORMATIONAL' });
    }
  }

  public cancel() {
    if (this.synth) {
      try {
        this.synth.cancel();
        this.queue = [];
        this.currentPriority = 'INFORMATIONAL';
        this.notifyActivity(false);
      } catch {}
    }
  }

  public getLastAlert(): string {
    return this.lastAlertText;
  }

  public getLastSpoken(): string {
    return this.lastSpokenText;
  }
}

export const speechOutputManager = new SpeechOutputManager();
