import type { CSSProperties } from 'react'
import type { Burst } from '../game/types'

type StyleWithVars = CSSProperties & { [key: `--${string}`]: string }

const SPARKS = [0, 1, 2, 3, 4, 5, 6, 7]

/** Ring and sparks thrown off where a merge lands, in board coordinates. */
export default function Bursts({ bursts }: { bursts: Burst[] }) {
  return (
    <div className="fx-layer" aria-hidden="true">
      {bursts.map((burst) =>
        [
          <span
            key={`ring-${burst.id}`}
            className="burst-ring"
            style={{ left: burst.x, top: burst.y, borderColor: burst.color }}
          />,
          ...SPARKS.map((i) => {
            const style: StyleWithVars = {
              left: burst.x,
              top: burst.y,
              background: i % 2 ? '#ffd166' : burst.color,
              animationDelay: `${i * 15}ms`,
              '--a': `${i * 45}deg`,
            }
            return <span key={`spark-${burst.id}-${i}`} className="burst-spark" style={style} />
          }),
        ],
      )}
    </div>
  )
}
