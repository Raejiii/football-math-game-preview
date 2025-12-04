type Difficulty = "easy" | "medium" | "hard"

interface AudioMap {
  background: string
  success: string
  uiClick: string
  connect: string
  incorrect: string
  effect: string
  levelWin: string
  clap: string
  instructions: string
  start: string
}

interface LabelPosition {
  id: string
  x: number
  y: number
  label: string
  targetX: number
  targetY: number
}

interface Scenario {
  id: number
  name: string
  difficulty: Difficulty | string
  title: string
  image: string
  labelPositions: LabelPosition[]
  labels: string[]
}

interface Dot {
  number: number
  x: number // percentage (0-100)
  y: number // percentage (0-100)
}

interface Shape {
  name: string
  difficulty: Difficulty
  image: string
  dots: Dot[]
}

interface GameConfig {
  gameTitle: string
  instructions: string
  audio: AudioMap
  splashScreen: {
    logo: string
    duration: number
  }
  scenarios: Scenario[]
  shapes: Shape[]
}

export const gameConfig: GameConfig = {
  gameTitle: "Labelling Game",
  instructions: "Drag the correct labels to their matching positions on the image!",
  audio: {
    background:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2-cherry-cute-bgm-271158-zIouDJ4FGUOTEpIXP10RZWnp9zff4A.mp3",
    success: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/success-MdF7nLdkwPlakm27xQWQmfipYHDzTL.webm",
    uiClick: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ui-click-IH3biGSjh8pksEtf1bHOC49dGslDPU.webm",
    connect: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ui-click-IH3biGSjh8pksEtf1bHOC49dGslDPU.webm",
    incorrect: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/incorrect-EsdPobrzIGyWVonDaJINuAhdNb496F.webm",
    effect: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/effect-7ewtIez1dCpY35G2g66YHhdvLCUekQ.webm",
    levelWin: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/level-win-SxCsRZQKipPLOAIFiceyYmP8n5rMn7.webm",
    clap: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/clap-9gShvB1t4npUll2sKjSmcNB ScG0mJ5.webm",
    instructions:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Connect%20identical%20pictures%20with%20a%20line-i0hDjGmmmYEiKwr0f3gYBDTuhnEQUR.webm",
    start:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Connect%20identical%20pictures%20with%20a%20line-i0hDjGmmmYEiKwr0f3gYBDTuhnEQUR.webm",
  },
  splashScreen: {
    logo: "./placeholder.svg",
    duration: 2000,
  },
  scenarios: [
    {
      id: 1,
      name: "Bee Body Parts",
      difficulty: "easy",
      title: "Bee Body Parts",
      image: "./simple-bee-anatomy-clean.jpg",
      labelPositions: [
        { id: "antenna", x: 36.5, y: 15, label: "ANTENNA", targetX: 18.7, targetY: 26.6 },
        { id: "leg", x: 15, y: 55, label: "LEG", targetX: 30, targetY: 57.9 },
        { id: "sting", x: 15, y: 80, label: "STING", targetX: 81, targetY: 76.8 },
        { id: "wing", x: 85.3, y: 12.1, label: "WING", targetX: 68.2, targetY: 36.2 },
        { id: "abdomen", x: 75, y: 80, label: "ABDOMEN", targetX: 68, targetY: 62 },
      ],
      labels: ["ANTENNA", "LEG", "STING", "WING", "ABDOMEN"],
    },
    {
      id: 2,
      name: "Human Body",
      difficulty: "easy",
      title: "Human Body Parts",
      image: "./simple-human-body-clean.jpg",
      labelPositions: [
        { id: "head", x: 20, y: 15, label: "HEAD", targetX: 50, targetY: 15 },
        { id: "arm", x: 10, y: 35, label: "ARM", targetX: 39.1, targetY: 39 },
        { id: "chest", x: 80, y: 35, label: "CHEST", targetX: 48.4, targetY: 28.4 },
        { id: "hand", x: 5, y: 50, label: "HAND", targetX: 36.7, targetY: 50.9 },
        { id: "leg", x: 80, y: 70, label: "LEG", targetX: 45, targetY: 70 },
        { id: "foot", x: 80, y: 90, label: "FOOT", targetX: 45, targetY: 90 },
      ],
      labels: ["HEAD", "ARM", "CHEST", "HAND", "LEG", "FOOT"],
    },
    {
      id: 3,
      name: "Plant Parts",
      difficulty: "medium",
      title: "Parts of a Plant",
      image: "./simple-plant-clean.jpg",
      labelPositions: [
        { id: "flower", x: 20, y: 10, label: "FLOWER", targetX: 50, targetY: 10 },
        { id: "leaf", x: 10, y: 25, label: "LEAF", targetX: 30, targetY: 25 },
        { id: "stem", x: 80, y: 50, label: "STEM", targetX: 50, targetY: 50 },
        { id: "roots", x: 80, y: 85, label: "ROOTS", targetX: 50, targetY: 85 },
      ],
      labels: ["FLOWER", "LEAF", "STEM", "ROOTS"],
    },
    {
      id: 4,
      name: "Car Parts",
      difficulty: "medium",
      title: "Parts of a Car",
      image: "./simple-car-clean.jpg",
      labelPositions: [
        { id: "windshield", x: 15, y: 25, label: "WINDSHIELD", targetX: 36.4, targetY: 47 },
        { id: "hood", x: 10, y: 35, label: "HOOD", targetX: 19.1, targetY: 53.3 },
        { id: "door", x: 80, y: 45, label: "DOOR", targetX: 43.8, targetY: 58.6 },
        { id: "wheel", x: 10, y: 70, label: "WHEEL", targetX: 20.5, targetY: 65.5 },
        { id: "trunk", x: 90, y: 40, label: "TRUNK", targetX: 90.7, targetY: 52.7 },
        { id: "headlight", x: 5, y: 50, label: "HEADLIGHT", targetX: 9, targetY: 57.6 },
      ],
      labels: ["WINDSHIELD", "HOOD", "DOOR", "WHEEL", "TRUNK", "HEADLIGHT"],
    },
  ],
  // Shapes used by ConnectTheDotsGame
  shapes: [
    {
      name: "Bee Outline",
      difficulty: "easy",
      image: "./simple-bee-anatomy-clean.jpg",
      dots: [
        { number: 1, x: 18, y: 30 },
        { number: 2, x: 30, y: 22 },
        { number: 3, x: 48, y: 28 },
        { number: 4, x: 63, y: 40 },
        { number: 5, x: 70, y: 55 },
        { number: 6, x: 60, y: 70 },
        { number: 7, x: 40, y: 72 },
        { number: 8, x: 22, y: 60 },
      ],
    },
    {
      name: "Human Body",
      difficulty: "easy",
      image: "./simple-human-body-clean.jpg",
      dots: [
        { number: 1, x: 50, y: 12 },
        { number: 2, x: 40, y: 28 },
        { number: 3, x: 60, y: 28 },
        { number: 4, x: 42, y: 50 },
        { number: 5, x: 58, y: 50 },
        { number: 6, x: 45, y: 72 },
        { number: 7, x: 55, y: 72 },
        { number: 8, x: 50, y: 90 },
      ],
    },
    {
      name: "Plant",
      difficulty: "medium",
      image: "./simple-plant-clean.jpg",
      dots: [
        { number: 1, x: 50, y: 10 },
        { number: 2, x: 35, y: 25 },
        { number: 3, x: 65, y: 25 },
        { number: 4, x: 50, y: 45 },
        { number: 5, x: 40, y: 65 },
        { number: 6, x: 60, y: 65 },
        { number: 7, x: 50, y: 85 },
      ],
    },
    {
      name: "Car",
      difficulty: "medium",
      image: "./simple-car-clean.jpg",
      dots: [
        { number: 1, x: 12, y: 60 },
        { number: 2, x: 22, y: 55 },
        { number: 3, x: 40, y: 58 },
        { number: 4, x: 60, y: 58 },
        { number: 5, x: 78, y: 54 },
        { number: 6, x: 90, y: 52 },
        { number: 7, x: 82, y: 70 },
        { number: 8, x: 62, y: 68 },
        { number: 9, x: 40, y: 68 },
        { number: 10, x: 22, y: 65 },
      ],
    },
    {
      name: "Solar System",
      difficulty: "hard",
      image: "./simple-solar-system-clean.jpg",
      dots: [
        { number: 1, x: 15, y: 50 },
        { number: 2, x: 28, y: 50 },
        { number: 3, x: 40, y: 50 },
        { number: 4, x: 52, y: 50 },
        { number: 5, x: 64, y: 50 },
        { number: 6, x: 76, y: 50 },
        { number: 7, x: 88, y: 50 },
        { number: 8, x: 76, y: 38 },
        { number: 9, x: 64, y: 62 },
        { number: 10, x: 52, y: 38 },
      ],
    },
  ],
}
