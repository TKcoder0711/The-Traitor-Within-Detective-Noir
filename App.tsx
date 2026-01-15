
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, PointerLockControls, Stars, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { GoogleGenAI } from "@google/genai";
import { GameStatus, GameState, Clue, NPC } from './types';
import GameUI from './components/GameUI';
import Scene from './components/Scene';
import Player from './components/Player';
import { sounds } from './utils/sounds';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.MENU,
    level: 1,
    clues: [],
    npcs: [],
    murdererId: '',
    foundCluesCount: 0,
    isPistolEquipped: false,
  });

  const [message, setMessage] = useState<string>("");
  const [isAiming, setIsAiming] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [lookingAt, setLookingAt] = useState<{ type: string; id: string } | null>(null);
  const [isMobile] = useState(() => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  const wallBounds = useMemo(() => {
    const bounds: THREE.Box3[] = [];
    const area = 25;
    bounds.push(new THREE.Box3(new THREE.Vector3(-area-1, 0, -area-1), new THREE.Vector3(area+1, 10, -area)));
    bounds.push(new THREE.Box3(new THREE.Vector3(-area-1, 0, area), new THREE.Vector3(area+1, 10, area+1)));
    bounds.push(new THREE.Box3(new THREE.Vector3(-area-1, 0, -area), new THREE.Vector3(-area, 10, area)));
    bounds.push(new THREE.Box3(new THREE.Vector3(area, 0, -area), new THREE.Vector3(area+1, 10, area)));
    const rooms = [{ x: -12, z: -12, w: 10, d: 10 }, { x: 12, z: -12, w: 10, d: 10 }, { x: -12, z: 12, w: 10, d: 10 }, { x: 12, z: 12, w: 10, d: 10 }];
    rooms.forEach(r => {
        bounds.push(new THREE.Box3(new THREE.Vector3(r.x - r.w/2, 0, r.z - r.d/2), new THREE.Vector3(r.x + r.w/2, 10, r.z - r.d/2 + 0.5)));
        bounds.push(new THREE.Box3(new THREE.Vector3(r.x - r.w/2, 0, r.z + r.d/2 - 0.5), new THREE.Vector3(r.x + r.w/2, 10, r.z + r.d/2)));
        bounds.push(new THREE.Box3(new THREE.Vector3(r.x - r.w/2, 0, r.z - r.d/2), new THREE.Vector3(r.x - r.w/2 + 0.5, 10, r.z + r.d/2)));
        bounds.push(new THREE.Box3(new THREE.Vector3(r.x + r.w/2 - 0.5, 0, r.z - r.d/2), new THREE.Vector3(r.x + r.w/2, 10, r.z + r.d/2)));
    });
    return bounds;
  }, []);

  const generateLevel = useCallback(async (level: number) => {
    setMessage("INITIALIZING CASE FILE...");
    const npcCount = Math.min(4 + level, 12);
    const clueCount = 5;
    const areaScale = 20;
    
    const colors = ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#34495e', '#7f8c8d'];
    const traits = ['Limps', 'Tall', 'Short', 'Wears Hat', 'Gloves', 'Gold Watch', 'Nervous', 'Heavy Boots', 'Smoker', 'Scarred'];
    const objects = ['Fingerprint', 'Bullet Casing', 'DNA Sample', 'Fabric Scrap', 'Lost Badge'];

    const team: NPC[] = [];
    for (let i = 0; i < npcCount; i++) {
      team.push({
        id: `npc-${level}-${i}`,
        name: `Agent ${String.fromCharCode(65 + (i % 26))}`,
        color: colors[i % colors.length],
        traits: [traits[Math.floor(Math.random() * traits.length)]],
        isMurderer: false,
        position: [(Math.random() - 0.5) * areaScale * 2, 0, (Math.random() - 0.5) * areaScale * 2]
      });
    }

    const murderer = team[Math.floor(Math.random() * team.length)];
    murderer.isMurderer = true;

    // AI Dynamic Clue Generation
    let aiClues: string[] = [];
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate 5 short detective clue descriptions (max 12 words each) for a game. 
        The target suspect is "${murderer.name}". 
        The suspect's physical trait is "${murderer.traits[0]}". 
        The suspect's uniform color is "${murderer.color}".
        Return only a JSON array of 5 strings. Each string should subtly hint at one of these 3 identifiers.`,
        config: { responseMimeType: "application/json" }
      });
      aiClues = JSON.parse(response.text);
    } catch (e) {
      aiClues = objects.map(o => `Evidence points towards the one who is ${murderer.traits[0]}.`);
    }

    const clues: Clue[] = aiClues.map((desc, i) => ({
      id: `clue-${level}-${i}`,
      name: objects[i % objects.length],
      description: desc,
      found: false,
      position: [(Math.random() - 0.5) * areaScale * 2, 0.3, (Math.random() - 0.5) * areaScale * 2],
      roomName: "Mansion"
    }));

    setGameState({
      status: GameStatus.PLAYING,
      level,
      clues,
      npcs: team,
      murdererId: murderer.id,
      foundCluesCount: 0,
      isPistolEquipped: false,
    });
    setIsDossierOpen(false);
    setMessage(`MISSION ACTIVE: SECURE ${clueCount} CLUES`);
    sounds.playAmbience();
  }, []);

  const handleClueFound = useCallback((clueId: string) => {
    sounds.playClueGrab();
    setGameState(prev => {
      const updatedClues = prev.clues.map(c => c.id === clueId ? { ...c, found: true } : c);
      const foundCount = updatedClues.filter(c => c.found).length;
      setMessage(foundCount === prev.clues.length ? "READY FOR EXECUTION" : `${foundCount}/5 SECURED`);
      return { ...prev, clues: updatedClues, foundCluesCount: foundCount };
    });
    setLookingAt(null);
  }, []);

  const handleShoot = useCallback((targetId: string | null) => {
    if (!targetId) return;
    const isSuccess = targetId === gameState.murdererId;
    if (isSuccess) {
        sounds.playWin();
        setGameState(prev => ({ ...prev, status: GameStatus.WON }));
    } else {
        sounds.playFail();
        setGameState(prev => ({ ...prev, status: GameStatus.FAILED }));
    }
    setIsLocked(false);
  }, [gameState.murdererId]);

  return (
    <div className="w-full h-full relative bg-black overflow-hidden select-none">
      {gameState.status === GameStatus.MENU && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white p-6">
          <h1 className="text-7xl md:text-9xl noir-font mb-4 text-red-600 uppercase tracking-tighter shadow-red-900/50">TRAITOR</h1>
          <p className="text-sm md:text-xl font-bold tracking-[0.6em] mb-12 text-zinc-500 uppercase">WINDOWS & ANDROID EDITION</p>
          <button 
            onClick={() => generateLevel(gameState.level)} 
            className="px-12 py-6 bg-red-700 hover:bg-red-600 transition-all text-2xl md:text-4xl font-black rounded-3xl border-b-[8px] md:border-b-[12px] border-red-950 active:translate-y-2 active:border-b-0 shadow-2xl"
          >
            START OPERATION
          </button>
        </div>
      )}

      {gameState.status === GameStatus.WON && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white text-center">
          <h2 className="text-8xl md:text-[12rem] noir-font mb-4 text-green-500">SOLVED</h2>
          <button onClick={() => generateLevel(gameState.level + 1)} className="px-16 py-6 bg-green-600 text-2xl font-black rounded-3xl">NEXT CASE</button>
        </div>
      )}

      {gameState.status === GameStatus.FAILED && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950 text-white text-center">
          <h2 className="text-8xl md:text-[15rem] noir-font mb-4 text-red-600">FAIL</h2>
          <button onClick={() => generateLevel(gameState.level)} className="px-16 py-6 bg-red-600 text-2xl font-black rounded-3xl">RETRY</button>
        </div>
      )}

      {gameState.status === GameStatus.PLAYING && (
        <>
          <Canvas shadows camera={{ fov: 75, position: [0, 1.7, 0] }}>
            <Sky distance={450000} sunPosition={[0, -0.05, 0]} inclination={0} azimuth={0.25} />
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={1} fade speed={2} />
            <ambientLight intensity={0.05} />
            <pointLight position={[0, 15, 0]} intensity={0.5} castShadow />
            <Environment preset="night" />
            
            <Player 
              onClueFound={handleClueFound} 
              onShoot={handleShoot}
              onTogglePistol={() => setGameState(p => ({...p, isPistolEquipped: !p.isPistolEquipped}))}
              onToggleDossier={() => setIsDossierOpen(p => !p)}
              onLookAt={setLookingAt}
              isAiming={isAiming}
              gameState={gameState}
              wallBounds={wallBounds}
              isLocked={isLocked || isMobile}
            />
            
            <Scene 
              clues={gameState.clues} 
              npcs={gameState.npcs} 
              wallBounds={wallBounds}
              onNPCMove={(id, pos) => setGameState(prev => ({...prev, npcs: prev.npcs.map(n => n.id === id ? {...n, position: pos} : n)}))}
            />
            
            {!isMobile && <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />}
            <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={100} blur={2.5} far={10} color="#000" />
          </Canvas>

          {!isLocked && !isMobile && (
            <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center cursor-pointer">
               <div className="text-center p-12 bg-zinc-900 border border-white/10 rounded-[3rem]">
                  <p className="text-white text-4xl font-black uppercase tracking-widest animate-pulse">CLICK TO START</p>
               </div>
            </div>
          )}

          <GameUI 
            gameState={gameState} 
            message={message} 
            lookingAt={lookingAt} 
            setIsAiming={setIsAiming} 
            isAiming={isAiming} 
            isDossierOpen={isDossierOpen}
            setIsDossierOpen={setIsDossierOpen}
            isMobile={isMobile}
            onTogglePistol={() => setGameState(p => ({...p, isPistolEquipped: !p.isPistolEquipped}))}
          />
        </>
      )}
    </div>
  );
};

export default App;
