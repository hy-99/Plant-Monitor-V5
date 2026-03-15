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
const DEFAULT_GHOST_NAME = 'Miso';
const defaultGhostSettings: GhostSettings = {
  name: DEFAULT_GHOST_NAME,
  size: 1,
  width: 1,
  hue: 212,
  lighting: 1,
  transparency: 0.92,
  activeness: 1,
};

const idleLines = {
  auth: [
    'Tiny ghost buddy here. We can do this slowly.',
    'I am haunting this login in a supportive way.',
    'Soft ghost mode. No panic.',
    'I am floating nearby for moral support.',
  ],
  home: [
    'Friendly greenhouse ghost on patrol.',
    'I am drifting around the dashboard.',
    'Tiny plant ghost keeping watch.',
    'Everything looks a little softer from here.',
  ],
} as const;

const celebrateLines = {
  auth: [
    'You clicked me.',
    'Tiny ghost celebration.',
    'That made me wiggle.',
    'Ghost approval granted.',
  ],
  home: [
    'Dashboard haunting upgraded.',
    'That click woke me up.',
    'I did a happy ghost bounce.',
    'That was fun.',
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
    size: clamp(Number(source.size) || defaultGhostSettings.size, 0.8, 1.35),
    width: clamp(Number(source.width) || defaultGhostSettings.width, 0.82, 1.3),
    hue: clamp(Number(source.hue) || defaultGhostSettings.hue, 170, 340),
    lighting: clamp(Number(source.lighting) || defaultGhostSettings.lighting, 0.7, 1.45),
    transparency: clamp(Number(source.transparency) || defaultGhostSettings.transparency, 0.45, 1),
    activeness: clamp(Number(source.activeness) || defaultGhostSettings.activeness, 0.35, 1.8),
  };
};

