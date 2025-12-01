import React, { useEffect, useRef } from 'react';
import { MediaItem } from '../types';

interface MediaConsoleProps {
  items: MediaItem[];
}

const MediaConsole: React.FC<MediaConsoleProps> = ({ items }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center border border-slate-800 rounded-lg bg-slate-950/50 text-slate-600 font-mono text-sm p-8 text-center border-dashed">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-4 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        <p>NO MEDIA GENERATED</p>
        <p className="text-xs mt-2 opacity-50">Ask to generate images, videos, or search the web.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border border-slate-700 rounded-lg bg-slate-950 overflow-hidden shadow-inner">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-xs font-hud text-cyan-400 tracking-widest">MEDIA_OUTPUT</h3>
        <span className="text-[10px] font-mono text-slate-500">{items.length} ITEMS</span>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {items.map((item) => (
          <div key={item.id} className="animate-fade-in group">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-cyan-500 uppercase px-2 py-0.5 border border-cyan-900 rounded bg-cyan-950/30">
                    {item.type}
                </span>
                <span className="text-[10px] font-mono text-slate-600">{item.timestamp}</span>
            </div>

            <div className="border border-slate-700 rounded bg-slate-900/50 overflow-hidden relative group-hover:border-cyan-500/30 transition-colors">
                
                {item.type === 'image' && item.url && (
                    <div className="relative">
                        <img src={item.url} alt="Generated" className="w-full h-auto object-cover" />
                        <a href={item.url} download={`besa-image-${item.id}.png`} className="absolute bottom-2 right-2 p-2 bg-black/50 hover:bg-cyan-600 text-white rounded text-xs backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            DOWNLOAD
                        </a>
                    </div>
                )}

                {item.type === 'video' && item.url && (
                    <div className="relative">
                        <video src={item.url} controls className="w-full h-auto" autoPlay loop muted />
                        <div className="absolute top-2 right-2 text-[10px] bg-black/60 text-white px-1 rounded font-mono">VEO 3.1</div>
                    </div>
                )}

                {item.type === 'search' && (
                    <div className="p-4 space-y-2">
                        <div className="text-sm text-slate-200 font-mono leading-relaxed">
                            {item.content}
                        </div>
                        {item.metadata?.groundingChunks && (
                            <div className="mt-3 pt-3 border-t border-slate-800 grid gap-2">
                                {item.metadata.groundingChunks.map((chunk: any, i: number) => (
                                    chunk.web?.uri && (
                                        <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-cyan-400 hover:underline truncate">
                                            <span className="w-4 h-4 flex items-center justify-center bg-cyan-950 rounded text-[8px] border border-cyan-900">{i + 1}</span>
                                            {chunk.web.title || chunk.web.uri}
                                        </a>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                )}

                 {item.type === 'map' && (
                    <div className="p-4 space-y-2">
                         <div className="text-sm text-slate-200 font-mono leading-relaxed">
                            {item.content}
                        </div>
                        {item.metadata?.groundingChunks && (
                             <div className="mt-3 pt-3 border-t border-slate-800 grid gap-2">
                                {item.metadata.groundingChunks.map((chunk: any, i: number) => {
                                    // Handle web links from maps tool or direct map links
                                    const uri = chunk.web?.uri || chunk.maps?.uri;
                                    const title = chunk.web?.title || chunk.maps?.title || "View on Google Maps";
                                    
                                    if (uri) {
                                        return (
                                            <a key={i} href={uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-emerald-400 hover:underline truncate">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                {title}
                                            </a>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        )}
                    </div>
                )}

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaConsole;