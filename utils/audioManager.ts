import { float32ToInt16, createAudioBlob, decodeAudioData } from './audioUtils';
import { Blob } from '@google/genai';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private audioSources: Set<AudioBufferSourceNode> = new Set();
  private nextStartTime: number = 0;
  private isClosed: boolean = false;

  constructor(sampleRate: number = 24000) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    this.outputAnalyser = this.audioContext.createAnalyser();
    this.outputAnalyser.fftSize = 256;
    this.outputAnalyser.smoothingTimeConstant = 0.5;
    this.outputAnalyser.connect(this.audioContext.destination);
  }

  async initializeInput(
    onAudioData: (blob: Blob) => void,
    sensitivity: number = 0.5
  ): Promise<void> {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const micSource = this.audioContext.createMediaStreamSource(this.stream);
    // Note: ScriptProcessor is deprecated but used here for simplicity in this environment.
    // Ideally, replace with AudioWorklet in a full build pipeline.
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (this.isClosed) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Simple RMS calculation for Noise Gate (Sensitivity)
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      
      // Basic gate: only send if volume > threshold based on sensitivity
      // Sensitivity 1.0 = highly sensitive (low threshold), 0.0 = low sensitivity (high threshold)
      // Inverting logic: Higher sensitivity setting = Lower threshold.
      const threshold = 0.001 + (1 - sensitivity) * 0.05; 

      if (rms > threshold) {
        const pcm16 = float32ToInt16(inputData);
        const blob = createAudioBlob(pcm16);
        onAudioData(blob);
      }
    };

    micSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  async playAudioChunk(base64Audio: string): Promise<void> {
    if (!this.audioContext || !this.outputAnalyser) return;

    try {
      const audioBuffer = await decodeAudioData(base64Audio, this.audioContext);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAnalyser);
      
      const now = this.audioContext.currentTime;
      // Ensure we schedule in the future, handling gaps if network lagged
      const startTime = Math.max(now, this.nextStartTime);
      
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;
      
      this.audioSources.add(source);
      source.onended = () => {
        this.audioSources.delete(source);
      };
    } catch (error) {
      console.error("Error playing audio chunk", error);
    }
  }

  getOutputAnalyser(): AnalyserNode | null {
    return this.outputAnalyser;
  }

  close() {
    this.isClosed = true;
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.audioSources.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.audioSources.clear();
    this.nextStartTime = 0;
  }
}