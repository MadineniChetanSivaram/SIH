/**
 * Unified Speech Interface Adapter
 * Bridges speech recognition (VoiceController) and text-to-speech output (SpeechOutputManager).
 */

import { VoiceCommandIntent } from '../types';
import { speechOutputManager } from './speechOutputManager';
import { voiceController } from './voiceController';

class SpeechServiceBridge {
  public setPreferences(rate: number, pitch: number) {
    speechOutputManager.setPreferences(rate, pitch);
  }

  public isSpeechSupported(): boolean {
    return speechOutputManager.isAvailable();
  }

  public isRecognitionSupported(): boolean {
    return voiceController.isSupported();
  }

  public startListening() {
    voiceController.activateListening();
  }

  public stopListening() {
    voiceController.stopListening();
  }

  public toggleListening(): boolean {
    if (voiceController.getState() === 'LISTENING') {
      voiceController.stopListening();
      return false;
    } else {
      voiceController.activateListening();
      return true;
    }
  }

  public isCurrentlyListening(): boolean {
    return voiceController.getState() === 'LISTENING';
  }

  public speak(
    text: string, 
    options?: { 
      priority?: 'low' | 'normal' | 'urgent'; 
      dedupKey?: string; 
      cooldownMs?: number;
      isAlert?: boolean;
    }
  ): boolean {
    const p = options?.priority === 'urgent' ? 'CRITICAL' : options?.priority === 'normal' ? 'IMPORTANT' : 'INFORMATIONAL';
    return speechOutputManager.speak(text, {
      priority: p,
      dedupKey: options?.dedupKey,
      cooldownMs: options?.cooldownMs,
      isAlert: options?.isAlert,
    });
  }

  public repeatLastAnnouncement() {
    speechOutputManager.repeatLastAlert();
  }

  public stopSpeaking() {
    speechOutputManager.cancel();
  }

  public parseVoiceCommand(text: string): VoiceCommandIntent {
    return voiceController.parseIntent(text);
  }
}

export const speechService = new SpeechServiceBridge();
