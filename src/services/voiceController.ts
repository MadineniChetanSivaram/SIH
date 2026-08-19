/**
 * VoiceController
 * Dedicated Hands-Free Continuous Speech Recognition & Voice Interaction Engine for SpatialEye
 * 
 * Features:
 * 1. Automatic Hands-Free Continuous Listening Mode on app launch (no buttons required).
 * 2. Echo-cancellation synchronization: pauses listening during TTS output, resumes automatically when speech finishes.
 * 3. Silent loop renewal: quietly cycles listening state without disruptive error prompts.
 * 4. Dual-Engine Architecture: Native Web Speech API with seamless MediaRecorder fallback.
 * 5. Robust parser for colloquial spoken queries.
 */

import { VoiceCommandIntent, VoiceState } from '../types';
import { speechOutputManager } from './speechOutputManager';
import { audioSynth } from './audioSpatialSynth';
import { hapticsService } from './hapticsService';

type StateListener = (state: VoiceState, transcript?: string) => void;
type CommandListener = (intent: VoiceCommandIntent) => void;

export class VoiceController {
  private state: VoiceState = 'IDLE';
  private recognition: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private timeoutTimer: any = null;
  private restartTimer: any = null;
  private stateListeners: Set<StateListener> = new Set();
  private commandListeners: Set<CommandListener> = new Set();
  private currentTranscript: string = '';
  private isSpeakingTTS: boolean = false;
  private isFallbackRecording: boolean = false;
  private fallbackTimeout: any = null;
  private continuousHandsFree: boolean = true;
  private isInitialized: boolean = false;

  constructor() {
    this.initRecognition();
    this.setupTTSSynchronization();
    this.setupGlobalActivationListener();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('Web Speech API not supported; using MediaRecorder engine.');
      return;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        if (this.isSpeakingTTS) {
          try { this.recognition.abort(); } catch {}
          return;
        }
        this.setState('LISTENING');
        this.clearTimers();
        // 8-second timeout for spoken phrase
        this.timeoutTimer = setTimeout(() => {
          if (this.state === 'LISTENING') {
            this.handleTimeout();
          }
        }, 8000);
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          this.currentTranscript = interim;
          this.notifyState(interim);
        }

