export interface LogEntry {
  id: string;
  timestamp: string;
  source: 'USER' | 'JARVIS' | 'SYSTEM';
  text: string;
  type: 'info' | 'error' | 'success' | 'command';
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  activeFile: ActiveFile | null;
}

export interface Settings {
  voiceName: string;
  wakeWordSensitivity: number;
}

export type MediaType = 'image' | 'video' | 'search' | 'map';

export interface MediaItem {
  id: string;
  type: MediaType;
  url?: string;
  content?: string;
  title?: string;
  metadata?: any;
  timestamp: string;
}

export interface ActiveFile {
  name: string;
  content: string;
  type: string;
  size: number;
}