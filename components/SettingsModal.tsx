import React from 'react';
import { Settings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (newSettings: Settings) => void;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Zephyr'];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.15)] w-full max-w-md overflow-hidden relative">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500"></div>

        {/* Header */}
        <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-hud text-cyan-400 tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            SYSTEM CONFIG
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          {/* Voice Selection */}
          <div className="space-y-3">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-500"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              Voice Synthesis Model
            </label>
            <div className="grid grid-cols-2 gap-2">
              {VOICES.map(voice => (
                <button
                  key={voice}
                  onClick={() => onSettingsChange({ ...settings, voiceName: voice })}
                  className={`
                    px-4 py-2 text-sm font-mono border rounded transition-all duration-200 relative overflow-hidden group
                    ${settings.voiceName === voice 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800'}
                  `}
                >
                  <span className="relative z-10">{voice.toUpperCase()}</span>
                  {settings.voiceName === voice && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Wake Word Sensitivity */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-500"><path d="M2 12h5"></path><path d="M17 12h5"></path><path d="M2 12c.5-5 5-9 10-9s9.5 4 10 9"></path><path d="M2 12c.5 5 5 9 10 9s9.5-4 10-9"></path></svg>
                Wake Word Sensitivity
              </label>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded border border-cyan-900">
                {Math.round(settings.wakeWordSensitivity * 100)}%
              </span>
            </div>
            <div className="relative h-6 flex items-center">
               <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={settings.wakeWordSensitivity}
                onChange={(e) => onSettingsChange({ ...settings, wakeWordSensitivity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 z-10 relative"
              />
              <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20">
                  {[...Array(10)].map((_, i) => (
                      <div key={i} className="w-px h-2 bg-slate-400"></div>
                  ))}
              </div>
            </div>
             <p className="text-[10px] text-slate-500 font-mono">
              Adjusts the threshold for local voice activity detection (VAD).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-700 flex justify-end">
           <button 
             onClick={onClose}
             className="px-8 py-2 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-hud text-sm hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all rounded-sm tracking-widest"
           >
             CONFIRM
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;