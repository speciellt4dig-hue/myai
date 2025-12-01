import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState, LogEntry, Settings, MediaItem, ActiveFile } from './types';
import Visualizer from './components/Visualizer';
import TerminalLog from './components/TerminalLog';
import SettingsModal from './components/SettingsModal';
import MediaConsole from './components/MediaConsole';
import { AudioManager } from './utils/audioManager'; // Import the new manager
import { toolsDeclaration, executeTool } from './utils/tools';

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const generateId = () => Math.random().toString(36).substring(2, 9);

function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMicActive, setIsMicActive] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeFile, setActiveFile] = useState<ActiveFile | null>(null);
  
  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    voiceName: 'Fenrir',
    wakeWordSensitivity: 0.6
  });

  // Local Wake Word / Speech Rec
  const [isAwake, setIsAwake] = useState(false);

  // Refs
  const audioManagerRef = useRef<AudioManager | null>(null);
  const sessionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFileRef = useRef<ActiveFile | null>(null);
  const recognitionRef = useRef<any>(null); // For Web Speech API

  // Sync refs
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  // --- Logging & Media ---
  const addLog = useCallback((source: LogEntry['source'], text: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: generateId(),
      timestamp: new Date().toLocaleTimeString(),
      source,
      text,
      type
    }]);
  }, []);

  const handleMediaGenerated = useCallback((item: MediaItem) => {
    setMediaItems(prev => [...prev, item]);
    addLog('SYSTEM', `New Media Generated: ${item.type.toUpperCase()}`, 'success');
  }, [addLog]);

  // --- File Upload ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const newFile: ActiveFile = {
          name: file.name,
          content: content,
          type: file.type,
          size: file.size
        };
        setActiveFile(newFile);
        addLog('SYSTEM', `File loaded: ${file.name}`, 'success');

        if (sessionRef.current && connectionState === ConnectionState.CONNECTED) {
            sessionRef.current.sendRealtimeInput({
                content: [{ text: `System Notification: User uploaded file '${file.name}'. You can read its content using the 'read_active_file' tool.` }]
            });
            addLog('SYSTEM', 'Context sent to AI', 'info');
        }
      };
      reader.readAsText(file);
    }
  };

  // --- Wake Word Logic (Web Speech API) ---
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;
    
    // @ts-ignore
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const text = lastResult[0].transcript.trim().toLowerCase();
      
      if (text.includes('jarvis') || text.includes('besa')) {
        setIsAwake(true);
        addLog('SYSTEM', 'Wake Word Detected', 'success');
      }
    };

    recognitionRef.current = recognition;
  }, [addLog]);

  useEffect(() => {
    if (connectionState === ConnectionState.DISCONNECTED && recognitionRef.current) {
      try { recognitionRef.current.start(); } catch(e) {}
    } else if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
  }, [connectionState]);

  // --- Cleanup ---
  const disconnect = useCallback(() => {
    if (sessionRef.current) {
       try {
         // @ts-ignore
         sessionRef.current.close();
       } catch (e) { console.warn("Session close error", e); }
       sessionRef.current = null;
    }
    
    if (audioManagerRef.current) {
      audioManagerRef.current.close();
      audioManagerRef.current = null;
    }

    setConnectionState(ConnectionState.DISCONNECTED);
    setIsMicActive(false);
    setIsAwake(false);
    addLog('SYSTEM', 'Disconnected.', 'info');
  }, [addLog]);

  // --- Connection Logic ---
  const connect = async () => {
    try {
      if (!isAwake) {
        addLog('SYSTEM', 'Awaiting Wake Word: "JARVIS" or "BESA"', 'info');
        // For demo purposes, we allow manual override via button, 
        // but typically we'd wait for isAwake to be true.
        setIsAwake(true); 
      }

      setConnectionState(ConnectionState.CONNECTING);
      addLog('SYSTEM', 'Initializing BESA core systems...', 'info');

      // 1. Initialize Audio Manager
      audioManagerRef.current = new AudioManager();
      
      // 2. Initialize Gemini Client
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API_KEY not found.");
      const ai = new GoogleGenAI({ apiKey });
      
      addLog('SYSTEM', `Connecting to ${MODEL_NAME}...`, 'info');
      
      // 3. Connect Live API
      let resolveSession: (s: any) => void;
      const sessionPromise = new Promise<any>(resolve => { resolveSession = resolve; });

      const session = await ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voiceName } },
          },
          systemInstruction: {
            parts: [{ text: "You are BESA (Best Enhanced System Assistant), a next-gen AI. You have access to specialized tools: 'Reasoning Core' (Gemini 3 Pro) for complex logic, 'Veo' for video generation, 'Imagen' for images, and 'Google Maps' for finding places/locations. You can also read files the user uploads using 'read_active_file'. When a user asks for these specific tasks, USE THE TOOLS. Do not try to describe an image, GENERATE IT. Be concise, professional, and futuristic." }]
          },
          tools: [{ functionDeclarations: toolsDeclaration }],
        },
        callbacks: {
          onopen: async () => {
            addLog('SYSTEM', `Link Established. Voice: ${settings.voiceName}`, 'success');
            setConnectionState(ConnectionState.CONNECTED);
            setIsMicActive(true);
            
            // Start Audio Input Stream
            if (audioManagerRef.current) {
              await audioManagerRef.current.initializeInput(
                (blob) => {
                  sessionPromise.then(s => s.sendRealtimeInput({ media: blob }));
                },
                settings.wakeWordSensitivity
              );
            }
            
            // Send Context
            if (activeFileRef.current) {
               sessionPromise.then(s => {
                   s.sendRealtimeInput({
                       content: [{ text: `System Notification: User uploaded file '${activeFileRef.current?.name}'.` }]
                   });
               });
            }
          },
          onmessage: async (message: LiveServerMessage) => {
             // Tool handling
             if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                    addLog('JARVIS', `Activating Tool: ${fc.name}`, 'command');
                    try {
                      const result = await executeTool(
                        fc.name, 
                        fc.args, 
                        apiKey, 
                        handleMediaGenerated,
                        activeFileRef.current
                      );
                      sessionPromise.then(s => s.sendToolResponse({
                           functionResponses: [{ id: fc.id, name: fc.name, response: result }]
                      }));
                    } catch (error: any) {
                      addLog('SYSTEM', `Tool Error: ${error.message}`, 'error');
                       sessionPromise.then(s => s.sendToolResponse({
                           functionResponses: [{ id: fc.id, name: fc.name, response: { error: error.message } }]
                       }));
                    }
                }
             }
             
             // Audio Output handling
             if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
                const audioData = message.serverContent.modelTurn.parts[0].inlineData.data;
                audioManagerRef.current?.playAudioChunk(audioData);
             }
             
             // Text transcript handling
             if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                addLog('JARVIS', message.serverContent.modelTurn.parts[0].text, 'info');
             }
          },
          onclose: () => {
             addLog('SYSTEM', 'Link severed.', 'error');
             disconnect(); // Cleanup locally
          },
          onerror: (err) => {
             addLog('SYSTEM', `Protocol Error: ${err.message}`, 'error');
          }
        }
      });
      
      sessionRef.current = session;
      resolveSession(session);

    } catch (error: any) {
      console.error(error);
      addLog('SYSTEM', `Initialization Failed: ${error.message}`, 'error');
      setConnectionState(ConnectionState.ERROR);
      disconnect();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M16 12v.01"></path><path d="M12 16v.01"></path><path d="M12 2a10 10 0 0 1 10 10v4a1 1 0 0 1-1 1h-2"></path><path d="M21 16.5a2.5 2.5 0 0 1-5 0V16"></path></svg>
             </div>
             <div>
               <h1 className="text-2xl font-hud font-bold text-white tracking-wider">BESA <span className="text-cyan-400">AI</span></h1>
               <div className="flex items-center gap-2">
                 <span className={`w-2 h-2 rounded-full ${connectionState === ConnectionState.CONNECTED ? 'bg-emerald-400 animate-pulse' : connectionState === ConnectionState.CONNECTING ? 'bg-yellow-400 animate-bounce' : 'bg-red-500'}`}></span>
                 <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">{connectionState}</span>
                 {isAwake && connectionState === ConnectionState.DISCONNECTED && (
                    <span className="text-[10px] text-cyan-400 border border-cyan-900 px-1 rounded bg-cyan-950/50">LISTENING FOR CMD</span>
                 )}
                 {!isAwake && connectionState === ConnectionState.DISCONNECTED && (
                    <span className="text-[10px] text-slate-500 border border-slate-800 px-1 rounded">STANDBY</span>
                 )}
               </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
                accept=".txt,.md,.js,.ts,.py,.json,.csv,.html,.css"
            />
             <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-700 transition-all text-slate-300 hover:text-cyan-400 group relative"
              title="Upload Context File"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              {activeFile && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900"></span>
              )}
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-700 transition-all text-slate-300 hover:text-cyan-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            
            <button 
              onClick={connectionState === ConnectionState.CONNECTED ? disconnect : connect}
              className={`
                px-6 py-2 rounded font-hud font-bold tracking-wider transition-all shadow-lg
                ${connectionState === ConnectionState.CONNECTED 
                  ? 'bg-red-500/10 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white shadow-red-900/20' 
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-900 border border-cyan-400 shadow-cyan-500/20'}
              `}
            >
              {connectionState === ConnectionState.CONNECTED ? 'TERMINATE' : 'INITIALIZE'}
            </button>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
           <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
              <Visualizer 
                analyser={audioManagerRef.current?.getOutputAnalyser() || null} 
                isActive={connectionState === ConnectionState.CONNECTED}
                activeFile={activeFile}
              />
              <TerminalLog logs={logs} />
           </div>
           <div className="lg:col-span-1 min-h-0">
              <MediaConsole items={mediaItems} />
           </div>
        </div>
      </div>
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}

export default App;