import React, { useEffect, useRef } from 'react';
import { AudioVisualizerProps } from '../types';

const Visualizer: React.FC<AudioVisualizerProps> = ({ analyser, isActive, activeFile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : new Uint8Array(0);

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw HUD Circle
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 3;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = isActive ? '#06b6d4' : '#334155'; // Cyan or Slate
      ctx.lineWidth = 2;
      ctx.stroke();

      // Rotating inner ring
      if (isActive) {
        const time = Date.now() / 1000;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 10, time % (2 * Math.PI), (time + 1.5) % (2 * Math.PI));
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
        
        // Draw frequency bars in a circle
        const barCount = 60;
        const step = (Math.PI * 2) / barCount;
        
        for (let i = 0; i < barCount; i++) {
            // Pick frequencies distributed across the spectrum
            const value = dataArray[i * 4]; // sparse sampling
            const barHeight = (value / 255) * (radius * 0.5);
            const angle = i * step;
            
            const x1 = centerX + Math.cos(angle) * (radius + 5);
            const y1 = centerY + Math.sin(angle) * (radius + 5);
            const x2 = centerX + Math.cos(angle) * (radius + 5 + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + 5 + barHeight);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, isActive]);

  return (
    <div className="relative w-full h-64 md:h-96 flex items-center justify-center bg-slate-900/50 rounded-lg border border-slate-700 shadow-[0_0_15px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 z-0 opacity-20" 
             style={{ 
                 backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', 
                 backgroundSize: '20px 20px' 
             }}>
        </div>
        
        <canvas 
            ref={canvasRef} 
            width={600} 
            height={400} 
            className="z-10 w-full h-full"
        />
        
        {!isActive && (
            <div className="absolute z-20 text-cyan-500 font-hud text-xl animate-pulse tracking-widest">
                SYSTEM STANDBY
            </div>
        )}

        {/* Active File Indicator */}
        {activeFile && (
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-600 rounded text-xs font-mono text-cyan-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                <span>LOADED: {activeFile.name}</span>
                <span className="text-slate-500 text-[10px]">({Math.round(activeFile.size / 1024)}KB)</span>
            </div>
        )}
    </div>
  );
};

export default Visualizer;