import { create } from "zustand"

type Stat = "speed" | "attack" | "defense" | "luck" | "hp"

type State = {
    exp: number
    level: number
    nextExp: number

    stats: {
        speed: number
        attack: number
        defense: number
        luck: number
        hp: number
    }

    paused: boolean
    choices: Stat[]

    addExp: (amount: number) => void
    pickUpgrade: (stat: Stat) => void
    resetProgression: () => void
}

const randomChoices = (): Stat[] => {
    const all: Stat[] = ["speed", "attack", "defense", "luck", "hp"]
    return all.sort(() => Math.random() - 0.5).slice(0, 3)
}

export const useProgressionStore = create<State>((set, get) => ({
    exp: 0,
    level: 1,
    nextExp: 10,

    stats: {
        speed: 1,
        attack: 0,
        defense: 0,
        luck: 0,
        hp: 100,
    },

    paused: false,
    choices: [],

    addExp: (amount) => {
        const { exp, nextExp, level } = get()
        const newExp = exp + amount

        if (newExp >= nextExp) {
            set({
                exp: newExp - nextExp,
                level: level + 1,
                nextExp: Math.floor(nextExp * 1.2),
                paused: true,
                choices: randomChoices(),
            })
        } else {
            set({ exp: newExp })
        }
    },

    pickUpgrade: (stat) => {
        set((state) => {
            const stats = { ...state.stats }

            if (stat === "speed") stats.speed += 0.1
            if (stat === "attack") stats.attack += 5
            if (stat === "defense") stats.defense += 3
            if (stat === "luck") stats.luck += 1
            if (stat === "hp") stats.hp += 10

            return {
                stats,
                paused: false,
                choices: [],
            }
        })
    },

    resetProgression: () => {
        set({
            exp: 0,
            level: 1,
            nextExp: 10,
            stats: {
                speed: 1,
                attack: 0,
                defense: 0,
                luck: 0,
                hp: 100,
            },
            paused: false,
            choices: [],
        })
    },
}))