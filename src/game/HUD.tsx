import { useGameStore } from "./useGameStore"

export function HUD() {
    const hp = useGameStore((s) => s.hp)
    const ammo = useGameStore((s) => s.ammo)
    const isReloading = useGameStore((s) => s.isReloading)
    const mobsLeft = useGameStore((s) => s.mobsLeft)
    const kills = useGameStore((s) => s.kills)
    const score = kills * 100

    return (
        <div style={styles.container}>
            {/* Crosshair */}
            <div style={styles.crosshair}>+</div>

            {/* Top - Score and remaining mobs */}
            <div style={styles.top}>
                <div>Score: {score}</div>
                <div>Mobs Left: {mobsLeft} | Kills: {kills}</div>
            </div>

            {/* Bottom */}
            <div style={styles.bottom}>
                <div>HP: {Math.round(hp)}</div>
                <div>
                    Ammo: {ammo} / {useGameStore.getState().weapon.magSize}
                    {isReloading && " (Reloading...)"}
                </div>
            </div>
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
    top: {
        position: "absolute",
        top: 10,
        width: "100%",
        textAlign: "center",
        fontSize: "18px",
        fontWeight: "bold",
    },
    bottom: {
        position: "absolute",
        bottom: 20,
        width: "95%",
        display: "flex",
        justifyContent: "space-between",
        padding: "0 20px",
    },
}