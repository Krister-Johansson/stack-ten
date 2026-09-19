import { colorOf } from '../game/constants'
import type { Banner as BannerData } from '../game/types'

/** Shown the first time a value is minted, alongside the slot it unlocks. */
export default function Banner({ banner }: { banner: BannerData }) {
  const color = colorOf(banner.v)
  return (
    <div className="banner" aria-hidden="true">
      <span className="banner-title">NEW CARD</span>
      <span className="banner-card" style={{ borderColor: color, color }}>
        {banner.v}
      </span>
      <span className="banner-sub">NEW SLOT UNLOCKED</span>
    </div>
  )
}
