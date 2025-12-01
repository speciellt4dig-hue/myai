import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalLogProps {
  logs: LogEntry[];
}

const TerminalLog: React.FC<TerminalLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-700 rounded-lg overflow-hidden font-mono text-sm shadow-inner">
      <div className="bg-slate-800 px-4 py-2 text-xs text-slate-400 border-b border-slate-700 flex justify-between">
        <span>TERMINAL_OUTPUT</span>
        <span>SECURE_CONNECTION: ACTIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 && (
            <div className="text-slate-600 italic">Waiting for input...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 animate-fade-in">
            <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
            <span className={`font-bold shrink-0 w-16 ${
              log.source === 'JARVIS' ? 'text-cyan-400' : 
              log.source === 'USER' ? 'text-emerald-400' : 'text-yellow-400'
            }`}>
              {log.source}:
            </span>
            <span className={`${
              log.type === 'error' ? 'text-red-400' : 
              log.type === 'command' ? 'text-purple-400' : 'text-slate-300'
            }`}>
              {log.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TerminalLog;