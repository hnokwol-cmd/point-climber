import { useState, useRef, useEffect, useCallback } from 'react'
import { Button, BottomSheet, Badge, Paragraph, TextButton, IconButton } from '@toss/tds-mobile'
import { generateHapticFeedback, Storage, getServerTime, loadFullScreenAd, showFullScreenAd, graniteEvent, setIosSwipeGestureEnabled, TossAds, appLogin, SafeAreaInsets } from '@apps-in-toss/web-framework'
import { colors } from '@toss/tds-colors'
import { functionsInstance } from '../firebase/init'
import { httpsCallable } from 'firebase/functions'
import IntroPage from '../IntroPage'
import '../App.css'

const AD_GROUP_ID = 'ait-ad-test-rewarded-id'
const BANNER_AD_ID = 'ait-ad-test-banner-id'
const STORAGE_KEY = 'treasurehunt'

const ICON_DIAMOND = 'https://static.toss.im/icons/png/4x/icon-diamond-blue-fill.png'
const ICON_TROPHY = 'https://static.toss.im/icons/png/4x/icn-trophy-color.png'
const ICON_CLOUD = 'https://static.toss.im/icons/png/4x/icon-emoji-cloud.png'
const ICON_GIFT = 'https://static.toss.im/icons/png/4x/icon-gift-yellow.png'
const ICON_PARTY = 'https://static.toss.im/icons/png/4x/icon-emoji-party-popper-fill.png'
const ICON_MOUNTAIN_NEXT = 'https://static.toss.im/icons/png/4x/icon-mountain-fill.png'
const TOSSFACE_CALENDAR = 'https://static.toss.im/2d-emojis/png/4x/u1F4C5.png'
const TOSSFACE_DIAMOND = 'https://static.toss.im/2d-emojis/png/4x/u1F48E.png'

const STAGES = [
  { name: '남산',   max: 250,  bonus: 3   },
  { name: '관악산', max: 650,  bonus: 10  },
  { name: '치악산', max: 1300, bonus: 15  },
  { name: '지리산', max: 1900, bonus: 25  },
  { name: '백두산', max: 2750, bonus: 40  },
]

interface State {
  alt: number
  pts: number
  todayPts: number
  stage: number
  waiting: boolean
  summitDone: boolean
  allDone: boolean
  attendDate: string
  lastDate: string
  nextTreasure: number
}

const defaultState: State = {
  alt: 0, pts: 0, todayPts: 0, stage: 0,
  waiting: false, summitDone: false, allDone: false,
  attendDate: '', lastDate: '',
  nextTreasure: 0,
}

function randomTreasureGap(): number {
  return Math.floor(Math.random() * 16) + 15
}

function calcNextTreasure(currentAlt: number): number {
  return currentAlt + randomTreasureGap()
}

async function getToday(): Promise<string> {
  try {
    if (getServerTime.isSupported()) {
      const serverTime = await getServerTime()
      if (serverTime) return new Date(serverTime).toISOString().slice(0, 10)
    }
  } catch {}
  return new Date().toISOString().slice(0, 10)
}

async function loadState(): Promise<State> {
  try {
    const today = await getToday()
    const raw = await Storage.getItem(STORAGE_KEY)
    const s = raw ? JSON.parse(raw) : null
    if (!s) {
      return { ...defaultState, lastDate: today, nextTreasure: calcNextTreasure(0) }
    }
    if (s.todayPts === undefined) s.todayPts = 0
    if (s.lastDate !== today) {
      if (s.allDone) {
        return { ...s, alt: 0, waiting: false, summitDone: false, allDone: false, stage: 0, lastDate: today, todayPts: 0, nextTreasure: calcNextTreasure(0) }
      }
      return { ...s, lastDate: today, todayPts: 0 }
    }
    if (!s.nextTreasure || s.nextTreasure <= s.alt) {
      return { ...s, nextTreasure: calcNextTreasure(s.alt) }
    }
    return s
  } catch {
    return { ...defaultState, lastDate: new Date().toISOString().slice(0, 10), nextTreasure: calcNextTreasure(0) }
  }
}

async function loadFromCloud(key: number): Promise<State | null> {
  try {
    const loadGameDataFn = httpsCallable<{ userKey: number }, { gameState: State | null }>(functionsInstance, 'loadGameData')
    const result = await loadGameDataFn({ userKey: key })
    const data = result.data.gameState
    if (data && (data.pts > 0 || data.stage > 0)) {
      if (data.todayPts === undefined) data.todayPts = 0
      return data
    }
  } catch (e) {
    console.error('클라우드 로드 실패:', e)
  }
  return null
}

