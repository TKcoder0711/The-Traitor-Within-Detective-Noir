
import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState } from '../types';
import { sounds } from '../utils/sounds';

interface PlayerProps {
  onClueFound: (id: string) => void;
  onShoot: (id: string | null) => void;
  onTogglePistol: () => void;
  onToggleDossier: () => void;
  onLookAt: (lookData: { type: string; id: string } | null) => void;
  isAiming: boolean;
  gameState: GameState;
  wallBounds: THREE.Box3[];
  isLocked: boolean;
}

const Player: React.FC<PlayerProps> = ({ 
  onClueFound, 
  onShoot, 
  onTogglePistol, 
  onToggleDossier, 
  onLookAt, 
  isAiming, 
  gameState, 
  wallBounds, 
  isLocked 
}) => {
  const { camera, scene } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  const stickMove = useRef({x: 0, y: 0});
  const touchLook = useRef({x: 0, y: 0});
  const raycaster = new THREE.Raycaster();
  const center = useRef(new THREE.Vector2(0, 0));
  const pistolGroupRef = useRef<THREE.Group>(null);
  const playerBox = useRef(new THREE.Box3());
  
  // Muzzle flash state
  const [flash, setFlash] = useState(0);

  const handleAction = (type: string) => {
    if (type === 'shoot') {
      if (!gameState.isPistolEquipped) return;
      
      sounds.playGunshot();
      setFlash(3); // Show flash for 3 frames
      
      raycaster.setFromCamera(center.current, camera);
      // We want to hit things far away
      raycaster.far = 100;
      
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        // Find the first relevant object hit
        let hitObject = intersects[0].object;
        let t: any = hitObject;
        
        // Traverse up to find if we hit an NPC group
        let foundType = null;
        let foundId = null;
        
        while (t && t !== scene) {
          if (t.userData && t.userData.type) {
            foundType = t.userData.type;
            foundId = t.userData.id;
            break;
          }
          t = t.parent;
        }

        if (foundType === 'npc') {
          onShoot(foundId);
        } else {
          // Hit a wall or something else
          onShoot(null);
        }
      }
    }
    
    if (type === 'grab') {
      raycaster.setFromCamera(center.current, camera);
      raycaster.far = 4; // Grab range
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        let t: any = intersects[0].object;
        while(t && t !== scene) {
          if (t.userData && t.userData.type === 'clue' && !t.userData.found) {
            onClueFound(t.userData.id);
            break;
          }
          t = t.parent;
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      keys.current[e.code] = true; 
      if(e.code === 'KeyP') onTogglePistol(); 
      if(e.code === 'KeyE') onToggleDossier(); 
      if(e.code === 'KeyG') handleAction('grab');
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    
    const handleMouseDown = (e: MouseEvent) => {
      // Allow shooting if pistol is equipped and mouse is locked
      if (isLocked && gameState.isPistolEquipped) {
        handleAction('shoot');
      }
    };

    const handleGameAction = (e: any) => handleAction(e.detail.type);
    const handleStick = (e: any) => { stickMove.current = { x: e.detail.x, y: e.detail.y }; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('game-action', handleGameAction);
    window.addEventListener('move-stick', handleStick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('game-action', handleGameAction);
      window.removeEventListener('move-stick', handleStick);
    };
    // Dependencies are crucial here to avoid stale closures
  }, [isLocked, gameState.isPistolEquipped, onTogglePistol, onToggleDossier, onShoot, onClueFound]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => { 
      if(e.touches[0].clientX > window.innerWidth/2) {
        touchLook.current = {x: e.touches[0].clientX, y: e.touches[0].clientY}; 
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if(e.touches[0].clientX > window.innerWidth/2) {
        const dx = (e.touches[0].clientX - touchLook.current.x) * 0.005;
        const dy = (e.touches[0].clientY - touchLook.current.y) * 0.005;
        camera.rotation.y -= dx;
        camera.rotation.x -= dy;
        camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
        touchLook.current = {x: e.touches[0].clientX, y: e.touches[0].clientY};
      }
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [camera]);

  useFrame(() => {
    if (flash > 0) setFlash(flash - 1);

    // Movement Logic
    const dir = new THREE.Vector3();
    const front = new THREE.Vector3(0, 0, (keys.current['KeyS'] ? 1 : 0) - (keys.current['KeyW'] ? 1 : 0) + stickMove.current.y);
    const side = new THREE.Vector3((keys.current['KeyD'] ? 1 : 0) - (keys.current['KeyA'] ? 1 : 0) + stickMove.current.x, 0, 0);
    dir.subVectors(front, side).normalize().multiplyScalar(0.12).applyEuler(new THREE.Euler(0, camera.rotation.y, 0));

    const nextPos = camera.position.clone().add(dir);
    playerBox.current.setFromCenterAndSize(nextPos, new THREE.Vector3(1, 2, 1));
    
    let collided = false;
    for (const bound of wallBounds) {
      if (bound.intersectsBox(playerBox.current)) {
        collided = true;
        break;
      }
    }
    
    if (!collided) camera.position.add(dir);
    camera.position.y = 1.7;

    // View Model Position
    if (pistolGroupRef.current) {
      pistolGroupRef.current.position.copy(camera.position);
      pistolGroupRef.current.quaternion.copy(camera.quaternion);
    }

    // Interaction HUD Check
    raycaster.setFromCamera(center.current, camera);
    raycaster.far = 10;
    const intersects = raycaster.intersectObjects(scene.children, true);
    let hovered = null;
    if (intersects.length > 0) {
        let t: any = intersects[0].object;
        while(t && t !== scene) {
          if (t.userData && t.userData.type) {
            if (!(t.userData.type === 'clue' && t.userData.found)) {
              hovered = { type: t.userData.type, id: t.userData.id };
            }
            break;
          }
          t = t.parent;
        }
    }
    onLookAt(hovered);
  });

  return gameState.isPistolEquipped ? (
    <group ref={pistolGroupRef}>
      <group position={[0.3, -0.35, -0.55]} rotation={[0, -0.05, 0]}>
         {/* Pistol Body */}
         <mesh castShadow>
            <boxGeometry args={[0.07, 0.08, 0.4]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
         </mesh>
         <mesh position={[0, -0.1, 0.08]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.06, 0.2, 0.1]} />
            <meshStandardMaterial color="#050505" />
         </mesh>
         
         {/* Muzzle Flash */}
         {flash > 0 && (
           <group position={[0, 0.05, -0.25]}>
             <mesh>
               <sphereGeometry args={[0.1, 8, 8]} />
               <meshBasicMaterial color="#ffcc00" />
             </mesh>
             <pointLight intensity={10} distance={5} color="#ffaa00" />
           </group>
         )}
      </group>
    </group>
  ) : null;
};

export default Player;
