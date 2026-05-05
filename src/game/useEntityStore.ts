import { create } from "zustand"
import * as THREE from "three"

type Entity = {
    id: string
    mesh: THREE.Object3D
    hit: (damage: number) => void
}

type EntityState = {
    entities: Map<string, Entity>

    add: (e: Entity) => void
    remove: (id: string) => void
    getMeshes: () => THREE.Object3D[]
    getEntityByMesh: (mesh: THREE.Object3D) => Entity | undefined
}

export const useEntityStore = create<EntityState>((set, get) => ({
    entities: new Map(),

    add: (e) =>
        set((state) => {
            const map = new Map(state.entities)
            map.set(e.id, e)
            return { entities: map }
        }),

    remove: (id) =>
        set((state) => {
            const map = new Map(state.entities)
            map.delete(id)
            return { entities: map }
        }),

    getMeshes: () => {
        return Array.from(get().entities.values()).map((e) => e.mesh)
    },

    getEntityByMesh: (mesh) => {
        return Array.from(get().entities.values()).find(
            (e) => e.mesh === mesh
        )
    },
}))