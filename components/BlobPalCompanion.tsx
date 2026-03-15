import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

type GhostMood = 'idle' | 'happy' | 'shy' | 'sad';
type GhostExpression = 'calm' | 'smile' | 'shy' | 'surprised' | 'sad' | 'blink';

interface BlobPalCompanionProps {
  mood: GhostMood;
  title: string;
  subtitle: string;
  footer?: string;
  scope?: 'auth' | 'home';
  placement?: 'inline' | 'floating';
  bubbleLabel?: string;
  bubbleText?: string;
  clickLines?: readonly string[];
  onActivate?: () => void;
  ariaLabel?: string;
}

interface GhostSettings {
  name: string;
  size: number;
  width: number;
  hue: number;
  lighting: number;
  transparency: number;
  activeness: number;
}

const GHOST_SETTINGS_STORAGE_KEY = 'plant-monitor-v5-ghost-settings';
const DEFAULT_GHOST_NAME = 'Lumafern';
const defaultGhostSettings: GhostSettings = {
  name: DEFAULT_GHOST_NAME,
  size: 1,
  width: 1,
  hue: 188,
  lighting: 1.04,
  transparency: 0.94,
  activeness: 0.92,
};

const idleLines = {
  auth: [
    'Your greenhouse guide is on standby.',
    'Soft light on. No rush.',
    'We can take this one calm step at a time.',
    'I am keeping the login screen steady.',
  ],
  home: [
    'Greenhouse pulse looks stable today.',
    'I am watching the canopy for you.',
    'Everything feels bright and balanced from here.',
    'Tiny companion patrol is currently active.',
  ],
} as const;

const celebrateLines = {
  auth: [
    'A little lantern bounce happened.',
    'Signal received. Staying calm.',
    'That click added a touch of glow.',
    'Companion support remains online.',
  ],
  home: [
    'Fresh growth energy just spiked.',
    'That woke the greenhouse lantern right up.',
    'Dashboard morale is climbing.',
    'Tiny orbit flourish completed.',
  ],
} as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const hsla = (hue: number, saturation: number, lightness: number, alpha: number) =>
  `hsla(${Math.round(hue)} ${Math.round(saturation)}% ${Math.round(lightness)}% / ${alpha})`;

const formatGhostSettings = (value: unknown): GhostSettings => {
  if (!value || typeof value !== 'object') return defaultGhostSettings;
  const source = value as Partial<GhostSettings>;
  return {
    name: String(source.name || DEFAULT_GHOST_NAME).trim().slice(0, 24) || DEFAULT_GHOST_NAME,
    size: clamp(Number(source.size) || defaultGhostSettings.size, 0.84, 1.3),
    width: clamp(Number(source.width) || defaultGhostSettings.width, 0.88, 1.28),
    hue: clamp(Number(source.hue) || defaultGhostSettings.hue, 156, 244),
    lighting: clamp(Number(source.lighting) || defaultGhostSettings.lighting, 0.8, 1.45),
    transparency: clamp(Number(source.transparency) || defaultGhostSettings.transparency, 0.72, 1),
    activeness: clamp(Number(source.activeness) || defaultGhostSettings.activeness, 0.35, 1.7),
  };
};

const buildGlowbudShellPath = (waveA: number, waveB: number, waveC: number) => `
  M 110 ${55 + waveA * 0.06}
  C 94 ${55 + waveB * 0.05}, 80 ${66 + waveA * 0.08}, 75 ${87 + waveC * 0.1}
  C 70 ${109 + waveA * 0.08}, 76 ${136 + waveB * 0.08}, 91 ${157 + waveC * 0.08}
  C 100 ${170 + waveA * 0.08}, 106 ${178 + waveB * 0.06}, 110 ${185 + waveC * 0.06}
  C 114 ${178 + waveA * 0.06}, 120 ${170 + waveB * 0.08}, 129 ${157 + waveC * 0.08}
  C 144 ${136 + waveA * 0.08}, 150 ${109 + waveB * 0.08}, 145 ${87 + waveC * 0.1}
  C 140 ${66 + waveA * 0.08}, 126 ${55 + waveB * 0.05}, 110 ${55 + waveC * 0.06}
  Z
`;

const pickAmbientExpression = (mood: GhostMood) => {
  if (mood === 'happy') return Math.random() > 0.4 ? 'smile' : 'blink';
  if (mood === 'shy') return Math.random() > 0.5 ? 'shy' : 'blink';
  if (mood === 'sad') return 'sad';
  const pool: GhostExpression[] = ['calm', 'smile', 'blink'];
  return pool[Math.floor(Math.random() * pool.length)] ?? 'calm';
};

const resolveExpression = (
  mood: GhostMood,
  proximity: 'far' | 'near' | 'hover',
  clickEnergy: number,
  ambient: GhostExpression,
): GhostExpression => {
  if (clickEnergy > 0.46) return 'smile';
  if (proximity === 'hover') return 'surprised';
  if (proximity === 'near' && mood !== 'sad') return 'smile';
  if (mood === 'sad') return 'sad';
  if (mood === 'shy') return ambient === 'smile' ? 'shy' : ambient;
  return ambient;
};

