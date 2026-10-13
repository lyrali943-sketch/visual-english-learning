/**
 * Microphone recording service using MediaRecorder API
 * Handles permission, recording, and playback
 */

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
  isSupported: boolean;
}

export interface RecordingResult {
  blob: Blob;
  duration: number;
  url: string;
}

export class RecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private pauseTime: number = 0;
  private timerInterval: number | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationFrame: number | null = null;

  state: RecorderState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
    isSupported: true,
  };

  onStateChange: ((state: RecorderState) => void) | null = null;
  onVolumeLevel: ((level: number) => void) | null = null;

  constructor() {
    this.state.isSupported = typeof MediaRecorder !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.state.isSupported) {
      this.state.error = 'Recording is not supported in this browser';
      this.notifyStateChange();
      return false;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.state.error = null;
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        this.state.error = 'Microphone access denied. Please allow microphone permission.';
      } else if (err.name === 'NotFoundError') {
        this.state.error = 'No microphone found on this device.';
      } else {
        this.state.error = 'Could not access microphone.';
      }
      this.notifyStateChange();
      return false;
    }
  }

  async startRecording(): Promise<boolean> {
    if (!this.stream) {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    try {
      this.chunks = [];
      this.startTime = Date.now();
      this.pauseTime = 0;

      this.mediaRecorder = new MediaRecorder(this.stream!);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.start(100);
      this.state.isRecording = true;
      this.state.isPaused = false;
      this.state.duration = 0;

      this.startTimer();
      this.startVolumeAnalysis();
      this.notifyStateChange();
      return true;
    } catch {
      this.state.error = 'Failed to start recording';
      this.notifyStateChange();
      return false;
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.state.isRecording && !this.state.isPaused) {
      this.mediaRecorder.pause();
      this.state.isPaused = true;
      this.pauseTime = Date.now();
      this.notifyStateChange();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.state.isRecording && this.state.isPaused) {
      this.mediaRecorder.resume();
      this.state.isPaused = false;
      if (this.pauseTime > 0) {
        this.startTime += Date.now() - this.pauseTime;
      }
      this.notifyStateChange();
    }
  }

  stopRecording(): Promise<RecordingResult | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.state.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        const duration = Math.round((Date.now() - this.startTime) / 1000);
        const url = URL.createObjectURL(blob);

        this.cleanup();
        resolve({ blob, duration, url });
      };

      this.mediaRecorder.stop();
      this.stopTimer();
      this.stopVolumeAnalysis();
      this.state.isRecording = false;
      this.state.isPaused = false;
      this.notifyStateChange();
    });
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
      this.chunks = [];
    }
    this.cleanup();
    this.state.isRecording = false;
    this.state.isPaused = false;
    this.state.duration = 0;
    this.notifyStateChange();
  }

  releaseStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  private cleanup(): void {
    this.stopTimer();
    this.stopVolumeAnalysis();
    this.releaseStream();
  }

  private startTimer(): void {
    this.timerInterval = window.setInterval(() => {
      if (!this.state.isPaused) {
        this.state.duration = Math.round((Date.now() - this.startTime) / 1000);
        this.notifyStateChange();
      }
    }, 100);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startVolumeAnalysis(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream!);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyzeVolume();
    } catch {
      // Volume analysis not available
    }
  }

  private analyzeVolume(): void {
    if (!this.analyser || !this.dataArray) return;

    const analyze = () => {
      this.analyser!.getByteFrequencyData(this.dataArray!);
      const average = this.dataArray!.reduce((a, b) => a + b, 0) / this.dataArray!.length;
      const normalized = Math.min(average / 128, 1);

      if (this.onVolumeLevel) {
        this.onVolumeLevel(normalized);
      }

      this.animationFrame = requestAnimationFrame(analyze);
    };

    analyze();
  }

  private stopVolumeAnalysis(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }
}
