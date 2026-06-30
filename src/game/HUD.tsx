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
    const score = kills * 100
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
    const [now, setNow] = useState(Date.now())
    const [nearInfo, setNearInfo] = useState<{ type: 'crate' | 'orb'; holding: boolean; blocked?: boolean } | null>(null)

    useEffect(() => {
        const needsTick = isReloading || wavePhase === "break"
        if (!needsTick) return

        const id = setInterval(() => {
            setNow(Date.now())
        }, 100)

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

    const handlePlayAgain = () => {
        resetProgression()
        resetGame()
    }

    return (
        <div style={styles.container}>
            <style>{`
                @keyframes fadeOut {
                    from {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                }
            `}</style>
            {/* Crosshair */}
            <div style={styles.crosshair}>+</div>

            {orbProgress > 0 && (
                <div
                    style={{
                        ...styles.orbRing,
                        background: `conic-gradient(#00f6ff ${orbProgress * 360}deg, rgba(255, 255, 255, 0.12) 0deg)`,
                    }}
                >
                    <div style={styles.orbRingInner} />
                    <div style={styles.lootingLabel}>
                        {nearInfo?.type === 'crate' ? 'LOOTING CRATE...' : 'COLLECTING XP...'}
                    </div>
                </div>
            )}

            {nearInfo && !nearInfo.blocked && orbProgress === 0 && (
                <div style={styles.interactHint}>
                    {nearInfo.type === 'crate'
                        ? 'Hold E / GET to loot crate'
                        : 'Hold E / GET to collect XP'}
                </div>
            )}

            {hitMarkerVisible && <div style={styles.hitMarker}>X</div>}

            {pelletHits.map((hit) => (
                <div
                    key={hit.id}
                    style={{
                        ...styles.pelletHit,
                        left: `${50 + hit.x}%`,
                        top: `${50 + hit.y}%`,
                    }}
                />
            ))}

            {/* Top - wave, score, mobs */}
            <div style={styles.top}>
                <div style={styles.waveLabel}>WAVE {wave}</div>
                {wavePhase === "break" ? (
                    <div style={styles.breakBanner}>
                        Next wave in {Math.ceil(breakSecondsLeft)}s — loot crates!
                    </div>
                ) : (
                    <div style={styles.topSub}>Mobs: {mobsLeft} | Kills: {kills} | Score: {score}</div>
                )}
            </div>

            <div style={styles.leftStats}>
                <div style={styles.leftStatsTitle}>STATS</div>
                <div>Weapon: {weapon.name}</div>
                <div>Level: {level}</div>
                <div>Speed: {(speed * 100).toFixed(0)}%</div>
                <div>Attack: +{attack.toFixed(0)}</div>
                <div>Defense: {defense.toFixed(0)}</div>
                <div>Luck: {(luck * 100).toFixed(0)}%</div>
            </div>

            {/* Bottom */}
            <div style={styles.bottom}>
                <div style={styles.bottomCenter}>
                    <div style={styles.barLabel}>HP {Math.round(hp)} / {Math.round(maxHp)}</div>
                    <div style={styles.barShell}>
                        <div style={{ ...styles.hpBarFill, width: `${hpPercent}%` }} />
                    </div>
                    <div style={styles.barLabel}>EXP {Math.floor(exp)} / {nextExp} | LV {level}</div>
                    <div style={styles.barShell}>
                        <div style={{ ...styles.expBarFill, width: `${expPercent}%` }} />
                    </div>
                </div>
                <div style={styles.ammoWrap}>
                    {isReloading && (
                        <span style={styles.reloadText}>Reloading {reloadSecondsLeft.toFixed(1)}s</span>
                    )}
                    <div style={styles.ammoRow}>
                        <span style={styles.bulletIcon} />
                        <span style={styles.ammoCounter}>{ammo} / {weapon.magSize}</span>
                    </div>
                </div>
            </div>

            {gameOver && (
                <div style={styles.gameOverOverlay}>
                    <div style={styles.gameOverTitle}>GAME OVER</div>
                    <div style={styles.gameOverText}>Score: {score}</div>
                    <div style={styles.gameOverText}>Time Survived: {Math.round(survivedSeconds)}s</div>
                    <button style={styles.playAgainButton} onClick={handlePlayAgain}>Play Again</button>
                </div>
            )}
        </div>
    )
}

const styles: any = {
    container: {
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        color: "white",
        fontFamily: "monospace",
    },
    crosshair: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "20px",
    },
    orbRing: {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "72px",
        height: "72px",
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        padding: "6px",
        boxShadow: "0 0 18px rgba(0, 246, 255, 0.35)",
    },
    orbRingInner: {
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: "rgba(0, 0, 0, 0.65)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
    },
    hitMarker: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "24px",
        color: "#ff2a2a",
        fontWeight: "900",
        textShadow: "0 0 12px rgba(255, 42, 42, 0.9)",
    },
    pelletHit: {
        position: "absolute",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: "#ffff00",
        boxShadow: "0 0 6px rgba(255, 255, 0, 0.8)",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        animation: "fadeOut 0.3s ease-out forwards",
    },
    top: {
        position: "absolute",
        top: 10,
        width: "100%",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
    },
    waveLabel: {
        fontSize: "22px",
        fontWeight: "900",
        letterSpacing: "3px",
        color: "#ffffff",
        textShadow: "0 0 14px rgba(255,100,0,0.8)",
    },
    topSub: {
        fontSize: "14px",
        color: "rgba(255,255,255,0.8)",
    },
    breakBanner: {
        fontSize: "16px",
        fontWeight: "bold",
        color: "#00f6ff",
        textShadow: "0 0 12px rgba(0,246,255,0.7)",
        letterSpacing: "0.5px",
    },
    leftStats: {
        position: "absolute",
        left: 16,
        top: "22%",
        minWidth: "180px",
        padding: "10px 12px",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "8px",
        background: "rgba(6, 10, 20, 0.55)",
        boxShadow: "0 0 12px rgba(0, 0, 0, 0.25)",
        lineHeight: 1.5,
        fontSize: "14px",
    },
    leftStatsTitle: {
        fontSize: "12px",
        letterSpacing: "1.4px",
        color: "#9be7ff",
        marginBottom: "6px",
        fontWeight: "bold",
    },
    bottom: {
        position: "absolute",
        bottom: 20,
        width: "95%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        padding: "0 20px",
    },
    bottomCenter: {
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(380px, 70vw)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    barLabel: {
        textAlign: "center",
        fontSize: "13px",
        letterSpacing: "0.8px",
        color: "#dbe7ff",
        textShadow: "0 0 8px rgba(0, 0, 0, 0.6)",
    },
    barShell: {
        width: "100%",
        height: "12px",
        border: "2px solid #fff",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        position: "relative",
        overflow: "hidden",
        borderRadius: "8px",
        boxShadow: "0 0 12px rgba(0, 0, 0, 0.4)",
    },
    hpBarFill: {
        height: "100%",
        background: "linear-gradient(90deg, #ff4d4d 0%, #ff8a65 100%)",
        transition: "width 0.12s ease-out",
        boxShadow: "0 0 10px rgba(255, 77, 77, 0.65)",
    },
    expBarFill: {
        height: "100%",
        background: "linear-gradient(90deg, #00d7ff 0%, #24ffb4 100%)",
        transition: "width 0.1s ease-out",
        boxShadow: "0 0 10px rgba(36, 255, 180, 0.7)",
    },
    ammoWrap: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "8px",
        fontSize: "16px",
        fontWeight: "bold",
        textShadow: "0 0 8px rgba(0, 0, 0, 0.7)",
    },
    ammoRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    bulletIcon: {
        width: "9px",
        height: "16px",
        borderRadius: "5px",
        background: "linear-gradient(180deg, #fce38a 0%, #f6b93b 100%)",
        border: "1px solid rgba(255, 255, 255, 0.55)",
        boxShadow: "0 0 8px rgba(246, 185, 59, 0.6)",
    },
    ammoCounter: {
        letterSpacing: "0.6px",
    },
    reloadText: {
        color: "#ffd166",
        fontSize: "14px",
    },
    interactHint: {
        position: "absolute",
        top: "calc(50% + 52px)",
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: "15px",
        fontWeight: "bold",
        color: "#ffffff",
        textShadow: "0 0 10px rgba(0,0,0,0.9)",
        background: "rgba(0,0,0,0.5)",
        padding: "4px 12px",
        borderRadius: "6px",
        whiteSpace: "nowrap",
    },
    lootingLabel: {
        position: "absolute",
        bottom: "-28px",
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: "13px",
        fontWeight: "bold",
        color: "#00f6ff",
        textShadow: "0 0 8px rgba(0,246,255,0.8)",
        whiteSpace: "nowrap",
    },
    gameOverOverlay: {
        position: "absolute",
        inset: 0,
        background: "rgba(0, 0, 0, 0.72)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "12px",
        pointerEvents: "auto",
    },
    gameOverTitle: {
        fontSize: "56px",
        color: "#ff3d3d",
        fontWeight: 900,
        letterSpacing: "3px",
        textShadow: "0 0 14px rgba(255, 61, 61, 0.85)",
    },
    gameOverText: {
        fontSize: "20px",
        color: "#ffffff",
    },
    playAgainButton: {
        marginTop: "12px",
        background: "#00d7ff",
        color: "#07141d",
        border: "none",
        borderRadius: "10px",
        padding: "12px 20px",
        fontSize: "16px",
        fontWeight: "bold",
        cursor: "pointer",
        boxShadow: "0 0 18px rgba(0, 215, 255, 0.45)",
    },
}