const BlobPalCompanion: React.FC<BlobPalCompanionProps> = ({
  mood,
  title,
  subtitle,
  footer,
  scope = 'auth',
  placement = 'inline',
  bubbleLabel,
  bubbleText,
  clickLines,
  onActivate,
  ariaLabel = 'Animated greenhouse companion',
}) => {
  const gradientId = useId().replace(/:/g, '');
  const wrapperRef = useRef<HTMLButtonElement | null>(null);
  const shellRef = useRef<SVGGElement | null>(null);
  const bodyRef = useRef<SVGPathElement | null>(null);
  const veilRef = useRef<SVGPathElement | null>(null);
  const shadowRef = useRef<SVGEllipseElement | null>(null);
  const faceRef = useRef<SVGGElement | null>(null);
  const leftEyeRef = useRef<SVGCircleElement | null>(null);
  const rightEyeRef = useRef<SVGCircleElement | null>(null);
  const leftBlinkRef = useRef<SVGPathElement | null>(null);
  const rightBlinkRef = useRef<SVGPathElement | null>(null);
  const leftEyeShineRef = useRef<SVGCircleElement | null>(null);
  const rightEyeShineRef = useRef<SVGCircleElement | null>(null);
  const leftBrowRef = useRef<SVGPathElement | null>(null);
  const rightBrowRef = useRef<SVGPathElement | null>(null);
  const mouthRef = useRef<SVGPathElement | null>(null);
  const blushLeftRef = useRef<SVGEllipseElement | null>(null);
  const blushRightRef = useRef<SVGEllipseElement | null>(null);
  const glowRef = useRef<SVGEllipseElement | null>(null);
  const sparkleRef = useRef<SVGGElement | null>(null);
  const burstRef = useRef<SVGGElement | null>(null);
  const burstRingRef = useRef<SVGCircleElement | null>(null);
  const burstEchoRef = useRef<SVGCircleElement | null>(null);
  const burstRaysRef = useRef<SVGGElement | null>(null);
  const burstDustRef = useRef<SVGGElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const faceMotionRef = useRef({
    leftEyeR: 2.25,
    rightEyeR: 2.25,
    blink: 0,
    browLift: 0,
    blush: 0.08,
    mouthSmile: 0.45,
    mouthOpen: 0,
  });
  const targetRef = useRef({ x: 0, y: 0, near: 0, hover: 0, click: 0 });
  const currentRef = useRef({ x: 0, y: 0, near: 0, hover: 0, click: 0 });
  const clickKickRef = useRef(0);
  const idleLineTimerRef = useRef<number | null>(null);
  const clickResetTimerRef = useRef<number | null>(null);
  const expressionTimerRef = useRef<number | null>(null);
  const prefersReducedMotionRef = useRef(false);
  const hoverLockedRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const customizationRef = useRef<HTMLDivElement | null>(null);

  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [proximity, setProximity] = useState<'far' | 'near' | 'hover'>('far');
  const [clickLine, setClickLine] = useState<string | null>(null);
  const [ambientExpression, setAmbientExpression] = useState<GhostExpression>('calm');
  const [winkCharge, setWinkCharge] = useState(0);
  const [ghostSettings, setGhostSettings] = useState<GhostSettings>(defaultGhostSettings);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [clickBurstKey, setClickBurstKey] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(GHOST_SETTINGS_STORAGE_KEY);
      if (raw) setGhostSettings(formatGhostSettings(JSON.parse(raw)));
    } catch {
      setGhostSettings(defaultGhostSettings);
    }
  }, []);

  useEffect(() => {
    if (!isCustomizerOpen) return;
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, [isCustomizerOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(GHOST_SETTINGS_STORAGE_KEY, JSON.stringify(ghostSettings));
  }, [ghostSettings]);

  useEffect(() => {
    if (!isCustomizerOpen || typeof window === 'undefined') return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!customizationRef.current?.contains(event.target as Node)) {
        setIsCustomizerOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCustomizerOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCustomizerOpen]);

  useEffect(() => {
    setAmbientExpression(pickAmbientExpression(mood));
  }, [mood]);

  const updatePointerTarget = (clientX: number, clientY: number) => {
    const element = wrapperRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRange = Math.max(rect.width, rect.height) * 0.58;

    targetRef.current.x = clamp(dx / maxRange, -0.62, 0.62);
    targetRef.current.y = clamp(dy / maxRange, -0.52, 0.52);
    targetRef.current.near = 1;
    targetRef.current.hover = 1;

    if (!hoverLockedRef.current) hoverLockedRef.current = true;
    setProximity('hover');
  };

  const resetPointerTarget = () => {
    targetRef.current.x = 0;
    targetRef.current.y = 0;
    targetRef.current.near = 0;
    targetRef.current.hover = 0;
    hoverLockedRef.current = false;
    setProximity('far');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handlePointerMove = (event: PointerEvent) => {
      const element = wrapperRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const reach = Math.max(rect.width, rect.height) * 1.6;
      const distance = Math.hypot(dx, dy);

      if (distance <= reach) {
        const maxRange = Math.max(rect.width, rect.height) * 0.58;
        targetRef.current.x = clamp(dx / maxRange, -0.62, 0.62);
        targetRef.current.y = clamp(dy / maxRange, -0.52, 0.52);
        targetRef.current.near = 1;
        targetRef.current.hover =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
            ? 1
            : 0;
        if (targetRef.current.hover && !hoverLockedRef.current) hoverLockedRef.current = true;
        if (!targetRef.current.hover) hoverLockedRef.current = false;
        setProximity(targetRef.current.hover ? 'hover' : 'near');
      } else if (proximity !== 'far') {
        resetPointerTarget();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [proximity]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      prefersReducedMotionRef.current = mediaQuery.matches;
    };
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    idleLineTimerRef.current = window.setInterval(() => {
      setBubbleIndex((current) => (current + 1) % idleLines[scope].length);
    }, 5400);

    const scheduleAmbient = () => {
      expressionTimerRef.current = window.setTimeout(() => {
        if (!clickLine && proximity === 'far') {
          const nextExpression = pickAmbientExpression(mood);
          setAmbientExpression(nextExpression === 'blink' ? 'calm' : nextExpression);
          setWinkCharge(nextExpression === 'blink' ? 1 : 0);
        }
        scheduleAmbient();
      }, 1800 + Math.round(Math.random() * 1400));
    };
    scheduleAmbient();

    return () => {
      if (idleLineTimerRef.current) window.clearInterval(idleLineTimerRef.current);
      if (clickResetTimerRef.current) window.clearTimeout(clickResetTimerRef.current);
      if (expressionTimerRef.current) window.clearTimeout(expressionTimerRef.current);
    };
  }, [clickLine, mood, proximity, scope]);

  useEffect(() => {
    if (!winkCharge) return undefined;
    const timer = window.setTimeout(() => {
      setWinkCharge(0);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [winkCharge]);

  const hue = ghostSettings.hue;
  const lightingBoost = (ghostSettings.lighting - 1) * 12;
  const alpha = ghostSettings.transparency;
  const shellTop = hsla(hue + 14, 40, 94 + lightingBoost * 0.45, Math.min(alpha + 0.04, 1));
  const shellMid = hsla(hue + 3, 34, 82 + lightingBoost * 0.35, alpha * 0.98);
  const shellBase = hsla(hue - 10, 38, 56 + lightingBoost * 0.22, alpha * 0.98);
  const shellOutline = hsla(hue - 8, 44, 22 + lightingBoost * 0.18, 0.62);
  const veilStart = hsla(hue + 26, 76, 99, alpha * 0.42);
  const veilEnd = hsla(hue - 10, 66, 72 + lightingBoost * 0.25, alpha * 0.08);
  const glossStart = hsla(hue + 34, 100, 99, 0.48);
  const coreGlowA = hsla(hue + 4, 92, 72 + lightingBoost * 0.38, alpha * 0.44);
  const coreGlowB = hsla(hue - 18, 88, 56 + lightingBoost * 0.24, alpha * 0.18);
  const innerLeafDark = hsla(hue - 16, 72, 38 + lightingBoost * 0.34, 0.98);
  const innerLeafLight = hsla(hue + 18, 68, 56 + lightingBoost * 0.3, 0.96);
  const innerLeafEdge = hsla(hue + 26, 72, 74 + lightingBoost * 0.25, 0.92);
  const crownLeafDark = hsla(hue - 20, 58, 28 + lightingBoost * 0.24, 0.98);
  const crownLeafLight = hsla(hue + 10, 68, 52 + lightingBoost * 0.26, 0.96);
  const collarDark = hsla(hue - 10, 46, 24 + lightingBoost * 0.18, 0.94);
  const collarLight = hsla(hue + 20, 54, 50 + lightingBoost * 0.24, 0.9);
  const rootLight = hsla(hue + 16, 44, 82 + lightingBoost * 0.22, 0.9);
  const rootShadow = hsla(hue - 12, 24, 46 + lightingBoost * 0.12, 0.5);
  const orbitCool = hsla(hue + 18, 92, 80 + lightingBoost * 0.26, 0.84);
  const orbitWarm = hsla(38, 92, 74 + lightingBoost * 0.16, 0.88);
  const eyeColor = hsla(hue - 8, 28, 18, 0.94);
  const browColor = hsla(hue - 10, 24, 24, 0.5);
  const mouthColor = hsla(hue - 8, 28, 20, 0.84);
  const blushColor = hsla(28, 74, 76, 0.16);
  const glowColor = hsla(hue + 4, 88, 72 + lightingBoost * 0.28, alpha * 0.3);
  const groundColor = hsla(hue - 12, 48, 14, 0.22);
  const sparkleColor = hsla(42, 96, 76, 0.94);
  const burstRingColor = hsla(hue + 24, 96, 82, 0.82);
  const burstEchoColor = hsla(44, 100, 76, 0.66);
  const burstRayColor = hsla(hue + 34, 100, 86, 0.28);
  const burstDustColor = hsla(46, 100, 80, 0.96);
  const burstHaloColor = hsla(hue + 18, 100, 80, 0.74);
  const burstLeafColor = hsla(hue + 32, 92, 88, 0.92);
  const burstGlowShadow = hsla(hue - 4, 64, 18, 0.42);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const t = (timestamp - startTimeRef.current) / 1000;
      const reduced = prefersReducedMotionRef.current;
      const energy = ghostSettings.activeness;
      const current = currentRef.current;
      const target = targetRef.current;

      current.x = lerp(current.x, target.x, reduced ? 0.035 : 0.048 + energy * 0.03);
      current.y = lerp(current.y, target.y, reduced ? 0.035 : 0.048 + energy * 0.03);
      current.near = lerp(current.near, target.near, reduced ? 0.045 : 0.05 + energy * 0.018);
      current.hover = lerp(current.hover, target.hover, reduced ? 0.045 : 0.058 + energy * 0.022);
      current.click = lerp(current.click, clickKickRef.current, reduced ? 0.065 : 0.086 + energy * 0.034);
      clickKickRef.current *= reduced ? 0.935 : 0.968 - energy * 0.008;

      const floatBase = Math.sin(t * (0.88 + energy * 0.18)) * (2.35 + energy * 1.05);
      const sideDrift = Math.cos(t * (0.58 + energy * 0.11)) * (1.15 + energy * 0.55);
      const driftX = sideDrift + current.x * (5.6 + energy * 2.4);
      const driftY =
        floatBase +
        current.y * (4.4 + energy * 1.9) -
        current.hover * (1.2 + energy * 0.35) -
        current.click * (2.2 + energy * 1.25);
      const rotate = Math.sin(t * (0.34 + energy * 0.08)) * (1.35 + energy * 0.85) + current.x * (3.8 + energy * 1.85);
      const squashX =
        1 + Math.sin(t * (0.7 + energy * 0.12)) * (0.01 + energy * 0.008) + current.click * (0.016 + energy * 0.009);
      const squashY =
        1 - Math.sin(t * (0.7 + energy * 0.12)) * (0.008 + energy * 0.006) - current.click * (0.012 + energy * 0.007);
      const waveA = Math.sin(t * (1.18 + energy * 0.2)) * (4.2 + energy * 1.9) + current.x * (2.2 + energy * 0.8);
      const waveB = Math.cos(t * (0.98 + energy * 0.18)) * (3.8 + energy * 1.8) - current.x * (1.9 + energy * 0.7);
      const waveC = Math.sin(t * (1.36 + energy * 0.2) + 1.2) * (3.3 + energy * 1.6) + current.hover * (2 + energy * 1.1);
      const faceMotion = faceMotionRef.current;

      const expression = winkCharge > 0 ? 'blink' : resolveExpression(mood, proximity, current.click, ambientExpression);
      const shellTransform = `translate(${driftX.toFixed(2)} ${driftY.toFixed(2)}) rotate(${rotate.toFixed(2)} 110 110) scale(${squashX.toFixed(3)} ${squashY.toFixed(3)})`;

      if (shellRef.current) shellRef.current.setAttribute('transform', shellTransform);

      const bodyPath = buildGlowbudShellPath(waveA, waveB, waveC);
      if (bodyRef.current) bodyRef.current.setAttribute('d', bodyPath);
      if (veilRef.current) veilRef.current.setAttribute('d', bodyPath);

      if (shadowRef.current) {
        shadowRef.current.setAttribute('rx', (43 - current.hover * 3 - current.click * 2.5).toFixed(2));
        shadowRef.current.setAttribute('opacity', (0.16 + current.near * 0.08).toFixed(3));
      }

      if (glowRef.current) {
        glowRef.current.setAttribute('rx', (50 + current.hover * 5 + current.click * 5).toFixed(2));
        glowRef.current.setAttribute('ry', (12 + current.hover * 2 + current.click * 2).toFixed(2));
        glowRef.current.setAttribute('opacity', (0.18 + current.near * 0.14 + current.click * 0.24).toFixed(3));
      }

      const burstEnergy = reduced ? current.click * 0.78 : current.click * 1.22;
      if (burstRef.current) {
        const burstScale = 0.84 + burstEnergy * 1.68;
        const burstRotate = burstEnergy * 18 + Math.sin(t * 6.1) * 3.4;
        burstRef.current.setAttribute('opacity', (0.08 + burstEnergy * 1.08).toFixed(3));
        burstRef.current.setAttribute(
          'transform',
          `translate(${(current.x * 5.4).toFixed(2)} ${(-burstEnergy * 12.5 - current.hover * 1.8).toFixed(2)}) rotate(${burstRotate.toFixed(2)} 110 118) scale(${burstScale.toFixed(3)})`,
        );
      }
      if (burstRingRef.current) {
        burstRingRef.current.setAttribute('r', (18 + burstEnergy * 42).toFixed(2));
        burstRingRef.current.setAttribute('stroke-width', Math.max(1.8, 5.8 - burstEnergy * 3).toFixed(2));
        burstRingRef.current.setAttribute('opacity', (0.16 + burstEnergy * 0.92).toFixed(3));
      }
      if (burstEchoRef.current) {
        burstEchoRef.current.setAttribute('r', (12 + burstEnergy * 58).toFixed(2));
        burstEchoRef.current.setAttribute('stroke-width', Math.max(1.4, 4.8 - burstEnergy * 2.4).toFixed(2));
        burstEchoRef.current.setAttribute('opacity', (0.12 + burstEnergy * 0.72).toFixed(3));
      }
      if (burstRaysRef.current) {
        burstRaysRef.current.setAttribute(
          'transform',
          `rotate(${(burstEnergy * 36 + t * 18).toFixed(2)} 110 118) scale(${(0.98 + burstEnergy * 0.92).toFixed(3)})`,
        );
      }
      if (burstDustRef.current) {
        burstDustRef.current.setAttribute(
          'transform',
          `rotate(${(-burstEnergy * 26 - t * 14).toFixed(2)} 110 118) scale(${(0.94 + burstEnergy * 1.08).toFixed(3)}) translate(0 ${(-burstEnergy * 2.4).toFixed(2)})`,
        );
        burstDustRef.current.setAttribute('opacity', (0.18 + burstEnergy * 1.04).toFixed(3));
      }

      if (faceRef.current) faceRef.current.setAttribute('transform', shellTransform);

      const eyeY = 112.9 + current.y * 1.9;
      const leftX = 103.6 + current.x * 3.5;
      const rightX = 116.6 + current.x * 3.5;

      let targetLeftEyeR = 2.25;
      let targetRightEyeR = 2.25;
      let targetBrowLift = 0;
      let targetBlush = 0.08;
      let targetMouthSmile = 0.45;
      let targetMouthOpen = 0;

      if (expression === 'surprised') {
        targetLeftEyeR = 2.85;
        targetRightEyeR = 2.85;
        targetBrowLift = 1.3;
        targetMouthOpen = 1;
        targetMouthSmile = 0;
      }
      if (expression === 'shy') {
        targetLeftEyeR = 2.05;
        targetRightEyeR = 2.05;
        targetBlush = 0.28;
        targetMouthSmile = 0.24;
      }
      if (expression === 'sad') {
        targetLeftEyeR = 2.1;
        targetRightEyeR = 2.1;
        targetBrowLift = -0.95;
        targetMouthSmile = -0.52;
      }
      if (expression === 'smile') {
        targetLeftEyeR = 2.35;
        targetRightEyeR = 2.35;
        targetBlush = 0.18;
        targetMouthSmile = 0.94;
      }
      if (expression === 'blink') {
        targetBlush = 0.1;
        targetMouthSmile = 0.58;
      }

      const targetBlink = expression === 'blink' ? 1 : 0;
      faceMotion.leftEyeR = lerp(faceMotion.leftEyeR, targetLeftEyeR, reduced ? 0.14 : 0.22);
      faceMotion.rightEyeR = lerp(faceMotion.rightEyeR, targetRightEyeR, reduced ? 0.14 : 0.22);
      faceMotion.blink = lerp(faceMotion.blink, targetBlink, reduced ? 0.28 : 0.58);
      faceMotion.browLift = lerp(faceMotion.browLift, targetBrowLift, reduced ? 0.12 : 0.2);
      faceMotion.blush = lerp(faceMotion.blush, targetBlush, reduced ? 0.12 : 0.18);
      faceMotion.mouthSmile = lerp(faceMotion.mouthSmile, targetMouthSmile, reduced ? 0.12 : 0.18);
      faceMotion.mouthOpen = lerp(faceMotion.mouthOpen, targetMouthOpen, reduced ? 0.12 : 0.18);

      const blinkScaleY = (1 - faceMotion.blink * 0.92).toFixed(3);
      const blinkLineOpacity = faceMotion.blink.toFixed(3);
      const eyeOpacity = (1 - faceMotion.blink * 0.72).toFixed(3);
      const shineOpacity = Math.max(0, 1 - faceMotion.blink * 1.2).toFixed(3);

      if (leftEyeRef.current) {
        leftEyeRef.current.setAttribute('cx', leftX.toFixed(2));
        leftEyeRef.current.setAttribute('cy', eyeY.toFixed(2));
        leftEyeRef.current.setAttribute('r', faceMotion.leftEyeR.toFixed(2));
        leftEyeRef.current.setAttribute('opacity', eyeOpacity);
        leftEyeRef.current.setAttribute(
          'transform',
          `translate(${leftX.toFixed(2)} ${eyeY.toFixed(2)}) scale(1 ${blinkScaleY}) translate(${-leftX.toFixed(2)} ${-eyeY.toFixed(2)})`,
        );
      }
      if (rightEyeRef.current) {
        rightEyeRef.current.setAttribute('cx', rightX.toFixed(2));
        rightEyeRef.current.setAttribute('cy', eyeY.toFixed(2));
        rightEyeRef.current.setAttribute('r', faceMotion.rightEyeR.toFixed(2));
        rightEyeRef.current.setAttribute('opacity', eyeOpacity);
        rightEyeRef.current.setAttribute(
          'transform',
          `translate(${rightX.toFixed(2)} ${eyeY.toFixed(2)}) scale(1 ${blinkScaleY}) translate(${-rightX.toFixed(2)} ${-eyeY.toFixed(2)})`,
        );
      }

      if (leftBlinkRef.current) {
        const leftBlink = `M ${(leftX - 2.8).toFixed(2)} ${(eyeY + 0.2).toFixed(2)} Q ${leftX.toFixed(2)} ${(eyeY + 1.25).toFixed(2)} ${(leftX + 2.8).toFixed(2)} ${(eyeY + 0.2).toFixed(2)}`;
        leftBlinkRef.current.setAttribute('d', leftBlink);
        leftBlinkRef.current.setAttribute('stroke', eyeColor);
        leftBlinkRef.current.setAttribute('opacity', blinkLineOpacity);
      }
      if (rightBlinkRef.current) {
        const rightBlink = `M ${(rightX - 2.8).toFixed(2)} ${(eyeY + 0.2).toFixed(2)} Q ${rightX.toFixed(2)} ${(eyeY + 1.25).toFixed(2)} ${(rightX + 2.8).toFixed(2)} ${(eyeY + 0.2).toFixed(2)}`;
        rightBlinkRef.current.setAttribute('d', rightBlink);
        rightBlinkRef.current.setAttribute('stroke', eyeColor);
        rightBlinkRef.current.setAttribute('opacity', blinkLineOpacity);
      }

      if (leftEyeShineRef.current) {
        leftEyeShineRef.current.setAttribute('cx', (leftX - 0.8).toFixed(2));
        leftEyeShineRef.current.setAttribute('cy', (eyeY - 0.82).toFixed(2));
        leftEyeShineRef.current.setAttribute('opacity', shineOpacity);
      }
      if (rightEyeShineRef.current) {
        rightEyeShineRef.current.setAttribute('cx', (rightX - 0.8).toFixed(2));
        rightEyeShineRef.current.setAttribute('cy', (eyeY - 0.82).toFixed(2));
        rightEyeShineRef.current.setAttribute('opacity', shineOpacity);
      }

      if (leftBrowRef.current) {
        const leftBrow = `M ${(leftX - 3.4).toFixed(2)} ${(eyeY - 5.5 - faceMotion.browLift * 0.8).toFixed(2)} Q ${leftX.toFixed(2)} ${(eyeY - 6.4 - faceMotion.browLift).toFixed(2)} ${(leftX + 3.2).toFixed(2)} ${(eyeY - 5.6 - faceMotion.browLift * 0.45).toFixed(2)}`;
        leftBrowRef.current.setAttribute('d', leftBrow);
      }
      if (rightBrowRef.current) {
        const rightBrow = `M ${(rightX - 3.2).toFixed(2)} ${(eyeY - 5.6 - faceMotion.browLift * 0.45).toFixed(2)} Q ${rightX.toFixed(2)} ${(eyeY - 6.4 - faceMotion.browLift).toFixed(2)} ${(rightX + 3.4).toFixed(2)} ${(eyeY - 5.5 - faceMotion.browLift * 0.8).toFixed(2)}`;
        rightBrowRef.current.setAttribute('d', rightBrow);
      }

      if (blushLeftRef.current) blushLeftRef.current.setAttribute('opacity', faceMotion.blush.toFixed(3));
      if (blushRightRef.current) blushRightRef.current.setAttribute('opacity', faceMotion.blush.toFixed(3));

      const mouthY = 120.1 - faceMotion.mouthSmile * 0.42;
      const mouthCurve = 121.8 + faceMotion.mouthSmile * 2.2;
      let mouth = `M 107.1 ${mouthY.toFixed(2)} Q 110 ${mouthCurve.toFixed(2)} 112.9 ${mouthY.toFixed(2)}`;
      if (faceMotion.mouthOpen > 0.08) {
        const openTop = 118.7 - faceMotion.mouthOpen * 2.2;
        const openBottom = 120.8 + faceMotion.mouthOpen * 2.6;
        mouth = `M 108.3 119.7 Q 110 ${openTop.toFixed(2)} 111.7 119.7 Q 110 ${openBottom.toFixed(2)} 108.3 119.7`;
      }
      if (mouthRef.current) mouthRef.current.setAttribute('d', mouth);

      if (sparkleRef.current) {
        sparkleRef.current.setAttribute('opacity', (0.18 + current.click * 0.76 + current.hover * 0.12).toFixed(3));
        sparkleRef.current.setAttribute(
          'transform',
          `translate(${(current.x * 3.2).toFixed(2)} ${(-current.click * 8 - current.hover * 1.8).toFixed(2)}) scale(${(1 + current.click * 0.16).toFixed(3)})`,
        );
      }

      rafRef.current = window.requestAnimationFrame(animate);
    };

    rafRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [ambientExpression, eyeColor, ghostSettings.activeness, mood, proximity, winkCharge]);

  const expression = resolveExpression(mood, proximity, currentRef.current.click, ambientExpression);
  const reactionLabel = clickLine ? 'companion reaction' : bubbleLabel;
  const resolvedBubbleText = clickLine ?? (bubbleText ?? idleLines[scope][bubbleIndex]);

  const className = useMemo(
    () =>
      `slime-pal ghost-pal slime-pal-${scope} slime-pal-${placement} slime-pal-${proximity} slime-pal-${clickLine ? 'clicked' : 'idle'} slime-pal-mood-${mood} ghost-pal-expression-${expression}`,
    [clickLine, expression, mood, placement, proximity, scope],
  );

  const updateGhostSettings = <K extends keyof GhostSettings>(key: K, value: GhostSettings[K]) => {
    setGhostSettings((current) => formatGhostSettings({ ...current, [key]: value }));
  };

  const ghostVisualStyle = {
    '--ghost-scene-height': `${(placement === 'floating' ? 8.8 : 7.8) * ghostSettings.size}rem`,
    '--ghost-scene-width': `${(placement === 'floating' ? 8.8 : 7.8) * ghostSettings.size * ghostSettings.width}rem`,
    '--ghost-alpha': String(ghostSettings.transparency),
    '--ghost-lighting': String(ghostSettings.lighting),
    '--ghost-burst-cool': burstHaloColor,
    '--ghost-burst-warm': burstDustColor,
    '--ghost-burst-leaf': burstLeafColor,
    '--ghost-burst-shadow': burstGlowShadow,
  } as React.CSSProperties;

  const ghostSceneSize = {
    width: `var(--ghost-scene-width)`,
    height: `var(--ghost-scene-height)`,
  } as React.CSSProperties;

  return (
    <div className={className} style={ghostVisualStyle}>
      <div className="slime-pal-content">
        <div className="slime-pal-copy">
          <p className="slime-pal-title">{title}</p>
          <p className="slime-pal-subtitle">{subtitle}</p>
          {footer ? <p className="slime-pal-footer">{footer}</p> : null}
        </div>
        <div className="slime-pal-chat ghost-pal-bubble">
          {bubbleLabel ? <p className="slime-pal-chat-kicker">{reactionLabel}</p> : null}
          <p>{resolvedBubbleText}</p>
        </div>
      </div>
      <div className="ghost-pal-stage">
        <button
          ref={wrapperRef}
          type="button"
          className="slime-pal-trigger ghost-pal-trigger"
          onPointerEnter={(event) => updatePointerTarget(event.clientX, event.clientY)}
          onPointerMove={(event) => updatePointerTarget(event.clientX, event.clientY)}
          onPointerLeave={resetPointerTarget}
          onBlur={resetPointerTarget}
          onFocus={() => {
            targetRef.current.near = 1;
            targetRef.current.hover = 0;
            setProximity('near');
          }}
          onClick={() => {
            clickKickRef.current = 1.52;
            setClickBurstKey((current) => current + 1);
            const pool = clickLines ?? celebrateLines[scope];
            setClickLine(pool[Math.floor(Math.random() * pool.length)]);
            setAmbientExpression('smile');
            onActivate?.();
            if (clickResetTimerRef.current) window.clearTimeout(clickResetTimerRef.current);
            clickResetTimerRef.current = window.setTimeout(() => setClickLine(null), 5000);
          }}
          aria-label={ariaLabel}
        >
          <svg viewBox="0 0 220 220" className="slime-pal-scene ghost-pal-scene" style={ghostSceneSize} aria-hidden="true">
            <defs>
              <linearGradient id={`ghost-shell-${gradientId}`} x1="80" y1="52" x2="142" y2="186" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={shellTop} />
                <stop offset="46%" stopColor={shellMid} />
                <stop offset="100%" stopColor={shellBase} />
              </linearGradient>
              <linearGradient id={`ghost-shell-veil-${gradientId}`} x1="84" y1="58" x2="134" y2="168" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={veilStart} />
                <stop offset="100%" stopColor={veilEnd} />
              </linearGradient>
              <radialGradient id={`ghost-shell-gloss-${gradientId}`} cx="34%" cy="24%">
                <stop offset="0%" stopColor={glossStart} />
                <stop offset="100%" stopColor={hsla(hue + 34, 100, 99, 0)} />
              </radialGradient>
              <radialGradient id={`ghost-core-${gradientId}`} cx="48%" cy="44%">
                <stop offset="0%" stopColor={coreGlowA} />
                <stop offset="55%" stopColor={coreGlowB} />
                <stop offset="100%" stopColor={hsla(hue - 14, 88, 56, 0)} />
              </radialGradient>
              <linearGradient id={`ghost-core-leaf-${gradientId}`} x1="93" y1="92" x2="127" y2="138" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={innerLeafEdge} />
                <stop offset="38%" stopColor={innerLeafLight} />
                <stop offset="100%" stopColor={innerLeafDark} />
              </linearGradient>
              <linearGradient id={`ghost-crown-${gradientId}`} x1="88" y1="24" x2="131" y2="67" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={innerLeafEdge} />
                <stop offset="42%" stopColor={crownLeafLight} />
                <stop offset="100%" stopColor={crownLeafDark} />
              </linearGradient>
              <linearGradient id={`ghost-collar-${gradientId}`} x1="84" y1="144" x2="136" y2="160" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={collarLight} />
                <stop offset="100%" stopColor={collarDark} />
              </linearGradient>
              <linearGradient id={`ghost-root-${gradientId}`} x1="92" y1="156" x2="128" y2="194" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={rootLight} />
                <stop offset="100%" stopColor={rootShadow} />
              </linearGradient>
              <filter id={`ghost-shadow-${gradientId}`} x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="14" stdDeviation={10 + ghostSettings.lighting * 2} floodColor={hsla(hue - 12, 42, 12, 0.18 + ghostSettings.lighting * 0.08)} />
              </filter>
            </defs>

            <ellipse ref={glowRef} className="ghost-pal-glow" cx="110" cy="191" rx="50" ry="12" fill={glowColor} />
            <ellipse ref={shadowRef} className="ghost-pal-ground" cx="110" cy="193" rx="43" ry="8.6" fill={groundColor} />
            <g ref={burstRef} className="ghost-pal-burst">
              <circle
                ref={burstEchoRef}
                className="ghost-pal-burst-echo"
                cx="110"
                cy="118"
                r="10"
                stroke={burstEchoColor}
              />
              <circle
                ref={burstRingRef}
                className="ghost-pal-burst-ring"
                cx="110"
                cy="118"
                r="16"
                stroke={burstRingColor}
              />
              <g ref={burstRaysRef} className="ghost-pal-burst-rays">
                <path className="ghost-pal-burst-ray" fill={burstRayColor} d="M 110 83 L 116.2 105 L 103.8 105 Z" />
                <path className="ghost-pal-burst-ray" fill={burstRayColor} d="M 145 104 L 123.5 111.2 L 125.8 98.4 Z" />
                <path className="ghost-pal-burst-ray" fill={burstRayColor} d="M 142 141 L 122.6 126.4 L 132.8 118.4 Z" />
                <path className="ghost-pal-burst-ray" fill={burstRayColor} d="M 110 154 L 115.8 131.8 L 104.2 131.8 Z" />
                <path className="ghost-pal-burst-ray" fill={burstRayColor} d="M 77 141 L 97.2 126.4 L 87 118.4 Z" />
                <path className="ghost-pal-burst-ray" fill={burstRayColor} d="M 75 104 L 96.5 111.2 L 94.2 98.4 Z" />
              </g>
              <g ref={burstDustRef} className="ghost-pal-burst-dust" fill={burstDustColor}>
                <circle className="ghost-pal-burst-seed" cx="110" cy="84" r="2.4" />
                <circle className="ghost-pal-burst-seed" cx="139" cy="95" r="2.1" />
                <circle className="ghost-pal-burst-seed" cx="150" cy="120" r="2.5" />
                <circle className="ghost-pal-burst-seed" cx="138" cy="144" r="2" />
                <circle className="ghost-pal-burst-seed" cx="110" cy="154" r="2.2" />
                <circle className="ghost-pal-burst-seed" cx="82" cy="144" r="2.1" />
                <circle className="ghost-pal-burst-seed" cx="70" cy="120" r="2.5" />
                <circle className="ghost-pal-burst-seed" cx="81" cy="95" r="2" />
              </g>
            </g>

            <g ref={shellRef} filter={`url(#ghost-shadow-${gradientId})`}>
              <g className="ghost-pal-orbits">
                <circle className="ghost-pal-orbit-dot" cx="69" cy="79" r="3.3" fill={orbitCool} />
                <circle className="ghost-pal-orbit-dot" cx="154" cy="82" r="2.7" fill={orbitWarm} />
                <circle className="ghost-pal-orbit-dot" cx="162" cy="129" r="2.35" fill={orbitCool} />
                <circle className="ghost-pal-orbit-dot" cx="64" cy="145" r="2.2" fill={orbitWarm} />
              </g>

              <path className="ghost-pal-crown-leaf ghost-pal-crown-leaf-back" fill={`url(#ghost-crown-${gradientId})`} d="M 110 54 C 101 44, 101 28, 111 17 C 121 29, 120 44, 110 54 Z" />
              <path className="ghost-pal-crown-leaf ghost-pal-crown-leaf-left" fill={`url(#ghost-crown-${gradientId})`} d="M 103 60 C 92 55, 86 43, 85 29 C 97 34, 105 44, 108 56 Z" />
              <path className="ghost-pal-crown-leaf ghost-pal-crown-leaf-right" fill={`url(#ghost-crown-${gradientId})`} d="M 117 60 C 129 54, 135 42, 136 30 C 124 34, 116 44, 113 56 Z" />
              <path className="ghost-pal-crown-stem" fill={crownLeafDark} d="M 108.8 58 C 108.6 51, 108.8 44, 110 37 C 111.2 44, 111.4 51, 111.2 58 Z" />

              <path ref={bodyRef} className="ghost-pal-shell" fill={`url(#ghost-shell-${gradientId})`} stroke={shellOutline} d={buildGlowbudShellPath(0, 0, 0)} />
              <path className="ghost-pal-shell-shadow" fill={hsla(hue - 10, 40, 28, alpha * 0.18)} d="M 86 129 C 94 151, 122 166, 139 149 C 135 163, 126 173, 112 180 C 95 174, 84 161, 80 143 C 80 137, 82 132, 86 129 Z" />
              <path ref={veilRef} className="ghost-pal-shell-veil" fill={`url(#ghost-shell-veil-${gradientId})`} d={buildGlowbudShellPath(0, 0, 0)} />
              <path className="ghost-pal-shell-gloss" fill={`url(#ghost-shell-gloss-${gradientId})`} d="M 92 67 C 82 80, 79 109, 88 138 C 93 149, 99 156, 107 160 C 90 147, 85 118, 86 87 C 87 78, 89 71, 92 67 Z" />
              <path className="ghost-pal-shell-gloss ghost-pal-shell-gloss-small" fill={`url(#ghost-shell-gloss-${gradientId})`} d="M 126 66 C 132 63, 138 64, 141 70 C 136 70, 131 73, 128 77 C 125 75, 124 70, 126 66 Z" />

              <ellipse className="ghost-pal-core-glow" cx="110" cy="116" rx="25" ry="30" fill={`url(#ghost-core-${gradientId})`} />
              <g className="ghost-pal-core">
                <path className="ghost-pal-core-leaf" fill={`url(#ghost-core-leaf-${gradientId})`} d="M 101 136 C 90 127, 89 111, 101 96 C 109 106, 108 123, 101 136 Z" />
                <path className="ghost-pal-core-leaf" fill={`url(#ghost-core-leaf-${gradientId})`} d="M 119 136 C 131 127, 132 111, 119 95 C 111 106, 112 123, 119 136 Z" />
                <ellipse className="ghost-pal-core-bud" cx="110" cy="117.5" rx="7.4" ry="6.1" fill={orbitWarm} />
                <path className="ghost-pal-core-vein" stroke={hsla(hue - 8, 28, 24, 0.34)} d="M 110 98 C 108.5 109, 108.9 122.4, 110 137" />
              </g>

              <ellipse className="ghost-pal-collar" cx="110" cy="151.5" rx="25.5" ry="9.2" fill={`url(#ghost-collar-${gradientId})`} />
              <ellipse className="ghost-pal-collar-shine" cx="102.5" cy="149.2" rx="14.5" ry="3.5" fill={hsla(hue + 28, 86, 92, 0.22)} />

              <g className="ghost-pal-roots">
                <path className="ghost-pal-root" stroke={`url(#ghost-root-${gradientId})`} d="M 95 158 C 91 169, 91 182, 96 192" />
                <path className="ghost-pal-root" stroke={`url(#ghost-root-${gradientId})`} d="M 108 160 C 107.5 171, 108.4 184, 110 194" />
                <path className="ghost-pal-root" stroke={`url(#ghost-root-${gradientId})`} d="M 124 158 C 129 169, 130 182, 126 191" />
                <circle className="ghost-pal-root-tip" cx="96" cy="192" r="1.8" fill={orbitWarm} />
                <circle className="ghost-pal-root-tip" cx="110" cy="194" r="1.7" fill={orbitCool} />
                <circle className="ghost-pal-root-tip" cx="126" cy="191" r="1.8" fill={orbitWarm} />
              </g>
            </g>

            <g ref={faceRef} className="ghost-pal-face">
              <path ref={leftBrowRef} className="ghost-pal-brow" stroke={browColor} d="M 100.2 107.2 Q 103.6 106 106.8 107.1" />
              <path ref={rightBrowRef} className="ghost-pal-brow" stroke={browColor} d="M 113.4 107.1 Q 116.6 106 120 107.2" />
              <ellipse ref={blushLeftRef} className="ghost-pal-blush" fill={blushColor} cx="97.6" cy="119.6" rx="4.2" ry="2.15" />
              <ellipse ref={blushRightRef} className="ghost-pal-blush" fill={blushColor} cx="122.5" cy="119.6" rx="4.2" ry="2.15" />
              <circle ref={leftEyeRef} className="ghost-pal-eye" fill={eyeColor} cx="103.6" cy="112.9" r="2.25" />
              <circle ref={rightEyeRef} className="ghost-pal-eye" fill={eyeColor} cx="116.6" cy="112.9" r="2.25" />
              <path ref={leftBlinkRef} className="ghost-pal-blink" d="M 100.8 113.1 Q 103.6 114.2 106.4 113.1" />
              <path ref={rightBlinkRef} className="ghost-pal-blink" d="M 113.8 113.1 Q 116.6 114.2 119.4 113.1" />
              <circle ref={leftEyeShineRef} className="ghost-pal-eye-shine" cx="102.8" cy="112.1" r="0.66" />
              <circle ref={rightEyeShineRef} className="ghost-pal-eye-shine" cx="115.8" cy="112.1" r="0.66" />
              <path ref={mouthRef} className="ghost-pal-mouth" stroke={mouthColor} d="M 107.1 119.9 Q 110 121.9 112.9 119.9" />
            </g>

            <g ref={sparkleRef} className="ghost-pal-sparkles" fill={sparkleColor}>
              <path d="M 61 91 L 62.4 93.8 L 65.4 95 L 62.4 96.2 L 61 99 L 59.6 96.2 L 56.8 95 L 59.6 93.8 Z" />
              <circle cx="158" cy="72" r="2.4" />
              <circle cx="172" cy="118" r="2.2" />
              <path d="M 73 145 L 74.1 147.3 L 76.6 148.4 L 74.1 149.4 L 73 151.8 L 71.8 149.4 L 69.4 148.4 L 71.8 147.3 Z" />
              <circle cx="147" cy="148" r="2.05" />
            </g>
          </svg>
          {clickBurstKey ? (
            <span key={clickBurstKey} className="ghost-pal-click-burst" aria-hidden="true">
              <span className="ghost-pal-click-aura" />
              <span className="ghost-pal-click-grid" />
              <span className="ghost-pal-click-wave ghost-pal-click-wave-a" />
              <span className="ghost-pal-click-wave ghost-pal-click-wave-b" />
              <span className="ghost-pal-click-rootwave" />
              <span className="ghost-pal-click-leaf ghost-pal-click-leaf-a" />
              <span className="ghost-pal-click-leaf ghost-pal-click-leaf-b" />
              <span className="ghost-pal-click-leaf ghost-pal-click-leaf-c" />
              <span className="ghost-pal-click-leaf ghost-pal-click-leaf-d" />
              <span className="ghost-pal-click-mote ghost-pal-click-mote-a" />
              <span className="ghost-pal-click-mote ghost-pal-click-mote-b" />
              <span className="ghost-pal-click-mote ghost-pal-click-mote-c" />
              <span className="ghost-pal-click-mote ghost-pal-click-mote-d" />
              <span className="ghost-pal-click-mote ghost-pal-click-mote-e" />
              <span className="ghost-pal-click-mote ghost-pal-click-mote-f" />
            </span>
          ) : null}
        </button>
        <div className="ghost-pal-nameplate-wrap">
          <button
            type="button"
            className="ghost-pal-nameplate"
            onClick={() => setIsCustomizerOpen((current) => !current)}
            aria-label={`Customize companion. Current name ${ghostSettings.name}`}
          >
            <span className="ghost-pal-nameplate-text">{ghostSettings.name}</span>
          </button>
        </div>
      </div>
      {isCustomizerOpen ? (
        <div className="ghost-pal-customizer-overlay" ref={customizationRef}>
          <button
            type="button"
            className="ghost-pal-customizer-backdrop"
            onClick={() => setIsCustomizerOpen(false)}
            aria-label="Close companion editor backdrop"
          />
          <div className="ghost-pal-customizer">
            <div className="ghost-pal-customizer-head">
              <p>Companion Studio</p>
              <button type="button" className="ghost-pal-customizer-close" onClick={() => setIsCustomizerOpen(false)} aria-label="Close companion editor">
                Close
              </button>
            </div>
            <label className="ghost-pal-control ghost-pal-control-name">
              <span>Name</span>
              <input
                ref={nameInputRef}
                className="ghost-pal-name-input"
                value={ghostSettings.name}
                maxLength={24}
                onChange={(event) => updateGhostSettings('name', event.target.value)}
                aria-label="Companion name"
              />
            </label>
            <label className="ghost-pal-control">
              <span>Accent</span>
              <input
                type="range"
                min="156"
                max="244"
                value={ghostSettings.hue}
                onChange={(event) => updateGhostSettings('hue', Number(event.target.value))}
              />
            </label>
            <label className="ghost-pal-control">
              <span>Size</span>
              <input
                type="range"
                min="0.84"
                max="1.3"
                step="0.01"
                value={ghostSettings.size}
                onChange={(event) => updateGhostSettings('size', Number(event.target.value))}
              />
            </label>
            <label className="ghost-pal-control">
              <span>Width</span>
              <input
                type="range"
                min="0.88"
                max="1.28"
                step="0.01"
                value={ghostSettings.width}
                onChange={(event) => updateGhostSettings('width', Number(event.target.value))}
              />
            </label>
            <label className="ghost-pal-control">
              <span>Glow</span>
              <input
                type="range"
                min="0.8"
                max="1.45"
                step="0.01"
                value={ghostSettings.lighting}
                onChange={(event) => updateGhostSettings('lighting', Number(event.target.value))}
              />
            </label>
            <label className="ghost-pal-control">
              <span>Glass</span>
              <input
                type="range"
                min="0.72"
                max="1"
                step="0.01"
                value={ghostSettings.transparency}
                onChange={(event) => updateGhostSettings('transparency', Number(event.target.value))}
              />
            </label>
            <label className="ghost-pal-control">
              <span>Energy</span>
              <input
                type="range"
                min="0.35"
                max="1.7"
                step="0.01"
                value={ghostSettings.activeness}
                onChange={(event) => updateGhostSettings('activeness', Number(event.target.value))}
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BlobPalCompanion;
