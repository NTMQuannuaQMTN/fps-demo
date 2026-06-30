import { useEffect, useRef, useState } from "react"

export type MobileInputState = {
  joystickX: number
  joystickY: number
  isShooting: boolean
  isReloading: boolean
  isGetting: boolean
}

// Separate mutable accumulator for per-frame delta inputs.
// Player.tsx reads and zeroes these each useFrame — never goes through React state.
export type MobileDeltas = {
  gyroYaw: number
  gyroPitch: number
  fingerLookX: number
  fingerLookY: number
}

const DEFAULT_STATE: MobileInputState = {
  joystickX: 0,
  joystickY: 0,
  isShooting: false,
  isReloading: false,
  isGetting: false,
}

function getDeltas(): MobileDeltas {
  if (!(window as any).mobileDeltas) {
    ;(window as any).mobileDeltas = { gyroYaw: 0, gyroPitch: 0, fingerLookX: 0, fingerLookY: 0 }
  }
  return (window as any).mobileDeltas as MobileDeltas
}

export function MobileControls() {
  const joystickContainerRef = useRef<HTMLDivElement>(null)
  const joystickStickRef = useRef<HTMLDivElement>(null)
  const rightButtonsRef = useRef<HTMLDivElement>(null)
  const [mobileInput, setMobileInput] = useState<MobileInputState>(DEFAULT_STATE)
  const lastGyroRef = useRef({ alpha: 0, beta: 0, gamma: 0, initialized: false })
  const lastFingerLookRef = useRef({ x: 0, y: 0 })
  const fingerLookActiveRef = useRef(false)
  const [gyroPermission, setGyroPermission] = useState<"unknown" | "granted" | "denied" | "na">("unknown")

  // Sync instantaneous inputs to window for Player.tsx poll
  useEffect(() => {
    ;(window as any).mobileInput = mobileInput
  }, [mobileInput])

  // =========================
  // JOYSTICK
  // =========================

  useEffect(() => {
    const container = joystickContainerRef.current
    const stick = joystickStickRef.current
    if (!container) return

    const radius = 50
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 0) return

      const touch = e.touches[0]
      const rect = container.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx = touch.clientX - centerX
      const dy = touch.clientY - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      let joystickX = dx / radius
      let joystickY = -dy / radius

      if (distance > radius) {
        joystickX = (dx / distance)
        joystickY = (-dy / distance)
      }

      joystickX = Math.max(-1, Math.min(1, joystickX))
      joystickY = Math.max(-1, Math.min(1, joystickY))

      const limitedDist = Math.min(distance, radius)
      const stickX = (limitedDist / radius) * (dx / distance || 0) * radius
      const stickY = (limitedDist / radius) * (dy / distance || 0) * radius

      if (stick) {
        stick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`
      }

      setMobileInput((prev) => ({ ...prev, joystickX, joystickY }))
    }

    const handleTouchEnd = () => {
      if (stick) stick.style.transform = "translate(-50%, -50%)"
      setMobileInput((prev) => ({ ...prev, joystickX: 0, joystickY: 0 }))
    }

    container.addEventListener("touchmove", handleTouchMove, { passive: false })
    container.addEventListener("touchend", handleTouchEnd)

    return () => {
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
    }
  }, [])

  // =========================
  // SHOOT BUTTON
  // =========================

  const handleShootStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation()
    setMobileInput((prev) => ({ ...prev, isShooting: true }))
  }

  const handleShootEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation()
    setMobileInput((prev) => ({ ...prev, isShooting: false }))
  }

  // =========================
  // RELOAD BUTTON
  // =========================

  const handleReload = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation()
    setMobileInput((prev) => ({ ...prev, isReloading: true }))
    setTimeout(() => setMobileInput((prev) => ({ ...prev, isReloading: false })), 100)
  }

  // =========================
  // GET BUTTON (E KEY)
  // =========================

  const handleGet = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation()
    setMobileInput((prev) => ({ ...prev, isGetting: true }))
    setTimeout(() => setMobileInput((prev) => ({ ...prev, isGetting: false })), 100)
  }

  // =========================
  // GYRO (writes to window.mobileDeltas, not React state)
  // =========================

  useEffect(() => {
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (typeof event.alpha !== "number" || typeof event.beta !== "number" || typeof event.gamma !== "number") return

      const alpha = event.alpha
      const beta = event.beta

      if (!lastGyroRef.current.initialized) {
        lastGyroRef.current = { alpha, beta, gamma: event.gamma ?? 0, initialized: true }
        return
      }

      let deltaAlpha = alpha - lastGyroRef.current.alpha
      const deltaBeta = beta - lastGyroRef.current.beta

      // Handle 360→0 wraparound for alpha
      if (deltaAlpha > 180) deltaAlpha -= 360
      if (deltaAlpha < -180) deltaAlpha += 360

      lastGyroRef.current = { alpha, beta, gamma: event.gamma ?? 0, initialized: true }

      const sensitivity = 0.005
      // Accumulate directly — Player.tsx will consume and zero each frame
      const d = getDeltas()
      d.gyroYaw += deltaAlpha * sensitivity
      d.gyroPitch += deltaBeta * sensitivity
    }

    const enableGyro = async () => {
      try {
        if (
          typeof DeviceOrientationEvent !== "undefined" &&
          typeof (DeviceOrientationEvent as any).requestPermission === "function"
        ) {
          // iOS 13+ requires user gesture — button handles this, skip auto-request
          return
        }
        // Android / non-iOS browsers: enable immediately
        window.addEventListener("deviceorientation", handleDeviceOrientation)
        setGyroPermission("granted")
      } catch (err) {
        console.error("Gyro error:", err)
        setGyroPermission("denied")
      }
    }

    enableGyro()

    return () => {
      window.removeEventListener("deviceorientation", handleDeviceOrientation)
    }
  }, [])

  const requestGyroPermission = async () => {
    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission()
      if (permission === "granted") {
        setGyroPermission("granted")
        const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
          if (typeof event.alpha !== "number" || typeof event.beta !== "number") return

          const alpha = event.alpha
          const beta = event.beta

          if (!lastGyroRef.current.initialized) {
            lastGyroRef.current = { alpha, beta, gamma: event.gamma ?? 0, initialized: true }
            return
          }

          let deltaAlpha = alpha - lastGyroRef.current.alpha
          const deltaBeta = beta - lastGyroRef.current.beta

          if (deltaAlpha > 180) deltaAlpha -= 360
          if (deltaAlpha < -180) deltaAlpha += 360

          lastGyroRef.current = { alpha, beta, gamma: event.gamma ?? 0, initialized: true }

          const d = getDeltas()
          d.gyroYaw += deltaAlpha * 0.005
          d.gyroPitch += deltaBeta * 0.005
        }
        window.addEventListener("deviceorientation", handleDeviceOrientation)
      } else {
        setGyroPermission("denied")
      }
    } catch {
      setGyroPermission("denied")
    }
  }

  const needsGyroButton =
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as any).requestPermission === "function" &&
    gyroPermission === "unknown"

  // =========================
  // SWIPE LOOK (right side of screen, excludes joystick and buttons)
  // =========================

  useEffect(() => {
    const joystickContainer = joystickContainerRef.current
    const rightButtons = rightButtonsRef.current

    const isInElement = (el: HTMLElement | null, x: number, y: number, padding = 20): boolean => {
      if (!el) return false
      const rect = el.getBoundingClientRect()
      return x >= rect.left - padding && x <= rect.right + padding && y >= rect.top - padding && y <= rect.bottom + padding
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      if (isInElement(joystickContainer, touch.clientX, touch.clientY)) return
      if (isInElement(rightButtons, touch.clientX, touch.clientY)) return

      fingerLookActiveRef.current = true
      lastFingerLookRef.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!fingerLookActiveRef.current || e.touches.length !== 1) return

      const touch = e.touches[0]
      const dx = touch.clientX - lastFingerLookRef.current.x
      const dy = touch.clientY - lastFingerLookRef.current.y

      lastFingerLookRef.current = { x: touch.clientX, y: touch.clientY }

      const sensitivity = 0.015
      // Accumulate directly — Player.tsx will consume and zero each frame
      const d = getDeltas()
      d.fingerLookX += dx * sensitivity
      d.fingerLookY += dy * sensitivity
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        fingerLookActiveRef.current = false
      }
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: true })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [])

  return (
    <div className="mobile-controls">
      {/* Joystick */}
      <div style={styles.joystickContainer} ref={joystickContainerRef}>
        <div style={styles.joystickBg}>
          <div style={styles.joystickStick} ref={joystickStickRef} />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.rightButtonsContainer} ref={rightButtonsRef}>
        <button
          style={styles.shootButton}
          onTouchStart={handleShootStart}
          onTouchEnd={handleShootEnd}
          onMouseDown={handleShootStart}
          onMouseUp={handleShootEnd}
        >
          FIRE
        </button>
        <button
          style={styles.reloadButton}
          onTouchStart={handleReload}
          onMouseDown={handleReload}
        >
          R
        </button>
        <button
          style={styles.getButton}
          onTouchStart={handleGet}
          onMouseDown={handleGet}
        >
          E
        </button>
      </div>

      {/* iOS gyro permission */}
      {needsGyroButton && (
        <button style={styles.gyroPermButton} onTouchStart={(e) => { e.stopPropagation(); requestGyroPermission() }}>
          Enable Gyro
        </button>
      )}

      {/* Status hint */}
      <div style={styles.gyroNotice}>
        {gyroPermission === "granted" ? "Gyro + Swipe" : "Swipe to look"}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  joystickContainer: {
    position: "fixed",
    bottom: "80px",
    left: "30px",
    width: "120px",
    height: "120px",
    zIndex: 10000,
    pointerEvents: "auto",
    touchAction: "none",
  },
  joystickBg: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    touchAction: "none",
  },
  joystickStick: {
    position: "absolute",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "rgba(0, 246, 255, 0.6)",
    border: "2px solid rgba(0, 246, 255, 0.9)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  rightButtonsContainer: {
    position: "fixed",
    bottom: "80px",
    right: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    zIndex: 10000,
    pointerEvents: "auto",
    touchAction: "manipulation",
  },
  shootButton: {
    fontSize: "13px",
    fontWeight: "bold",
    backgroundColor: "rgba(255, 0, 0, 0.75)",
    color: "white",
    border: "2px solid rgba(255,80,80,0.8)",
    borderRadius: "50%",
    width: "68px",
    height: "68px",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "manipulation",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 12px rgba(255,0,0,0.4)",
  },
  reloadButton: {
    fontSize: "14px",
    fontWeight: "bold",
    backgroundColor: "rgba(255, 165, 0, 0.75)",
    color: "white",
    border: "2px solid rgba(255,200,50,0.8)",
    borderRadius: "50%",
    width: "52px",
    height: "52px",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "manipulation",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  getButton: {
    fontSize: "14px",
    fontWeight: "bold",
    backgroundColor: "rgba(0, 200, 100, 0.75)",
    color: "white",
    border: "2px solid rgba(50,255,150,0.8)",
    borderRadius: "50%",
    width: "52px",
    height: "52px",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "manipulation",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  gyroPermButton: {
    position: "fixed",
    top: "50px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "bold",
    backgroundColor: "rgba(0, 150, 255, 0.85)",
    color: "white",
    border: "2px solid rgba(100,200,255,0.8)",
    borderRadius: "8px",
    cursor: "pointer",
    zIndex: 10001,
    pointerEvents: "auto",
    touchAction: "manipulation",
  },
  gyroNotice: {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.5)",
    pointerEvents: "none",
    zIndex: 10000,
    letterSpacing: "0.5px",
  },
}
