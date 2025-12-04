import { useEffect, useMemo, useRef, useState } from "react"
import confetti from "canvas-confetti"
import { Pause, Play, RotateCcw, Music, VolumeX, HelpCircle, X } from "lucide-react"
import { gameConfig } from "../config/game-config"

type Player = "left" | "right"

type Ball = {
  id: number
  value: number
  x: number
  y: number
  selected: boolean
  compSelected: boolean
}

type ArmAnim = {
  id: number
  x: number
  y: number
  angle: number
  width: number
  height: number
  opacity: number
  side: Player
  filter?: string
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
}

const clampToTarget = (n: number, t: number) => Math.min(Math.max(n, 1), Math.max(1, t - 1))

 

export default function PoolAdditionGame() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [balls, setBalls] = useState<Ball[]>([])
  const [target, setTarget] = useState<number>(0)
  const [activePlayer, setActivePlayer] = useState<Player>("left")
  const [scores, setScores] = useState<{ left: number; right: number }>({ left: 0, right: 0 })
  const [, setMessage] = useState<string>("")
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [showSidebar, setShowSidebar] = useState<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [showHelp, setShowHelp] = useState<boolean>(false)
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
  const [wrapWidthPx, setWrapWidthPx] = useState<number>(760)
  const [correctPair, setCorrectPair] = useState<number[]>([])
  const [gameOver, setGameOver] = useState<Player | null>(null)
  const selectedCountRef = useRef<number>(0)
  const selectedSumRef = useRef<number>(0)
  const activePlayerRef = useRef<Player>("left")
  const [arms, setArms] = useState<ArmAnim[]>([])
  const armIdRef = useRef<number>(1)
  const computerIntervalRef = useRef<number | null>(null)
  const computerSecondPickTimeoutRef = useRef<number | null>(null)
  const ballsRef = useRef<Ball[]>([])
  const correctPairRef = useRef<number[]>([])
  const computerPairRef = useRef<[number, number] | null>(null)
  const recentPairsRef = useRef<Set<string>>(new Set())
  const lastTargetChangeLeftRef = useRef<number>(0)
  const lastTargetChangeRightRef = useRef<number>(0)

  // helpers for responsive scaling
  const baseWidth = 760
  const aspect = 3 / 2
  const scale = wrapWidthPx / baseWidth
  const clampNum = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)
  const pairKey = (a: number, b: number) => {
    const x = Math.min(a, b)
    const y = Math.max(a, b)
    return `${x},${y}`
  }
  const allPairsForTarget = (t: number) => {
    const out: [number, number][] = []
    for (let a = 1; a <= Math.max(1, t - 1); a++) {
      const b = t - a
      if (b >= 1) out.push([a, b])
    }
    const seen = new Set<string>()
    const uniq: [number, number][] = []
    for (let i = 0; i < out.length; i++) {
      const k = pairKey(out[i][0], out[i][1])
      if (!seen.has(k)) { seen.add(k); uniq.push(out[i]) }
    }
    return uniq
  }
  const pickVarietyPair = (t: number) => {
    const combos = allPairsForTarget(t)
    if (!combos.length) {
      const a = 1
      const b = Math.max(1, t - a)
      return [a, b]
    }
    const unused = combos.filter(([a,b]) => !recentPairsRef.current.has(pairKey(a,b)))
    const pool = unused.length ? unused : combos
    const idx = randInt(0, pool.length - 1)
    const choice = pool[idx] || combos[0]
    const k = pairKey(choice[0], choice[1])
    recentPairsRef.current.add(k)
    if (recentPairsRef.current.size >= combos.length) {
      recentPairsRef.current.clear()
      recentPairsRef.current.add(k)
    }
    return choice
  }
  const computePositionsSafe = (c: number) => {
    const positions: { x: number; y: number }[] = []
    const poolHeightPx = wrapWidthPx / aspect
    const ballPx = clampNum(Math.round(56 * scale), 30, 84)
    const extraEdgePx = Math.round(24 * scale)
    const lifePx = clampNum(Math.round(150 * scale), 120, 200)
    const marginPx = Math.round(28 * scale)
    const safeFactor = scale < 0.55 ? 1.35 : 1.18
    const rx = (((lifePx / 2) * safeFactor) + (ballPx / 2) + marginPx) / wrapWidthPx * 100
    const ry = (((lifePx / 2) * safeFactor) + (ballPx / 2) + marginPx) / poolHeightPx * 100

    const leftOffsetPx = clampNum(Math.round(wrapWidthPx * 0.09), 12, 72)
    const rightOffsetPx = clampNum(Math.round(wrapWidthPx * 0.09), 12, 72)
    const leftOctoWidthPx = clampNum(Math.round(wrapWidthPx * 0.20), 80, 140)
    const rightOctoWidthPx = clampNum(Math.round(wrapWidthPx * 0.22), 88, 150)
    const leftOverlapPx = Math.max(0, leftOctoWidthPx - leftOffsetPx)
    const rightOverlapPx = Math.max(0, rightOctoWidthPx - rightOffsetPx)
    let leftBandPercent = (leftOverlapPx / wrapWidthPx) * 100
    let rightBandPercent = (rightOverlapPx / wrapWidthPx) * 100
    leftBandPercent = Math.max(0, leftBandPercent * 0.9)
    rightBandPercent = Math.max(0, rightBandPercent * 0.9)
    let minXPercent = 8 + leftBandPercent
    let maxXPercent = 92 - rightBandPercent
    if (maxXPercent - minXPercent < 20) {
      minXPercent = 8 + leftBandPercent * 0.5
      maxXPercent = 92 - rightBandPercent * 0.5
    }
    if (maxXPercent - minXPercent < 14) {
      minXPercent = 8
      maxXPercent = 92
    }

    const wallMarginXPercent = (((ballPx / 2) + marginPx + extraEdgePx) / wrapWidthPx) * 100
    const wallMarginYPercent = (((ballPx / 2) + marginPx + extraEdgePx) / poolHeightPx) * 100
    minXPercent = Math.max(minXPercent, wallMarginXPercent)
    maxXPercent = Math.min(maxXPercent, 100 - wallMarginXPercent)
    let minYPercent = Math.max(18, wallMarginYPercent)
    let maxYPercent = Math.min(82, 100 - wallMarginYPercent)
    if (maxYPercent - minYPercent < 20) {
      minYPercent = Math.max(10, minYPercent * 0.8)
      maxYPercent = Math.min(90, 100 - ((100 - maxYPercent) * 0.8))
    }
    if (maxYPercent - minYPercent < 14) {
      minYPercent = 18
      maxYPercent = 82
    }

    const insideCenter = (xx: number, yy: number) => {
      const dx = (xx - 50) / rx
      const dy = (yy - 50) / ry
      return (dx * dx + dy * dy) <= 1
    }

    const cols = 4
    const rows = Math.ceil(c / cols)
    const colStep = (maxXPercent - minXPercent) / cols
    const rowStep = (maxYPercent - minYPercent) / rows
    const layout = randInt(0, 2)
    let placed = 0
    for (let r = 0; r < rows && placed < c; r++) {
      for (let col = 0; col < cols && placed < c; col++) {
        let x = minXPercent + colStep * (col + 0.5)
        let y = minYPercent + rowStep * (r + 0.5)
        if (layout === 1) {
          x += colStep * 0.25 * (r % 2 === 0 ? 1 : -1)
        } else if (layout === 2) {
          y += rowStep * 0.15 * (col % 2 === 0 ? 1 : -1)
        }
        const jx = randInt(Math.round(-colStep * 0.22), Math.round(colStep * 0.22))
        const jy = randInt(Math.round(-rowStep * 0.18), Math.round(rowStep * 0.18))
        x = Math.min(maxXPercent, Math.max(minXPercent, x + jx))
        y = Math.min(maxYPercent, Math.max(minYPercent, y + jy))
        if (insideCenter(x, y)) {
          const ndx = (x - 50) / rx
          const ndy = (y - 50) / ry
          const norm = Math.sqrt(ndx * ndx + ndy * ndy) || 0.0001
          const s = 1.08 / norm
          const tx = 50 + ndx * s * rx
          const ty = 50 + ndy * s * ry
          x = Math.min(maxXPercent, Math.max(minXPercent, tx))
          y = Math.min(maxYPercent, Math.max(minYPercent, ty))
          if (insideCenter(x, y)) {
            y = Math.min(maxYPercent, Math.max(minYPercent, y + (y >= 50 ? rowStep : -rowStep)))
            x = Math.min(maxXPercent, Math.max(minXPercent, x + (x >= 50 ? colStep : -colStep)))
          }
        }
        positions.push({ x, y })
        placed++
      }
    }
    return positions
  }

  

  const generateReplacementPositions = (ids: number[]) => {
    const poolHeightPx = wrapWidthPx / aspect
    const ballPx = clampNum(Math.round(56 * scale), 30, 84)
    const marginPx = Math.round(28 * scale)
    const lifePx = clampNum(Math.round(150 * scale), 120, 200)
    const safeFactor = scale < 0.55 ? 1.35 : 1.18
    const rx = (((lifePx / 2) * safeFactor) + (ballPx / 2) + marginPx) / wrapWidthPx * 100
    const ry = (((lifePx / 2) * safeFactor) + (ballPx / 2) + marginPx) / poolHeightPx * 100
    const minXPercent = 8
    const maxXPercent = 92
    const minYPercent = 18
    const maxYPercent = 82
    const exclude = new Set(ids)
    const existing = ballsRef.current.filter((b) => !exclude.has(b.id))
    const existingKeys = new Set(existing.map((b) => `${b.x.toFixed(3)},${b.y.toFixed(3)}`))
    const existingPx = existing.map((b) => ({ x: (b.x / 100) * wrapWidthPx, y: (b.y / 100) * poolHeightPx }))
    const minDistPx = ballPx
    const candidates = computePositionsSafe(ballsRef.current.length)
    const shuffled = candidates.slice()
    shuffle(shuffled)
    const out: { x: number; y: number }[] = []
    for (let i = 0; i < shuffled.length && out.length < ids.length; i++) {
      let p = shuffled[i]
      let x = Math.max(minXPercent, Math.min(maxXPercent, p.x + randInt(-2, 2)))
      let y = Math.max(minYPercent, Math.min(maxYPercent, p.y + randInt(-2, 2)))
      const key = `${p.x.toFixed(3)},${p.y.toFixed(3)}`
      if (existingKeys.has(key)) continue
      const dxC = (x - 50) / rx
      const dyC = (y - 50) / ry
      if ((dxC * dxC + dyC * dyC) <= 1) continue
      const px = { x: (x / 100) * wrapWidthPx, y: (y / 100) * poolHeightPx }
      let ok = true
      for (let j = 0; j < existingPx.length && ok; j++) {
        const dx = px.x - existingPx[j].x
        const dy = px.y - existingPx[j].y
        if (dx * dx + dy * dy < minDistPx * minDistPx) ok = false
      }
      if (ok) {
        for (let j = 0; j < out.length && ok; j++) {
          const px2 = { x: (out[j].x / 100) * wrapWidthPx, y: (out[j].y / 100) * poolHeightPx }
          const dx = px.x - px2.x
          const dy = px.y - px2.y
          if (dx * dx + dy * dy < minDistPx * minDistPx) ok = false
        }
      }
      if (ok) out.push({ x, y })
    }
    let attempts = 0
    while (out.length < ids.length && attempts < 400) {
      const x = randInt(minXPercent, maxXPercent)
      const y = randInt(minYPercent, maxYPercent)
      const dxC = (x - 50) / rx
      const dyC = (y - 50) / ry
      if ((dxC * dxC + dyC * dyC) <= 1) {
        attempts++
        continue
      }
      const px = { x: (x / 100) * wrapWidthPx, y: (y / 100) * poolHeightPx }
      let ok = true
      for (let j = 0; j < existingPx.length && ok; j++) {
        const dx = px.x - existingPx[j].x
        const dy = px.y - existingPx[j].y
        if (dx * dx + dy * dy < minDistPx * minDistPx) ok = false
      }
      if (ok) {
        for (let j = 0; j < out.length && ok; j++) {
          const px2 = { x: (out[j].x / 100) * wrapWidthPx, y: (out[j].y / 100) * poolHeightPx }
          const dx = px.x - px2.x
          const dy = px.y - px2.y
          if (dx * dx + dy * dy < minDistPx * minDistPx) ok = false
        }
      }
      if (ok) out.push({ x, y })
      attempts++
    }
    while (out.length < ids.length) {
      out.push({ x: Math.max(minXPercent, Math.min(maxXPercent, randInt(minXPercent, maxXPercent))), y: Math.max(minYPercent, Math.min(maxYPercent, randInt(minYPercent, maxYPercent))) })
    }
    return out
  }

  const replaceBalls = (ids: number[], t: number, ensurePair: boolean = true) => {
    const positions = generateReplacementPositions(ids)
    const makePairVals = () => {
      const [a, b] = pickVarietyPair(t)
      return [a, b]
    }
    const pairVals = ensurePair && ids.length === 2 ? makePairVals() : null
    const order = Math.random() < 0.5 ? [0, 1] : [1, 0]
    setBalls((prev) => {
      const idToIndex = new Map(prev.map((b, i) => [b.id, i]))
      const next = prev.slice()
      for (let i = 0; i < ids.length; i++) {
        const idx = idToIndex.get(ids[i])
        if (idx !== undefined) {
          const val = pairVals ? pairVals[order[i] as 0 | 1] : randInt(1, Math.max(1, t - 1))
          const pos = positions[i]
          next[idx] = {
            id: prev[idx].id,
            value: clampToTarget(val, t),
            x: pos?.x ?? prev[idx].x,
            y: pos?.y ?? prev[idx].y,
            selected: false,
            compSelected: false,
          }
        }
      }
      return next
    })
    if (ids.length === 2 && ensurePair) {
      setCorrectPair(ids)
    }
    setActivePlayer("left")
  }

  const scheduleComputerPick = (delay: number = 600) => {
    if (computerSecondPickTimeoutRef.current) {
      clearTimeout(computerSecondPickTimeoutRef.current)
      computerSecondPickTimeoutRef.current = null
    }
    window.setTimeout(() => {
      if (isPaused || gameOver) return
      if (computerSecondPickTimeoutRef.current) return
      const playerSelectedIds = new Set(ballsRef.current.filter((bb) => bb.selected).map((bb) => bb.id))
      let firstId: number | null = null
      let secondId: number | null = null
      const cp = correctPairRef.current
      if (cp && cp.length === 2) {
        const [cpa, cpb] = cp
        if (!playerSelectedIds.has(cpa)) {
          firstId = cpa
          secondId = cpb
        } else if (!playerSelectedIds.has(cpb)) {
          firstId = cpb
          secondId = cpa
        }
      } else {
        const bs = ballsRef.current
        for (let i = 0; i < bs.length; i++) {
          for (let j = i + 1; j < bs.length; j++) {
            if (bs[i].value + bs[j].value === target && !playerSelectedIds.has(bs[i].id) && !playerSelectedIds.has(bs[j].id)) {
              firstId = bs[i].id
              secondId = bs[j].id
              break
            }
          }
          if (firstId && secondId) break
        }
      }
      if (!firstId || !secondId) {
        scheduleComputerPick(2000)
        return
      }
      computerPairRef.current = [firstId, secondId]
      const b1 = ballsRef.current.find((bb) => bb.id === firstId)
      if (b1) spawnArm("right", b1.x, b1.y)
      setBalls((prev) => prev.map((bb) => (bb.id === firstId ? { ...bb, compSelected: true } : bb)))
      computerSecondPickTimeoutRef.current = window.setTimeout(() => {
        if (isPaused || gameOver) {
          computerSecondPickTimeoutRef.current = null
          return
        }
        const playerSelectedIdsNow = new Set(ballsRef.current.filter((bb) => bb.selected).map((bb) => bb.id))
        let secondPickId: number | null = null
        let firstPickId: number | null = null
        if (computerPairRef.current) {
          const [fid, sid] = computerPairRef.current
          firstPickId = fid
          const firstBall = ballsRef.current.find((bb) => bb.id === fid)
          if (firstBall) {
            const need = target - firstBall.value
            const forceWrong = Math.random() < 0.2
            if (forceWrong) {
              let wrongCandidate: Ball | undefined = ballsRef.current.find(
                (bb) => bb.id !== fid && !playerSelectedIdsNow.has(bb.id) && bb.value !== need,
              )
              if (!wrongCandidate) wrongCandidate = ballsRef.current.find((bb) => bb.id !== fid && !playerSelectedIdsNow.has(bb.id))
              if (wrongCandidate) {
                const wb = wrongCandidate
                setActivePlayer("right")
                spawnArm("right", wb.x, wb.y)
                setBalls((prev) => prev.map((bb) => (bb.id === wb.id ? { ...bb, compSelected: true } : bb)))
                setScores((s) => ({ ...s, left: s.left + 1 }))
                setTimeout(() => {
                  const idsToReplace: number[] = []
                  idsToReplace.push(fid)
                  idsToReplace.push(wb.id)
                  replaceBalls(idsToReplace, target, true)
                  computerSecondPickTimeoutRef.current = null
                  scheduleComputerPick(1100)
                }, 900)
                return
              }
            }
            const candidate = ballsRef.current.find((bb) => bb.value === need && bb.id !== fid && !playerSelectedIdsNow.has(bb.id))
            if (candidate) secondPickId = candidate.id
          }
          if (!secondPickId && !playerSelectedIdsNow.has(sid)) {
            secondPickId = sid
          }
        } else {
          const bs = ballsRef.current
          for (let i = 0; i < bs.length; i++) {
            for (let j = i + 1; j < bs.length; j++) {
              if (bs[i].value + bs[j].value === target && !playerSelectedIdsNow.has(bs[j].id)) {
                firstPickId = bs[i].id
                secondPickId = bs[j].id
                break
              }
            }
            if (secondPickId) break
          }
        }
        if (!secondPickId) {
          if (firstPickId) {
            const fb = ballsRef.current.find((bb) => bb.id === firstPickId)
            const need = fb ? target - fb.value : null
            let wrongCandidate: Ball | undefined = ballsRef.current.find(
              (bb) => bb.id !== firstPickId && !playerSelectedIdsNow.has(bb.id) && (need === null || bb.value !== need),
            )
            if (!wrongCandidate) {
              wrongCandidate = ballsRef.current.find((bb) => bb.id !== firstPickId && !playerSelectedIdsNow.has(bb.id))
            }
            if (wrongCandidate) {
              const wb = wrongCandidate
              setActivePlayer("right")
              spawnArm("right", wb.x, wb.y)
              setBalls((prev) => prev.map((bb) => (bb.id === wb.id ? { ...bb, compSelected: true } : bb)))
              setScores((s) => ({ ...s, left: s.left + 1 }))
              setTimeout(() => {
                const idsToReplace: number[] = []
                idsToReplace.push(firstPickId)
                idsToReplace.push(wb.id)
                replaceBalls(idsToReplace, target, true)
                computerSecondPickTimeoutRef.current = null
                scheduleComputerPick(1100)
              }, 900)
              return
            }
        setScores((s) => ({ ...s, left: s.left + 1 }))
        const other = ballsRef.current.find((bb) => bb.id !== firstPickId && !playerSelectedIdsNow.has(bb.id)) || ballsRef.current.find((bb) => bb.id !== firstPickId)
        if (other) {
          const otherId = other.id
          setTimeout(() => {
            replaceBalls([firstPickId, otherId], target, true)
            computerSecondPickTimeoutRef.current = null
            scheduleComputerPick(1100)
          }, 900)
        } else {
          setBalls((prev) => prev.map((bb) => (bb.id === firstPickId ? { ...bb, compSelected: false } : bb)))
          computerSecondPickTimeoutRef.current = null
          scheduleComputerPick(2000)
        }
            return
          }
          computerSecondPickTimeoutRef.current = null
          scheduleComputerPick(2000)
          return
        }
        const b2Now = ballsRef.current.find((bb) => bb.id === secondPickId)
        setActivePlayer("right")
        if (b2Now) spawnArm("right", b2Now.x, b2Now.y)
        setBalls((prev) => prev.map((bb) => (bb.id === secondPickId ? { ...bb, compSelected: true } : bb)))
        setScores((s) => ({ ...s, right: s.right + 1 }))
        setTimeout(() => {
          const idsToReplace: number[] = []
          if (firstPickId) idsToReplace.push(firstPickId)
          idsToReplace.push(secondPickId!)
          replaceBalls(idsToReplace, target, true)
          computerSecondPickTimeoutRef.current = null
          scheduleComputerPick(1100)
        }, 900)
      }, 3000)
    }, delay)
  }

  // Confetti celebration (ported from ConnectTheDots)
  const playConfetti = (): void => {
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
        }),
      )
    }, 250)
  }

  useEffect(() => {
    const computeWidth = () => {
      const vwWidth = Math.floor(window.innerWidth * 0.98)
      const capWidth = baseWidth
      const headerH = headerRef.current?.offsetHeight ?? 0
      const safety = 64 // bottom spacing, paddings, buttons
      const availableH = Math.max(240, window.innerHeight - headerH - safety)
      const widthFromH = Math.floor(availableH * aspect)
      const newWidth = Math.max(260, Math.min(vwWidth, capWidth, widthFromH))
      setWrapWidthPx(newWidth)
    }
    computeWidth()
    window.addEventListener("resize", computeWidth)
    return () => window.removeEventListener("resize", computeWidth)
  }, [])

  const selectedSum = useMemo(
    () => balls.filter((b) => b.selected).reduce((s, b) => s + b.value, 0),
    [balls]
  )
  const selectedCount = useMemo(() => balls.filter((b) => b.selected).length, [balls])
  useEffect(() => { selectedCountRef.current = selectedCount }, [selectedCount])
  useEffect(() => { selectedSumRef.current = selectedSum }, [selectedSum])
  useEffect(() => { activePlayerRef.current = activePlayer }, [activePlayer])
  useEffect(() => { ballsRef.current = balls }, [balls])
  useEffect(() => { correctPairRef.current = correctPair }, [correctPair])

  const startRound = () => {
    if (gameOver) return
    setActivePlayer("left")
    const count = 12
    let positions = computePositionsSafe(count)
    const poolHeightPx = wrapWidthPx / aspect
    const ballPx = clampNum(Math.round(56 * scale), 30, 84)
    const minDistPx = ballPx
    const ok = (pos: { x: number; y: number }[]) => {
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const ax = (pos[i].x / 100) * wrapWidthPx
          const ay = (pos[i].y / 100) * poolHeightPx
          const bx = (pos[j].x / 100) * wrapWidthPx
          const by = (pos[j].y / 100) * poolHeightPx
          const dx = ax - bx
          const dy = ay - by
          if (dx * dx + dy * dy < minDistPx * minDistPx) return false
        }
      }
      return true
    }
    let tries = 0
    while (!ok(positions) && tries < 10) {
      positions = computePositionsSafe(count)
      tries++
    }
    const baseTargetCandidates: number[] = []
    for (let s = 10; s <= 18; s++) baseTargetCandidates.push(s)
    const targetSum = baseTargetCandidates[randInt(0, baseTargetCandidates.length - 1)]
    let values = Array.from({ length: count }, () => randInt(1, Math.max(1, targetSum - 1)))
    const idxs = Array.from({ length: count }, (_, i) => i)
    shuffle(idxs)
    const pairsToPlace = Math.min(4, Math.floor(count / 2))
    const placed: number[] = []
    for (let k = 0; k < pairsToPlace; k++) {
      const [va, vb] = pickVarietyPair(targetSum)
      const i1 = idxs[k * 2]
      const i2 = idxs[k * 2 + 1]
      values[i1] = clampToTarget(va, targetSum)
      values[i2] = clampToTarget(vb, targetSum)
      placed.push(i1, i2)
    }
    const nextBalls: Ball[] = positions.map((p, i) => ({ id: i + 1, value: values[i], x: p.x, y: p.y, selected: false, compSelected: false }))
    const cpCandidates: { a: number; b: number }[] = []
    for (let a = 0; a < count; a++) {
      for (let b = a + 1; b < count; b++) {
        if (nextBalls[a].value + nextBalls[b].value === targetSum) cpCandidates.push({ a, b })
      }
    }
    const chosenCP = cpCandidates[randInt(0, Math.max(0, cpCandidates.length - 1))] || { a: 0, b: 1 }
    const pairIds = [nextBalls[chosenCP.a].id, nextBalls[chosenCP.b].id]
    setBalls(nextBalls)
    setTarget(targetSum)
    setCorrectPair(pairIds)
    setMessage("")
    setIsPaused(false)
    setShowSidebar(false)
    scheduleComputerPick(2000)
  }

  const retargetBoard = () => {
    if (!ballsRef.current.length) return
    const count = ballsRef.current.length
    const positions = ballsRef.current.map((b) => ({ x: b.x, y: b.y }))
    const candidates: number[] = []
    for (let s = 10; s <= 18; s++) candidates.push(s)
    const targetSum = candidates[randInt(0, candidates.length - 1)]
    let values = Array.from({ length: count }, () => randInt(1, Math.max(1, targetSum - 1)))
    const idxs = Array.from({ length: count }, (_, i) => i)
    shuffle(idxs)
    const pairsToPlace = Math.min(4, Math.floor(count / 2))
    for (let k = 0; k < pairsToPlace; k++) {
      const [va, vb] = pickVarietyPair(targetSum)
      const i1 = idxs[k * 2]
      const i2 = idxs[k * 2 + 1]
      values[i1] = clampToTarget(va, targetSum)
      values[i2] = clampToTarget(vb, targetSum)
    }
    const nextBalls: Ball[] = positions.map((p, i) => ({ id: ballsRef.current[i].id, value: values[i], x: p.x, y: p.y, selected: false, compSelected: false }))
    const cpCandidates: { a: number; b: number }[] = []
    for (let a = 0; a < count; a++) {
      for (let b = a + 1; b < count; b++) {
        if (nextBalls[a].value + nextBalls[b].value === targetSum) cpCandidates.push({ a, b })
      }
    }
    const chosenCP = cpCandidates[randInt(0, Math.max(0, cpCandidates.length - 1))] || { a: 0, b: 1 }
    const pairIds = [nextBalls[chosenCP.a].id, nextBalls[chosenCP.b].id]
    setBalls(nextBalls)
    setTarget(targetSum)
    setCorrectPair(pairIds)
    computerPairRef.current = null
    if (computerSecondPickTimeoutRef.current) {
      clearTimeout(computerSecondPickTimeoutRef.current)
      computerSecondPickTimeoutRef.current = null
    }
    setActivePlayer("left")
    scheduleComputerPick(2000)
  }

  useEffect(() => {
    startRound()
  }, [])

  const spawnArm = (side: Player, txPercent: number, tyPercent: number) => {
    const poolHeightPx = wrapWidthPx / aspect
    const marginPx = Math.round(18 * scale)
    const originXPx = side === "left" ? marginPx : wrapWidthPx - marginPx
    const originYPx = poolHeightPx / 2
    const targetXPx = (txPercent / 100) * wrapWidthPx
    const targetYPx = (tyPercent / 100) * poolHeightPx
    const dx = targetXPx - originXPx
    const dy = targetYPx - originYPx
    const len = Math.sqrt(dx * dx + dy * dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    const h = clampNum(Math.round(30 * scale), 14, 40)
    const newId = armIdRef.current++
    const filter = "none"
    const pad = clampNum(Math.round(40 * scale), 16, 64)
    setArms((a) => [...a, { id: newId, x: originXPx, y: originYPx, angle, width: 1, height: h, opacity: 1, side, filter }])
    setTimeout(() => {
      setArms((a) => a.map((aa) => (aa.id === newId ? { ...aa, width: len + pad } : aa)))
    }, 10)
    setTimeout(() => {
      setArms((a) => a.map((aa) => (aa.id === newId ? { ...aa, opacity: 0 } : aa)))
    }, 450)
    setTimeout(() => {
      setArms((a) => a.filter((aa) => aa.id !== newId))
    }, 700)
  }

  const toggleBall = (id: number) => {
    if (isPaused) return
    setBalls((prev) => {
      const currentSelected = prev.filter((b) => b.selected).length
      const next = prev.map((b) => {
        if (b.id !== id) return b
        if (b.compSelected) return b
        // Enforce selecting at most two balls
        if (!b.selected && currentSelected >= 2) {
          // Ignore selection if already two balls chosen
          return b
        }
        return { ...b, selected: !b.selected }
      })
      const chosen = prev.find((b) => b.id === id)
      if (chosen && chosen.compSelected) return next
      const willSelect = chosen && !chosen.selected && currentSelected < 2
      if (willSelect && chosen) {
        spawnArm("left", chosen.x, chosen.y)
      }
      return next
    })
  }

  const togglePause = () => {
    setIsPaused((p) => {
      const next = !p
      setShowSidebar(next)
      return next
    })
  }

  const playAudio = (name: string, loop: boolean = false): void => {
    if (!isMuted) {
      if (!audioRefs.current[name]) {
        const src = (gameConfig.audio as unknown as Record<string, string>)[name]
        audioRefs.current[name] = new Audio(src)
        if (audioRefs.current[name]) {
          audioRefs.current[name]!.loop = loop
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

  const resetRound = () => {
    if (gameOver) {
      setScores({ left: 0, right: 0 })
      setGameOver(null)
    }
    startRound()
  }

  

  const openHelp = () => {
    setShowHelp(true)
    setIsPaused(true)
    setShowSidebar(true)
    playAudio("instructions")
  }

  const closeHelp = () => {
    setShowHelp(false)
    setIsPaused(false)
    setShowSidebar(false)
    pauseAudio("instructions")
    if (!isMuted) {
      playAudio("background", true)
    }
  }

  useEffect(() => {
    // Background music management
    if (!isPaused && !isMuted) {
      playAudio("background", true)
    } else {
      pauseAudio("background")
    }
    return () => {
      // Cleanup on unmount
      stopAllAudio()
      if (computerIntervalRef.current) {
        clearInterval(computerIntervalRef.current)
        computerIntervalRef.current = null
      }
      if (computerSecondPickTimeoutRef.current) {
        clearTimeout(computerSecondPickTimeoutRef.current)
        computerSecondPickTimeoutRef.current = null
      }
    }
  }, [isPaused, isMuted])

  useEffect(() => {
    if (!balls.length) return
    if (selectedCount === 2) {
      const chosenIds = balls.filter((b) => b.selected).map((b) => b.id)
      if (computerSecondPickTimeoutRef.current) {
        clearTimeout(computerSecondPickTimeoutRef.current)
        computerSecondPickTimeoutRef.current = null
      }
      computerPairRef.current = null
      setBalls((prev) => prev.map((bb) => (bb.compSelected ? { ...bb, compSelected: false } : bb)))
      if (selectedSum === target) {
        setScores((s) => ({ ...s, left: s.left + 1 }))
        playConfetti()
        replaceBalls(chosenIds, target, true)
        setTimeout(() => {
          if (!isPaused && !gameOver) scheduleComputerPick(1100)
        }, 900)
      } else {
        replaceBalls(chosenIds, target, true)
        setTimeout(() => {
          if (!isPaused && !gameOver) scheduleComputerPick(1100)
        }, 900)
      }
    }
    if (selectedCount === 1) {
      setMessage("Pick exactly two balls.")
    } else if (selectedCount === 0) {
      setMessage("")
    }
  }, [selectedCount, selectedSum, target, balls, isPaused, gameOver])

  

  // simple round timer (mm:ss) — pauses when game is paused
  useEffect(() => {
    if (isPaused) return
    const id = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [isPaused])

  useEffect(() => {
    if (scores.left >= 15 || scores.right >= 15) {
      setGameOver(scores.left >= 15 ? "left" : "right")
      setIsPaused(true)
    }
  }, [scores.left, scores.right])

  useEffect(() => {
    let shouldChange = false
    if (scores.left > 0 && scores.left % 5 === 0 && lastTargetChangeLeftRef.current !== scores.left) {
      lastTargetChangeLeftRef.current = scores.left
      shouldChange = true
    }
    if (scores.right > 0 && scores.right % 5 === 0 && lastTargetChangeRightRef.current !== scores.right) {
      lastTargetChangeRightRef.current = scores.right
      shouldChange = true
    }
    if (shouldChange) {
      setTimeout(() => {
        if (!gameOver) retargetBoard()
      }, 300)
    }
  }, [scores.left, scores.right, gameOver])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  }

 

  return (
    <div
      className="h-screen w-screen overflow-hidden relative"
      style={{
        backgroundColor: "#F6E3C5",
        backgroundImage: "url('./Desktop%20Kittien%20Match.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* corner accents removed to avoid stray image */}
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
      {/* Title and timer */}
      <div className="max-w-6xl mx-auto h-full flex flex-col items-center justify-start">
        <div ref={headerRef} className="w-full px-2 sm:px-4 pt-4 sm:pt-8 pb-2 sm:pb-4 flex items-center justify-center">
          <div className="text-center">
            <div
              style={{
                color: "#252525",
                textAlign: "center",
                fontFamily: 'Luckiest Guy',
                fontSize: "38px",
                fontStyle: "normal",
                fontWeight: 400,
                lineHeight: "28px",
                letterSpacing: "3.8px",
                textTransform: "uppercase",
              }}
            >
              Octopus Number Splash
            </div>
            <div className="mt-3 sm:mt-4 lg:mt-5 inline-flex items-center gap-2 text-black font-semibold">
              <img src="./time-hourglass-H3UkbK6hVS.svg" alt="Timer" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
              <span
                style={{
                  color: "var(--black-300, #252525)",
                  fontFamily: "Nunito",
                  fontSize: clampNum(Math.round(wrapWidthPx * 0.03), 14, 22),
                  fontStyle: "normal",
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full px-0 sm:px-2 pb-4 sm:pb-8 flex items-center justify-center relative" ref={containerRef}>
          {/* Pool with side octopus wrapper */}
          <div className="relative inline-block" ref={wrapperRef} style={{ width: wrapWidthPx }}>
            {/* Swimming pool area using SVG background */}
            <div
              className="relative w-full aspect-[3/2] rounded-xl overflow-hidden"
              style={{
                backgroundImage: "url(./Group-4.svg)",
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >

            {arms.map((a) => (
              <img
                key={a.id}
                src={a.side === "right" ? "./Group%2026086546.svg" : "./Group%2026086544.svg"}
                className="absolute"
                style={{
                  left: a.x,
                  top: a.y,
                  width: a.width,
                  height: a.height,
                  maxWidth: "none",
                  objectFit: "fill",
                  transform: `translateY(-50%) rotate(${a.angle}deg)`,
                  transformOrigin: "left center",
                  transition: "width 300ms ease-out, opacity 200ms ease-in-out",
                  opacity: a.opacity,
                  filter: a.filter ?? "none",
                  zIndex: 18,
                  pointerEvents: "none",
                }}
                alt="arm"
              />
            ))}

            {balls.map((b) => (
              <button
                key={b.id}
                onClick={() => toggleBall(b.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md focus:outline-none`}
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  width: clampNum(Math.round(56 * scale), 30, 84),
                  height: clampNum(Math.round(56 * scale), 30, 84),
                  backgroundImage: (b.selected || b.compSelected) ? "url('./Group%2026086542-3.svg')" : "url('./Group%2026086542.svg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  color: "#fff",
                  zIndex: 20,
                }}
              >
                <span
                  className="font-extrabold drop-shadow"
                  style={{
                    fontSize: clampNum(Math.round(20 * scale), 12, 26),
                    color: (b.selected || b.compSelected) ? "#000" : "#fff",
                    fontFamily: "Bubblegum Sans",
                  }}
                >
                  {b.value}
                </span>
              </button>
            ))}

            {/* central lifebuoy target */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{ width: clampNum(Math.round(150 * scale), 120, 200), height: clampNum(Math.round(150 * scale), 120, 200), zIndex: 5 }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src="./buoy.png"
                  alt="buoy"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ width: '100%', height: '100%', zIndex: 6 }}
                />
                <svg
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ width: '75%', height: '75%', flexShrink: 0, aspectRatio: '1/1', zIndex: 7 }}
                  viewBox="0 0 172 172"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="86" cy="86" r="86" fill="#009EC9" fillOpacity="0.8"/>
                </svg>
                <div className="relative flex flex-col items-center justify-center" style={{ marginTop: clampNum(Math.round(12 * scale), 8, 16), zIndex: 8 }}>
                  <div
                    className="uppercase text-white font-bold drop-shadow"
                    style={{
                      fontSize: clampNum(Math.round(24 * scale), 12, 28),
                      fontFamily: "Bubblegum Sans",
                      lineHeight: 1.1,
                    }}
                  >
                    MAKE
                  </div>
                  <div
                    className="font-black drop-shadow-lg"
                    style={{ fontSize: clampNum(Math.round(56 * scale), 36, 72), fontFamily: "Bubblegum Sans", color: "#FFF600" }}
                  >
                    {target}
                  </div>
                </div>
              </div>
            </div>

            </div>

            {/* left player (You) */}
            <button
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-10 cursor-pointer"
              style={{ left: -clampNum(Math.round(wrapWidthPx * 0.09), 12, 72) }}
              onClick={() => setActivePlayer("left")}
              aria-label="Select left player"
            >
              <div
                className="text-[#8B0000] font-semibold mb-1"
                style={{ fontSize: clampNum(Math.round(wrapWidthPx * 0.024), 11, 16), lineHeight: 1.1, fontFamily: "Bubblegum Sans", marginLeft: -clampNum(Math.round(wrapWidthPx * 0.06), 18, 50) }}
              >
                You
              </div>
              <img
                src="./Group-2.svg"
                alt="You"
                className="h-auto"
                style={{ width: clampNum(Math.round(wrapWidthPx * 0.20), 80, 140) }}
              />
              <div
                className="text-[#8B0000] mt-2"
                style={{ fontSize: clampNum(Math.round(wrapWidthPx * 0.022), 10, 14), lineHeight: 1.1, fontFamily: "Bubblegum Sans", marginLeft: -clampNum(Math.round(wrapWidthPx * 0.06), 18, 50) }}
              >
                Score {scores.left}
              </div>
            </button>

            {/* right player (Computer 1) */}
            <button
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-10 cursor-pointer"
              style={{ right: -clampNum(Math.round(wrapWidthPx * 0.09), 12, 72) }}
              onClick={() => setActivePlayer("right")}
              aria-label="Select right player"
            >
              <div
                className="text-indigo-700 font-semibold mb-1"
                style={{ fontSize: clampNum(Math.round(wrapWidthPx * 0.024), 11, 16), lineHeight: 1.1, fontFamily: "Bubblegum Sans", marginLeft: clampNum(Math.round(wrapWidthPx * 0.065), 20, 54) }}
              >
                Computer 1
              </div>
              <img
                src="./Group-3.svg"
                alt="Computer 1"
                className="h-auto"
                style={{ width: clampNum(Math.round(wrapWidthPx * 0.22), 88, 150) }}
              />
              <div
                className="text-indigo-700 mt-2"
                style={{ fontSize: clampNum(Math.round(wrapWidthPx * 0.022), 10, 14), lineHeight: 1.1, fontFamily: "Bubblegum Sans", marginLeft: clampNum(Math.round(wrapWidthPx * 0.065), 20, 54) }}
              >
                Score {scores.right}
              </div>
            </button>
          </div>

          
        </div>
      </div>

      {/* Help Overlay */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-11/12 text-black relative">
            <button
              onClick={closeHelp}
              className="absolute top-3 right-3 p-2 rounded-full bg-gray-200 hover:bg-gray-300"
              aria-label="Close help"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-4 text-center">How to Play</h2>
            <ul className="space-y-2 text-sm">
              <li>- Pick exactly two balls to make the target.</li>
              <li>- Wrong pair gives the computer an automatic point.</li>
              <li>- Tap balls to select/deselect them.</li>
              <li>- The selected sum shows under the target.</li>
            </ul>
            <div className="mt-5 flex items-center justify-center">
              <button
                onClick={closeHelp}
                className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      {gameOver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90]">
          <div className="bg-white rounded-xl p-6 sm:p-8 max-w-sm w-11/12 text-black text-center">
            <div className="text-2xl font-bold mb-3">{gameOver === "left" ? "You win!" : "Computer wins!"}</div>
            <div className="mb-5 text-sm">First to 15 points wins.</div>
            <button
              onClick={() => {
                setScores({ left: 0, right: 0 })
                setGameOver(null)
                setIsPaused(false)
                startRound()
              }}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
            >
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
