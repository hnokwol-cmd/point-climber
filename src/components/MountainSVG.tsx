interface MountainSVGProps {
  progress: number; // 0 to 1
  mountainName: string;
  bouncing: boolean;
  showAdOverlay: boolean;
  onAdClick: () => void;
  adLoading: boolean;
}

const MountainSVG = ({ progress, mountainName, bouncing, showAdOverlay, onAdClick, adLoading }: MountainSVGProps) => {
  // Main mountain: triangle from (50,30) top to (5,200) bottom-left to (95,200) bottom-right
  // Small left peak: (15,120) top to (0,200) bottom-left to (30,200) bottom-right
  const fillHeight = progress * 170; // 170 is the mountain height (30 to 200)
  const clipY = 200 - fillHeight;

  return (
    <div className={`relative w-full ${bouncing ? "mountain-bounce" : ""}`}>
      <svg viewBox="0 0 100 210" className="w-full" style={{ maxHeight: 320 }}>
        <defs>
          <clipPath id="mainMountainClip">
            <polygon points="50,30 5,200 95,200" />
          </clipPath>
          <clipPath id="smallPeakClip">
            <polygon points="18,130 2,200 34,200" />
          </clipPath>
          {/* Snow cap clip */}
          <clipPath id="snowCap">
            <polygon points="50,30 43,55 57,55" />
          </clipPath>
        </defs>

        {/* Small left peak - unfilled */}
        <polygon points="18,130 2,200 34,200" className="fill-mountain-unfilled" />
        {/* Small left peak - filled */}
        <rect x="0" y={clipY} width="100" height={fillHeight + 10} clipPath="url(#smallPeakClip)" className="fill-mountain-fill" />

        {/* Main mountain - unfilled */}
        <polygon points="50,30 5,200 95,200" className="fill-mountain-unfilled" />
        {/* Main mountain - filled */}
        <rect x="0" y={clipY} width="100" height={fillHeight + 10} clipPath="url(#mainMountainClip)" className="fill-mountain-fill" />

        {/* Snow cap */}
        <polygon points="50,30 43,55 57,55" className="fill-mountain-snow" />

        {/* Mountain name */}
        <text x="50" y="155" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold" style={{ fontSize: 8 }}>
          {mountainName}
        </text>
      </svg>

      {/* Ad overlay */}
      {showAdOverlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onAdClick(); }}
            disabled={adLoading}
            className="bg-card rounded-2xl px-5 py-3 shadow-lg border border-border text-sm font-semibold text-primary transition-transform active:scale-95"
          >
            {adLoading ? "광고 시청 중…" : "📺 광고 보고 이어서 등반하기"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MountainSVG;
