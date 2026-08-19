/**
 * Haptic Vibration Service for Spatial Navigation Warnings
 * Uses navigator.vibrate when available, with fallback event dispatching
 */

export type HapticType = 'light' | 'info' | 'warning' | 'critical' | 'tap' | 'sonar';

class HapticsService {
  private enabled: boolean = true;
  private listeners: Array<(type: HapticType, pattern: number[]) => void> = [];

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public onHapticEvent(callback: (type: HapticType, pattern: number[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public trigger(type: HapticType) {
    if (!this.enabled) return;

    let pattern: number[] = [50];
    switch (type) {
      case 'tap':
        pattern = [30];
        break;
      case 'light':
      case 'info':
        pattern = [80];
        break;
      case 'sonar':
        pattern = [40, 30, 40];
        break;
      case 'warning':
        pattern = [120, 70, 140];
        break;
      case 'critical':
        pattern = [260, 60, 260, 60, 350];
        break;
    }

    // Call native navigator.vibrate if supported
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe catch if restricted by browser permissions
      }
    }

    // Dispatch to registered UI listeners for visual tactile pulsation
    this.listeners.forEach(cb => cb(type, pattern));
  }
}

export const hapticsService = new HapticsService();
