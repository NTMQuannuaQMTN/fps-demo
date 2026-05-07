import { useEffect } from "react"
import { useProgressionStore } from "./useProgressionStore"

export function UpgradeUI() {
    const { paused, choices, pickUpgrade } = useProgressionStore()

    useEffect(() => {
        if (!paused) return

        // Ensure the player can interact with upgrade buttons.
        if (document.pointerLockElement) {
            document.exitPointerLock()
        }

        // Keep pointer lock exited while paused
        const preventLock = () => {
            if (document.pointerLockElement) {
                document.exitPointerLock()
            }
        }

        document.addEventListener("pointerlockchange", preventLock)
        return () => document.removeEventListener("pointerlockchange", preventLock)
    }, [paused])

    if (!paused) return null

    return (
        <div style={styles.overlay}>
            <div style={styles.box}>
                <h2 style={{color: 'white'}}>Choose Upgrade</h2>
                {choices.map((c) => (
                    <button key={c} style={styles.button} onClick={() => pickUpgrade(c)}>
                        {c.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    )
}

const styles: any = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
        zIndex: 20,
        cursor: "auto",
    },
    box: {
        background: "#222",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        borderRadius: "8px",
    },
    button: {
        padding: "12px 24px",
        fontSize: "16px",
        fontWeight: "bold",
        color: "#fff",
        background: "#aa3bff",
        border: "2px solid #aa3bff",
        borderRadius: "4px",
        cursor: "pointer",
        transition: "all 0.2s",
    },
}