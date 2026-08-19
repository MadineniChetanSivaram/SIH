/**
 * Web Audio API Spatial Earcon & Sonar Synthesizer
 * Provides directional audio cues (stereo panning + proximity pitch)
 * and tactile-auditory earcons for blind navigation.
 */

class AudioSpatialSynth {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  /**
   * Play an accessible touch/button feedback sound
   */
  public playClickSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio context might not be allowed before user interaction
    }
  }

  /**
   * Directional Sonar Ping
   * @param angleDegrees -90 (left) to +90 (right), 0 is ahead
   * @param distanceMeters 0.5 to 10+ meters
   * @param severity 'info' | 'warning' | 'critical'
   */
  public playSpatialCue(angleDegrees: number, distanceMeters: number, severity: 'info' | 'warning' | 'critical' | 'clear' = 'warning') {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const panVal = Math.max(-1, Math.min(1, angleDegrees / 60)); // normalized -1 to +1

      // Frequency scales higher for closer obstacles (sonar effect)
      const baseFreq = severity === 'critical' ? 880 : severity === 'warning' ? 580 : 350;
      const proximityMultiplier = Math.max(1, (5 - Math.min(5, distanceMeters)) * 0.35 + 1);
      const targetFreq = baseFreq * proximityMultiplier;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = severity === 'critical' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(targetFreq, ctx.currentTime);

      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panner) {
        panner.pan.setValueAtTime(panVal, ctx.currentTime);
      }

      const duration = severity === 'critical' ? 0.22 : 0.15;
      const volume = severity === 'critical' ? 0.25 : 0.15;

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      if (panner) {
        osc.connect(panner);
        panner.connect(gain);
      } else {
        osc.connect(gain);
      }
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);

      // Repeat if critical
      if (severity === 'critical') {
        setTimeout(() => {
          if (this.isMuted) return;
          try {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(targetFreq * 1.15, ctx.currentTime);
            gain2.gain.setValueAtTime(volume * 1.1, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
            if (panner) {
              osc2.connect(panner);
              panner.connect(gain2);
            } else {
              osc2.connect(gain2);
            }
            gain2.connect(ctx.destination);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.18);
          } catch {
            // Ignored
          }
        }, 120);
      }
    } catch {
      // Web Audio fallback
    }
  }

  /**
   * Play Distinct Risk Classification Beeps for Blind Navigation:
   * - High-Level Risk: 3 rapid, sharp, high-frequency warning beeps (danger / obstacle in path / imminent collision)
   * - Low-Level Risk: 1 gentle, soft, low-frequency ping (minor situational awareness / side object / landmark)
   */
  public playRiskBeep(level: 'high' | 'low', angleDegrees: number = 0) {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const panVal = Math.max(-1, Math.min(1, angleDegrees / 60)); // -1 (left) to +1 (right)

      if (level === 'high') {
        // High-Risk Alert: 3 fast, urgent, rising warning beeps
        const frequencies = [950, 1150, 1380];
        const pulseLen = 0.055;
        const gap = 0.035;

        frequencies.forEach((freq, idx) => {
          const startTime = now + idx * (pulseLen + gap);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, startTime);

          // Sharp attack, quick decay
          gain.gain.setValueAtTime(0.28, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + pulseLen);

          if (panner) {
            panner.pan.setValueAtTime(panVal, startTime);
            osc.connect(panner);
            panner.connect(gain);
          } else {
            osc.connect(gain);
          }

          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + pulseLen);
        });
      } else {
        // Low-Risk Alert: 1 gentle, soft, warm sine ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);

        // Soft, non-intrusive volume
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        if (panner) {
          panner.pan.setValueAtTime(panVal, now);
          osc.connect(panner);
          panner.connect(gain);
        } else {
          osc.connect(gain);
        }

        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      }
    } catch {
      // Audio context fallback
    }
  }

  public playHighRiskBeep(angleDegrees: number = 0) {
    this.playRiskBeep('high', angleDegrees);
  }

  public playLowRiskBeep(angleDegrees: number = 0) {
    this.playRiskBeep('low', angleDegrees);
  }

  /**
   * Melodic notification chime for system states (e.g. Monitoring started, place learned)
   */
  public playStateChime(type: 'success' | 'alert' | 'mode_change' | 'ping') {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      if (type === 'success') {
        // Upward triad chime (C5 -> E5 -> G5)
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.12, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.15);
        });
      } else if (type === 'alert') {
        // Downward caution chime (A4 -> F4)
        [440, 349.23].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.15, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.2);
        });
      } else if (type === 'mode_change') {
        // 2-tone toggle chime
        [440, 554.37].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0.1, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.12);
        });
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Subtle soft percussive footstep sound for odometry steps
   */
  public playFootstepSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }
}

export const audioSynth = new AudioSpatialSynth();
