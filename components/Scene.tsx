
import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Clue, NPC } from '../types';

interface SceneProps {
  clues: Clue[];
  npcs: NPC[];
  wallBounds: THREE.Box3[];
  onNPCMove: (id: string, pos: [number, number, number]) => void;
}

const MovingNPC: React.FC<{ 
  npc: NPC; 
  wallBounds: THREE.Box3[];
  onNPCMove: (id: string, pos: [number, number, number]) => void;
}> = ({ npc, wallBounds, onNPCMove }) => {
  const groupRef = useRef<THREE.Group>(null);
  const npcBox = useRef(new THREE.Box3());
  const velocity = useRef(new THREE.Vector3());
  const speed = 0.035;
  const syncCounter = useRef(0);

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    velocity.current.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;

    // Occasional direction change
    if (Math.random() < 0.004) {
      const angle = (Math.random() - 0.5) * 1.5;
      velocity.current.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    }

    const pos = groupRef.current.position;
    const nextX = pos.x + velocity.current.x;
    const nextZ = pos.z + velocity.current.z;

    // Simple AABB Collision
    npcBox.current.setFromCenterAndSize(new THREE.Vector3(nextX, 1, pos.z), new THREE.Vector3(0.6, 2, 0.6));
    if (wallBounds.some(b => b.intersectsBox(npcBox.current))) velocity.current.x *= -1;
    else groupRef.current.position.x = nextX;

    npcBox.current.setFromCenterAndSize(new THREE.Vector3(pos.x, 1, nextZ), new THREE.Vector3(0.6, 2, 0.6));
    if (wallBounds.some(b => b.intersectsBox(npcBox.current))) velocity.current.z *= -1;
    else groupRef.current.position.z = nextZ;

    // Face direction
    if (velocity.current.lengthSq() > 0.0001) {
      const targetRotation = Math.atan2(velocity.current.x, velocity.current.z);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation, 0.1);
    }

    // Update Radar
    syncCounter.current++;
    if (syncCounter.current > 20) {
      syncCounter.current = 0;
      onNPCMove(npc.id, [groupRef.current.position.x, 0, groupRef.current.position.z]);
    }
  });

  return (
    <group ref={groupRef} position={npc.position} userData={{ type: 'npc', id: npc.id }}>
      {/* Body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.25, 1, 4, 12]} />
        <meshStandardMaterial color={npc.color} roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.22]} />
        <meshStandardMaterial color="#f3d5b5" />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.08, 1.75, 0.18]}><sphereGeometry args={[0.03]} /><meshBasicMaterial color="#000" /></mesh>
      <mesh position={[-0.08, 1.75, 0.18]}><sphereGeometry args={[0.03]} /><meshBasicMaterial color="#000" /></mesh>
      
      {npc.traits.includes('Wears Hat') && (
        <group position={[0, 1.9, 0]}>
            <mesh><cylinderGeometry args={[0.2, 0.25, 0.05]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.15, 0.15, 0.2]} /><meshStandardMaterial color="#111" /></mesh>
        </group>
      )}
    </group>
  );
};

const ClueModel: React.FC<{ type: string }> = ({ type }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
        meshRef.current.rotation.y += 0.02;
        meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.001;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} castShadow>
        {type === 'Fingerprint' && <circleGeometry args={[0.25, 32]} />}
        {type === 'Bullet Casing' && <cylinderGeometry args={[0.05, 0.05, 0.2]} />}
        {type === 'DNA Sample' && <icosahedronGeometry args={[0.2]} />}
        {type === 'Bloody Key' && <torusKnotGeometry args={[0.1, 0.03]} />}
        {type === 'Fabric Scrap' && <boxGeometry args={[0.3, 0.01, 0.3]} />}
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} transparent opacity={0.8} />
      </mesh>
      <pointLight intensity={2} color="#00ffff" distance={5} />
    </group>
  );
};

const Scene: React.FC<SceneProps> = ({ clues, npcs, wallBounds, onNPCMove }) => {
  const area = 25;

  return (
    <group>
      {/* Polished Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[area * 2, area * 2]} />
        <meshStandardMaterial color="#121212" roughness={0.1} metalness={0.6} />
      </mesh>
      
      {/* Grid Pattern Floor (Detailed) */}
      <gridHelper args={[area * 2, 50, 0x333333, 0x222222]} position={[0, 0.01, 0]} />

      {/* House Architecture */}
      <group>
        {/* Exterior Walls */}
        <Wall position={[0, 4, -area]} args={[area * 2, 8, 0.5]} />
        <Wall position={[0, 4, area]} args={[area * 2, 8, 0.5]} />
        <Wall position={[-area, 4, 0]} args={[0.5, 8, area * 2]} />
        <Wall position={[area, 4, 0]} args={[0.5, 8, area * 2]} />
        
        {/* Room Divisions */}
        <Wall position={[-12, 4, -7]} args={[10, 8, 0.5]} />
        <Wall position={[12, 4, -7]} args={[10, 8, 0.5]} />
        <Wall position={[-12, 4, 7]} args={[10, 8, 0.5]} />
        <Wall position={[12, 4, 7]} args={[10, 8, 0.5]} />
        
        {/* Room Lights */}
        <pointLight position={[-12, 6, -12]} intensity={0.6} color="#ffccaa" distance={20} castShadow />
        <pointLight position={[12, 6, -12]} intensity={0.6} color="#ffccaa" distance={20} castShadow />
        <pointLight position={[-12, 6, 12]} intensity={0.6} color="#ffccaa" distance={20} castShadow />
        <pointLight position={[12, 6, 12]} intensity={0.6} color="#ffccaa" distance={20} castShadow />
      </group>

      {/* Decorative Victim Scene */}
      <group position={[0, 0.05, 10]}>
         <mesh rotation={[Math.PI/2, 0, 0.4]}><planeGeometry args={[1.5, 3]} /><meshStandardMaterial color="#400" transparent opacity={0.6} /></mesh>
         <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]}><ringGeometry args={[1.8, 2, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.1} /></mesh>
      </group>

      {/* Clues */}
      {clues.map((clue) => (
        <group key={clue.id} position={clue.position} userData={{ type: 'clue', id: clue.id, found: clue.found }}>
          {!clue.found && <ClueModel type={clue.name} />}
        </group>
      ))}

      {/* Agents */}
      {npcs.map((npc) => (
        <MovingNPC key={npc.id} npc={npc} wallBounds={wallBounds} onNPCMove={onNPCMove} />
      ))}
    </group>
  );
};

const Wall: React.FC<{ position: [number, number, number]; args: [number, number, number] }> = ({ position, args }) => (
  <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={args} />
    <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
  </mesh>
);

export default Scene;
