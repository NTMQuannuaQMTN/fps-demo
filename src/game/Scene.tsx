import { Canvas } from "@react-three/fiber"
import { PointerLockControls } from "@react-three/drei"
import { Player } from "./Player"
import { WaveManager } from "./WaveManager"
import { useProgressionStore } from "./useProgressionStore"
import { useGameStore } from "./useGameStore"
import { Crate } from "./Crate"

const props = [
  { position: [-14, 0.5, -8], scale: [2, 1, 2], color: "#8a735c" },
  { position: [12, 0.75, -18], scale: [1.5, 1.5, 1.5], color: "#7d6f5c" },
  { position: [-9, 0.35, 16], scale: [1, 0.7, 1], color: "#6d7f55" },
  { position: [16, 0.5, 11], scale: [1.2, 1, 1.2], color: "#7d6f5c" },
  { position: [-18, 1.4, 6], scale: [0.8, 2.8, 0.8], color: "#5f7f45" },
  { position: [20, 1.2, -2], scale: [0.8, 2.4, 0.8], color: "#5f7f45" },
  // Additional obstacles
  { position: [0, 0.6, -20], scale: [3, 1.2, 1], color: "#8a735c" },
  { position: [-25, 0.5, 0], scale: [1.5, 1.5, 1.5], color: "#7d6f5c" },
  { position: [25, 0.8, -10], scale: [1, 2, 1], color: "#6d7f55" },
  { position: [-5, 0.4, -15], scale: [2, 0.8, 2], color: "#7d6f5c" },
  { position: [5, 1, 25], scale: [1.5, 2.5, 1.5], color: "#5f7f45" },
  { position: [-20, 0.6, -10], scale: [2.5, 1, 2.5], color: "#8a735c" },
  { position: [15, 0.5, 20], scale: [1, 1.2, 1], color: "#7d6f5c" },
  { position: [0, 1.2, 10], scale: [1.8, 2, 1.8], color: "#6d7f55" },
  { position: [-30, 0.7, 15], scale: [1.2, 1.8, 1.2], color: "#5f7f45" },
  { position: [30, 0.5, -5], scale: [2, 1, 2], color: "#7d6f5c" },
]

const crates: Array<[number, number, number]> = [
  [-10, 0.6, 12],
  [8, 0.6, -14],
  [22, 0.6, 6],
]

export default function Scene() {
  const paused = useProgressionStore((s) => s.paused)
  const gameOver = useGameStore((s) => s.gameOver)
  const sessionId = useGameStore((s) => s.sessionId)
  return (
    <Canvas
      key={sessionId}
      shadows
      camera={{ fov: 75, position: [0, 1.6, 5] }}
      style={{ width: "100vw", height: "100vh", display: "block", pointerEvents: paused || gameOver ? "none" : "auto" }}
    >
      {/* Cyberpunk night sky */}
      <color attach="background" args={["#0b0620"]} />
      <fog attach="fog" args={["#0b0620", 12, 80]} />

      {/* Ambient neon fill */}
      <ambientLight intensity={0.25} color="#8ab6ff" />

      {/* Rim/Neon lights */}
      <directionalLight position={[8, 14, 6]} intensity={0.6} castShadow color="#a45cff" />
      <pointLight position={[-10, 4, -6]} intensity={1.2} color="#00f6ff" distance={40} />
      <pointLight position={[12, 3, 10]} intensity={0.9} color="#ff3db8" distance={40} />

      {/* Ground - dark with subtle emissive grid look */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#070713" metalness={0.2} roughness={0.8} emissive="#001026" emissiveIntensity={0.12} />
      </mesh>

      {/* Neon props (also register as colliders) */}
      {props.map((prop, index) => (
        <mesh
          key={index}
          position={prop.position as [number, number, number]}
          scale={prop.scale as [number, number, number]}
          castShadow
          receiveShadow
          ref={(m) => {
            if (!m) return
            if (!(window as any).colliders) (window as any).colliders = []
            if (!(window as any).colliders.includes(m)) (window as any).colliders.push(m)
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={prop.color} emissive={prop.color} emissiveIntensity={0.6} metalness={0.3} />
        </mesh>
      ))}

      {crates.map((position, index) => (
        <group
          key={`crate-${index}`}
          ref={(g) => {
            if (!g) return
            if (!(window as any).colliders) (window as any).colliders = []
            if (!(window as any).colliders.includes(g)) (window as any).colliders.push(g)
          }}
        >
          <Crate position={position} />
        </group>
      ))}

      <Player />
      <WaveManager />

      {!paused && !gameOver && <PointerLockControls />}
    </Canvas>
  )
}