const buildGhostPath = (waveA: number, waveB: number, waveC: number) => `
  M 52 128
  C 49 92, 57 58, 83 40
  C 101 28, 119 28, 137 40
  C 163 58, 171 92, 168 128
  C 166 146, 162 160, 158 177
  C 148 ${168 + waveA * 0.34}, 139 ${154 + waveB * 0.42}, 129 ${179 + waveC * 0.36}
  C 121 ${160 + waveA * 0.28}, 116 ${154 + waveC * 0.22}, 110 ${182 + waveB * 0.34}
  C 104 ${154 + waveC * 0.22}, 99 ${160 + waveA * 0.28}, 91 ${179 + waveC * 0.36}
  C 81 ${154 + waveB * 0.42}, 72 ${168 + waveA * 0.34}, 62 ${177 + waveB * 0.3}
  C 58 160, 54 146, 52 128 Z
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
  ariaLabel = 'Animated ghost companion',
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
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const faceMotionRef = useRef({
    leftEyeR: 7.2,
    rightEyeR: 7.2,
    blink: 0,
    browLift: 0,
    blush: 0.12,
    mouthSmile: 0.5,
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
        if (!targetRef.current.hover) {
          hoverLockedRef.current = false;
        }
        setProximity(targetRef.current.hover ? 'hover' : 'near');
      } else if (proximity !== 'far') {
        resetPointerTarget();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [proximity, scope]);

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

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const t = (timestamp - startTimeRef.current) / 1000;
      const reduced = prefersReducedMotionRef.current;
      const energy = ghostSettings.activeness;
      const current = currentRef.current;
      const target = targetRef.current;

      current.x = lerp(current.x, target.x, reduced ? 0.035 : 0.048 + energy * 0.032);
      current.y = lerp(current.y, target.y, reduced ? 0.035 : 0.048 + energy * 0.032);
      current.near = lerp(current.near, target.near, reduced ? 0.045 : 0.05 + energy * 0.018);
      current.hover = lerp(current.hover, target.hover, reduced ? 0.045 : 0.058 + energy * 0.022);
      current.click = lerp(current.click, clickKickRef.current, reduced ? 0.05 : 0.072 + energy * 0.032);
      clickKickRef.current *= reduced ? 0.91 : 0.955 - energy * 0.02;

      const floatBase = Math.sin(t * (0.9 + energy * 0.18)) * (2.8 + energy * 1.4);
      const sideDrift = Math.cos(t * (0.54 + energy * 0.12)) * (1.7 + energy * 0.9);
      const driftX = sideDrift + current.x * (9.4 + energy * 3.6);
      const driftY = floatBase + current.y * (6.2 + energy * 2.6) - current.hover * (1.6 + energy) - current.click * (2.8 + energy * 1.8);
      const rotate = Math.sin(t * (0.36 + energy * 0.08)) * (1.8 + energy * 1.1) + current.x * (6.2 + energy * 3.1);
      const squashX = 1 + Math.sin(t * (0.72 + energy * 0.14)) * (0.012 + energy * 0.01) + current.click * (0.02 + energy * 0.012);
      const squashY = 1 - Math.sin(t * (0.72 + energy * 0.14)) * (0.008 + energy * 0.008) - current.click * (0.014 + energy * 0.008);
      const waveA = Math.sin(t * (1.32 + energy * 0.25)) * (6.2 + energy * 3.1) + current.x * (4.5 + energy * 1.8);
      const waveB = Math.cos(t * (1.08 + energy * 0.22)) * (5.4 + energy * 2.6) - current.x * (4.2 + energy * 1.6);
      const waveC = Math.sin(t * (1.54 + energy * 0.28) + 1.2) * (4.8 + energy * 2.4) + current.hover * (3.2 + energy * 2.2);
      const faceMotion = faceMotionRef.current;

      const expression = winkCharge > 0 ? 'blink' : resolveExpression(mood, proximity, current.click, ambientExpression);
      const shellTransform = `translate(${driftX.toFixed(2)} ${driftY.toFixed(2)}) rotate(${rotate.toFixed(2)} 110 110) scale(${squashX.toFixed(3)} ${squashY.toFixed(3)})`;

      if (shellRef.current) {
        shellRef.current.setAttribute('transform', shellTransform);
      }

      const bodyPath = buildGhostPath(waveA, waveB, waveC);
      if (bodyRef.current) bodyRef.current.setAttribute('d', bodyPath);
      if (veilRef.current) veilRef.current.setAttribute('d', bodyPath);

      if (shadowRef.current) {
        shadowRef.current.setAttribute('rx', (38 - current.hover * 3 - current.click * 2).toFixed(2));
        shadowRef.current.setAttribute('opacity', (0.18 + current.near * 0.08).toFixed(3));
      }

      if (glowRef.current) {
        glowRef.current.setAttribute('rx', (44 + current.hover * 5 + current.click * 6).toFixed(2));
        glowRef.current.setAttribute('ry', (12 + current.hover * 2 + current.click * 2).toFixed(2));
        glowRef.current.setAttribute('opacity', (0.2 + current.near * 0.16 + current.click * 0.24).toFixed(3));
      }

      if (faceRef.current) {
        faceRef.current.setAttribute('transform', shellTransform);
      }

      const eyeY = 98 + current.y * 3.8;
      const leftX = 91 + current.x * 7;
      const rightX = 129 + current.x * 7;

      let targetLeftEyeR = 7.2;
      let targetRightEyeR = 7.2;
      let targetBrowLift = 0;
      let targetBlush = 0.12;
      let targetMouthSmile = 0.5;
      let targetMouthOpen = 0;

      if (expression === 'surprised') {
        targetLeftEyeR = 7.9;
        targetRightEyeR = 7.9;
        targetBrowLift = 2.2;
        targetMouthOpen = 1;
        targetMouthSmile = 0;
      }
      if (expression === 'shy') {
        targetLeftEyeR = 6.5;
        targetRightEyeR = 6.5;
        targetBlush = 0.46;
        targetMouthSmile = 0.22;
      }
      if (expression === 'sad') {
        targetLeftEyeR = 7;
        targetRightEyeR = 7;
        targetBrowLift = -1.8;
        targetMouthSmile = -0.5;
      }
      if (expression === 'smile') {
        targetLeftEyeR = 7.4;
        targetRightEyeR = 7.4;
        targetBlush = 0.26;
        targetMouthSmile = 1;
      }
      if (expression === 'blink') {
        targetBlush = 0.18;
        targetMouthSmile = 0.58;
      }

      const targetBlink = expression === 'blink' ? 1 : 0;
      faceMotion.leftEyeR = lerp(faceMotion.leftEyeR, targetLeftEyeR, reduced ? 0.14 : 0.2);
      faceMotion.rightEyeR = lerp(faceMotion.rightEyeR, targetRightEyeR, reduced ? 0.14 : 0.18);
      faceMotion.blink = lerp(faceMotion.blink, targetBlink, reduced ? 0.28 : 0.58);
      faceMotion.browLift = lerp(faceMotion.browLift, targetBrowLift, reduced ? 0.12 : 0.18);
      faceMotion.blush = lerp(faceMotion.blush, targetBlush, reduced ? 0.12 : 0.18);
      faceMotion.mouthSmile = lerp(faceMotion.mouthSmile, targetMouthSmile, reduced ? 0.12 : 0.18);
      faceMotion.mouthOpen = lerp(faceMotion.mouthOpen, targetMouthOpen, reduced ? 0.12 : 0.18);
      const blinkScaleY = (1 - faceMotion.blink * 0.9).toFixed(3);
      const blinkLineOpacity = faceMotion.blink.toFixed(3);
      const eyeOpacity = (1 - faceMotion.blink * 0.7).toFixed(3);
      const shineOpacity = (1 - faceMotion.blink * 1.2 < 0 ? 0 : 1 - faceMotion.blink * 1.2).toFixed(3);

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
        const leftBlink = `M ${(leftX - 7.8).toFixed(2)} ${(eyeY + 0.4).toFixed(2)} Q ${leftX.toFixed(2)} ${(eyeY + 3.1).toFixed(2)} ${(leftX + 7.8).toFixed(2)} ${(eyeY + 0.4).toFixed(2)}`;
        leftBlinkRef.current.setAttribute('d', leftBlink);
        leftBlinkRef.current.setAttribute('stroke', eyeColor);
        leftBlinkRef.current.setAttribute('opacity', blinkLineOpacity);
      }
      if (rightBlinkRef.current) {
        const rightBlink = `M ${(rightX - 7.8).toFixed(2)} ${(eyeY + 0.4).toFixed(2)} Q ${rightX.toFixed(2)} ${(eyeY + 3.1).toFixed(2)} ${(rightX + 7.8).toFixed(2)} ${(eyeY + 0.4).toFixed(2)}`;
        rightBlinkRef.current.setAttribute('d', rightBlink);
        rightBlinkRef.current.setAttribute('stroke', eyeColor);
        rightBlinkRef.current.setAttribute('opacity', blinkLineOpacity);
      }

      if (leftEyeShineRef.current) {
        leftEyeShineRef.current.setAttribute('cx', (leftX - 2.6).toFixed(2));
        leftEyeShineRef.current.setAttribute('cy', (eyeY - 2.4).toFixed(2));
        leftEyeShineRef.current.setAttribute('opacity', shineOpacity);
      }
      if (rightEyeShineRef.current) {
        rightEyeShineRef.current.setAttribute('cx', (rightX - 2.6).toFixed(2));
        rightEyeShineRef.current.setAttribute('cy', (eyeY - 2.4).toFixed(2));
        rightEyeShineRef.current.setAttribute('opacity', shineOpacity);
      }

      if (leftBrowRef.current) {
        const leftBrow = `M ${leftX - 7.5} ${(eyeY - 11 - faceMotion.browLift * 0.8).toFixed(2)} Q ${leftX} ${(eyeY - 13.2 - faceMotion.browLift).toFixed(2)} ${leftX + 7.5} ${(eyeY - 11 - faceMotion.browLift * 0.45).toFixed(2)}`;
        leftBrowRef.current.setAttribute('d', leftBrow);
      }
      if (rightBrowRef.current) {
        const rightBrow = `M ${rightX - 7.5} ${(eyeY - 11 - faceMotion.browLift * 0.45).toFixed(2)} Q ${rightX} ${(eyeY - 13.2 - faceMotion.browLift).toFixed(2)} ${rightX + 7.5} ${(eyeY - 11 - faceMotion.browLift * 0.8).toFixed(2)}`;
        rightBrowRef.current.setAttribute('d', rightBrow);
      }

      if (blushLeftRef.current) {
        blushLeftRef.current.setAttribute('opacity', faceMotion.blush.toFixed(3));
      }
      if (blushRightRef.current) {
        blushRightRef.current.setAttribute('opacity', faceMotion.blush.toFixed(3));
      }

      const mouthY = 127 - faceMotion.mouthSmile * 1.2;
      const mouthCurve = 129 + faceMotion.mouthSmile * 5.2;
      let mouth = `M 101 ${mouthY.toFixed(2)} Q 110 ${mouthCurve.toFixed(2)} 119 ${mouthY.toFixed(2)}`;
      if (faceMotion.mouthOpen > 0.08) {
        const openTop = 126 - faceMotion.mouthOpen * 5.4;
        const openBottom = 127 + faceMotion.mouthOpen * 5.2;
        mouth = `M 105.5 126.5 Q 110 ${openTop.toFixed(2)} 114.5 126.5 Q 110 ${openBottom.toFixed(2)} 105.5 126.5`;
      }
      if (mouthRef.current) mouthRef.current.setAttribute('d', mouth);

      if (sparkleRef.current) {
        sparkleRef.current.setAttribute('opacity', (0.18 + current.click * 0.78 + current.hover * 0.12).toFixed(3));
        sparkleRef.current.setAttribute(
          'transform',
          `translate(${(current.x * 4).toFixed(2)} ${(-current.click * 10 - current.hover * 2).toFixed(2)}) scale(${(1 + current.click * 0.18).toFixed(3)})`,
        );
      }

      rafRef.current = window.requestAnimationFrame(animate);
    };

    rafRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [ambientExpression, ghostSettings.activeness, mood, proximity]);

  const expression = resolveExpression(mood, proximity, currentRef.current.click, ambientExpression);
  const reactionLabel =
    clickLine
      ? 'ghost reaction'
      : bubbleLabel;

  const resolvedBubbleText =
    clickLine ??
    (bubbleText ?? idleLines[scope][bubbleIndex]);

  const className = useMemo(
    () =>
      `slime-pal ghost-pal slime-pal-${scope} slime-pal-${placement} slime-pal-${proximity} slime-pal-${clickLine ? 'clicked' : 'idle'} slime-pal-mood-${mood} ghost-pal-expression-${expression}`,
    [clickLine, expression, mood, placement, proximity, scope],
  );

  const updateGhostSettings = <K extends keyof GhostSettings>(key: K, value: GhostSettings[K]) => {
    setGhostSettings((current) => formatGhostSettings({ ...current, [key]: value }));
  };

  const ghostVisualStyle = {
    '--ghost-scene-height': `${(placement === 'floating' ? 8.8 : 7.75) * ghostSettings.size}rem`,
    '--ghost-scene-width': `${(placement === 'floating' ? 8.8 : 7.75) * ghostSettings.size * ghostSettings.width}rem`,
    '--ghost-alpha': String(ghostSettings.transparency),
    '--ghost-lighting': String(ghostSettings.lighting),
    '--ghost-shadow-strength': String(0.16 + (ghostSettings.lighting - 0.7) * 0.18),
  } as React.CSSProperties;
  const hue = ghostSettings.hue;
  const lightingBoost = (ghostSettings.lighting - 1) * 12;
  const alpha = ghostSettings.transparency;
  const bodyStart = hsla(hue, 90, 98 + lightingBoost, Math.min(alpha + 0.06, 1));
  const bodyMid = hsla(hue, 72, 92 + lightingBoost, Math.min(alpha + 0.04, 1));
  const bodyEnd = hsla(hue, 72, 79 + lightingBoost, alpha);
  const innerStart = hsla(hue, 96, 99, alpha * 0.62);
  const innerMid = hsla(hue, 72, 90 + lightingBoost, alpha * 0.18);
  const glossStart = hsla(hue, 100, 99, Math.min(alpha + 0.08, 1));
  const outline = hsla(hue, 84, 98, alpha * 0.84);
  const eyeColor = 'rgba(61, 80, 111, 0.95)';
  const browColor = 'rgba(105, 123, 156, 0.88)';
  const mouthColor = 'rgba(95, 118, 152, 0.94)';
  const blushColor = `rgba(255, 186, 206, ${Math.max(0.12, alpha * 0.34)})`;
  const glowColor = hsla(hue, 88, 88 + lightingBoost, alpha * 0.34);
  const groundColor = hsla(hue - 8, 24, 42, alpha * 0.18);
  const sparkleColor = hsla(hue, 86, 99, alpha * 0.95);
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
            clickKickRef.current = 1;
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
              <radialGradient id={`ghost-body-${gradientId}`} cx="42%" cy="24%">
                <stop offset="0%" stopColor={bodyStart} />
                <stop offset="36%" stopColor={bodyMid} />
                <stop offset="70%" stopColor={bodyEnd} />
                <stop offset="100%" stopColor={bodyEnd} />
              </radialGradient>
              <radialGradient id={`ghost-inner-${gradientId}`} cx="44%" cy="38%">
                <stop offset="0%" stopColor={innerStart} />
                <stop offset="62%" stopColor={innerMid} />
                <stop offset="100%" stopColor={hsla(hue, 72, 90, 0)} />
              </radialGradient>
              <radialGradient id={`ghost-gloss-${gradientId}`} cx="30%" cy="28%">
                <stop offset="0%" stopColor={glossStart} />
                <stop offset="100%" stopColor={hsla(hue, 100, 100, 0)} />
              </radialGradient>
              <filter id={`ghost-shadow-${gradientId}`} x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="14" stdDeviation={10 + ghostSettings.lighting * 2} floodColor={hsla(hue - 10, 34, 40, 0.12 + ghostSettings.lighting * 0.08)} />
              </filter>
            </defs>

            <ellipse ref={glowRef} className="ghost-pal-glow" cx="110" cy="188" rx="44" ry="12" fill={glowColor} />
            <ellipse ref={shadowRef} className="ghost-pal-ground" cx="110" cy="191" rx="38" ry="8.5" fill={groundColor} />

            <g ref={shellRef} filter={`url(#ghost-shadow-${gradientId})`}>
              <path ref={bodyRef} className="ghost-pal-body" fill={`url(#ghost-body-${gradientId})`} stroke={outline} d={buildGhostPath(0, 0, 0)} />
              <path ref={veilRef} className="ghost-pal-veil" fill={`url(#ghost-inner-${gradientId})`} d={buildGhostPath(0, 0, 0)} />
              <ellipse className="ghost-pal-gloss" cx="83" cy="75" rx="25" ry="18" fill={`url(#ghost-gloss-${gradientId})`} />
              <ellipse className="ghost-pal-gloss ghost-pal-gloss-small" cx="128" cy="60" rx="11" ry="7.5" fill={`url(#ghost-gloss-${gradientId})`} />
            </g>

            <g ref={faceRef} className="ghost-pal-face">
              <path ref={leftBrowRef} className="ghost-pal-brow" stroke={browColor} d="M 83.5 87 Q 91 84.8 98.5 87" />
              <path ref={rightBrowRef} className="ghost-pal-brow" stroke={browColor} d="M 121.5 87 Q 129 84.8 136.5 87" />
              <ellipse ref={blushLeftRef} className="ghost-pal-blush" fill={blushColor} cx="77" cy="117" rx="8.5" ry="4.8" />
              <ellipse ref={blushRightRef} className="ghost-pal-blush" fill={blushColor} cx="143" cy="117" rx="8.5" ry="4.8" />
              <circle ref={leftEyeRef} className="ghost-pal-eye" fill={eyeColor} cx="91" cy="98" r="7.2" />
              <circle ref={rightEyeRef} className="ghost-pal-eye" fill={eyeColor} cx="129" cy="98" r="7.2" />
              <path ref={leftBlinkRef} className="ghost-pal-blink" d="M 83.2 98.4 Q 91 101.2 98.8 98.4" />
              <path ref={rightBlinkRef} className="ghost-pal-blink" d="M 121.2 98.4 Q 129 101.2 136.8 98.4" />
              <circle ref={leftEyeShineRef} className="ghost-pal-eye-shine" cx="88.4" cy="95.6" r="1.8" />
              <circle ref={rightEyeShineRef} className="ghost-pal-eye-shine" cx="126.4" cy="95.6" r="1.8" />
              <path ref={mouthRef} className="ghost-pal-mouth" stroke={mouthColor} d="M 101 127 Q 110 132 119 127" />
            </g>

            <g ref={sparkleRef} className="ghost-pal-sparkles" fill={sparkleColor}>
              <circle cx="61" cy="81" r="3.2" />
              <circle cx="160" cy="73" r="2.7" />
              <circle cx="172" cy="118" r="2.4" />
              <circle cx="71" cy="145" r="2.4" />
              <circle cx="145" cy="148" r="2.2" />
            </g>
          </svg>
        </button>
        <div className="ghost-pal-nameplate-wrap">
          <button
            type="button"
            className="ghost-pal-nameplate"
            onClick={() => setIsCustomizerOpen((current) => !current)}
            aria-label={`Customize ghost. Current name ${ghostSettings.name}`}
          >
            <span className="ghost-pal-nameplate-text">{ghostSettings.name}</span>
          </button>
        </div>
      </div>
      {isCustomizerOpen ? (
        <div className="ghost-pal-customizer-overlay" ref={customizationRef}>
          <button type="button" className="ghost-pal-customizer-backdrop" onClick={() => setIsCustomizerOpen(false)} aria-label="Close ghost editor backdrop" />
          <div className="ghost-pal-customizer">
            <div className="ghost-pal-customizer-head">
              <p>Ghost Editor</p>
              <button type="button" className="ghost-pal-customizer-close" onClick={() => setIsCustomizerOpen(false)} aria-label="Close ghost editor">
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
                aria-label="Ghost name"
              />
            </label>
            <label className="ghost-pal-control">
              <span>Color</span>
              <input
                type="range"
                min="170"
                max="340"
                value={ghostSettings.hue}
                onChange={(event) => updateGhostSettings('hue', Number(event.target.value))}
              />
            </label>
            <label className="ghost-pal-control">
              <span>Size</span>
              <input
                type="range"
                min="0.8"
                max="1.35"
                step="0.01"
                value={ghostSettings.size}
                onChange={(event) => updateGhostSettings('size', Number(event.target.value))}
              />
            </label>
            <label className="ghost-pal-control">
              <span>Width</span>
              <input
                type="range"
                min="0.82"
                max="1.3"
                step="0.01"
                value={ghostSettings.width}
                onChange={(event) => updateGhostSettings('width', Number(event.target.value))}
              />
            </label>
            <label className="ghost-pal-control">
              <span>Lighting</span>
              <input
                type="range"
                min="0.7"
                max="1.45"
                step="0.01"
                value={ghostSettings.lighting}
                onChange={(event) => updateGhostSettings('lighting', Number(event.target.value))}
              />
            </label>
            <label className="ghost-pal-control">
              <span>Transparency</span>
              <input
                type="range"
                min="0.45"
                max="1"
                step="0.01"
                value={ghostSettings.transparency}
                onChange={(event) => updateGhostSettings('transparency', Number(event.target.value))}
              />
            </label>
            <label className="ghost-pal-control">
              <span>Activeness</span>
              <input
                type="range"
                min="0.35"
                max="1.8"
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
