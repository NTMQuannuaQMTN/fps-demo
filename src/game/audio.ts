let ctx: AudioContext | null = null

const getCtx = (): AudioContext => {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === "suspended") ctx.resume()
    return ctx
}

// ── Gun shots ────────────────────────────────────────────────────────────────

export type GunType = "pistol" | "smg" | "shotgun" | "ar" | "lmg" | "sniper"

// Infer gun type from weapon stats (called once per shot)
export const getGunType = (w: {
    pellets: number
    magSize: number
    damage: number
    rpm: number
}): GunType => {
    if (w.pellets > 1)               return "shotgun"
    if (w.magSize > 50)              return "lmg"
    if (w.damage >= 80 && w.rpm <= 120) return "sniper"
    if (w.rpm > 800)                 return "smg"
    if (w.magSize <= 8)              return "pistol"
    return "ar"
}

interface GunParams {
    noiseGain: number
    noiseDur:  number
    lowFreq?:  number
    lowGain?:  number
}

const GUN_PARAMS: Record<GunType, GunParams> = {
    pistol:  { noiseGain: 0.38, noiseDur: 0.10 },
    smg:     { noiseGain: 0.20, noiseDur: 0.05 },
    shotgun: { noiseGain: 0.55, noiseDur: 0.28, lowFreq: 80,  lowGain: 0.35 },
    ar:      { noiseGain: 0.28, noiseDur: 0.09 },
    lmg:     { noiseGain: 0.30, noiseDur: 0.11 },
    sniper:  { noiseGain: 0.52, noiseDur: 0.32, lowFreq: 55,  lowGain: 0.45 },
}

export const playGunShot = (type: GunType) => {
    try {
        const c = getCtx()
        const now = c.currentTime
        const { noiseGain, noiseDur, lowFreq, lowGain } = GUN_PARAMS[type]

        // Decaying white-noise crack
        const samples = Math.ceil(c.sampleRate * noiseDur)
        const buf = c.createBuffer(1, samples, c.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < samples; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples, 2.2)
        }
        const noise = c.createBufferSource()
        noise.buffer = buf

        // Slight high-pass so it doesn't muffle the footstep range
        const hp = c.createBiquadFilter()
        hp.type = "highpass"
        hp.frequency.value = 800

        const g = c.createGain()
        g.gain.value = noiseGain

        noise.connect(hp).connect(g).connect(c.destination)
        noise.start(now)

        // Low-frequency thud for shotgun / sniper
        if (lowFreq && lowGain) {
            const osc = c.createOscillator()
            osc.type = "sine"
            osc.frequency.setValueAtTime(lowFreq, now)
            osc.frequency.exponentialRampToValueAtTime(lowFreq * 0.4, now + noiseDur)

            const g2 = c.createGain()
            g2.gain.setValueAtTime(lowGain, now)
            g2.gain.linearRampToValueAtTime(0, now + noiseDur)

            osc.connect(g2).connect(c.destination)
            osc.start(now)
            osc.stop(now + noiseDur)
        }
    } catch {
        // AudioContext blocked or unavailable
    }
}

// ── Zombie sounds ─────────────────────────────────────────────────────────────

// Low growl — played once when zombie first spots player within range
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
        osc2.frequency.exponentialRampToValueAtTime(35, now + 0.30)

        const g1 = c.createGain()
        g1.gain.setValueAtTime(0.20, now)
        g1.gain.linearRampToValueAtTime(0, now + 0.40)

        const g2 = c.createGain()
        g2.gain.setValueAtTime(0.07, now)
        g2.gain.linearRampToValueAtTime(0, now + 0.32)

        osc1.connect(g1).connect(c.destination)
        osc2.connect(g2).connect(c.destination)
        osc1.start(now); osc1.stop(now + 0.40)
        osc2.start(now); osc2.stop(now + 0.32)
    } catch { /* ignore */ }
}

// Directional footstep — pan in [-1, 1], volume in [0, 1]
export const playZombieFootstep = (pan: number, volume: number) => {
    if (volume < 0.02) return
    try {
        const c = getCtx()
        const now = c.currentTime
        const dur = 0.08

        const samples = Math.ceil(c.sampleRate * dur)
        const buf = c.createBuffer(1, samples, c.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < samples; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples, 1.4)
        }
        const noise = c.createBufferSource()
        noise.buffer = buf

        // Low-pass: heavy thuddy shuffle
        const lp = c.createBiquadFilter()
        lp.type = "lowpass"
        lp.frequency.value = 350

        const panner = c.createStereoPanner()
        panner.pan.value = Math.max(-1, Math.min(1, pan))

        const g = c.createGain()
        g.gain.value = 0.16 * volume

        noise.connect(lp).connect(g).connect(panner).connect(c.destination)
        noise.start(now)
    } catch { /* ignore */ }
}

// ── Level-up chime ────────────────────────────────────────────────────────────

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
    } catch { /* ignore */ }
}
