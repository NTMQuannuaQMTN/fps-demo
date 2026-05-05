import Scene from "./game/Scene"
import { HUD } from "./game/HUD"
import { UpgradeUI } from "./game/UpgradeUI"

function App() {
  return (
    <>
      <Scene />
      <HUD />
      <UpgradeUI />
    </>
  )
}
export default App