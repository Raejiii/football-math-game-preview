import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { Volume2, VolumeX, Play, RotateCcw, HelpCircle, X, Pause, Music } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { gameConfig } from '../config/game-config'

// Game constants
const QUESTION_COUNT = 10
const ANIMATION_DURATION = 800 // ms

type GameState = 'menu' | 'playing' | 'finished'

interface Question {
  num1: number
  num2: number
  answer: number
  options: number[]
}

export default function SoccerMathGame() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [ballPosition, setBallPosition] = useState({ x: 20, y: 50 }) // Percentages
  const [isKicking, setIsKicking] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [showKicker, setShowKicker] = useState(true)

  // UI States from PoolGame
  const [showSidebar, setShowSidebar] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  
  // Audio refs
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})

  const playAudio = (name: string, loop: boolean = false): void => {
    if (!isMuted) {
      if (!audioRefs.current[name]) {
        const src = (gameConfig.audio as unknown as Record<string, string>)[name]
        if (src) {
          audioRefs.current[name] = new Audio(src)
          if (audioRefs.current[name]) {
            audioRefs.current[name]!.loop = loop
          }
        }
      }

      if (audioRefs.current[name] && audioRefs.current[name]!.paused) {
        audioRefs.current[name]!
          .play()
          .catch((error) => {
            console.error(`Error playing audio ${name}:`, error)
          })
      }
    }
  }

  const pauseAudio = (name: string): void => {
    if (audioRefs.current[name]) {
      audioRefs.current[name]!.pause()
    }
  }

  const stopAllAudio = (): void => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    })
  }

  useEffect(() => {
    generateQuestion()
    setShowHelp(true) // Show instructions on load
    setIsPaused(true)
    playAudio("instructions")
    
    return () => {
      stopAllAudio()
    }
  }, [])

  // Background music management
  useEffect(() => {
    if (!isPaused && !isMuted) {
      playAudio("background", true)
    } else {
      pauseAudio("background")
    }
  }, [isPaused, isMuted])


  // Timer effect
  useEffect(() => {
    if (isPaused || gameState !== 'playing') return
    const id = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [isPaused, gameState])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  }

  const togglePause = () => {
    setIsPaused((p) => {
      const next = !p
      setShowSidebar(next)
      return next
    })
  }

  const toggleMute = () => {
    setIsMuted((m) => {
      const next = !m
      if (next) {
        stopAllAudio()
      } else {
        if (!isPaused) {
          playAudio("background", true)
        }
      }
      return next
    })
  }

  const openHelp = () => {
    setShowHelp(true)
    setIsPaused(true)
    setShowSidebar(true)
    playAudio("instructions")
  }

  const closeHelp = () => {
    setShowHelp(false)
    if (gameState === 'menu') {
      startGame()
    } else {
      setIsPaused(false)
    }
    setShowSidebar(false)
    pauseAudio("instructions")
    if (!isMuted) {
      playAudio("background", true)
    }
  }

  const resetRound = () => {
    setGameState('playing')
    setScore(0)
    setQuestionIndex(0)
    setElapsedSeconds(0)
    setFeedback(null)
    setIsKicking(false)
    setShowKicker(true)
    setBallPosition({ x: 20, y: 50 })
    generateQuestion()
    setIsPaused(false)
    setShowSidebar(false)
  }

  const generateQuestion = () => {
    const num1 = Math.floor(Math.random() * 10) + 1
    const num2 = Math.floor(Math.random() * 10) + 1
    const answer = num1 + num2
    
    // Generate options
    const options = new Set<number>()
    options.add(answer)
    
    while (options.size < 3) {
      const wrong = Math.floor(Math.random() * 20) + 1
      if (wrong !== answer) {
        options.add(wrong)
      }
    }
    
    setCurrentQuestion({
      num1,
      num2,
      answer,
      options: Array.from(options).sort(() => Math.random() - 0.5)
    })
    
    // Reset ball and feedback
    setBallPosition({ x: 20, y: 50 })
    setFeedback(null)
    setIsKicking(false)
    setShowKicker(true)
  }

  const handleAnswer = (selectedAnswer: number, index: number) => {
    if (isKicking || isPaused || gameState !== 'playing') return

    setIsKicking(true)
    playAudio("uiClick")

    // Horizontal target calculation
    // Target X is fixed near the right goal (approx 85-90%)
    // Target Y varies based on the option index to hit different parts of the goal
    const targetX = 90 
    const targetY = 25 + (index * 25) // Spreads options vertically: 25%, 50%, 75%

    setBallPosition({ x: targetX, y: targetY })
    
    setTimeout(() => {
      const isCorrect = selectedAnswer === currentQuestion?.answer
      
      if (isCorrect) {
        setScore(s => s + 1)
        setFeedback('correct')
        playAudio("success")
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      } else {
        setFeedback('incorrect')
        playAudio("incorrect")
      }

      setTimeout(() => {
        if (questionIndex < QUESTION_COUNT - 1) {
          setQuestionIndex(i => i + 1)
          generateQuestion()
        } else {
          setGameState('finished')
          setIsPaused(true)
        }
      }, 1500)
    }, ANIMATION_DURATION)
  }

  const startGame = () => {
    setGameState('playing')
    setScore(0)
    setQuestionIndex(0)
    setElapsedSeconds(0)
    generateQuestion()
    setIsPaused(false)
    setShowHelp(false)
  }

  return (
    <div className="relative w-full h-full bg-green-600 overflow-hidden select-none font-sans">
      {/* Background Elements - Horizontal Field */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Center Line (Vertical) */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-white/50" />
        
        {/* Center Circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[20vw] h-[20vw] border-4 border-white/50 rounded-full" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white/50 rounded-full" />
        
        {/* Right Goal Area (Answers) */}
        <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-[15%] h-[60%] border-4 border-r-0 border-white/50 bg-black/10 rounded-l-xl">
           <div className="absolute inset-0 opacity-20" 
               style={{ backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff), linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}>
           </div>
        </div>
        
        {/* Left Penalty Area (Player Start) */}
        <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-[15%] h-[60%] border-4 border-l-0 border-white/50 rounded-r-xl" />
      </div>

      {/* --- NEW UI ELEMENTS --- */}

      {/* Top-right Help button */}
      <div className="fixed top-4 right-4 z-[60]">
        <button
          onClick={openHelp}
          className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors shadow-lg"
          aria-label="Help"
        >
          <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-white" />
        </button>
      </div>

      {/* Pause Sidebar Controls */}
      <div
        className={`fixed top-4 left-4 z-[60] transition-all duration-300 ${
          showSidebar ? "w-14 sm:w-16 lg:w-20" : "w-10 sm:w-12 lg:w-16"
        }`}
      >
        <div className="flex flex-col items-center gap-2 sm:gap-4 lg:gap-6">
          <button
            onClick={togglePause}
            className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-full bg-violet-500 hover:bg-violet-600 flex items-center justify-center transition-colors shadow-lg"
            aria-label={showSidebar ? "Resume game" : "Pause game"}
          >
            {showSidebar ? (
              <Play className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-white" />
            ) : (
              <Pause className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-white" />
            )}
          </button>
          {showSidebar && (
            <>
              <button
                onClick={toggleMute}
                className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-full ${
                  isMuted ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                } flex items-center justify-center transition-colors shadow-lg`}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 lg:w-10 lg:h-10 text-white" />
                ) : (
                  <Music className="w-5 h-5 sm:w-6 sm:h-6 lg:w-10 lg:h-10 text-white" />
                )}
              </button>
              <button
                onClick={resetRound}
                className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center transition-colors shadow-lg"
                aria-label="Reset round"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 lg:w-10 lg:h-10 text-white" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Title and Timer Header */}
      <div className="absolute top-0 left-0 w-full z-40 flex flex-col items-center justify-start pointer-events-none">
        <div className="w-full px-2 sm:px-4 pt-4 sm:pt-8 pb-2 sm:pb-4 flex items-center justify-center">
          <div className="text-center">
            <div
              style={{
                color: "#fff",
                textAlign: "center",
                fontFamily: 'Luckiest Guy',
                fontSize: "38px",
                fontStyle: "normal",
                fontWeight: 400,
                lineHeight: "28px",
                letterSpacing: "3.8px",
                textTransform: "uppercase",
                textShadow: "2px 2px 0 #000"
              }}
            >
              SOCCER MATH
            </div>
            <div className="mt-3 sm:mt-4 lg:mt-5 inline-flex items-center gap-2 text-white font-semibold bg-black/30 px-4 py-1 rounded-full">
              <img src="/time-hourglass-H3UkbK6hVS.svg" alt="Timer" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
              <span
                style={{
                  fontFamily: "Nunito",
                  fontSize: "22px",
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Score Display (Updated Style) */}
      <div className="absolute top-24 right-4 z-40 bg-white/90 p-2 rounded-xl shadow-lg flex flex-col items-center min-w-[80px]">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Score</div>
        <div className="text-xl font-black text-green-600" style={{ fontFamily: "Bubblegum Sans" }}>{score} / {QUESTION_COUNT}</div>
      </div>

      {/* Game Content */}
      {currentQuestion && (
        <>
          {/* Question Banner */}
          <div className="absolute top-[15%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
            <div className="bg-white border-4 border-green-500 rounded-2xl px-6 py-3 md:px-8 md:py-4 shadow-xl transform rotate-[-2deg] hover:rotate-0 transition-transform">
              <div className="text-3xl md:text-5xl font-black text-green-600 flex gap-4 items-center" style={{ fontFamily: "Bubblegum Sans" }}>
                <span>{currentQuestion.num1}</span>
                <span>+</span>
                <span>{currentQuestion.num2}</span>
                <span>=</span>
                <span>?</span>
              </div>
            </div>
          </div>

          {/* Goal Targets (Vertical Stack on Right) */}
          <div className="absolute right-[5%] top-1/2 transform -translate-y-1/2 h-[70%] flex flex-col justify-around z-40">
            {currentQuestion.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(opt, idx)}
                disabled={isKicking || isPaused}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border-4 border-green-500 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer group"
              >
                <span className="text-xl md:text-2xl font-bold text-green-700 group-hover:text-green-900" style={{ fontFamily: "Bubblegum Sans" }}>{opt}</span>
              </button>
            ))}
          </div>

          {/* Player (Kicker) - Left Side */}
          <div className="absolute left-[5%] top-1/2 transform -translate-y-1/2 w-24 md:w-32 z-20 transition-opacity duration-300" style={{ opacity: showKicker ? 1 : 0.5 }}>
             <img src="/spot-kicker.png" alt="Kicker" className="w-full h-auto object-contain transform scale-x-[-1]" /> {/* Flipped to face right if original faces left, check image */}
          </div>

          {/* Ball */}
          <div 
            className="absolute w-10 h-10 md:w-14 md:h-14 z-30 transition-all ease-out"
            style={{ 
              left: `${ballPosition.x}%`, 
              top: `${ballPosition.y}%`,
              transform: 'translate(-50%, -50%)',
              transitionDuration: isKicking ? `${ANIMATION_DURATION}ms` : '300ms'
            }}
          >
            <div className={cn(
              "w-full h-full rounded-full bg-white shadow-lg relative overflow-hidden border-2 border-gray-300",
              isKicking && "animate-spin"
            )}>
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_white,_#ddd)]"></div>
               <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-black rounded-full opacity-80"></div>
               <div className="absolute -top-2 left-1/2 w-4 h-4 bg-black rounded-full opacity-80"></div>
               <div className="absolute top-1/2 -left-2 w-4 h-4 bg-black rounded-full opacity-80"></div>
            </div>
          </div>

          {/* Feedback Overlay */}
          {feedback && (
            <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
              <div className={cn(
                "text-6xl md:text-8xl font-black drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300",
                feedback === 'correct' ? "text-yellow-400" : "text-red-500"
              )} style={{ fontFamily: "Luckiest Guy" }}>
                {feedback === 'correct' ? 'GOAL!' : 'MISS!'}
              </div>
            </div>
          )}
        </>
      )}

      {/* Help / Start Overlay */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-11/12 text-black relative shadow-2xl border-4 border-green-500">
            <button
              onClick={closeHelp}
              className="absolute top-3 right-3 p-2 rounded-full bg-gray-200 hover:bg-gray-300"
              aria-label="Close help"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-3xl font-bold mb-4 text-center text-green-700" style={{ fontFamily: "Luckiest Guy" }}>How to Play</h2>
            <div className="space-y-4 text-lg font-medium text-gray-700" style={{ fontFamily: "Nunito" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">1</div>
                <p>Solve the math problem.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">2</div>
                <p>Click the correct answer in the goal.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">3</div>
                <p>Score as many goals as you can!</p>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-center">
              <button
                onClick={closeHelp}
                className="px-8 py-3 rounded-full bg-green-500 hover:bg-green-600 text-white font-bold text-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                style={{ fontFamily: "Luckiest Guy" }}
              >
                PLAY BALL!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === 'finished' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90]">
          <div className="bg-white rounded-xl p-6 sm:p-8 max-w-sm w-11/12 text-black text-center shadow-2xl border-4 border-green-500 animate-in zoom-in">
            <div className="text-4xl font-bold mb-3 text-green-600" style={{ fontFamily: "Luckiest Guy" }}>
              {score > QUESTION_COUNT / 2 ? "YOU WIN!" : "GAME OVER"}
            </div>
            <div className="mb-6 text-2xl font-bold text-gray-700" style={{ fontFamily: "Nunito" }}>
              Final Score: {score} / {QUESTION_COUNT}
            </div>
            
            <div className="flex justify-center gap-2 mb-6">
               {/* Stars based on score */}
               {[1, 2, 3].map(i => (
                 <div key={i} className={`w-12 h-12 ${score >= (QUESTION_COUNT/3)*i ? 'text-yellow-400' : 'text-gray-300'}`}>
                   <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                     <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                   </svg>
                 </div>
               ))}
            </div>

            <button
              onClick={resetRound}
              className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-lg shadow-md transition-transform hover:scale-105"
              style={{ fontFamily: "Bubblegum Sans" }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
