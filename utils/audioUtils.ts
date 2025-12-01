import { Blob } from '@google/genai';

// Convert Float32 audio data from the browser mic to PCM 16-bit Int16 array for Gemini
export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

// Create a blob payload for the Live API
export function createAudioBlob(int16Data: Int16Array, sampleRate: number = 16000): Blob {
  const uint8Array = new Uint8Array(int16Data.buffer);
  const base64 = btoa(
    Array.from(uint8Array)
      .map((byte) => String.fromCharCode(byte))
      .join('')
  );

  return {
    data: base64,
    mimeType: `audio/pcm;rate=${sampleRate}`,
  };
}

// Decode base64 raw PCM string from Gemini into an AudioBuffer
export async function decodeAudioData(
  base64String: string,
  audioContext: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 back to Float32 for playback
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  
  return buffer;
}

// Calculate RMS for noise gating (Volume level)
export function calculateRMS(inputData: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < inputData.length; i++) {
    sum += inputData[i] * inputData[i];
  }
  return Math.sqrt(sum / inputData.length);
}