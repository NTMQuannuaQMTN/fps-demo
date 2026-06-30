import { useEffect, useState } from "react"
import { useGameStore } from "./useGameStore"
import { useProgressionStore } from "./useProgressionStore"

export function HUD() {
    const hp = useGameStore((s) => s.hp)
    const ammo = useGameStore((s) => s.ammo)
    const isReloading = useGameStore((s) => s.isReloading)
    const reloadEndAt = useGameStore((s) => s.reloadEndAt)
    const weapon = useGameStore((s) => s.weapon)
    const mobsLeft = useGameStore((s) => s.mobsLeft)
    const kills = useGameStore((s) => s.kills)
    const wave = useGameStore((s) => s.wave)
    const wavePhase = useGameStore((s) => s.wavePhase)
    const breakEndsAt = useGameStore((s) => s.breakEndsAt)
    const hitMarkerVisible = useGameStore((s) => s.hitMarkerVisible)
    const orbProgress = useGameStore((s) => s.orbProgress)
    const gameOver = useGameStore((s) => s.gameOver)
    const survivedSeconds = useGameStore((s) => s.survivedSeconds)
    const resetGame = useGameStore((s) => s.resetGame)
    const pelletHits = useGameStore((s) => s.pelletHits)

    const exp = useProgressionStore((s) => s.exp)
    const nextExp = useProgressionStore((s) => s.nextExp)
    const level = useProgressionStore((s) => s.level)
    const speed = useProgressionStore((s) => s.stats.speed)
    const attack = useProgressionStore((s) => s.stats.attack)
    const defense = useProgressionStore((s) => s.stats.defense)
    const luck = useProgressionStore((s) => s.stats.luck)
    const hpStat = useProgressionStore((s) => s.stats.hp)
    const resetProgression = useProgressionStore((s) => s.resetProgression)

    const maxHp = 100 * Math.pow(1.05, Math.max(0, (hpStat - 100) / 10))
    const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100))
    const expPercent = (exp / nextExp) * 100
    const score = kills * 100

    const [now, setNow] = useState(Date.now())
    const [nearInfo, setNearInfo] = useState<{ type: 'crate' | 'orb'; holding: boolean; blocked?: boolean } | null>(null)

    useEffect(() => {
        const needsTick = isReloading || wavePhase === "break"
        if (!needsTick) return
        const id = setInterval(() => setNow(Date.now()), 100)
        return () => clearInterval(id)
    }, [isReloading, wavePhase])

    useEffect(() => {
        const id = setInterval(() => {
            setNearInfo((window as any).nearInteractableInfo ?? null)
        }, 80)
        return () => clearInterval(id)
    }, [])

    const reloadSecondsLeft = Math.max(0, (reloadEndAt - now) / 1000)
    const breakSecondsLeft = Math.max(0, (breakEndsAt - now) / 1000)

    // HP bar color: green → yellow → red
    const hpColor = hpPercent > 60
        ? `hsl(${(hpPercent - 60) * 2.2 + 80}, 90%, 48%)`
        : hpPercent > 30
        ? `hsl(${hpPercent * 1.3 + 30}, 90%, 50%)`
        : `hsl(${hpPercent * 1.3}, 90%, 50%)`

    const handlePlayAgain = () => {
        resetProgression()
        resetGame()
    }

    const line = (style: React.CSSProperties) => (
        <div style={{ ...styles.crosshairLine, ...style }} />
    )

    return (
        <div style={styles.container}>
            <style>{`
                @keyframes fadeOut {
                    from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    to   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                }
                @keyframes hitFlash {
                    0%   { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
                @keyframes reloadPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.55; }
                }
            `}</style>

            {/* ── CROSSHAIR ─────────────────────────── */}
            <div style={styles.crosshairOrigin}>
                {line({ top: -1, right: 6,  width: 12, height: 2 })}
                {line({ top: -1, left: 6,   width: 12, height: 2 })}
                {line({ left: -1, bottom: 6, width: 2, height: 12 })}
                {line({ left: -1, top: 6,    width: 2, height: 12 })}
                {hitMarkerVisible && <div style={styles.hitMarker}>✕</div>}
            </div>

            {/* ── ORB PROGRESS RING ─────────────────── */}
            {orbProgress > 0 && (
                <div style={{
                    ...styles.orbRing,
                    background: `conic-gradient(#00f6ff ${orbProgress * 360}deg, rgba(255,255,255,0.10) 0deg)`,
                }}>
                    <div style={styles.orbRingInner} />
                    <div style={styles.lootingLabel}>
                        {nearInfo?.type === 'crate' ? 'LOOTING CRATE...' : 'COLLECTING XP...'}
                    </div>
                </div>
            )}

            {/* ── INTERACTION HINT ──────────────────── */}
            {nearInfo && !nearInfo.blocked && orbProgress === 0 && (
                <div style={styles.interactHint}>
                    {nearInfo.type === 'crate'
                        ? '[ E / GET ]  Hold to loot crate'
                        : '[ E / GET ]  Hold to collect XP'}
                </div>
            )}

            {/* ── PELLET HITS ───────────────────────── */}
            {pelletHits.map((hit) => (
                <div key={hit.id} style={{
                    ...styles.pelletHit,
                    left: `${50 + hit.x}%`,
                    top:  `${50 + hit.y}%`,
                }} />
            ))}

            {/* ── TOP: WAVE INFO ────────────────────── */}
            <div style={styles.topBar}>
                <div style={styles.waveChip}>
                    WAVE {wave}
                </div>
                {wavePhase === "break" ? (
                    <div style={styles.breakBanner}>
                        ⏱ Next wave in {Math.ceil(breakSecondsLeft)}s — loot crates!
                    </div>
                ) : (
                    <div style={styles.combatInfo}>
                        <span style={styles.combatStat}>☠ {mobsLeft} left</span>
                        <span style={styles.combatDot}>·</span>
                        <span style={styles.combatStat}>✦ {kills} kills</span>
                        <span style={styles.combatDot}>·</span>
                        <span style={styles.combatStat}>{score} pts</span>
                    </div>
                )}
            </div>

            {/* ── BOTTOM LEFT: HP / EXP / STATS ────── */}
            <div style={styles.bottomLeft}>
                {/* HP */}
                <div style={styles.barLabel}>
                    <span style={{ color: '#ff6b6b' }}>❤</span>
                    <span>{Math.round(hp)} / {Math.round(maxHp)}</span>
                </div>
                <div style={styles.barTrack}>
                    <div style={{
                        ...styles.barFill,
                        width: `${hpPercent}%`,
                        background: hpColor,
                        boxShadow: `0 0 8px ${hpColor}88`,
                    }} />
                </div>

                {/* EXP */}
                <div style={{ ...styles.barLabel, marginTop: 8 }}>
                    <span style={{ color: '#00d7ff' }}>⚡</span>
                    <span>LV {level}  ·  {Math.floor(exp)} / {nextExp}</span>
                </div>
                <div style={styles.barTrack}>
                    <div style={{
                        ...styles.barFill,
                        width: `${expPercent}%`,
                        background: 'linear-gradient(90deg, #00b4d8, #48cae4)',
                        boxShadow: '0 0 8px rgba(0,212,255,0.6)',
                    }} />
                </div>

                {/* Mini stats */}
                <div style={styles.miniStats}>
                    <span>SPD {(speed * 100).toFixed(0)}%</span>
                    <span style={styles.dot}>·</span>
                    <span>ATK +{attack.toFixed(0)}</span>
                    <span style={styles.dot}>·</span>
                    <span>DEF {defense.toFixed(0)}</span>
                    <span style={styles.dot}>·</span>
                    <span>LCK {luck}</span>
                </div>
            </div>

            {/* ── BOTTOM RIGHT: WEAPON / AMMO ───────── */}
            <div style={styles.bottomRight}>
                <div style={styles.weaponName}>{weapon.name}</div>
                {weapon.pierceWalls ? (
                    <div style={styles.pierceTag}>PIERCE ×{weapon.pierceWalls}</div>
                ) : null}
                <div style={styles.ammoDisplay}>
                    <span style={styles.ammoMag}>{ammo}</span>
                    <span style={styles.ammoSep}> / </span>
                    <span style={styles.ammoTotal}>{weapon.magSize}</span>
                </div>
                {isReloading ? (
                    <div style={styles.reloadBadge}>
                        ↻ RELOADING  {reloadSecondsLeft.toFixed(1)}s
                    </div>
                ) : ammo === 0 ? (
                    <div style={styles.emptyBadge}>EMPTY — press R</div>
                ) : null}
            </div>

            {/* ── GAME OVER ─────────────────────────── */}
            {gameOver && (
                <div style={styles.gameOverOverlay}>
                    <div style={styles.gameOverTitle}>GAME OVER</div>
                    <div style={styles.gameOverStat}>Score: <strong>{score}</strong></div>
                    <div style={styles.gameOverStat}>Kills: <strong>{kills}</strong></div>
                    <div style={styles.gameOverStat}>Survived: <strong>{Math.round(survivedSeconds)}s</strong></div>
                    <div style={styles.gameOverStat}>Wave reached: <strong>{wave}</strong></div>
                    <button style={styles.playAgainButton} onClick={handlePlayAgain}>
                        PLAY AGAIN
                    </button>
                </div>
            )}
        </div>
    )
}

