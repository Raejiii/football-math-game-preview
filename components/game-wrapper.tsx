import { lazy, Suspense } from "react"

const SoccerMathGame = lazy(() => import("./SoccerMathGame").then((mod) => ({ default: mod.default })))

export default function GameWrapper() {
  return (
    <div className="h-screen w-screen bg-green-800 overflow-hidden">
      <Suspense fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-green-800">
          <div className="text-xl text-white">Loading game...</div>
        </div>
      }>
        <SoccerMathGame />
      </Suspense>
    </div>
  )
}
