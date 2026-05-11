import Scene from "./game/Scene"
import { HUD } from "./game/HUD"
import { UpgradeUI } from "./game/UpgradeUI"
import { MobileControls } from "./game/MobileControls"

function App() {
  return (
    <>
      <Scene />
      <HUD />
      <UpgradeUI />
      <MobileControls />
    </>
  )
}
export default App