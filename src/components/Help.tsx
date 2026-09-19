import { useDismiss } from './useDismiss'

interface HelpProps {
  mergeCount: number
  onClose: () => void
}

export default function Help({ mergeCount, onClose }: HelpProps) {
  const panel = useDismiss(onClose, '.help-toggle')

  return (
    <div className="popover help" id="help" ref={panel}>
      <p className="help-title">HOW TO PLAY</p>
      <ol className="help-steps">
        <li>Tap the deck. One card lands on every open slot.</li>
        <li>Tap a slot to lift the matching cards on top of it, then tap another slot to drop them.</li>
        <li>They only land on a slot showing the same number, or on an empty slot.</li>
        <li>{mergeCount} of a kind collapse into one card of the next number up.</li>
        <li>Every new number you reach opens another slot.</li>
      </ol>
      <p className="help-end">
        The run ends when there is no move and no deal left. BEST is the highest card you made.
      </p>
    </div>
  )
}
