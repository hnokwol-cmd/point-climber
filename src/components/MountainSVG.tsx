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
          <clipPath id="mainClip">
            <path d="M160,40 Q165,38 170,42 L280,250 Q282,254 278,256 L42,256 Q38,254 40,250 Z" />
          </clipPath>
          <clipPath id="leftClip">
            <path d="M60,160 Q63,157 66,160 L110,256 L10,256 Z" />
          </clipPath>
          <clipPath id="rightClip">
            <path d="M255,175 Q258,172 261,175 L300,256 L215,256 Z" />
          </clipPath>
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
        <path d="M60,160 Q63,157 66,160 L110,256 L10,256 Z" fill="hsl(145 30% 80%)" opacity="0.6" />
        <rect x="0" y={fillY} width="320" height={300 - fillY} clipPath="url(#leftClip)" fill="hsl(145 50% 55%)" />

        {/* Right small mountain - base */}
        <path d="M255,175 Q258,172 261,175 L300,256 L215,256 Z" fill="hsl(145 30% 80%)" opacity="0.6" />
        <rect x="0" y={fillY} width="320" height={300 - fillY} clipPath="url(#rightClip)" fill="hsl(145 50% 55%)" />

        {/* Main mountain - base */}
        <path d="M160,40 Q165,38 170,42 L280,250 Q282,254 278,256 L42,256 Q38,254 40,250 Z" fill="hsl(145 25% 82%)" opacity="0.5" />
        {/* Main mountain - filled portion */}
        <rect x="0" y={fillY} width="320" height={300 - fillY} clipPath="url(#mainClip)" fill="hsl(145 55% 48%)" />

        {/* Snow cap */}
        <path d="M160,40 Q165,38 170,42 L188,80 Q175,92 160,94 Q145,92 132,80 Z" fill="white" />
        <path d="M132,80 Q140,88 148,82 Q155,90 160,94 Q145,92 132,80Z" fill="hsl(145 20% 92%)" opacity="0.5"/>

        {/* Flag at summit */}
        <line x1="160" y1="28" x2="160" y2="42" stroke="hsl(0 70% 55%)" strokeWidth="1.5"/>
        <path d="M160,28 L175,33 L160,38" fill="hsl(0 70% 55%)" />

        {/* Mountain name - centered, large, black */}
        <text x="160" y="195" textAnchor="middle" fill="hsl(220 20% 15%)" fontSize="22" fontWeight="800" opacity="0.9">
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
