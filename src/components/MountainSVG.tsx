interface MountainSVGProps {
  progress: number;
  mountainName: string;
  bouncing: boolean;
  showAdOverlay: boolean;
  onAdClick: () => void;
  adLoading: boolean;
}

const MountainSVG = ({ progress, mountainName, bouncing, showAdOverlay, onAdClick, adLoading }: MountainSVGProps) => {
  const fillY = 280 - progress * 200;

  return (
    <div className={`relative w-full ${bouncing ? "mountain-bounce" : ""}`}>
      <svg viewBox="0 0 320 300" className="w-full" style={{ maxHeight: 340 }}>
        <defs>
          {/* Main mountain clip */}
          <clipPath id="mainClip">
            <path d="M160,40 Q165,38 170,42 L280,250 Q282,254 278,256 L42,256 Q38,254 40,250 Z" />
          </clipPath>
          {/* Left small mountain clip */}
          <clipPath id="leftClip">
            <path d="M60,160 Q63,157 66,160 L110,256 L10,256 Z" />
          </clipPath>
          {/* Right small mountain clip */}
          <clipPath id="rightClip">
            <path d="M255,175 Q258,172 261,175 L300,256 L215,256 Z" />
          </clipPath>
          {/* Snow cap */}
          <clipPath id="snowClip">
            <path d="M160,40 Q165,38 170,42 L188,80 Q170,90 150,90 L132,80 Z" />
          </clipPath>
          {/* Cloud filter */}
          <filter id="cloudShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.05"/>
          </filter>
        </defs>

        {/* Clouds */}
        <g className="float-gentle" filter="url(#cloudShadow)">
          <ellipse cx="70" cy="55" rx="28" ry="14" fill="white" opacity="0.9"/>
          <ellipse cx="55" cy="55" rx="18" ry="12" fill="white" opacity="0.9"/>
          <ellipse cx="88" cy="55" rx="18" ry="11" fill="white" opacity="0.9"/>
        </g>
        <g className="float-gentle" style={{ animationDelay: '1.5s' }} filter="url(#cloudShadow)">
          <ellipse cx="265" cy="40" rx="22" ry="11" fill="white" opacity="0.85"/>
          <ellipse cx="252" cy="40" rx="14" ry="10" fill="white" opacity="0.85"/>
          <ellipse cx="280" cy="40" rx="14" ry="9" fill="white" opacity="0.85"/>
        </g>

        {/* Left small mountain - base */}
        <path d="M60,160 Q63,157 66,160 L110,256 L10,256 Z" fill="hsl(214 40% 82%)" />
        <rect x="0" y={fillY} width="320" height={300 - fillY} clipPath="url(#leftClip)" fill="hsl(214 80% 65%)" />

        {/* Right small mountain - base */}
        <path d="M255,175 Q258,172 261,175 L300,256 L215,256 Z" fill="hsl(214 40% 82%)" />
        <rect x="0" y={fillY} width="320" height={300 - fillY} clipPath="url(#rightClip)" fill="hsl(214 80% 65%)" />

        {/* Main mountain - base (soft rounded) */}
        <path d="M160,40 Q165,38 170,42 L280,250 Q282,254 278,256 L42,256 Q38,254 40,250 Z" fill="hsl(214 40% 82%)" />
        {/* Main mountain - filled portion */}
        <rect x="0" y={fillY} width="320" height={300 - fillY} clipPath="url(#mainClip)" fill="hsl(214 91% 58%)" />

        {/* Snow cap */}
        <path d="M160,40 Q165,38 170,42 L188,80 Q175,92 160,94 Q145,92 132,80 Z" fill="white" />
        <path d="M132,80 Q140,88 148,82 Q155,90 160,94 Q145,92 132,80Z" fill="hsl(214 30% 92%)" opacity="0.5"/>

        {/* Flag at summit */}
        <line x1="160" y1="28" x2="160" y2="42" stroke="hsl(0 70% 55%)" strokeWidth="1.5"/>
        <path d="M160,28 L175,33 L160,38" fill="hsl(0 70% 55%)" />

        {/* Trees on main mountain */}
        {progress < 0.85 && (
          <>
            <g transform="translate(110, 210)">
              <polygon points="0,-18 -8,0 8,0" fill="hsl(145 45% 55%)" />
              <polygon points="0,-12 -6,0 6,0" fill="hsl(145 50% 48%)" transform="translate(0,-6)"/>
              <rect x="-1.5" y="0" width="3" height="5" fill="hsl(30 40% 45%)" rx="0.5"/>
            </g>
            <g transform="translate(200, 215)">
              <polygon points="0,-16 -7,0 7,0" fill="hsl(145 45% 55%)" />
              <polygon points="0,-10 -5,0 5,0" fill="hsl(145 50% 48%)" transform="translate(0,-5)"/>
              <rect x="-1.5" y="0" width="3" height="5" fill="hsl(30 40% 45%)" rx="0.5"/>
            </g>
            <g transform="translate(150, 225)">
              <polygon points="0,-14 -6,0 6,0" fill="hsl(145 40% 50%)" />
              <polygon points="0,-9 -4,0 4,0" fill="hsl(145 45% 45%)" transform="translate(0,-4)"/>
              <rect x="-1" y="0" width="2" height="4" fill="hsl(30 40% 45%)" rx="0.5"/>
            </g>
          </>
        )}

        {/* Trees on left mountain */}
        <g transform="translate(50, 230)">
          <polygon points="0,-12 -5,0 5,0" fill="hsl(145 40% 58%)" />
          <rect x="-1" y="0" width="2" height="4" fill="hsl(30 40% 45%)" rx="0.5"/>
        </g>
        <g transform="translate(75, 235)">
          <polygon points="0,-10 -4,0 4,0" fill="hsl(145 40% 55%)" />
          <rect x="-1" y="0" width="2" height="3" fill="hsl(30 40% 45%)" rx="0.5"/>
        </g>

        {/* Mountain name */}
        <text x="160" y="200" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" opacity="0.95">
          {mountainName}
        </text>

        {/* Ground/grass line */}
        <ellipse cx="160" cy="258" rx="150" ry="6" fill="hsl(145 35% 65%)" opacity="0.4"/>
      </svg>

      {/* Ad overlay */}
      {showAdOverlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onAdClick(); }}
            disabled={adLoading}
            className="bg-card rounded-2xl px-6 py-3.5 shadow-xl text-sm font-semibold text-primary transition-all active:scale-95 border border-border/50"
            style={{ boxShadow: '0 8px 30px rgba(49, 130, 246, 0.15)' }}
          >
            {adLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                광고 시청 중…
              </span>
            ) : "📺 광고 보고 이어서 등반하기"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MountainSVG;
