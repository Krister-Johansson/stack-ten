interface GameOverProps {
  best: number
  onReplay: () => void
}

export default function GameOver({ best, onReplay }: GameOverProps) {
  return (
    <div className="gameover" role="dialog" aria-modal="true" aria-label="No moves left">
      <p className="gameover-title">NO MOVES LEFT</p>
      <p className="gameover-label">HIGHEST CARD</p>
      <p className="gameover-score">{best}</p>
      <button type="button" className="replay" onClick={onReplay} autoFocus>
        PLAY AGAIN
      </button>
    </div>
  )
}
