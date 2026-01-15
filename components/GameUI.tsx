
import React, { useState, useEffect } from 'react';
import { GameState } from '../types';

interface GameUIProps {
  gameState: GameState;
  message: string;
  lookingAt: { type: string; id: string } | null;
  isAiming: boolean;
  setIsAiming: (val: boolean) => void;
  isDossierOpen: boolean;
  setIsDossierOpen: (val: boolean) => void;
  isMobile: boolean;
  onTogglePistol: () => void;
}

const GameUI: React.FC<GameUIProps> = ({ gameState, message, lookingAt, isAiming, setIsAiming, isDossierOpen, setIsDossierOpen, isMobile, onTogglePistol }) => {
  const dispatchAction = (type: string) => {
    window.dispatchEvent(new CustomEvent('game-action', { detail: { type } }));
  };

  // Mobile Joystick Logic
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [joystickOffset, setJoystickOffset] = useState({x: 0, y: 0});

  const handleJoystick = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touchStart) {
        setTouchStart({x: touch.clientX, y: touch.clientY});
        return;
    }
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 50);
    const angle = Math.atan2(dy, dx);
    const fx = Math.cos(angle) * dist;
    const fy = Math.sin(angle) * dist;
    setJoystickOffset({x: fx, y: fy});
    window.dispatchEvent(new CustomEvent('move-stick', { detail: { x: fx/50, y: fy/50 } }));
  };

  const endJoystick = () => {
    setTouchStart(null);
    setJoystickOffset({x: 0, y: 0});
    window.dispatchEvent(new CustomEvent('move-stick', { detail: { x: 0, y: 0 } }));
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 select-none font-sans overflow-hidden">
      
      {/* HUD - TOP */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="bg-zinc-950/80 border-l-4 border-red-600 p-4 md:p-6 rounded-r-3xl backdrop-blur-xl">
            <p className="text-[10px] font-black text-red-600 uppercase mb-1 tracking-widest">STATUS</p>
            <p className="text-lg md:text-2xl font-black text-white uppercase tracking-tighter">{message}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
            <button 
                onClick={() => setIsDossierOpen(!isDossierOpen)}
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all ${isDossierOpen ? 'bg-red-600 text-white' : 'bg-zinc-900/90 text-zinc-400 border border-white/5'}`}
            >
                FILES [E] ({gameState.foundCluesCount}/5)
            </button>
            
            {isDossierOpen && (
                <div className="bg-zinc-950/95 border border-white/10 p-4 md:p-6 w-64 md:w-80 rounded-3xl backdrop-blur-3xl animate-in slide-in-from-right duration-300">
                    <h4 className="noir-font text-2xl text-red-600 mb-4 border-b border-white/10 pb-2">Dossier</h4>
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                        {gameState.clues.map((clue) => (
                            <div key={clue.id} className={`p-3 rounded-xl border transition-all ${clue.found ? 'bg-zinc-900/50 border-white/10' : 'bg-black/20 border-white/5 opacity-40'}`}>
                                <span className="text-[9px] font-black uppercase text-zinc-300 block mb-1">{clue.name}</span>
                                {clue.found && <p className="text-[10px] text-zinc-400 font-serif italic">"{clue.description}"</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* CENTER - CROSSHAIR */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className={`w-10 h-10 border-2 border-white/20 rounded-full flex items-center justify-center transition-all ${isAiming ? 'scale-150 border-red-500' : ''}`}>
            <div className="w-1 h-1 bg-red-600 rounded-full"></div>
        </div>
        {lookingAt && (
            <div className="mt-16 bg-red-600 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase animate-bounce">
                {lookingAt.type === 'clue' ? 'ANALYZE EVIDENCE' : 'NEUTRALIZE TARGET'}
            </div>
        )}
      </div>

      {/* BOTTOM - CONTROLS */}
      <div className="flex justify-between items-end pointer-events-auto">
        {/* Mobile Joystick */}
        {isMobile && (
            <div 
                className="w-40 h-40 bg-zinc-900/40 rounded-full relative flex items-center justify-center border-2 border-white/5"
                onTouchMove={handleJoystick}
                onTouchEnd={endJoystick}
            >
                <div 
                    className="w-16 h-16 bg-red-600 rounded-full shadow-lg absolute transition-transform"
                    style={{ transform: `translate(${joystickOffset.x}px, ${joystickOffset.y}px)` }}
                />
            </div>
        )}

        {/* Windows Mini-Radar (Only Desktop) */}
        {!isMobile && (
            <div className="w-48 h-48 rounded-3xl bg-zinc-950/90 border-4 border-zinc-900 overflow-hidden relative shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full z-10"></div>
                {gameState.npcs.map(n => (
                    <div key={n.id} className="absolute w-2 h-2 rounded-full shadow-lg" style={{ 
                        left: `${50 + n.position[0] * 1.5}%`, 
                        top: `${50 + n.position[2] * 1.5}%`,
                        backgroundColor: n.color
                    }} />
                ))}
            </div>
        )}

        {/* Action Buttons Cluster */}
        <div className="flex flex-col items-end gap-4 pb-4">
            {isMobile && (
                <div className="flex gap-3">
                    <button onClick={() => dispatchAction('grab')} className="w-20 h-20 rounded-full bg-zinc-900/90 border border-white/10 text-white font-black text-xs uppercase">Grab</button>
                    <button onClick={onTogglePistol} className={`w-20 h-20 rounded-full border text-[10px] font-black uppercase ${gameState.isPistolEquipped ? 'bg-red-600 text-white border-red-400' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>Gun</button>
                </div>
            )}
            
            <div className="flex items-center gap-4">
                {isMobile && (
                    <button 
                        onTouchStart={() => setIsAiming(true)} 
                        onTouchEnd={() => setIsAiming(false)}
                        className={`w-20 h-20 rounded-full border-4 ${isAiming ? 'bg-white text-black border-red-600' : 'bg-black/60 text-white border-white/10'}`}
                    >
                        Aim
                    </button>
                )}

                <button 
                    onClick={() => gameState.isPistolEquipped && dispatchAction('shoot')}
                    className={`w-32 h-32 md:w-40 md:h-40 rounded-full font-black text-xl border-[10px] active:scale-90 transition-all ${gameState.isPistolEquipped ? 'bg-red-700 text-white border-red-950' : 'bg-zinc-800 text-zinc-600 border-zinc-900'}`}
                >
                    FIRE
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GameUI;