// ── 개선 1: 광고 표시 + 복원 공통 함수 ──
// handleAdClick, handleSummitNext, doAttendance에서 반복되던 패턴을 하나로 통합
function showRewardedAd(onReward: () => void, onDone: () => void) {
  const unregisterBack = graniteEvent.addEventListener('backEvent', { onEvent: () => {} })
  try { setIosSwipeGestureEnabled({ isEnabled: false }) } catch {}

  showFullScreenAd({
    options: { adGroupId: AD_GROUP_ID },
    onEvent: (event) => {
      switch (event.type) {
        case 'userEarnedReward':
          onReward()
          break
        case 'dismissed':
        case 'failedToShow':
          break
      }
      // 모든 이벤트 후 공통 정리
      unregisterBack()
      try { setIosSwipeGestureEnabled({ isEnabled: true }) } catch {}
      onDone()
    },
    onError: (err) => {
      console.error('광고 노출 실패:', err)
      unregisterBack()
      try { setIosSwipeGestureEnabled({ isEnabled: true }) } catch {}
      onDone()
    },
  })
}

export default function App() {
  const [state, setState] = useState<State>(defaultState)
  const [today, setToday] = useState('')
  const [userKey, setUserKey] = useState<number | null>(null)
  const [_isLoggedIn, setIsLoggedIn] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isAdLoaded, setIsAdLoaded] = useState(false)
  const [adWaiting, setAdWaiting] = useState(false)
  const [adLoadDelayed, setAdLoadDelayed] = useState(false)
  const [bannerInitialized, setBannerInitialized] = useState(false)
  const [summitModal, setSummitModal] = useState(false)
  const [attendModal, setAttendModal] = useState(false)
  const [exchangeModal, setExchangeModal] = useState(false)
  const [bounce, setBounce] = useState(false)
  const [coins, setCoins] = useState<{id:number,x:number,y:number,fly:number}[]>([])
  const [rewardText, setRewardText] = useState(false)
  const [safeArea, setSafeArea] = useState(() => SafeAreaInsets.get())

  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)
  const coinIdRef = useRef(0)
  const lastClickRef = useRef(0)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userKeyRef = useRef<number | null>(null)
  const adDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 개선 2: stale closure 방지를 위한 ref
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])
  const todayRef = useRef(today)
  useEffect(() => { todayRef.current = today }, [today])

  useEffect(() => { userKeyRef.current = userKey }, [userKey])

  useEffect(() => {
    const cleanup = SafeAreaInsets.subscribe({ onEvent: (insets) => setSafeArea(insets) })
    return () => cleanup()
  }, [])

  useEffect(() => {
    if (isAdLoaded) {
      if (adDelayTimerRef.current) clearTimeout(adDelayTimerRef.current)
      setAdLoadDelayed(false)
    } else {
      adDelayTimerRef.current = setTimeout(() => {
        setAdLoadDelayed(true)
      }, 10000)
    }
    return () => {
      if (adDelayTimerRef.current) clearTimeout(adDelayTimerRef.current)
    }
  }, [isAdLoaded])

  function syncToCloud(stateToSync: State & { lastDate: string }) {
    const key = userKeyRef.current
    if (!key) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(async () => {
      try {
        const saveGameDataFn = httpsCallable<{ userKey: number; gameState: State }, { success: boolean }>(functionsInstance, 'saveGameData')
        await saveGameDataFn({ userKey: key, gameState: stateToSync })
      } catch (e) {
        console.error('클라우드 동기화 실패:', e)
      }
    }, 2000)
  }

  // 개선 3: save가 async인데 await 안 하는 문제 해결
  // setState 업데이터 패턴으로 항상 최신 state 기반으로 저장
  const save = useCallback(async (updater: (prev: State) => State) => {
    const currentToday = todayRef.current || await getToday()
    setState(prev => {
      const newState = updater(prev)
      const stateToSave = { ...newState, lastDate: currentToday }
      Storage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
      syncToCloud(stateToSave)
      return newState
    })
  }, [])

  async function handleTossLogin() {
    setLoginLoading(true)
    setLoginError('')
    try {
      const { authorizationCode, referrer } = await appLogin()
      const tossLoginFn = httpsCallable<
        { authorizationCode: string; referrer: string },
        { userKey: number }
      >(functionsInstance, 'tossLogin')
      const result = await tossLoginFn({ authorizationCode, referrer })
      const key = result.data.userKey
      setUserKey(key)
      setIsLoggedIn(true)
      setShowIntro(false)
      await Storage.setItem('userKey', String(key))
      const cloudState = await loadFromCloud(key)
      const localState = await loadState()
      if (cloudState && cloudState.pts > localState.pts) {
        const todayStr = await getToday()
        const restored = cloudState.lastDate !== todayStr && cloudState.allDone
          ? { ...cloudState, alt: 0, waiting: false, summitDone: false, allDone: false, stage: 0, lastDate: todayStr, todayPts: 0, nextTreasure: calcNextTreasure(0) }
          : cloudState.lastDate !== todayStr
            ? { ...cloudState, lastDate: todayStr, todayPts: 0 }
            : cloudState
        setState(restored)
        await Storage.setItem(STORAGE_KEY, JSON.stringify(restored))
      }
    } catch (error) {
      console.error('토스 로그인 실패:', error)
      setLoginError('로그인에 실패했어요. 다시 시도해주세요.')
    } finally {
      setLoginLoading(false)
    }
  }

  useEffect(() => {
    loadState().then((loaded) => { setState(loaded); setToday(loaded.lastDate) })
    Storage.getItem('userKey').then(async (saved) => {
      if (saved) {
        try {
          const checkFn = httpsCallable<{ userKey: number }, { valid: boolean }>(functionsInstance, 'checkUserValid')
          const result = await checkFn({ userKey: Number(saved) })
          if (result.data.valid) {
            setUserKey(Number(saved)); setIsLoggedIn(true); setShowIntro(false)
          } else {
            await Storage.removeItem('userKey')
            await Storage.removeItem(STORAGE_KEY)
            setShowIntro(true)
          }
        } catch {
          setUserKey(Number(saved)); setIsLoggedIn(true); setShowIntro(false)
        }
      } else {
        setShowIntro(true)
      }
    }).catch(() => { setShowIntro(true) })
  }, [])

  useEffect(() => {
    if (!loadFullScreenAd.isSupported()) return
    const unregister = loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => { if (event.type === 'loaded') { setIsAdLoaded(true) } },
      onError: (err) => console.error('광고 로드 실패:', err),
    })
    return () => unregister()
  }, [])

  useEffect(() => {
    if (!TossAds.initialize.isSupported()) return
    TossAds.initialize({
      callbacks: {
        onInitialized: () => { setBannerInitialized(true) },
        onInitializationFailed: (error) => { console.error('배너 광고 SDK 초기화 실패:', error) },
      },
    })
    return () => { TossAds.destroyAll?.() }
  }, [])

  useEffect(() => {
    if (!bannerInitialized || !bannerRef.current) return
    if (!TossAds.attachBanner.isSupported()) return
    const attached = TossAds.attachBanner(BANNER_AD_ID, bannerRef.current, {
      theme: 'light', tone: 'grey', variant: 'card',
      callbacks: {
        onAdRendered: (payload) => console.log('배너 렌더링 완료:', payload.slotId),
        onAdImpression: (payload) => console.log('배너 노출 기록 (수익 발생):', payload.slotId),
        onAdFailedToRender: (payload) => console.error('배너 렌더링 실패:', payload.error.message),
        onNoFill: () => console.warn('표시할 배너 광고 없음'),
      },
    })
    return () => attached?.destroy()
  }, [bannerInitialized])

  const s = STAGES[state.stage]
  const isLast = state.stage >= STAGES.length - 1
  const next = STAGES[state.stage + 1]

  function loadNextAd() {
    if (!loadFullScreenAd.isSupported()) return
    setIsAdLoaded(false)
    loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => { if (event.type === 'loaded') setIsAdLoaded(true) },
      onError: (err) => console.error('다음 광고 로드 실패:', err),
    })
  }

  function spawnCoins() {
    if (!wrapRef.current || !svgRef.current) return
    const svgRect = svgRef.current.getBoundingClientRect()
    const wRect = wrapRef.current.getBoundingClientRect()
    const tipX = svgRect.left - wRect.left + 160 * (svgRect.width / 320)
    const tipY = svgRect.top - wRect.top + 40 * (svgRect.height / 300)
    const newCoins = Array.from({length: 5}, (_, i) => ({
      id: coinIdRef.current++,
      x: tipX - 16 + (Math.random() - 0.5) * 40,
      y: tipY - 16,
      fly: i + 1,
    }))
    setCoins(newCoins)
    setRewardText(true)
    setTimeout(() => setCoins([]), 1200)
    setTimeout(() => setRewardText(false), 1200)
  }

  function handleClick() {
    const now = Date.now()
    if (now - lastClickRef.current < 50) return
    lastClickRef.current = now
    if (adWaiting || state.waiting || state.summitDone || state.allDone || adLoadDelayed) return
    generateHapticFeedback({ type: 'tickMedium' })
    const newAlt = state.alt + 1
    setBounce(true)
    setTimeout(() => setBounce(false), 200)
    if (newAlt >= state.nextTreasure && newAlt < s.max) {
      spawnCoins()
      const nextTarget = calcNextTreasure(newAlt)
      setTimeout(() => save(prev => ({ ...prev, alt: newAlt, waiting: true, nextTreasure: nextTarget })), 250)
      return
    }
    if (newAlt >= s.max) {
      save(prev => ({ ...prev, alt: newAlt }))
      setSummitModal(true)
      return
    }
    save(prev => ({ ...prev, alt: newAlt }))
  }

  // 개선 1: 광고 콜백 공통화 — 보상 로직만 다르게 전달
  function handleAdClick() {
    if (adWaiting || !isAdLoaded) return
    setAdWaiting(true)

    showRewardedAd(
      () => {
        // stateRef로 최신 state 참조
        const cur = stateRef.current
        const curStage = STAGES[cur.stage]
        if (cur.summitDone) {
          save(prev => ({ ...prev, stage: prev.stage + 1, alt: 0, waiting: false, summitDone: false, nextTreasure: calcNextTreasure(0) }))
        } else {
          generateHapticFeedback({ type: 'success' })
          spawnCoins()
          if (cur.alt >= curStage.max) {
            save(prev => ({ ...prev, pts: prev.pts + 1, todayPts: prev.todayPts + 1, waiting: false }))
            setSummitModal(true)
          } else {
            save(prev => ({ ...prev, pts: prev.pts + 1, todayPts: prev.todayPts + 1, waiting: false }))
          }
        }
      },
      () => { setAdWaiting(false); loadNextAd() },
    )
  }

  function handleSummitNext() {
    if (adWaiting || !isAdLoaded) return
    setAdWaiting(true)

    showRewardedAd(
      () => {
        const curStage = STAGES[stateRef.current.stage]
        save(prev => ({
          ...prev,
          stage: prev.stage + 1, alt: 0, waiting: false, summitDone: false,
          pts: prev.pts + curStage.bonus, todayPts: prev.todayPts + curStage.bonus,
          nextTreasure: calcNextTreasure(0),
        }))
        setSummitModal(false)
        generateHapticFeedback({ type: 'success' })
      },
      () => { setAdWaiting(false); loadNextAd() },
    )
  }

  function handleSummitClose() {
    if (isLast) {
      save(prev => ({ ...prev, allDone: true, pts: prev.pts + s.bonus, todayPts: prev.todayPts + s.bonus }))
    } else {
      save(prev => ({ ...prev, summitDone: true, pts: prev.pts + s.bonus, todayPts: prev.todayPts + s.bonus }))
    }
    setSummitModal(false)
  }

  function doAttendance() {
    if (adWaiting || !isAdLoaded) return
    setAdWaiting(true)

    showRewardedAd(
      () => {
        save(prev => ({ ...prev, pts: prev.pts + 1, todayPts: prev.todayPts + 1, attendDate: todayRef.current }))
        setAttendModal(false)
        generateHapticFeedback({ type: 'success' })
        spawnCoins()
      },
      () => { setAdWaiting(false); loadNextAd() },
    )
  }

  // DEV 함수 (출시 전 제거 예정)
  function devJump() { save(prev => ({ ...prev, stage: 4, alt: 2700, waiting: false, summitDone: false, allDone: false, nextTreasure: calcNextTreasure(2700) })) }
  function devReset() { save(() => ({ ...defaultState, lastDate: todayRef.current, nextTreasure: calcNextTreasure(0) })) }

  const fillH = Math.min(state.alt / s.max, 1) * 200
  const fillY = 280 - fillH

  if (showIntro) {
    return <IntroPage onStart={handleTossLogin} isLoading={loginLoading} error={loginError} />
  }

  return (
    <div ref={wrapRef} style={{maxWidth:390,margin:'0 auto',background:colors.grey50,minHeight:'100vh',padding:`16px 20px ${safeArea.bottom+40}px`,display:'flex',flexDirection:'column',alignItems:'center',position:'relative'}}>
      <style>{`
        @keyframes coinFly1{0%{transform:translate(0,0) scale(.5);opacity:1}100%{transform:translate(-55px,-100px) scale(1.2);opacity:0}}
        @keyframes coinFly2{0%{transform:translate(0,0) scale(.5);opacity:1}100%{transform:translate(-20px,-120px) scale(1.2);opacity:0}}
        @keyframes coinFly3{0%{transform:translate(0,0) scale(.5);opacity:1}100%{transform:translate(20px,-118px) scale(1.2);opacity:0}}
        @keyframes coinFly4{0%{transform:translate(0,0) scale(.5);opacity:1}100%{transform:translate(55px,-100px) scale(1.2);opacity:0}}
        @keyframes coinFly5{0%{transform:translate(0,0) scale(.5);opacity:1}100%{transform:translate(0px,-125px) scale(1.2);opacity:0}}
        @keyframes rewardPop{0%{transform:translateY(0) scale(0.5);opacity:0}20%{transform:translateY(-20px) scale(1.1);opacity:1}80%{transform:translateY(-60px) scale(1);opacity:1}100%{transform:translateY(-80px) scale(0.9);opacity:0}}
        @keyframes floatAnim{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes bounceAnim{0%{transform:scale(1)}50%{transform:scale(1.04) translateY(-5px)}100%{transform:scale(1)}}
      `}</style>
      {coins.map(c => (
        <div key={c.id} style={{position:'absolute',left:c.x,top:c.y,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',zIndex:50,animation:`coinFly${c.fly} 1s ease-out forwards`}}>
          <img src={ICON_DIAMOND} width={32} height={32} alt="" />
        </div>
      ))}
      {rewardText && svgRef.current && wrapRef.current && (() => {
        const svgRect = svgRef.current!.getBoundingClientRect()
        const wRect = wrapRef.current!.getBoundingClientRect()
        const cx = svgRect.left - wRect.left + svgRect.width / 2 - 40
        const cy = svgRect.top - wRect.top + 60
        return (
          <div style={{position:'absolute',left:cx,top:cy,zIndex:60,pointerEvents:'none',animation:'rewardPop 1.2s ease-out forwards',display:'flex',alignItems:'center',gap:4,background:'rgba(49,130,246,0.9)',borderRadius:20,padding:'6px 14px',boxShadow:'0 4px 16px rgba(49,130,246,0.3)'}}>
            <img src={ICON_DIAMOND} width={18} height={18} alt="" />
            <span style={{color:'white',fontWeight:800,fontSize:15}}>+1 보물</span>
          </div>
        )
      })()}
      <div style={{background:'white',borderRadius:999,padding:'8px 16px',display:'flex',alignItems:'center',gap:8,marginBottom:14,boxShadow:`0 2px 12px ${colors.greyOpacity100}`}}>
        <Badge size="small" color="blue" variant="fill"><img src={TOSSFACE_DIAMOND} width={14} height={14} alt="" style={{verticalAlign:'middle',display:'block'}} /></Badge>
        <Paragraph typography="t6" fontWeight="medium" color={colors.grey900}>
          <Paragraph.Text>오늘 등산으로 </Paragraph.Text>
          <Paragraph.Text fontWeight="bold" color={colors.blue500}>{state.todayPts}</Paragraph.Text>
          <Paragraph.Text> 보물을 찾았어요</Paragraph.Text>
        </Paragraph>
      </div>
      <div style={{width:'100%',borderRadius:20,padding:'16px 16px 12px',marginBottom:8,background:`linear-gradient(180deg,${colors.blue50} 0%,${colors.blue100} 100%)`,position:'relative'}}>
        <div style={{textAlign:'center',marginBottom:6}}>
          <Paragraph typography="t2" fontWeight="bold" color={colors.grey900} textAlign="center">
             <Paragraph.Text>{s.name} {s.max.toLocaleString()}M</Paragraph.Text>
          </Paragraph>
          <Paragraph typography="t7" fontWeight="semibold" color={colors.blue500} textAlign="center">
            <Paragraph.Text>도착 보너스 {s.bonus} 보물</Paragraph.Text>
          </Paragraph>
        </div>
        <div onClick={handleClick} style={{position:'relative',cursor:adLoadDelayed?'default':'pointer',userSelect:'none',width:'100%',animation:bounce?'bounceAnim 0.2s ease':undefined,opacity:adLoadDelayed?0.6:1}}>
          <svg ref={svgRef} viewBox="0 0 320 300" style={{width:'100%',maxHeight:270}}>
            <defs>
              <clipPath id="mainClip"><path d="M160,40 Q165,38 170,42 L280,250 Q282,254 278,256 L42,256 Q38,254 40,250 Z"/></clipPath>
              <clipPath id="leftClip"><path d="M60,160 Q63,157 66,160 L110,256 L10,256 Z"/></clipPath>
              <clipPath id="rightClip"><path d="M255,175 Q258,172 261,175 L300,256 L215,256 Z"/></clipPath>
            </defs>
            <g style={{animation:'floatAnim 3s ease-in-out infinite'}}>
              <ellipse cx="70" cy="55" rx="28" ry="14" fill="white" opacity="0.9"/>
              <ellipse cx="55" cy="55" rx="18" ry="12" fill="white" opacity="0.9"/>
              <ellipse cx="88" cy="55" rx="18" ry="11" fill="white" opacity="0.9"/>
            </g>
            <g style={{animation:'floatAnim 3s ease-in-out infinite',animationDelay:'1.5s'}}>
              <ellipse cx="265" cy="40" rx="22" ry="11" fill="white" opacity="0.85"/>
              <ellipse cx="252" cy="40" rx="14" ry="10" fill="white" opacity="0.85"/>
              <ellipse cx="280" cy="40" rx="14" ry="9" fill="white" opacity="0.85"/>
            </g>
            <path d="M60,160 Q63,157 66,160 L110,256 L10,256 Z" fill={colors.green200} opacity="0.6"/>
            <rect x="0" y={fillY} width="320" height={300-fillY} clipPath="url(#leftClip)" fill={colors.green400}/>
            <path d="M255,175 Q258,172 261,175 L300,256 L215,256 Z" fill={colors.green200} opacity="0.6"/>
            <rect x="0" y={fillY} width="320" height={300-fillY} clipPath="url(#rightClip)" fill={colors.green400}/>
            <path d="M160,40 Q165,38 170,42 L280,250 Q282,254 278,256 L42,256 Q38,254 40,250 Z" fill={colors.green100} opacity="0.5"/>
            <rect x="0" y={fillY} width="320" height={300-fillY} clipPath="url(#mainClip)" fill={colors.green500}/>
            <path d="M160,40 Q165,38 170,42 L188,80 Q175,92 160,94 Q145,92 132,80 Z" fill="white"/>
            <line x1="160" y1="28" x2="160" y2="42" stroke={colors.red500} strokeWidth="1.5"/>
            <path d="M160,28 L175,33 L160,38" fill={colors.red500}/>
            <ellipse cx="160" cy="258" rx="150" ry="6" fill={colors.green300} opacity="0.4"/>
          </svg>
          {(state.waiting || state.summitDone) && !state.allDone && (
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Button size="medium" color="primary" variant="fill" loading={adWaiting} disabled={!isAdLoaded}
                onClick={e => { e.stopPropagation(); handleAdClick() }}>
                {!isAdLoaded ? '광고 준비 중...' : state.summitDone ? '광고 보고 다음 산으로 이동' : '광고 보고 이어서 보물 찾기'}
              </Button>
            </div>
          )}
          {state.allDone && (
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(238,244,255,.85)',borderRadius:16,flexDirection:'column',gap:6}}>
              <img src={ICON_TROPHY} width={40} height={40} alt="" />
              <Paragraph typography="t6" fontWeight="bold" color={colors.grey900} textAlign="center">
                <Paragraph.Text>모든 산을 정복했어요!</Paragraph.Text>
              </Paragraph>
              <Paragraph typography="t7" color={colors.grey500} textAlign="center">
                <Paragraph.Text>내일 다시 등산할 수 있어요</Paragraph.Text>
              </Paragraph>
            </div>
          )}
        </div>
        <div style={{textAlign:'center',marginTop:4}}>
          <Paragraph typography="st9" fontWeight="bold" color={colors.grey900} textAlign="center">
            <Paragraph.Text>나의 위치 {state.alt.toLocaleString()}M</Paragraph.Text>
          </Paragraph>
        </div>
        {!state.waiting && !state.summitDone && !state.allDone && (
          <div style={{display:'flex',justifyContent:'center',marginTop:8}}>
            <div style={{background:'white',borderRadius:14,padding:'6px 16px',display:'inline-flex',flexDirection:'column',alignItems:'center',gap:2,boxShadow:`0 2px 12px ${colors.greyOpacity100}`}}>
              {adLoadDelayed ? (
                <>
                  <Paragraph typography="t6" fontWeight="medium" color={colors.grey900} textAlign="center">
                    <Paragraph.Text><img src={ICON_CLOUD} width={18} height={18} alt="" style={{verticalAlign:'middle',marginRight:4}} />산이 높아 잠시 쉬어가요</Paragraph.Text>
                  </Paragraph>
                  <Paragraph typography="t7" color={colors.grey500} textAlign="center">
                    <Paragraph.Text>곧 다시 보물을 찾을 수 있어요</Paragraph.Text>
                  </Paragraph>
                </>
              ) : (
                <>
                  <Paragraph typography="t6" fontWeight="medium" color={colors.grey900} textAlign="center">
                    <Paragraph.Text><img src={ICON_MOUNTAIN_NEXT} width={16} height={16} alt="" style={{verticalAlign:'middle',marginRight:4}} />산을 눌러 숨겨진 보물을 찾아요</Paragraph.Text>
                  </Paragraph>
                  <Paragraph typography="t7" color={colors.grey500} textAlign="center">
                    <Paragraph.Text>산을 오르면 보물을 발견할 수 있어요</Paragraph.Text>
                  </Paragraph>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div ref={bannerRef} style={{width:'100%',height:96,marginBottom:10}} />
      <div style={{width:'100%',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
        <div onClick={()=>state.attendDate!==today&&setAttendModal(true)} style={{background:'white',borderRadius:12,padding:'11px 14px',boxShadow:`0 2px 12px ${colors.greyOpacity100}`,cursor:state.attendDate===today?'default':'pointer'}}>
          <Paragraph typography="st13" fontWeight="medium" color={colors.grey500}>
            <Paragraph.Text>출석하고 보물 받아요</Paragraph.Text>
          </Paragraph>
          <div style={{marginTop:4,display:'flex',alignItems:'center',gap:6}}>
            {state.attendDate === today ? (
              <Paragraph typography="t6" fontWeight="bold" color={colors.grey400}>
                <Paragraph.Text>출석 완료</Paragraph.Text>
              </Paragraph>
            ) : (
              <Paragraph typography="t6" fontWeight="bold" color={colors.grey900}>
                <Paragraph.Text>출석체크</Paragraph.Text>
              </Paragraph>
            )}
          </div>
        </div>
        <div style={{background:'white',borderRadius:12,padding:'11px 14px',boxShadow:`0 2px 12px ${colors.greyOpacity100}`}}>
          <Paragraph typography="st13" fontWeight="medium" color={colors.grey500}>
            <Paragraph.Text>다음 목적지</Paragraph.Text>
          </Paragraph>
          <div style={{marginTop:4,display:'flex',alignItems:'center',gap:6}}>
            <Paragraph typography="t6" fontWeight="bold" color={colors.grey900}>
              <Paragraph.Text>{next ? `${next.name} ${next.max.toLocaleString()}M` : '모든 산 정복!'}</Paragraph.Text>
            </Paragraph>
          </div>
        </div>
      </div>
      <div onClick={() => setExchangeModal(true)} style={{width:'100%',background:'white',borderRadius:12,padding:'11px 14px',display:'flex',alignItems:'center',gap:10,boxShadow:`0 2px 12px ${colors.greyOpacity100}`,cursor:'pointer'}}>
        <div style={{width:32,height:32,borderRadius:9,background:colors.blue50,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <img src={ICON_GIFT} width={24} height={24} alt="" />
        </div>
        <div>
          <Paragraph typography="t6" fontWeight="bold" color={colors.grey900}>
            <Paragraph.Text>보물상자에 </Paragraph.Text>
            <Paragraph.Text color={colors.blue500}>{state.pts}</Paragraph.Text>
            <Paragraph.Text>개 보물이 있어요</Paragraph.Text>
          </Paragraph>
          <TextButton size="xsmall" color={colors.grey500}>토스 포인트로 교환할 수 있어요</TextButton>
        </div>
        <IconButton src="https://static.toss.im/icons/svg/icon-arrow-right-small-mono.svg" variant="clear" aria-label="보물 교환하기" iconSize={20} style={{marginLeft:'auto'}} />
      </div>
      {/* DEV 버튼 (출시 전 제거 예정) */}
      <div style={{display:'flex',gap:8,marginTop:12}}>
        <button onClick={devJump} style={{background:colors.grey900,color:'white',border:'none',borderRadius:10,padding:'8px 16px',fontSize:11,fontWeight:600,cursor:'pointer',opacity:0.4}}>🛠 백두산 2700M</button>
        <button onClick={devReset} style={{background:colors.red500,color:'white',border:'none',borderRadius:10,padding:'8px 16px',fontSize:11,fontWeight:600,cursor:'pointer',opacity:0.4}}>🔄 리셋</button>
      </div>
      <BottomSheet open={summitModal} onClose={handleSummitClose}
        header={<BottomSheet.Header>{isLast ? <span style={{display:'inline-flex',alignItems:'center',gap:6}}>모든 산 완등! <img src={ICON_TROPHY} width={22} height={22} alt="" /></span> : <span style={{display:'inline-flex',alignItems:'center',gap:6}}>정상 도착! <img src={ICON_PARTY} width={22} height={22} alt="" /></span>}</BottomSheet.Header>}
        headerDescription={<BottomSheet.HeaderDescription>{s.name} {s.max.toLocaleString()}M 등반 완료</BottomSheet.HeaderDescription>}
        cta={isLast ? (
          <BottomSheet.CTA><Button color="dark" variant="weak" display="full" onClick={handleSummitClose}>오늘 등산은 여기까지 하기</Button></BottomSheet.CTA>
        ) : (
          <BottomSheet.DoubleCTA
            leftButton={<Button variant="weak" color="dark" display="full" onClick={handleSummitClose}>오늘은 여기까지</Button>}
            rightButton={<Button color="primary" display="full" loading={adWaiting} disabled={!isAdLoaded} onClick={handleSummitNext}>{!isAdLoaded ? '광고 준비 중...' : '광고 보고 다음 산으로'}</Button>}
          />
        )}>
        <div style={{textAlign:'center',padding:'8px 0 16px'}}>
          <Badge size="large" color="blue" variant="fill">+{s.bonus} 보너스 보물</Badge>
        </div>
      </BottomSheet>
      <BottomSheet open={attendModal} onClose={() => setAttendModal(false)}
        header={<BottomSheet.Header><span style={{display:'inline-flex',alignItems:'center',gap:6}}>출석체크 <img src={TOSSFACE_CALENDAR} width={22} height={22} alt="" /></span></BottomSheet.Header>}
        headerDescription={<BottomSheet.HeaderDescription>출석 체크하고 보물을 받으세요!</BottomSheet.HeaderDescription>}
        cta={
          <BottomSheet.DoubleCTA
            leftButton={<Button variant="weak" color="dark" display="full" onClick={() => setAttendModal(false)}>괜찮아요</Button>}
            rightButton={<Button color="primary" display="full" loading={adWaiting} disabled={!isAdLoaded} onClick={doAttendance}>{!isAdLoaded ? '광고 준비 중...' : '광고 보고 출석하기'}</Button>}
          />
        }>
        <div style={{textAlign:'center',padding:'12px 20px 20px'}}>
          <img src={TOSSFACE_DIAMOND} width={48} height={48} alt="" style={{marginBottom:8}} />
          <Paragraph typography="t4" fontWeight="bold" color={colors.grey900} textAlign="center">
            <Paragraph.Text>보물 1개를 받을 수 있어요!</Paragraph.Text>
          </Paragraph>
        </div>
      </BottomSheet>
      <BottomSheet open={exchangeModal} onClose={() => setExchangeModal(false)}
        header={<BottomSheet.Header><span style={{display:'inline-flex',alignItems:'center',gap:6}}>보물 교환 <img src={ICON_GIFT} width={22} height={22} alt="" /></span></BottomSheet.Header>}
        headerDescription={<BottomSheet.HeaderDescription>모은 보물을 토스 포인트로 교환해요</BottomSheet.HeaderDescription>}
        cta={
          <BottomSheet.DoubleCTA
            leftButton={<Button variant="weak" color="dark" display="full" onClick={() => setExchangeModal(false)}>닫기</Button>}
            rightButton={<Button color="primary" display="full" disabled>교환하기 (준비 중)</Button>}
          />
        }>
        <div style={{textAlign:'center',padding:'16px 0 24px'}}>
          <img src={ICON_GIFT} width={48} height={48} alt="" style={{marginBottom:12}} />
          <Paragraph typography="t4" fontWeight="bold" color={colors.grey900} textAlign="center">
            <Paragraph.Text>보물 </Paragraph.Text>
            <Paragraph.Text color={colors.blue500}>{state.pts}</Paragraph.Text>
            <Paragraph.Text>개</Paragraph.Text>
          </Paragraph>
          <div style={{height:16}} />
          <div style={{background:colors.blue50,borderRadius:12,padding:'16px 20px'}}>
            <Paragraph typography="t6" color={colors.grey600} textAlign="center">
              <Paragraph.Text>교환 기능이 곧 준비될 예정이에요.</Paragraph.Text>
            </Paragraph>
            <div style={{height:4}} />
            <Paragraph typography="t7" color={colors.grey400} textAlign="center">
              <Paragraph.Text>조금만 기다려 주세요!</Paragraph.Text>
            </Paragraph>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
