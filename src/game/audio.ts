let ctx: AudioContext | null = null

const getCtx = (): AudioContext => {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === "suspended") ctx.resume()
    return ctx
}

// Short growl: two oscillators pitched down over 400ms.
// Called once per zombie when it first enters LOS range.
export const playZombieGrowl = () => {
    try {
        const c = getCtx()
        const now = c.currentTime

        const osc1 = c.createOscillator()
        osc1.type = "sawtooth"
        osc1.frequency.setValueAtTime(150, now)
        osc1.frequency.exponentialRampToValueAtTime(50, now + 0.35)

        const osc2 = c.createOscillator()
        osc2.type = "square"
        osc2.frequency.setValueAtTime(75, now)
        osc2.frequency.exponentialRampToValueAtTime(35, now + 0.3)

        const g1 = c.createGain()
        g1.gain.setValueAtTime(0.2, now)
        g1.gain.linearRampToValueAtTime(0, now + 0.4)

        const g2 = c.createGain()
        g2.gain.setValueAtTime(0.07, now)
        g2.gain.linearRampToValueAtTime(0, now + 0.32)

        osc1.connect(g1).connect(c.destination)
        osc2.connect(g2).connect(c.destination)

        osc1.start(now); osc1.stop(now + 0.4)
        osc2.start(now); osc2.stop(now + 0.32)
    } catch {
        // AudioContext unavailable (e.g. SSR)
    }
}

// Four ascending sine tones played on level-up.
export const playLevelUp = () => {
    try {
        const c = getCtx()
        const freqs = [440, 554, 659, 880]
        freqs.forEach((freq, i) => {
            const osc = c.createOscillator()
            osc.type = "sine"
            osc.frequency.value = freq

            const g = c.createGain()
            const t = c.currentTime + i * 0.1
            g.gain.setValueAtTime(0, t)
            g.gain.linearRampToValueAtTime(0.22, t + 0.05)
            g.gain.linearRampToValueAtTime(0, t + 0.22)

            osc.connect(g).connect(c.destination)
            osc.start(t)
            osc.stop(t + 0.25)
        })
    } catch {
        // ignore
    }
}