const glassPanel: React.CSSProperties = {
    background: "rgba(4, 8, 20, 0.72)",
    border: "1px solid rgba(255, 255, 255, 0.10)",
    borderRadius: 12,
    padding: "12px 16px",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 28px rgba(0,0,0,0.5)",
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        color: "white",
        fontFamily: "'Courier New', Courier, monospace",
        userSelect: "none",
    },

    // ── crosshair ──────────────────────────────
    crosshairOrigin: {
        position: "absolute",
        top: "50%",
        left: "50%",
    },
    crosshairLine: {
        position: "absolute",
        background: "rgba(255, 255, 255, 0.92)",
        boxShadow: "0 0 4px rgba(0,0,0,0.85)",
    },
    hitMarker: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: 26,
        fontWeight: 900,
        color: "#ff2222",
        textShadow: "0 0 14px rgba(255,34,34,0.95)",
        animation: "hitFlash 0.18s ease-out forwards",
        pointerEvents: "none",
    },

    // ── orb ring ───────────────────────────────
    orbRing: {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 72,
        height: 72,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        padding: 6,
        boxShadow: "0 0 20px rgba(0,246,255,0.4)",
    },
    orbRingInner: {
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: "rgba(0,0,0,0.7)",
        border: "1px solid rgba(255,255,255,0.18)",
    },
    lootingLabel: {
        position: "absolute",
        bottom: -28,
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 12,
        fontWeight: "bold",
        color: "#00f6ff",
        textShadow: "0 0 8px rgba(0,246,255,0.9)",
        whiteSpace: "nowrap",
        letterSpacing: "0.5px",
    },

    // ── interact hint ──────────────────────────
    interactHint: {
        position: "absolute",
        top: "calc(50% + 52px)",
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 13,
        fontWeight: "bold",
        color: "rgba(255,255,255,0.9)",
        textShadow: "0 0 10px rgba(0,0,0,0.9)",
        background: "rgba(0,0,0,0.55)",
        padding: "4px 14px",
        borderRadius: 20,
        whiteSpace: "nowrap",
        border: "1px solid rgba(255,255,255,0.15)",
        letterSpacing: "0.3px",
    },

    // ── pellet hits ────────────────────────────
    pelletHit: {
        position: "absolute",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "#ffee00",
        boxShadow: "0 0 6px rgba(255,238,0,0.9)",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        animation: "fadeOut 0.28s ease-out forwards",
    },

    // ── top bar ────────────────────────────────
    topBar: {
        position: "absolute",
        top: 12,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        pointerEvents: "none",
    },
    waveChip: {
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: "4px",
        color: "#ffffff",
        background: "rgba(255,100,0,0.25)",
        border: "1px solid rgba(255,120,0,0.5)",
        borderRadius: 20,
        padding: "3px 16px",
        textShadow: "0 0 12px rgba(255,80,0,0.9)",
    },
    combatInfo: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        color: "rgba(255,255,255,0.7)",
    },
    combatStat: {
        letterSpacing: "0.3px",
    },
    combatDot: {
        color: "rgba(255,255,255,0.3)",
    },
    breakBanner: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#00f6ff",
        textShadow: "0 0 14px rgba(0,246,255,0.8)",
        letterSpacing: "0.5px",
        animation: "reloadPulse 1.5s ease-in-out infinite",
    },

    // ── bottom left ────────────────────────────
    bottomLeft: {
        ...glassPanel,
        position: "absolute",
        bottom: 20,
        left: 20,
        minWidth: 200,
        maxWidth: 240,
    },
    barLabel: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "rgba(255,255,255,0.75)",
        marginBottom: 4,
        letterSpacing: "0.3px",
    },
    barTrack: {
        width: "100%",
        height: 8,
        background: "rgba(255,255,255,0.08)",
        borderRadius: 4,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
    },
    barFill: {
        height: "100%",
        borderRadius: 4,
        transition: "width 0.12s ease-out",
    },
    miniStats: {
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 10,
        fontSize: 11,
        color: "rgba(255,255,255,0.4)",
        letterSpacing: "0.2px",
    },
    dot: {
        color: "rgba(255,255,255,0.2)",
    },

    // ── bottom right ───────────────────────────
    bottomRight: {
        ...glassPanel,
        position: "absolute",
        bottom: 20,
        right: 20,
        minWidth: 140,
        textAlign: "right",
    },
    weaponName: {
        fontSize: 12,
        fontWeight: "bold",
        color: "rgba(255,255,255,0.5)",
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        marginBottom: 4,
    },
    pierceTag: {
        fontSize: 10,
        color: "#a78bfa",
        letterSpacing: "1px",
        marginBottom: 4,
        textShadow: "0 0 8px rgba(167,139,250,0.8)",
    },
    ammoDisplay: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "flex-end",
        gap: 2,
        lineHeight: 1,
    },
    ammoMag: {
        fontSize: 40,
        fontWeight: 900,
        color: "#ffffff",
        textShadow: "0 0 16px rgba(255,255,255,0.3)",
        letterSpacing: "-1px",
    },
    ammoSep: {
        fontSize: 20,
        color: "rgba(255,255,255,0.25)",
        padding: "0 2px",
    },
    ammoTotal: {
        fontSize: 20,
        color: "rgba(255,255,255,0.45)",
    },
    reloadBadge: {
        marginTop: 6,
        fontSize: 11,
        fontWeight: "bold",
        color: "#ffd166",
        textShadow: "0 0 8px rgba(255,209,102,0.8)",
        letterSpacing: "0.5px",
        animation: "reloadPulse 0.7s ease-in-out infinite",
    },
    emptyBadge: {
        marginTop: 6,
        fontSize: 11,
        fontWeight: "bold",
        color: "#ff6b6b",
        letterSpacing: "0.5px",
        animation: "reloadPulse 0.7s ease-in-out infinite",
    },

    // ── game over ──────────────────────────────
    gameOverOverlay: {
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        pointerEvents: "auto",
    },
    gameOverTitle: {
        fontSize: 60,
        fontWeight: 900,
        color: "#ff3d3d",
        letterSpacing: "4px",
        textShadow: "0 0 30px rgba(255,61,61,0.8)",
        marginBottom: 8,
    },
    gameOverStat: {
        fontSize: 18,
        color: "rgba(255,255,255,0.8)",
        letterSpacing: "0.5px",
    },
    playAgainButton: {
        marginTop: 20,
        background: "transparent",
        color: "#00d7ff",
        border: "2px solid #00d7ff",
        borderRadius: 8,
        padding: "12px 36px",
        fontSize: 15,
        fontWeight: "bold",
        fontFamily: "inherit",
        cursor: "pointer",
        letterSpacing: "2px",
        boxShadow: "0 0 20px rgba(0,215,255,0.4)",
        transition: "background 0.15s",
        pointerEvents: "auto",
    },
}
