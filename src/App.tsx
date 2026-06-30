import Scene from "./game/Scene"
import { HUD } from "./game/HUD"
import { UpgradeUI } from "./game/UpgradeUI"
import { MobileControls } from "./game/MobileControls"

// Render mobile controls only on actual touch devices.
// CSS media query alone is unreliable on some tablets/hybrid devices.
const isTouchDevice = navigator.maxTouchPoints > 0

function App() {
  return (
    <>
      <Scene />
      <HUD />
      <UpgradeUI />
      {isTouchDevice && <MobileControls />}
    </>
  )
}
export default App