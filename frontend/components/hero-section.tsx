"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Float } from "@react-three/drei";
import { ArrowRight } from "lucide-react";
import type * as THREE from "three";
import Link from "next/link";

// Simplified blockchain security visualization
function BlockchainSecurityModel() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <group ref={group}>
      {/* Shield base */}
      <mesh position={[0, 0, 0]} scale={[1.2, 1.5, 0.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#4361ee"
          emissive="#3a0ca3"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Shield border */}
      <mesh position={[0, 0, 0.11]} scale={[1.3, 1.6, 0.05]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#4cc9f0"
          emissive="#4cc9f0"
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Blockchain cubes - simplified to static positions */}
      <mesh
        position={[0.6, 0, 0.3]}
        scale={0.15}
        rotation={[Math.PI / 4, Math.PI / 4, 0]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#560bad"
          emissive="#7209b7"
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      <mesh
        position={[0.2, 0.5, 0.3]}
        scale={0.15}
        rotation={[Math.PI / 4, Math.PI / 4, 0]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#560bad"
          emissive="#7209b7"
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      <mesh
        position={[-0.4, 0.4, 0.3]}
        scale={0.15}
        rotation={[Math.PI / 4, Math.PI / 4, 0]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#560bad"
          emissive="#7209b7"
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      <mesh
        position={[-0.5, -0.2, 0.3]}
        scale={0.15}
        rotation={[Math.PI / 4, Math.PI / 4, 0]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#560bad"
          emissive="#7209b7"
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      <mesh
        position={[0.2, -0.5, 0.3]}
        scale={0.15}
        rotation={[Math.PI / 4, Math.PI / 4, 0]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#560bad"
          emissive="#7209b7"
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      {/* Connection lines - simplified to static positions */}
      <mesh
        position={[0.4, 0.25, 0.3]}
        rotation={[0, 0, Math.PI / 4]}
        scale={[0.03, 0.3, 0.03]}
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial
          color="#4cc9f0"
          emissive="#4cc9f0"
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>

      <mesh
        position={[-0.1, 0.45, 0.3]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[0.03, 0.3, 0.03]}
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial
          color="#4cc9f0"
          emissive="#4cc9f0"
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>

      <mesh
        position={[-0.45, 0.1, 0.3]}
        rotation={[0, 0, Math.PI / 4]}
        scale={[0.03, 0.3, 0.03]}
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial
          color="#4cc9f0"
          emissive="#4cc9f0"
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>

      <mesh
        position={[-0.15, -0.35, 0.3]}
        rotation={[0, 0, Math.PI / 2]}
        scale={[0.03, 0.3, 0.03]}
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial
          color="#4cc9f0"
          emissive="#4cc9f0"
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>

      <mesh
        position={[0.4, -0.25, 0.3]}
        rotation={[0, 0, Math.PI / 4]}
        scale={[0.03, 0.3, 0.03]}
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial
          color="#4cc9f0"
          emissive="#4cc9f0"
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Lock in center */}
      <group position={[0, 0, 0.3]}>
        {/* Lock body */}
        <mesh position={[0, -0.2, 0]} scale={[0.4, 0.3, 0.2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#4895ef"
            emissive="#4361ee"
            emissiveIntensity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Lock shackle */}
        <mesh position={[0, 0.05, 0]} scale={[0.25, 0.25, 0.1]}>
          <torusGeometry args={[1, 0.2, 16, 32, Math.PI]} />
          <meshStandardMaterial
            color="#4895ef"
            emissive="#4361ee"
            emissiveIntensity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* Solana logo hint */}
      <mesh position={[0, 0, 0.15]} rotation={[0, 0, Math.PI / 4]} scale={0.5}>
        <ringGeometry args={[0.2, 0.25, 32]} />
        <meshStandardMaterial
          color="#4cc9f0"
          emissive="#4cc9f0"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

// Simplified particles
function SimpleParticles() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <group ref={group}>
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
          ]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#4cc9f0" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// Simplified data flow lines
function SimpleDataFlowLines() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current && group.current.children.length > 0) {
      group.current.children.forEach((child, i) => {
        // Simple up and down movement
        child.position.y =
          Math.sin(state.clock.getElapsedTime() * 0.5 + i * 0.2) * 2;
      });
    }
  });

  return (
    <group ref={group}>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh
          key={i}
          position={[(Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8]}
        >
          <boxGeometry args={[0.05, 2, 0.05]} />
          <meshBasicMaterial color="#4cc9f0" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Scene() {
  return (
    <React.Suspense fallback={null}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight
        position={[-10, -10, -5]}
        intensity={0.5}
        color="#4cc9f0"
      />
      <Float
        speed={1.5}
        rotationIntensity={0.4}
        floatIntensity={0.8}
      >
        <BlockchainSecurityModel />
      </Float>
      <SimpleParticles />
      <SimpleDataFlowLines />
      <Environment preset="night" />
    </React.Suspense>
  );
}

export default function HeroSection() {
  const terminalLines = [
    { text: "> Initializing Lavinth security protocol...", delay: 0 },
    {
      text: "> Scanning Solana blockchain for suspicious activities...",
      delay: 1000,
    },
    { text: "> Detecting address poisoning attempts...", delay: 2000 },
    { text: "> Analyzing dusting attacks...", delay: 3000 },
    {
      text: "> Security layer activated. Your assets are protected.",
      delay: 4000,
    },
  ];

  const [visibleLines, setVisibleLines] = useState<number[]>([]);

  useEffect(() => {
    terminalLines.forEach((line, index) => {
      setTimeout(() => {
        setVisibleLines((prev) => [...prev, index]);
      }, line.delay);
    });
  }, []);

  return (
    <section className="relative min-h-screen pt-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 via-black to-black z-0" />

      {/* Grid pattern */}
      {/* <div className="absolute inset-0 bg-[url('/grid.png')] bg-center opacity-20 z-0" /> */}

      <div className="container mx-auto px-4 relative z-10 h-full flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[calc(100vh-80px)]">
          <div className="flex flex-col justify-center">
            <div className="inline-block mb-4 px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
              DeFi Security Layer on Solana
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                Secure Your Assets
              </span>{" "}
              from Poisoning & Dusting Attacks
            </h1>
            <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-xl">
              Lavinth provides real-time detection and protection against
              address poisoning and dusting attacks on the Solana blockchain.
            </p>

            {/* Terminal-like animation */}
            <div className="mb-8 bg-black/60 border border-blue-500/30 rounded-lg p-4 font-mono text-sm text-green-400 max-w-xl">
              {terminalLines.map((line, index) => (
                <div
                  key={index}
                  className={`transition-opacity duration-500 ${
                    visibleLines.includes(index) ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {line.text}
                </div>
              ))}
              <div className="h-4 w-2 bg-green-400 inline-block ml-1 animate-pulse" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
                  Launch Dashboard
                </Button>
              </Link>
              <Link href="/wallet-check">
                <Button
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10 text-lg px-8 py-6"
                >
                  Check Wallet <ArrowRight className="ml-2" size={18} />
                </Button>
              </Link>
            </div>
          </div>

          <div className="h-[500px] lg:h-[600px] w-full">
            <Canvas
              camera={{ position: [0, 0, 5], fov: 45 }}
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-black/40 text-blue-400">
                  Loading 3D scene...
                </div>
              }
            >
              <Scene />
              <OrbitControls
                enableZoom={false}
                enablePan={false}
                autoRotate
                autoRotateSpeed={0.5}
              />
            </Canvas>
          </div>
        </div>
      </div>

      {/* Animated scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
        <span className="text-blue-400 text-sm mb-2">Scroll to explore</span>
        <div className="w-6 h-10 border-2 border-blue-400 rounded-full flex justify-center">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce mt-2" />
        </div>
      </div>
    </section>
  );
}
