import GameWrapper from '../components/game-wrapper'
import { ThemeProvider } from './contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <div className="h-screen w-screen bg-[#000B18] overflow-hidden">
        <GameWrapper />
      </div>
    </ThemeProvider>
  )
}

export default App
