import { useEffect, useRef, useState } from "react"

export type MobileInputState = {
  joystickX: number
  joystickY: number
  isShooting: boolean
  isReloading: boolean
  isGetting: boolean
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
  gyroYaw: 0,
  gyroPitch: 0,
  fingerLookX: 0,
  fingerLookY: 0,
}

export function MobileControls() {
  const joystickContainerRef = useRef<HTMLDivElement>(null)
  const joystickStickRef = useRef<HTMLDivElement>(null)
  const [mobileInput, setMobileInput] = useState<MobileInputState>(DEFAULT_STATE)
  const lastGyroRef = useRef({ alpha: 0, beta: 0, gamma: 0 })
  const lastFingerLookRef = useRef({ x: 0, y: 0 })
  const fingerLookActiveRef = useRef(false)

  // Store mobile input in window for Player.tsx to access
  useEffect(() => {
    (window as any).mobileInput = mobileInput
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
      if (e.touches.length === 0) return

      const touch = e.touches[0]
      const rect = container.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx = touch.clientX - centerX
      const dy = touch.clientY - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const maxDistance = radius

      let joystickX = dx / maxDistance
      let joystickY = -dy / maxDistance

      if (distance > maxDistance) {
        joystickX = (dx / distance) * (maxDistance / maxDistance)
        joystickY = (-dy / distance) * (maxDistance / maxDistance)
      } else {
        joystickX = dx / maxDistance
        joystickY = -dy / maxDistance
      }

      joystickX = Math.max(-1, Math.min(1, joystickX))
      joystickY = Math.max(-1, Math.min(1, joystickY))

      const limitedDistance = Math.min(distance, maxDistance)
      const stickX = (limitedDistance / maxDistance) * (dx / distance || 0) * radius
      const stickY = (limitedDistance / maxDistance) * (dy / distance || 0) * radius

      if (stick) {
        stick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`
      }

      setMobileInput((prev) => ({
        ...prev,
        joystickX,
        joystickY,
      }))
    }

    const handleTouchEnd = () => {
      if (stick) {
        stick.style.transform = "translate(-50%, -50%)"
      }
      setMobileInput((prev) => ({
        ...prev,
        joystickX: 0,
        joystickY: 0,
      }))
    }

    // Bind to the joystick container to avoid interfering with page-level touch
    // handling (scroll/zoom) which can cause the UI to flicker/disappear.
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    })
    container.addEventListener("touchend", handleTouchEnd)

    return () => {
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
    }
  }, [])

  // =========================
  // SHOOT BUTTON
  // =========================

  const handleShootStart = () => {
    setMobileInput((prev) => ({ ...prev, isShooting: true }))
  }

  const handleShootEnd = () => {
    setMobileInput((prev) => ({ ...prev, isShooting: false }))
  }

  // =========================
  // RELOAD BUTTON
  // =========================

  const handleReload = () => {
    setMobileInput((prev) => ({ ...prev, isReloading: true }))
    setTimeout(() => {
      setMobileInput((prev) => ({ ...prev, isReloading: false }))
    }, 100)
  }

  // =========================
  // GET BUTTON (E KEY)
  // =========================

  const handleGet = () => {
    setMobileInput((prev) => ({ ...prev, isGetting: true }))
    setTimeout(() => {
      setMobileInput((prev) => ({ ...prev, isGetting: false }))
    }, 100)
  }

  // =========================
  // GYRO
  // =========================

  useEffect(() => {
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) return

      const alpha = event.alpha // Z axis rotation (0-360)
      const beta = event.beta // X axis rotation (-180 to 180)
      const gamma = event.gamma // Y axis rotation (-90 to 90)

      const deltaAlpha = alpha - lastGyroRef.current.alpha
      const deltaBeta = beta - lastGyroRef.current.beta

      lastGyroRef.current = { alpha, beta, gamma }

      // Convert to radians and apply sensitivity
      const sensitivity = 0.01
      const yaw = deltaAlpha * sensitivity
      const pitch = deltaBeta * sensitivity

      setMobileInput((prev) => ({
        ...prev,
        gyroYaw: prev.gyroYaw + yaw,
        gyroPitch: prev.gyroPitch + pitch,
      }))
    }

    const handlePermission = async () => {
      try {
        // iOS 13+
        if (
          typeof DeviceOrientationEvent !== "undefined" &&
          typeof (DeviceOrientationEvent as any).requestPermission === "function"
        ) {
          const permission = await (DeviceOrientationEvent as any).requestPermission()
          if (permission === "granted") {
            window.addEventListener("deviceorientation", handleDeviceOrientation, true)
          }
        } else if (typeof DeviceOrientationEvent !== "undefined") {
          // Android and non-iOS browsers
          window.addEventListener("deviceorientation", handleDeviceOrientation, true)
        }
      } catch (err) {
        console.error("Gyro permission error:", err)
        // Fallback: try to listen anyway
        if (typeof DeviceOrientationEvent !== "undefined") {
          window.addEventListener("deviceorientation", handleDeviceOrientation, true)
        }
      }
    }

    handlePermission()

    return () => {
      window.removeEventListener("deviceorientation", handleDeviceOrientation, true)
    }
  }, [])

  // =========================
  // FINGER LOOK (TWO FINGER DRAG)
  // =========================

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        fingerLookActiveRef.current = true
        lastFingerLookRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!fingerLookActiveRef.current || e.touches.length !== 2) return

      const currentX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2

      const dx = currentX - lastFingerLookRef.current.x
      const dy = currentY - lastFingerLookRef.current.y

      const sensitivity = 0.002

      setMobileInput((prev) => ({
        ...prev,
        fingerLookX: dx * sensitivity,
        fingerLookY: dy * sensitivity,
      }))

      lastFingerLookRef.current = { x: currentX, y: currentY }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        fingerLookActiveRef.current = false
        setMobileInput((prev) => ({
          ...prev,
          fingerLookX: 0,
          fingerLookY: 0,
        }))
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
      <div
        style={styles.joystickContainer}
        ref={joystickContainerRef}
      >
        <div style={styles.joystickBg}>
          <div style={styles.joystickStick} ref={joystickStickRef} />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.rightButtonsContainer}>
        {/* Shoot Button */}
        <button
          style={styles.shootButton}
          onTouchStart={handleShootStart}
          onTouchEnd={handleShootEnd}
          onMouseDown={handleShootStart}
          onMouseUp={handleShootEnd}
          title="Shoot"
        >
          SHOOT
        </button>

        {/* Reload Button */}
        <button
          style={styles.reloadButton}
          onTouchStart={handleReload}
          onMouseDown={handleReload}
          title="Reload (R)"
        >
          R
        </button>

        {/* Get Button */}
        <button
          style={styles.getButton}
          onTouchStart={handleGet}
          onMouseDown={handleGet}
          title="Get (E)"
        >
          E
        </button>
      </div>

      {/* Gyro permission button (optional) */}
      <div style={styles.gyroNotice}>
        Gyro & finger look enabled
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
    touchAction: "manipulation",
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
    padding: "15px 30px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "60px",
    height: "60px",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "manipulation",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  reloadButton: {
    padding: "12px 24px",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor: "rgba(255, 165, 0, 0.7)",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "50px",
    height: "50px",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "manipulation",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  getButton: {
    padding: "12px 24px",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor: "rgba(0, 200, 100, 0.7)",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "50px",
    height: "50px",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "manipulation",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  gyroNotice: {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.6)",
    pointerEvents: "none",
    zIndex: 10000,
  },
}
