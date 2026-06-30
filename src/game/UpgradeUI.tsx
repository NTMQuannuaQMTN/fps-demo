import { useEffect } from "react"
import { useProgressionStore } from "./useProgressionStore"
import { playLevelUp } from "./audio"

type Stat = "speed" | "attack" | "defense" | "luck" | "hp"

const STAT_META: Record<Stat, {
    icon: string
    label: string
    color: string
    desc: (cur: number) => string
    next: (cur: number) => string
}> = {
    speed: {
        icon: "⚡",
        label: "SPEED",
        color: "#ffd166",
        desc: (v) => `${(v * 100).toFixed(0)}% move speed`,
        next: (v) => `${((v + 0.1) * 100).toFixed(0)}%`,
    },
    attack: {
        icon: "⚔",
        label: "ATTACK",
        color: "#ff6b6b",
        desc: (v) => `+${v.toFixed(0)} bonus dmg / pellet`,
        next: (v) => `+${(v + 5).toFixed(0)}`,
    },
    defense: {
        icon: "🛡",
        label: "DEFENSE",
        color: "#74c0fc",
        desc: (v) => `${v.toFixed(0)} dmg reduction`,
        next: (v) => `${(v + 3).toFixed(0)}`,
    },
    luck: {
        icon: "★",
        label: "LUCK",
        color: "#a78bfa",
        desc: (v) => `${v} pts (better crate rolls)`,
        next: (v) => `${v + 1}`,
    },
    hp: {
        icon: "❤",
        label: "HP POOL",
        color: "#51cf66",
        desc: (v) => `${v} max HP`,
        next: (v) => `${v + 10}`,
    },
}

export function UpgradeUI() {
    const paused = useProgressionStore((s) => s.paused)
    const choices = useProgressionStore((s) => s.choices)
    const stats = useProgressionStore((s) => s.stats)
    const level = useProgressionStore((s) => s.level)
    const pickUpgrade = useProgressionStore((s) => s.pickUpgrade)

    useEffect(() => {
        if (!paused) return

        playLevelUp()

        if (document.pointerLockElement) document.exitPointerLock()

        const preventLock = () => {
            if (document.pointerLockElement) document.exitPointerLock()
        }
        document.addEventListener("pointerlockchange", preventLock)
        return () => document.removeEventListener("pointerlockchange", preventLock)
    }, [paused])

    if (!paused) return null

    return (
        <div style={styles.overlay}>
            <div style={styles.panel}>
                <div style={styles.header}>
                    <div style={styles.levelBadge}>LV {level}</div>
                    <div style={styles.title}>LEVEL UP</div>
                    <div style={styles.subtitle}>Choose one upgrade</div>
                </div>

                <div style={styles.choices}>
                    {(choices as Stat[]).map((stat) => {
                        const m = STAT_META[stat]
                        const cur = stats[stat]
                        return (
                            <button
                                key={stat}
                                style={{ ...styles.card, borderColor: m.color + "55" }}
                                onClick={() => pickUpgrade(stat)}
                                onMouseEnter={(e) => {
                                    ;(e.currentTarget as HTMLElement).style.borderColor = m.color
                                    ;(e.currentTarget as HTMLElement).style.background = m.color + "18"
                                }}
                                onMouseLeave={(e) => {
                                    ;(e.currentTarget as HTMLElement).style.borderColor = m.color + "55"
                                    ;(e.currentTarget as HTMLElement).style.background = "rgba(4,8,20,0.85)"
                                }}
                            >
                                <div style={styles.cardTop}>
                                    <span style={{ ...styles.icon, color: m.color }}>{m.icon}</span>
                                    <span style={{ ...styles.statName, color: m.color }}>{m.label}</span>
                                </div>
                                <div style={styles.currentVal}>{m.desc(cur)}</div>
                                <div style={styles.upgrade}>
                                    <span style={styles.curVal}>{m.desc(cur).split(" ")[0]}</span>
                                    <span style={styles.arrow}>→</span>
                                    <span style={{ ...styles.nextVal, color: m.color }}>{m.next(cur)}</span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
        zIndex: 20,
        cursor: "auto",
        backdropFilter: "blur(4px)",
    },
    panel: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        fontFamily: "'Courier New', Courier, monospace",
    },
    header: {
        textAlign: "center",
        color: "white",
    },
    levelBadge: {
        display: "inline-block",
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: "3px",
        color: "#ffd166",
        background: "rgba(255,209,102,0.15)",
        border: "1px solid rgba(255,209,102,0.4)",
        borderRadius: 20,
        padding: "3px 14px",
        marginBottom: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: 900,
        letterSpacing: "6px",
        color: "#ffffff",
        textShadow: "0 0 24px rgba(255,255,255,0.3)",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: "rgba(255,255,255,0.45)",
        letterSpacing: "1px",
    },
    choices: {
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        justifyContent: "center",
    },
    card: {
        width: 180,
        padding: "18px 16px",
        background: "rgba(4,8,20,0.85)",
        border: "1px solid",
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.15s, background 0.15s",
        color: "white",
        fontFamily: "inherit",
    },
    cardTop: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    icon: {
        fontSize: 18,
    },
    statName: {
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: "2px",
    },
    currentVal: {
        fontSize: 11,
        color: "rgba(255,255,255,0.4)",
        letterSpacing: "0.3px",
    },
    upgrade: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 14,
        fontWeight: "bold",
        marginTop: 2,
    },
    curVal: {
        color: "rgba(255,255,255,0.45)",
        fontSize: 13,
    },
    arrow: {
        color: "rgba(255,255,255,0.3)",
        fontSize: 12,
    },
    nextVal: {
        fontSize: 16,
        fontWeight: 900,
    },
}
