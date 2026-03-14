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

  useEffect(() => {
    const saved = getStoredState();
    if (saved) {
      const isNewDay = checkNewDay(saved.lastDate || "");
      setPoints(saved.points || 0);
      setStageIdx(saved.stageIdx || 0);
      setAltitude(isNewDay ? 0 : (saved.altitude || 0));
      setLastDate(new Date().toDateString());
      if (!isNewDay && saved.altitude > 0 && saved.altitude % 10 === 0 && saved.altitude < STAGES[saved.stageIdx || 0]?.summit) {
        setShowAdOverlay(true);
      }
    }
  }, []);

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
    setTimeout(() => setBouncing(false), 200);

    if (newAlt >= stage.summit) {
      setAltitude(stage.summit);
      setPoints((p) => p + stage.bonus);
      setSummitSheet(true);
      return;
    }
    setAltitude(newAlt);
    if (newAlt % 10 === 0) setShowAdOverlay(true);
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

  const progressPercent = Math.round(progress * 100);

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-[390px] flex flex-col items-center px-5 pt-6 pb-10">
        {/* Point badge */}
        <div
          className="bg-card rounded-full px-5 py-2.5 flex items-center gap-2.5 mb-6"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-extrabold text-xs">P</span>
          </div>
          <span className="text-foreground text-[15px] font-medium tracking-tight">
            지금까지 총 <span className="font-bold text-primary">{points}</span> 포인트 받았어요.
          </span>
        </div>

        {/* Mountain illustration area */}
        <div
          className="w-full rounded-3xl px-4 pt-6 pb-2 mb-3"
          style={{
            background: 'linear-gradient(180deg, hsl(214 100% 96%) 0%, hsl(214 70% 90%) 100%)',
          }}
        >
          {/* Summit info */}
          <div className="text-center mb-2">
            <p className="text-foreground font-extrabold tracking-tight" style={{ fontSize: 32 }}>
              정상 {stage.summit}M
            </p>
            <p className="text-primary text-[13px] font-semibold mt-0.5">
              ⭐ 정상 도착 보너스 {stage.bonus}포인트
            </p>
          </div>

          {/* Mountain */}
          <div
            className="w-full cursor-pointer"
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
        </div>

        {/* Speech bubble guide */}
        <div
          className="speech-bubble bg-card rounded-2xl px-5 py-3 text-center mb-5"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <p className="text-foreground text-[15px] font-medium">
            👆 산을 눌러 등반하세요
          </p>
        </div>

        {/* Current altitude */}
        <div className="w-full mb-4">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-foreground font-bold" style={{ fontSize: 22 }}>
              현재 {altitude}M
            </span>
            <span className="text-muted-foreground text-sm font-medium">
              {progressPercent}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Info cards */}
        <div className="w-full grid grid-cols-2 gap-3 mb-4">
          <div
            className="bg-card rounded-2xl p-4"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
          >
            <p className="text-muted-foreground text-[11px] font-medium mb-0.5">포인트 획득 조건</p>
            <p className="text-foreground text-[14px] font-bold">10M 당 1포인트</p>
          </div>
          <div
            className="bg-card rounded-2xl p-4"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
          >
            <p className="text-muted-foreground text-[11px] font-medium mb-0.5">다음 목표</p>
            <p className="text-foreground text-[14px] font-bold">
              {isLastStage && altitude >= stage.summit
                ? "🎉 완주!"
                : nextStage
                  ? `${nextStage.name} ${nextStage.summit}M`
                  : `${stage.name} 정복`}
            </p>
          </div>
        </div>

        {/* Status card */}
        <div
          className="w-full bg-card rounded-2xl p-4 flex items-center gap-3"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
            🏔️
          </div>
          <div className="flex-1">
            <p className="text-foreground text-[14px] font-bold">
              {stage.name}에서 <span className="text-primary">{altitude}M</span> 등반했어요
            </p>
            <p className="text-muted-foreground text-[12px] mt-0.5">
              매일 자정에 고도가 초기화돼요
            </p>
          </div>
          <span className="text-muted-foreground text-lg">›</span>
        </div>
      </div>

      {/* Summit bottom sheet */}
      <BottomSheet open={summitSheet} onClose={handleSummitClose}>
        <div className="text-center">
          <div className="text-6xl mb-5">🎉</div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">정상 도착!</h2>
          <p className="text-muted-foreground text-[15px] mb-1">
            {stage.name} {stage.summit}M 등반 완료
          </p>
          <div
            className="inline-flex items-center gap-1.5 bg-primary/10 rounded-full px-4 py-2 mb-7 mt-3"
          >
            <span className="text-primary font-extrabold text-lg">+{stage.bonus}</span>
            <span className="text-primary font-semibold text-sm">보너스 포인트</span>
          </div>
          <button
            onClick={handleSummitClose}
            className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl text-[16px] active:scale-[0.98] transition-transform"
          >
            {isLastStage ? "완료" : "다음 산으로 이동 →"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default Index;