        if (final.trim()) {
          this.currentTranscript = final.trim();
          this.clearTimers();
          this.setState('PROCESSING', this.currentTranscript);
          this.processTranscript(this.currentTranscript);
        }
      };

      this.recognition.onerror = (e: any) => {
        this.clearTimers();
        if (e.error === 'no-speech') {
          this.handleTimeout();
        } else if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'network') {
          this.startMediaRecorderFallback();
        } else {
          this.handleTimeout();
        }
      };

      this.recognition.onend = () => {
        this.clearTimers();
        if (this.state === 'LISTENING') {
          this.handleTimeout();
        } else if (this.continuousHandsFree && !this.isSpeakingTTS && this.state === 'IDLE') {
          this.scheduleContinuousRestart(400);
        }
      };
    } catch (err) {
      console.warn('SpeechRecognition setup error:', err);
    }
  }

  /**
   * Listen to TTS activity to pause microphone while robot speaks
   */
  private setupTTSSynchronization() {
    speechOutputManager.subscribeActivity((speaking) => {
      this.isSpeakingTTS = speaking;
      if (speaking) {
        // Pause listening so we don't recognize our own voice
        if (this.state === 'LISTENING') {
          this.stopListening(false);
        }
      } else {
        // Resume continuous listening once speaking ends
        if (this.continuousHandsFree) {
          this.scheduleContinuousRestart(500);
        }
      }
    });
  }

  /**
   * Global browser unlocker: guarantees continuous voice starts on first user touch/key
   */
  private setupGlobalActivationListener() {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      if (!this.isInitialized) {
        this.isInitialized = true;
        this.startContinuousListening();
      }
    };

    window.addEventListener('pointerdown', unlockHandler, { once: true, passive: true });
    window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
    window.addEventListener('touchstart', unlockHandler, { once: true, passive: true });
  }

  private scheduleContinuousRestart(delayMs: number = 500) {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (this.continuousHandsFree && !this.isSpeakingTTS && this.state !== 'LISTENING' && this.state !== 'PROCESSING') {
        this.startListeningSilently();
      }
    }, delayMs);
  }

  private async startMediaRecorderFallback() {
    if (this.isFallbackRecording || this.isSpeakingTTS) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      const recorder = new MediaRecorder(stream);
      this.mediaRecorder = recorder;
      this.isFallbackRecording = true;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        this.isFallbackRecording = false;
        const audioBlob = new Blob(this.audioChunks, { type: recorder.mimeType || 'audio/webm' });
        await this.sendAudioForServerTranscription(audioBlob);
      };

      recorder.start();
      this.setState('LISTENING');

      this.fallbackTimeout = setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          this.setState('PROCESSING');
        }
      }, 4000);
    } catch (err: any) {
      console.warn('Fallback recorder error:', err);
      if (this.continuousHandsFree) {
        this.scheduleContinuousRestart(2000);
      }
    }
  }

  private async sendAudioForServerTranscription(blob: Blob) {
    this.setState('PROCESSING');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res = await fetch('/api/spatial/transcribe-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64, mimeType: blob.type }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.intent) {
            const transcript = json.intent.transcript || '';
            this.currentTranscript = transcript;
            this.setState('COMMAND_RECOGNIZED', transcript);
            audioSynth.playStateChime('success');
            hapticsService.trigger('info');

            const intent: VoiceCommandIntent = {
              action: json.intent.action || 'UNKNOWN',
              targetObject: json.intent.targetObject,
              rawQuery: transcript,
            };

            this.commandListeners.forEach((listener) => listener(intent));
            setTimeout(() => {
              this.setState('IDLE');
              if (this.continuousHandsFree) this.scheduleContinuousRestart(600);
            }, 1200);
            return;
          }
        }
        this.handleTimeout();
      };
    } catch (err) {
      this.handleTimeout();
    }
  }

  public isSupported(): boolean {
    return !!this.recognition || !!(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia);
  }

  public getState(): VoiceState {
    return this.state;
  }

  public getTranscript(): string {
    return this.currentTranscript;
  }

  public subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state, this.currentTranscript);
    return () => this.stateListeners.delete(listener);
  }

  public onCommand(listener: CommandListener): () => void {
    this.commandListeners.add(listener);
    return () => this.commandListeners.delete(listener);
  }

  private setState(newState: VoiceState, transcript?: string) {
    this.state = newState;
    if (transcript !== undefined) {
      this.currentTranscript = transcript;
    }
    this.notifyState();
  }

  private notifyState(transcript?: string) {
    const text = transcript ?? this.currentTranscript;
    this.stateListeners.forEach((fn) => fn(this.state, text));
  }

  private clearTimers() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.fallbackTimeout) {
      clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = null;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  public startContinuousListening() {
    this.continuousHandsFree = true;
    this.startListeningSilently();
  }

  public activateListening() {
    this.continuousHandsFree = true;
    this.currentTranscript = '';
    audioSynth.playStateChime('ping');
    hapticsService.trigger('light');
    this.startListeningSilently();
  }

  private startListeningSilently() {
    if (this.isSpeakingTTS || this.state === 'LISTENING') return;

    if (this.recognition) {
      try {
        this.recognition.start();
        return;
      } catch (e) {
        // Recognition might already be running or need restart
      }
    }

    this.startMediaRecorderFallback();
  }

  public stopListening(disableContinuous: boolean = true) {
    if (disableContinuous) {
      this.continuousHandsFree = false;
    }
    this.clearTimers();
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
    }
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try { this.mediaRecorder.stop(); } catch {}
    }
    this.setState('IDLE');
  }

  public executeTextCommand(text: string) {
    this.currentTranscript = text;
    this.setState('PROCESSING', text);
    this.processTranscript(text);
  }

  private processTranscript(text: string) {
    const intent = this.parseIntent(text);

    this.setState('COMMAND_RECOGNIZED', text);
    audioSynth.playStateChime('success');
    hapticsService.trigger('info');

    // Notify registered listeners
    this.commandListeners.forEach((listener) => listener(intent));

    setTimeout(() => {
      if (this.state === 'COMMAND_RECOGNIZED') {
        this.setState('IDLE');
        if (this.continuousHandsFree) {
          this.scheduleContinuousRestart(600);
        }
      }
    }, 1200);
  }

  private handleTimeout() {
    this.setState('IDLE');
    if (this.continuousHandsFree && !this.isSpeakingTTS) {
      // Quietly restart continuous listening in hands-free mode
      this.scheduleContinuousRestart(300);
    }
  }

  public parseIntent(rawText: string): VoiceCommandIntent {
    const raw = rawText.toLowerCase().trim();

    // 0. TRAIN ENVIRONMENT & 360 DEGREE CALIBRATION
    if (
      raw.includes('train') ||
      raw.includes('calibrate') ||
      raw.includes('360') ||
      raw.includes('map space') ||
      raw.includes('map room') ||
      raw.includes('map environment') ||
      raw.includes('map the space') ||
      raw.includes('map the room') ||
      raw.includes('learn room') ||
      raw.includes('learn space') ||
      raw.includes('scan room') ||
      raw === 'train' ||
      raw === 'calibrate'
    ) {
      return { action: 'TRAIN_ENVIRONMENT', rawQuery: rawText };
    }

    // 1. START MONITORING
    if (
      raw.includes('start monitor') ||
      raw.includes('begin monitor') ||
      raw.includes('start scan') ||
      raw.includes('start watch') ||
      raw.includes('start observing') ||
      raw.includes('monitor on') ||
      raw === 'start' ||
      raw === 'scan' ||
      raw === 'monitor' ||
      raw === 'begin'
    ) {
      return { action: 'START_MONITORING', rawQuery: rawText };
    }

    // 2. STOP MONITORING
    if (
      raw.includes('stop monitor') ||
      raw.includes('pause monitor') ||
      raw.includes('end monitor') ||
      raw.includes('monitor off') ||
      raw.includes('stop scan') ||
      raw === 'stop' ||
      raw === 'pause' ||
      raw === 'halt' ||
      raw === 'end'
    ) {
      return { action: 'STOP_MONITORING', rawQuery: rawText };
    }

    // 3. REMEMBER / ANCHOR SPACE
    if (
      raw.includes('remember') ||
      raw.includes('learn environment') ||
      raw.includes('save environment') ||
      raw.includes('anchor') ||
      raw.includes('learn this space') ||
      raw.includes('memorize') ||
      raw.includes('create memory') ||
      raw.includes('save space')
    ) {
      return { action: 'REMEMBER_ENVIRONMENT', rawQuery: rawText };
    }

    // 4. WHAT CHANGED
    if (
      raw.includes('what changed') ||
      raw.includes('what has changed') ||
      raw.includes("what's changed") ||
      raw.includes('any change') ||
      raw.includes('check change') ||
      raw.includes('difference') ||
      raw.includes('did anything move') ||
      raw.includes('is anything moved') ||
      raw.includes('what moved')
    ) {
      return { action: 'WHAT_CHANGED', rawQuery: rawText };
    }

    // 5. WHERE AM I
    if (
      raw.includes('where am i') ||
      raw.includes('which environment') ||
      raw.includes('what environment') ||
      raw.includes('identify place') ||
      raw.includes('what space is this') ||
      raw.includes('location')
    ) {
      return { action: 'WHERE_AM_I', rawQuery: rawText };
    }

    // 6. WHAT IS AHEAD / CLEAR PATH / DISTANCE TO OBSTACLE
    if (
      raw.includes('what is ahead') ||
      raw.includes("what's ahead") ||
      raw.includes('look ahead') ||
      raw.includes('in front') ||
      raw.includes('path clear') ||
      raw.includes('is my path clear') ||
      raw.includes('obstacles ahead') ||
      raw.includes('what is in front') ||
      raw.includes('what are the obstacles') ||
      raw.includes('obstacle') ||
      raw.includes('distance') ||
      raw.includes('how far') ||
      raw.includes('how close') ||
      raw.includes('how many steps') ||
      raw.includes('measure distance') ||
      raw === 'ahead'
    ) {
      return { action: 'WHAT_IS_AHEAD', rawQuery: rawText };
    }

    // 7. DESCRIBE SURROUNDINGS
    if (
      raw.includes('describe surroundings') ||
      raw.includes('describe room') ||
      raw.includes('describe area') ||
      raw.includes('what do you see') ||
      raw.includes('look around') ||
      raw.includes('tell me what you see') ||
      raw.includes('describe space') ||
      raw.includes('describe')
    ) {
      return { action: 'DESCRIBE_SURROUNDINGS', rawQuery: rawText };
    }

    // 8. REPEAT
    if (
      raw.includes('repeat') ||
      raw.includes('say that again') ||
      raw.includes('say again') ||
      raw.includes('pardon') ||
      raw.includes('what was that')
    ) {
      return { action: 'REPEAT_ALERT', rawQuery: rawText };
    }

    // 9. FORGET
    if (
      raw.includes('forget environment') ||
      raw.includes('delete environment') ||
      raw.includes('erase memory') ||
      raw.includes('delete space')
    ) {
      return { action: 'FORGET_ENVIRONMENT', rawQuery: rawText };
    }

    // 10. FIND SPECIFIC OBJECT
    if (
      raw.includes('find') ||
      raw.includes('where is the') ||
      raw.includes('where is my') ||
      raw.includes('locate')
    ) {
      const match = raw.match(/(?:where is the|find the|where is my|locate the|find)\s+([a-zA-Z0-9\s]+)/i);
      const target = match ? match[1].trim() : 'object';
      return { action: 'FIND_OBJECT', targetObject: target, rawQuery: rawText };
    }

    // 11. AUDIO MUTE / UNMUTE
    if (
      raw.includes('mute') ||
      raw.includes('unmute') ||
      raw.includes('silence') ||
      raw.includes('sound off') ||
      raw.includes('sound on') ||
      raw.includes('audio off') ||
      raw.includes('audio on') ||
      raw.includes('quiet')
    ) {
      return { action: 'TOGGLE_MUTE', rawQuery: rawText };
    }

    // 12. SPEECH SPEED CONTROLS
    if (
      raw.includes('faster') ||
      raw.includes('speed up') ||
      raw.includes('speak faster') ||
      raw.includes('quick voice')
    ) {
      return { action: 'SPEED_UP_SPEECH', rawQuery: rawText };
    }

    if (
      raw.includes('slower') ||
      raw.includes('slow down') ||
      raw.includes('speak slower') ||
      raw.includes('slow speech')
    ) {
      return { action: 'SLOW_DOWN_SPEECH', rawQuery: rawText };
    }

    // 13. SCREEN CURTAIN / PRIVACY
    if (
      raw.includes('curtain') ||
      raw.includes('privacy') ||
      raw.includes('black screen') ||
      raw.includes('turn off screen') ||
      raw.includes('turn on screen') ||
      raw.includes('hide screen')
    ) {
      return { action: 'TOGGLE_SCREEN_CURTAIN', rawQuery: rawText };
    }

    // 14. HIGH CONTRAST
    if (
      raw.includes('contrast') ||
      raw.includes('invert color') ||
      raw.includes('high contrast')
    ) {
      return { action: 'TOGGLE_HIGH_CONTRAST', rawQuery: rawText };
    }

    // 15. HAPTICS / VIBRATION
    if (
      raw.includes('vibration') ||
      raw.includes('vibrate') ||
      raw.includes('haptic')
    ) {
      return { action: 'TOGGLE_HAPTICS', rawQuery: rawText };
    }

    // 16. SYSTEM STATUS
    if (
      raw.includes('status') ||
      raw.includes('battery') ||
      raw.includes('diagnostics') ||
      raw.includes('state')
    ) {
      return { action: 'SYSTEM_STATUS', rawQuery: rawText };
    }

    // 17. VIEW NAVIGATION
    if (raw.includes('monitor') || raw.includes('home view')) {
      return { action: 'NAVIGATE_VIEW', targetView: 'monitor', rawQuery: rawText };
    }
    if (raw.includes('history') || raw.includes('past change') || raw.includes('log')) {
      return { action: 'NAVIGATE_VIEW', targetView: 'changes', rawQuery: rawText };
    }
    if (raw.includes('map') || raw.includes('graph') || raw.includes('spatial view')) {
      return { action: 'NAVIGATE_VIEW', targetView: 'graph', rawQuery: rawText };
    }
    if (raw.includes('settings') || raw.includes('preferences') || raw.includes('configure')) {
      return { action: 'NAVIGATE_VIEW', targetView: 'settings', rawQuery: rawText };
    }

    // 18. HELP
    if (
      raw === 'help' ||
      raw === 'commands' ||
      raw === 'what can i say' ||
      raw === 'options'
    ) {
      return { action: 'HELP', rawQuery: rawText };
    }

    // 19. ALL OTHER NATURAL VOICE QUERIES, VISUAL QUESTIONS, SCENE INQUIRIES, OR OPEN REQUESTS
    return { action: 'NATURAL_QUERY', rawQuery: rawText };
  }
}

export const voiceController = new VoiceController();
