/**
 * CameraFrameService
 * Provides instant live camera frame capture for Multimodal Visual AI queries and spatial perception.
 */

type FrameCaptureFn = () => string | null;

class CameraFrameService {
  private captureFn: FrameCaptureFn | null = null;
  private isStreamActive: boolean = false;
  private lastCapturedFrame: string | null = null;

  public registerCaptureProvider(fn: FrameCaptureFn) {
    this.captureFn = fn;
  }

  public unregisterCaptureProvider() {
    this.captureFn = null;
  }

  public setStreamActive(active: boolean) {
    this.isStreamActive = active;
  }

  public isAvailable(): boolean {
    return this.isStreamActive || !!this.captureFn;
  }

  public setLastFrame(base64: string) {
    this.lastCapturedFrame = base64;
  }

  public captureFrame(): string | null {
    if (this.captureFn) {
      try {
        const frame = this.captureFn();
        if (frame) {
          this.lastCapturedFrame = frame;
          return frame;
        }
      } catch (err) {
        console.warn('Frame capture provider error:', err);
      }
    }
    return this.lastCapturedFrame;
  }
}

export const cameraFrameService = new CameraFrameService();
