declare module "canvas-confetti" {
  export type ConfettiOptions = Record<string, unknown>
  const confetti: (options?: ConfettiOptions) => void
  export default confetti
}

