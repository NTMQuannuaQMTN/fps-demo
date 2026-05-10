import { Canvas } from "@react-three/fiber"
import { PointerLockControls } from "@react-three/drei"
import { Player } from "./Player"
import { WaveManager } from "./WaveManager"
import { useProgressionStore } from "./useProgressionStore"
import { useGameStore } from "./useGameStore"
import { Crate } from "./Crate"

const generateRandomObstacles = (count: number) => {
  const obstacles = []
  const colors = ["#8a735c", "#7d6f5c", "#6d7f55", "#5f7f45"]
  
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 70
    const z = (Math.random() - 0.5) * 70
    const scale = 0.8 + Math.random() * 1.8
    const heightVariation = Math.random() * 2
    
    obstacles.push({
      position: [x, 0.5 + heightVariation, z] as [number, number, number],
      scale: [scale, heightVariation + 0.8, scale] as [number, number, number],
      color: colors[Math.floor(Math.random() * colors.length)],
    })
  }
  
  return obstacles
}

const staticProps = [
  { position: [-14, 0.5, -8], scale: [2, 1, 2], color: "#8a735c" },
  { position: [12, 0.75, -18], scale: [1.5, 1.5, 1.5], color: "#7d6f5c" },
  { position: [-9, 0.35, 16], scale: [1, 0.7, 1], color: "#6d7f55" },
  { position: [16, 0.5, 11], scale: [1.2, 1, 1.2], color: "#7d6f5c" },
  { position: [-18, 1.4, 6], scale: [0.8, 2.8, 0.8], color: "#5f7f45" },
  { position: [20, 1.2, -2], scale: [0.8, 2.4, 0.8], color: "#5f7f45" },
]

const randomObstacles = generateRandomObstacles(20)
const props = [...staticProps, ...randomObstacles]

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
      {/* Sunset sky */}
      <color attach="background" args={["#ff9d5c"]} />
      <fog attach="fog" args={["#ff9d5c", 12, 80]} />

      {/* Warm ambient fill */}
      <ambientLight intensity={0.35} color="#ffb380" />

      {/* Sunset directional light */}
      <directionalLight position={[8, 12, 6]} intensity={0.8} castShadow color="#ff7f50" />
      <pointLight position={[-10, 4, -6]} intensity={0.8} color="#ffaa00" distance={40} />
      <pointLight position={[12, 3, 10]} intensity={0.6} color="#ff6b9d" distance={40} />

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

      {/* Map Border Barriers */}
      {/* North wall */}
      <mesh
        position={[0, 2, -50]}
        ref={(m) => {
          if (!m) return
          if (!(window as any).colliders) (window as any).colliders = []
          if (!(window as any).colliders.includes(m)) (window as any).colliders.push(m)
        }}
      >
        <boxGeometry args={[100, 4, 2]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#0a0a1a" emissiveIntensity={0.3} transparent opacity={0.2} />
      </mesh>

      {/* South wall */}
      <mesh
        position={[0, 2, 50]}
        ref={(m) => {
          if (!m) return
          if (!(window as any).colliders) (window as any).colliders = []
          if (!(window as any).colliders.includes(m)) (window as any).colliders.push(m)
        }}
      >
        <boxGeometry args={[100, 4, 2]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#0a0a1a" emissiveIntensity={0.3} transparent opacity={0.2} />
      </mesh>

      {/* West wall */}
      <mesh
        position={[-50, 2, 0]}
        ref={(m) => {
          if (!m) return
          if (!(window as any).colliders) (window as any).colliders = []
          if (!(window as any).colliders.includes(m)) (window as any).colliders.push(m)
        }}
      >
        <boxGeometry args={[2, 4, 100]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#0a0a1a" emissiveIntensity={0.3} transparent opacity={0.2} />
      </mesh>

      {/* East wall */}
      <mesh
        position={[50, 2, 0]}
        ref={(m) => {
          if (!m) return
          if (!(window as any).colliders) (window as any).colliders = []
          if (!(window as any).colliders.includes(m)) (window as any).colliders.push(m)
        }}
      >
        <boxGeometry args={[2, 4, 100]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#0a0a1a" emissiveIntensity={0.3} transparent opacity={0.2} />
      </mesh>

      <Player />
      <WaveManager />

      {!paused && !gameOver && <PointerLockControls />}
    </Canvas>
  )
}