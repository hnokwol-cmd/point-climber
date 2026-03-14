import { useState, useEffect, useCallback } from "react";
import MountainSVG from "@/components/MountainSVG";
import BottomSheet from "@/components/BottomSheet";

const STAGES = [
  { name: "북한산", summit: 200, bonus: 20 },
  { name: "설악산", summit: 500, bonus: 20 },
  { name: "한라산", summit: 1000, bonus: 20 },
];

function getStoredState() {
  try {
    const raw = localStorage.getItem("point-climbing");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function checkNewDay(lastDate: string): boolean {
  const today = new Date().toDateString();
  return lastDate !== today;
}

const Index = () => {
  const [altitude, setAltitude] = useState(0);
  const [points, setPoints] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [bouncing, setBouncing] = useState(false);
  const [showAdOverlay, setShowAdOverlay] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [summitSheet, setSummitSheet] = useState(false);
  const [lastDate, setLastDate] = useState(new Date().toDateString());

  // Load from localStorage
  useEffect(() => {
    const saved = getStoredState();
    if (saved) {
      const isNewDay = checkNewDay(saved.lastDate || "");
      setPoints(saved.points || 0);
      setStageIdx(saved.stageIdx || 0);
      setAltitude(isNewDay ? 0 : (saved.altitude || 0));
      setLastDate(new Date().toDateString());
      // Restore ad overlay state
      if (!isNewDay && saved.altitude > 0 && saved.altitude % 10 === 0 && saved.altitude < STAGES[saved.stageIdx || 0]?.summit) {
        setShowAdOverlay(true);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("point-climbing", JSON.stringify({ altitude, points, stageIdx, lastDate }));
  }, [altitude, points, stageIdx, lastDate]);

  const stage = STAGES[stageIdx] || STAGES[STAGES.length - 1];
  const isLastStage = stageIdx >= STAGES.length - 1;
  const nextStage = STAGES[stageIdx + 1];
  const progress = altitude / stage.summit;

  const handleMountainClick = useCallback(() => {
    if (showAdOverlay || summitSheet) return;

    const newAlt = altitude + 1;
    setBouncing(true);
    setTimeout(() => setBouncing(false), 150);

    if (newAlt >= stage.summit) {
      // Summit reached
      setAltitude(stage.summit);
      setPoints((p) => p + stage.bonus);
      setSummitSheet(true);
      return;
    }

    setAltitude(newAlt);

    // Every 10M, show ad
    if (newAlt % 10 === 0) {
      setShowAdOverlay(true);
    }
  }, [altitude, showAdOverlay, summitSheet, stage]);

  const handleAdClick = useCallback(() => {
    setAdLoading(true);
    setTimeout(() => {
      setAdLoading(false);
      setShowAdOverlay(false);
      setPoints((p) => p + 1);
    }, 2000);
  }, []);

  const handleSummitClose = useCallback(() => {
    setSummitSheet(false);
    if (!isLastStage) {
      setStageIdx((i) => i + 1);
      setAltitude(0);
    }
  }, [isLastStage]);

  return (
    <div className="min-h-screen flex justify-center bg-background">
      <div className="w-full max-w-[390px] flex flex-col items-center px-5 py-6 gap-4">
        {/* Point badge */}
        <div className="bg-card rounded-full px-5 py-2.5 shadow-sm border border-border flex items-center gap-2">
          <span className="text-primary font-bold text-base">P</span>
          <span className="text-foreground text-sm font-medium">
            지금까지 총 <span className="font-bold text-primary">{points}</span> 포인트 받았어요.
          </span>
        </div>

        {/* Summit info */}
        <div className="text-center mt-2">
          <p className="text-4xl font-extrabold text-foreground tracking-tight" style={{ fontSize: 36 }}>
            정상 {stage.summit}M
          </p>
          <p className="text-primary text-sm font-medium mt-1">
            정상 도착 보너스 {stage.bonus}포인트
          </p>
        </div>

        {/* Mountain */}
        <div
          className="w-full cursor-pointer active:cursor-pointer mt-2"
          onClick={handleMountainClick}
        >
          <MountainSVG
            progress={progress}
            mountainName={stage.name}
            bouncing={bouncing}
            showAdOverlay={showAdOverlay}
            onAdClick={handleAdClick}
            adLoading={adLoading}
          />
        </div>

        {/* Current altitude */}
        <p className="text-foreground font-bold text-center" style={{ fontSize: 26 }}>
          현재 위치 {altitude}M
        </p>

        {/* Guide card */}
        <div className="bg-card rounded-2xl px-5 py-4 shadow-sm border border-border w-full text-center">
          <p className="text-foreground text-sm font-medium">산을 눌러 포인트 등반하세요</p>
          <p className="text-muted-foreground text-xs mt-1">10M 당 1포인트 획득</p>
        </div>

        {/* Footer */}
        <p className="text-muted-foreground text-xs mt-2">
          {isLastStage && altitude >= stage.summit
            ? "🎉 모든 산을 정복했어요!"
            : nextStage
              ? `다음 목표: ${nextStage.name} ${nextStage.summit}M`
              : `현재 목표: ${stage.name} ${stage.summit}M`}
        </p>
      </div>

      {/* Summit bottom sheet */}
      <BottomSheet open={summitSheet} onClose={handleSummitClose}>
        <div className="text-center">
          <p className="text-5xl mb-4">🏔️</p>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">정상 도착!</h2>
          <p className="text-muted-foreground text-sm mb-1">
            {stage.name} {stage.summit}M 등반 완료
          </p>
          <p className="text-primary font-bold text-lg mb-6">+{stage.bonus} 보너스 포인트 획득!</p>
          <button
            onClick={handleSummitClose}
            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-2xl text-base active:scale-[0.98] transition-transform"
          >
            {isLastStage ? "완료" : "다음 산으로 이동"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default Index;
