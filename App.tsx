import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addSnapshot,
  completeReminder,
  createPlant,
  createReminder,
  deleteReminder,
  deleteSnapshot,
  guestAnalyze,
  getChatHistory,
  getCurrentUser,
  getPlants,
  getReminders,
  getStorageUsage,
  login,
  register,
  renamePlant,
  saveFeedback,
  sendChat,
  updateCurrentUser,
  updateReminder,
} from './services/api';
import { AnalysisResult, ChatMessage, ChatMode, Plant, Reminder, ReminderRecurrence, StorageUsage, User } from './types';
import Header from './components/Header';
import HomePage from './components/HomePage';
import AddPlantPage from './components/AddPlantPage';
import DetailPage from './components/DetailPage';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage';
import CalendarPage from './components/CalendarPage';
import AchievementsPage from './components/AchievementsPage';
import useLocalStorage from './hooks/useLocalStorage';
import { getAchievementSummary } from './utils/achievements';
import ProfilePage from './components/ProfilePage';
import PlantFactRobot from './components/PlantFactRobot';
import PlantShatterSequence from './components/PlantShatterSequence';

type Page = 'home' | 'add' | 'detail' | 'chat' | 'calendar' | 'achievements' | 'profile';
type AuthMode = 'login' | 'register';
type RobotMood = 'warm' | 'curious' | 'excited' | 'sad';
type ScreenTransitionMode = 'auth-to-app' | 'app-to-auth';
type SurfaceKind = 'boot' | 'auth' | 'app';
type TransitionPhase = 'fadeout' | 'forge' | 'settle';

interface RobotOverride {
  title: string;
  text: string;
  footer?: string;
  mood: RobotMood;
}

interface PendingPlantCollapse {
  plant: Plant;
  phase: 'waiting' | 'shattering';
}

type TransitionPiece = {
  x: string;
  y: string;
  w: string;
  h: string;
  tx: string;
  ty: string;
  r: string;
  d: string;
  clip: string;
  tier: 'major' | 'minor' | 'micro';
};

type TransitionCrack = {
  x: string;
  y: string;
  len: string;
  rot: string;
  delay: string;
  branch: string;
  tier: 'major' | 'minor' | 'micro';
};

const TRANSITION_FADE_MS = 1020;
const TRANSITION_FORGE_MS = 6000;
const TRANSITION_SWAP_MS = 1800;
const TRANSITION_SETTLE_MS = 1150;
const PLANT_COLLAPSE_DELAY_MS = 700;
const PLANT_SHATTER_MS = 2500;

const transitionPieces: TransitionPiece[] = [
  { x: '-4%', y: '-3%', w: '35%', h: '42%', tx: '-42vw', ty: '-28vh', r: '-30deg', d: '0ms', clip: 'polygon(0 8%, 72% 0, 100% 10%, 90% 42%, 68% 74%, 48% 100%, 8% 80%, 3% 38%)', tier: 'major' },
  { x: '20%', y: '-5%', w: '33%', h: '36%', tx: '-12vw', ty: '-34vh', r: '24deg', d: '70ms', clip: 'polygon(12% 0, 88% 6%, 100% 34%, 82% 70%, 58% 100%, 18% 92%, 0 44%)', tier: 'major' },
  { x: '47%', y: '-4%', w: '26%', h: '40%', tx: '16vw', ty: '-32vh', r: '-26deg', d: '120ms', clip: 'polygon(0 16%, 58% 0, 92% 8%, 100% 54%, 76% 100%, 12% 84%)', tier: 'major' },
  { x: '70%', y: '-2%', w: '34%', h: '39%', tx: '44vw', ty: '-24vh', r: '22deg', d: '170ms', clip: 'polygon(0 4%, 100% 0, 94% 44%, 82% 86%, 42% 100%, 8% 72%, 2% 26%)', tier: 'major' },

  { x: '-3%', y: '25%', w: '23%', h: '28%', tx: '-44vw', ty: '-4vh', r: '18deg', d: '140ms', clip: 'polygon(0 14%, 86% 0, 100% 28%, 90% 72%, 40% 100%, 5% 82%)', tier: 'minor' },
  { x: '14%', y: '23%', w: '24%', h: '30%', tx: '-24vw', ty: '2vh', r: '-14deg', d: '180ms', clip: 'polygon(8% 0, 94% 8%, 100% 52%, 72% 100%, 16% 90%, 0 34%)', tier: 'minor' },
  { x: '31%', y: '28%', w: '20%', h: '22%', tx: '-6vw', ty: '4vh', r: '16deg', d: '215ms', clip: 'polygon(0 10%, 72% 0, 100% 24%, 86% 82%, 44% 100%, 4% 68%)', tier: 'minor' },
  { x: '47%', y: '24%', w: '21%', h: '27%', tx: '12vw', ty: '0vh', r: '-20deg', d: '250ms', clip: 'polygon(12% 0, 92% 12%, 100% 58%, 70% 100%, 10% 80%, 0 24%)', tier: 'minor' },
  { x: '62%', y: '22%', w: '18%', h: '29%', tx: '28vw', ty: '3vh', r: '20deg', d: '285ms', clip: 'polygon(0 18%, 56% 0, 100% 18%, 88% 88%, 32% 100%, 6% 64%)', tier: 'minor' },
  { x: '76%', y: '27%', w: '26%', h: '26%', tx: '46vw', ty: '6vh', r: '-18deg', d: '320ms', clip: 'polygon(0 0, 100% 8%, 92% 82%, 54% 100%, 12% 84%, 3% 28%)', tier: 'minor' },
  { x: '2%', y: '41%', w: '19%', h: '24%', tx: '-48vw', ty: '8vh', r: '-20deg', d: '205ms', clip: 'polygon(0 8%, 84% 0, 100% 24%, 82% 92%, 24% 100%, 0 62%)', tier: 'minor' },
  { x: '22%', y: '36%', w: '18%', h: '21%', tx: '-18vw', ty: '-2vh', r: '18deg', d: '238ms', clip: 'polygon(10% 0, 96% 10%, 100% 56%, 68% 100%, 8% 82%, 0 26%)', tier: 'minor' },
  { x: '54%', y: '38%', w: '17%', h: '22%', tx: '18vw', ty: '4vh', r: '-16deg', d: '272ms', clip: 'polygon(0 16%, 72% 0, 100% 20%, 86% 88%, 28% 100%, 0 58%)', tier: 'minor' },
  { x: '81%', y: '39%', w: '18%', h: '21%', tx: '52vw', ty: '10vh', r: '21deg', d: '336ms', clip: 'polygon(0 0, 100% 8%, 88% 84%, 38% 100%, 2% 62%, 6% 18%)', tier: 'minor' },
  { x: '8%', y: '14%', w: '16%', h: '20%', tx: '-34vw', ty: '-16vh', r: '-18deg', d: '164ms', clip: 'polygon(0 10%, 90% 0, 100% 36%, 76% 100%, 18% 90%, 0 44%)', tier: 'minor' },
  { x: '37%', y: '12%', w: '17%', h: '19%', tx: '2vw', ty: '-18vh', r: '17deg', d: '196ms', clip: 'polygon(14% 0, 94% 12%, 100% 58%, 72% 100%, 10% 84%, 0 24%)', tier: 'minor' },
  { x: '64%', y: '12%', w: '15%', h: '18%', tx: '26vw', ty: '-16vh', r: '-15deg', d: '224ms', clip: 'polygon(0 12%, 72% 0, 100% 18%, 86% 86%, 20% 100%, 2% 58%)', tier: 'minor' },
  { x: '12%', y: '72%', w: '17%', h: '16%', tx: '-22vw', ty: '38vh', r: '16deg', d: '352ms', clip: 'polygon(0 0, 100% 12%, 82% 100%, 18% 88%, 0 34%)', tier: 'minor' },
  { x: '52%', y: '78%', w: '16%', h: '14%', tx: '20vw', ty: '42vh', r: '-17deg', d: '418ms', clip: 'polygon(10% 0, 92% 8%, 100% 46%, 66% 100%, 8% 82%, 0 22%)', tier: 'minor' },

  { x: '6%', y: '50%', w: '13%', h: '19%', tx: '-34vw', ty: '18vh', r: '-22deg', d: '260ms', clip: 'polygon(0 10%, 88% 0, 100% 28%, 74% 100%, 16% 82%, 6% 36%)', tier: 'micro' },
  { x: '24%', y: '49%', w: '14%', h: '18%', tx: '-6vw', ty: '20vh', r: '-17deg', d: '315ms', clip: 'polygon(0 8%, 76% 0, 100% 18%, 90% 76%, 30% 100%, 2% 54%)', tier: 'micro' },
  { x: '49%', y: '48%', w: '13%', h: '18%', tx: '18vw', ty: '16vh', r: '-21deg', d: '365ms', clip: 'polygon(0 14%, 62% 0, 100% 14%, 86% 86%, 22% 100%, 0 58%)', tier: 'micro' },
  { x: '72%', y: '49%', w: '14%', h: '19%', tx: '40vw', ty: '18vh', r: '-24deg', d: '420ms', clip: 'polygon(0 6%, 96% 0, 100% 36%, 70% 100%, 10% 76%, 0 24%)', tier: 'micro' },
  { x: '15%', y: '61%', w: '10%', h: '13%', tx: '-18vw', ty: '26vh', r: '16deg', d: '286ms', clip: 'polygon(8% 0, 100% 18%, 84% 100%, 16% 86%, 0 28%)', tier: 'micro' },
  { x: '33%', y: '59%', w: '11%', h: '14%', tx: '-2vw', ty: '24vh', r: '-19deg', d: '332ms', clip: 'polygon(0 10%, 82% 0, 100% 24%, 74% 100%, 10% 82%, 2% 40%)', tier: 'micro' },
  { x: '58%', y: '60%', w: '10%', h: '13%', tx: '24vw', ty: '22vh', r: '18deg', d: '388ms', clip: 'polygon(10% 0, 90% 10%, 100% 52%, 64% 100%, 0 78%, 0 24%)', tier: 'micro' },
  { x: '82%', y: '61%', w: '9%', h: '12%', tx: '48vw', ty: '24vh', r: '-20deg', d: '446ms', clip: 'polygon(0 8%, 100% 0, 88% 88%, 28% 100%, 0 58%)', tier: 'micro' },
  { x: '39%', y: '70%', w: '11%', h: '12%', tx: '8vw', ty: '34vh', r: '14deg', d: '470ms', clip: 'polygon(0 16%, 70% 0, 100% 18%, 90% 82%, 22% 100%, 0 56%)', tier: 'micro' },
  { x: '63%', y: '71%', w: '10%', h: '12%', tx: '30vw', ty: '36vh', r: '-16deg', d: '496ms', clip: 'polygon(8% 0, 96% 8%, 100% 42%, 72% 100%, 10% 84%, 0 24%)', tier: 'micro' },
  { x: '18%', y: '18%', w: '9%', h: '12%', tx: '-20vw', ty: '-12vh', r: '18deg', d: '214ms', clip: 'polygon(8% 0, 100% 14%, 82% 100%, 10% 86%, 0 26%)', tier: 'micro' },
  { x: '31%', y: '16%', w: '8%', h: '11%', tx: '-4vw', ty: '-14vh', r: '-14deg', d: '236ms', clip: 'polygon(0 10%, 78% 0, 100% 20%, 76% 100%, 8% 82%, 0 38%)', tier: 'micro' },
  { x: '58%', y: '16%', w: '8%', h: '11%', tx: '16vw', ty: '-12vh', r: '16deg', d: '252ms', clip: 'polygon(10% 0, 90% 8%, 100% 48%, 66% 100%, 0 74%, 0 22%)', tier: 'micro' },
  { x: '74%', y: '18%', w: '9%', h: '12%', tx: '34vw', ty: '-10vh', r: '-18deg', d: '276ms', clip: 'polygon(0 6%, 94% 0, 100% 36%, 74% 100%, 12% 78%, 0 22%)', tier: 'micro' },
  { x: '8%', y: '34%', w: '8%', h: '10%', tx: '-30vw', ty: '2vh', r: '14deg', d: '298ms', clip: 'polygon(10% 0, 100% 18%, 82% 100%, 12% 84%, 0 24%)', tier: 'micro' },
  { x: '86%', y: '32%', w: '8%', h: '10%', tx: '54vw', ty: '4vh', r: '-16deg', d: '322ms', clip: 'polygon(0 10%, 100% 0, 90% 86%, 24% 100%, 0 52%)', tier: 'micro' },
  { x: '10%', y: '82%', w: '9%', h: '10%', tx: '-26vw', ty: '46vh', r: '-15deg', d: '514ms', clip: 'polygon(0 0, 94% 10%, 84% 100%, 20% 88%, 0 30%)', tier: 'micro' },
  { x: '78%', y: '84%', w: '8%', h: '10%', tx: '42vw', ty: '48vh', r: '17deg', d: '532ms', clip: 'polygon(10% 0, 100% 12%, 90% 88%, 20% 100%, 0 42%)', tier: 'micro' },
];

const transitionCracks: TransitionCrack[] = [
  { x: '51%', y: '50%', len: '31vw', rot: '-72deg', delay: '0ms', branch: '0.52', tier: 'major' },
  { x: '51%', y: '50%', len: '28vw', rot: '-18deg', delay: '90ms', branch: '0.42', tier: 'major' },
  { x: '51%', y: '50%', len: '26vw', rot: '14deg', delay: '180ms', branch: '0.58', tier: 'major' },
  { x: '51%', y: '50%', len: '34vw', rot: '58deg', delay: '270ms', branch: '0.48', tier: 'major' },
  { x: '51%', y: '50%', len: '24vw', rot: '112deg', delay: '360ms', branch: '0.36', tier: 'major' },
  { x: '51%', y: '50%', len: '20vw', rot: '-146deg', delay: '430ms', branch: '0.28', tier: 'major' },
  { x: '51%', y: '50%', len: '18vw', rot: '154deg', delay: '500ms', branch: '0.24', tier: 'major' },
  { x: '34%', y: '22%', len: '18vw', rot: '-124deg', delay: '1200ms', branch: '0.34', tier: 'minor' },
  { x: '42%', y: '36%', len: '14vw', rot: '-136deg', delay: '1280ms', branch: '0.46', tier: 'minor' },
  { x: '62%', y: '34%', len: '16vw', rot: '-38deg', delay: '1360ms', branch: '0.38', tier: 'minor' },
  { x: '74%', y: '30%', len: '13vw', rot: '-8deg', delay: '1440ms', branch: '0.3', tier: 'minor' },
  { x: '26%', y: '48%', len: '12vw', rot: '-104deg', delay: '1520ms', branch: '0.32', tier: 'minor' },
  { x: '38%', y: '66%', len: '13vw', rot: '152deg', delay: '1600ms', branch: '0.34', tier: 'minor' },
  { x: '66%', y: '68%', len: '15vw', rot: '34deg', delay: '1680ms', branch: '0.44', tier: 'minor' },
  { x: '74%', y: '48%', len: '11vw', rot: '104deg', delay: '1760ms', branch: '0.36', tier: 'minor' },
  { x: '18%', y: '58%', len: '9vw', rot: '-126deg', delay: '1840ms', branch: '0.28', tier: 'minor' },
  { x: '52%', y: '18%', len: '10vw', rot: '82deg', delay: '1920ms', branch: '0.26', tier: 'minor' },
  { x: '18%', y: '18%', len: '10vw', rot: '-92deg', delay: '1380ms', branch: '0.22', tier: 'minor' },
  { x: '82%', y: '20%', len: '9vw', rot: '18deg', delay: '1460ms', branch: '0.28', tier: 'minor' },
  { x: '10%', y: '42%', len: '11vw', rot: '-154deg', delay: '1540ms', branch: '0.24', tier: 'minor' },
  { x: '88%', y: '42%', len: '10vw', rot: '154deg', delay: '1620ms', branch: '0.24', tier: 'minor' },
  { x: '22%', y: '78%', len: '10vw', rot: '136deg', delay: '1700ms', branch: '0.3', tier: 'minor' },
  { x: '78%', y: '80%', len: '9vw', rot: '34deg', delay: '1780ms', branch: '0.32', tier: 'minor' },
  { x: '20%', y: '28%', len: '8vw', rot: '-158deg', delay: '2280ms', branch: '0.3', tier: 'micro' },
  { x: '28%', y: '30%', len: '9vw', rot: '-164deg', delay: '2340ms', branch: '0.36', tier: 'micro' },
  { x: '44%', y: '22%', len: '7vw', rot: '-94deg', delay: '2400ms', branch: '0.24', tier: 'micro' },
  { x: '60%', y: '24%', len: '7vw', rot: '-24deg', delay: '2460ms', branch: '0.3', tier: 'micro' },
  { x: '72%', y: '28%', len: '8vw', rot: '-8deg', delay: '2520ms', branch: '0.42', tier: 'micro' },
  { x: '82%', y: '36%', len: '6vw', rot: '26deg', delay: '2580ms', branch: '0.26', tier: 'micro' },
  { x: '16%', y: '52%', len: '7vw', rot: '-136deg', delay: '2640ms', branch: '0.28', tier: 'micro' },
  { x: '46%', y: '42%', len: '6vw', rot: '88deg', delay: '2700ms', branch: '0.3', tier: 'micro' },
  { x: '58%', y: '62%', len: '7vw', rot: '146deg', delay: '2760ms', branch: '0.26', tier: 'micro' },
  { x: '74%', y: '74%', len: '9vw', rot: '18deg', delay: '2820ms', branch: '0.4', tier: 'micro' },
  { x: '30%', y: '76%', len: '8vw', rot: '164deg', delay: '2880ms', branch: '0.3', tier: 'micro' },
  { x: '84%', y: '58%', len: '6vw', rot: '28deg', delay: '2940ms', branch: '0.34', tier: 'micro' },
  { x: '12%', y: '14%', len: '6vw', rot: '-110deg', delay: '2360ms', branch: '0.18', tier: 'micro' },
  { x: '34%', y: '12%', len: '5vw', rot: '-72deg', delay: '2420ms', branch: '0.18', tier: 'micro' },
  { x: '66%', y: '12%', len: '5vw', rot: '72deg', delay: '2480ms', branch: '0.18', tier: 'micro' },
  { x: '88%', y: '16%', len: '6vw', rot: '110deg', delay: '2540ms', branch: '0.2', tier: 'micro' },
  { x: '8%', y: '68%', len: '6vw', rot: '-144deg', delay: '2600ms', branch: '0.22', tier: 'micro' },
  { x: '92%', y: '66%', len: '6vw', rot: '144deg', delay: '2660ms', branch: '0.22', tier: 'micro' },
];

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const createMessage = (role: ChatMessage['role'], content: string, mode: ChatMode, sources?: ChatMessage['sources']): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
  mode,
  createdAt: new Date().toISOString(),
  sources,
});

const sortReminders = (items: Reminder[]) =>
  items.slice().sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));

const buildPlantRobotOverride = (plantName: string, analysis: AnalysisResult): RobotOverride => {
  const displayName = analysis.commonName || analysis.species || plantName;
  const health = analysis.health;
  const firstAdvice = analysis.advice[0]?.title || analysis.advice[0]?.description;
  const diseaseName = analysis.disease?.name;

  if (health === 'Healthy') {
    return {
      title: 'Fresh Analysis',
      text: `Nice, you analyzed ${displayName}. It looks ${health.toLowerCase()} right now, which is a strong sign your care is working.`,
      footer: 'Keep the routine steady and watch for new growth.',
      mood: 'excited',
    };
  }

  if (health === 'Stressed' || health === 'Unhealthy') {
    const issue = diseaseName ? `${health.toLowerCase()} with signs of ${diseaseName}` : health.toLowerCase();
    return {
      title: 'Care Check',
      text: `I see you added ${displayName}, but it seems ${issue}. ${firstAdvice ? `You can ${firstAdvice.toLowerCase()}.` : 'A gentle care adjustment now could help a lot.'}`,
      footer: analysis.disease?.recommendations?.[0] || 'Start with the most urgent stress signal first.',
      mood: 'sad',
    };
  }

  return {
    title: 'New Plant Scan',
    text: `You analyzed ${displayName}. I have the result saved, and we can keep tracking changes from here.`,
    footer: firstAdvice || 'More snapshots will make the pattern clearer over time.',
    mood: 'curious',
  };
};

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [chatPlantId, setChatPlantId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [robotOverride, setRobotOverride] = useState<RobotOverride | null>(null);
  const [equippedTitles, setEquippedTitles] = useLocalStorage<Record<string, string>>('plant-guart-equipped-titles', {});
  const [screenTransition, setScreenTransition] = useState<{
    mode: ScreenTransitionMode;
    phase: TransitionPhase;
  } | null>(null);
  const [pendingPlantCollapse, setPendingPlantCollapse] = useState<PendingPlantCollapse | null>(null);
  const prefetchedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!robotOverride) return undefined;
    const timer = window.setTimeout(() => setRobotOverride(null), 9000);
    return () => window.clearTimeout(timer);
  }, [robotOverride]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setPlants([]);
      setReminders([]);
      setStorageUsage(null);
      setIsBootstrapping(false);
      return;
    }

    if (prefetchedTokenRef.current === token && user) {
      prefetchedTokenRef.current = null;
      setIsBootstrapping(false);
      return;
    }

    const bootstrap = async () => {
      setIsBootstrapping(true);
      setError(null);

      try {
        const [nextUser, nextPlants, nextReminders, nextStorageUsage] = await Promise.all([
          getCurrentUser(token),
          getPlants(token),
          getReminders(token),
          getStorageUsage(token),
        ]);
        setUser(nextUser);
        setPlants(nextPlants);
        setReminders(sortReminders(nextReminders));
        setStorageUsage(nextStorageUsage);
      } catch (bootstrapError) {
        console.error(bootstrapError);
        setToken(null);
        setUser(null);
        setPlants([]);
        setReminders([]);
        setStorageUsage(null);
        setError(bootstrapError instanceof Error ? bootstrapError.message : 'Unable to restore your session.');
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, [token, setToken]);

  useEffect(() => {
    if (!token || !user) return;

    const loadHistory = async () => {
      try {
        const messages = await getChatHistory(token, chatPlantId);
        setChatMessages(
          messages.length
            ? messages
            : [
                createMessage(
                  'assistant',
                  chatPlantId
                    ? 'This plant has its own conversation history. Ask about changes, care, disease, or compare snapshots.'
                    : 'This is your global assistant. I can use everything across your saved plants, plus casual chat or web mode.',
                  'plant'
                ),
              ]
        );
      } catch (historyError) {
        console.error(historyError);
        setError(historyError instanceof Error ? historyError.message : 'Unable to load chat history.');
      }
    };

    loadHistory();
  }, [chatPlantId, token, user]);

  useEffect(() => {
    if (!pendingPlantCollapse || pendingPlantCollapse.phase !== 'waiting') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentPage('home');
      setSelectedPlantId(null);
      setPendingPlantCollapse((current) =>
        current && current.phase === 'waiting'
          ? { ...current, phase: 'shattering' }
          : current
      );
    }, PLANT_COLLAPSE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [pendingPlantCollapse]);

  useEffect(() => {
    if (!pendingPlantCollapse || pendingPlantCollapse.phase !== 'shattering') {
      return;
    }

    const doomedPlantId = pendingPlantCollapse.plant.id;
    const timeoutId = window.setTimeout(() => {
      setPlants((currentPlants) => currentPlants.filter((plant) => plant.id !== doomedPlantId));
      setPendingPlantCollapse((current) => (current?.plant.id === doomedPlantId ? null : current));
      setSelectedPlantId((current) => (current === doomedPlantId ? null : current));
    }, PLANT_SHATTER_MS);

    return () => window.clearTimeout(timeoutId);
  }, [pendingPlantCollapse]);

  const selectedPlant = useMemo(
    () => plants.find((plant) => plant.id === selectedPlantId) || null,
    [plants, selectedPlantId]
  );
  const dueReminderCount = useMemo(
    () =>
      reminders.filter((reminder) => !reminder.completedAt && new Date(reminder.dueAt).getTime() <= Date.now()).length,
    [reminders]
  );
  const achievementSummary = useMemo(() => getAchievementSummary(plants, reminders), [plants, reminders]);
  const equippedTitle = user ? equippedTitles[user.id] || 'Grower' : 'Grower';

  const refreshMeta = async (nextToken: string) => {
    const [nextPlants, nextReminders, nextStorageUsage] = await Promise.all([
      getPlants(nextToken),
      getReminders(nextToken),
      getStorageUsage(nextToken),
    ]);
    setPlants(nextPlants);
    setReminders(sortReminders(nextReminders));
    setStorageUsage(nextStorageUsage);
  };

  const handleAuth = async (payload: { name?: string; username: string; password: string }) => {
    setIsWorking(true);
    setError(null);
    setScreenTransition({ mode: 'auth-to-app', phase: 'fadeout' });

    try {
      const authRequest =
        authMode === 'register'
          ? register({
              name: payload.name || '',
              username: payload.username,
              password: payload.password,
            })
          : login({
              username: payload.username,
              password: payload.password,
            });

      const authResponse = await authRequest;
      await Promise.all([wait(TRANSITION_FADE_MS), refreshMeta(authResponse.token)]);
      setUser(authResponse.user);
      setScreenTransition({ mode: 'auth-to-app', phase: 'forge' });
      await wait(TRANSITION_SWAP_MS);
      prefetchedTokenRef.current = authResponse.token;
      setToken(authResponse.token);
      setCurrentPage('home');
      await wait(TRANSITION_FORGE_MS - TRANSITION_SWAP_MS);
      setScreenTransition({ mode: 'auth-to-app', phase: 'settle' });
      await wait(TRANSITION_SETTLE_MS);
      setScreenTransition(null);
    } catch (authError) {
      console.error(authError);
      setScreenTransition(null);
      setError(authError instanceof Error ? authError.message : 'Authentication failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleAddPlant = async (payload: { name: string; imageDataUrl: string }) => {
    if (!token) return;

    setIsWorking(true);
    setError(null);
    try {
      const plant = await createPlant(token, payload);
      setPlants((currentPlants) => [plant, ...currentPlants]);
      setStorageUsage(await getStorageUsage(token));
      if (plant.snapshots[0]) {
        setRobotOverride(buildPlantRobotOverride(plant.name, plant.snapshots[0].analysis));
      }
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Unable to save plant.');
      throw saveError;
    } finally {
      setIsWorking(false);
    }
  };

  const handleSelectPlant = (plantId: string) => {
    setSelectedPlantId(plantId);
    setCurrentPage('detail');
  };

  const handleUpdatePlant = async (plantId: string, imageDataUrl: string) => {
    if (!token) return;

    setIsWorking(true);
    setError(null);
    try {
      const snapshot = await addSnapshot(token, plantId, imageDataUrl);
      const plantName = plants.find((plant) => plant.id === plantId)?.name || 'this plant';
      setPlants((currentPlants) =>
        currentPlants.map((plant) =>
          plant.id === plantId ? { ...plant, snapshots: [...plant.snapshots, snapshot] } : plant
        )
      );
      setStorageUsage(await getStorageUsage(token));
      setSelectedPlantId(plantId);
      setRobotOverride(buildPlantRobotOverride(plantName, snapshot.analysis));
    } catch (updateError) {
      console.error(updateError);
      setError(updateError instanceof Error ? updateError.message : 'Unable to add snapshot.');
      throw updateError;
    } finally {
      setIsWorking(false);
    }
  };

  const handleUpdatePlantName = async (plantId: string, newName: string) => {
    if (!token) return;
    const updated = await renamePlant(token, plantId, newName);
    setPlants((currentPlants) =>
      currentPlants.map((plant) => (plant.id === plantId ? { ...plant, name: updated.name } : plant))
    );
  };

  const handleDeleteSnapshot = async (plantId: string, snapshotId: string) => {
    if (!token) return;

    const doomedPlant = plants.find((plant) => plant.id === plantId) || null;
    const isFinalSnapshot = doomedPlant?.snapshots.length === 1;

    await deleteSnapshot(token, plantId, snapshotId);

    if (isFinalSnapshot && doomedPlant) {
      setSelectedPlantId(null);
      setCurrentPage('home');
      setPendingPlantCollapse({ plant: doomedPlant, phase: 'waiting' });
    } else {
      setPlants((currentPlants) =>
        currentPlants
          .map((plant) =>
            plant.id === plantId
              ? { ...plant, snapshots: plant.snapshots.filter((snapshot) => snapshot.id !== snapshotId) }
              : plant
          )
          .filter((plant) => plant.snapshots.length > 0)
      );
    }

    setStorageUsage(await getStorageUsage(token));
  };

  const handleUpdateFeedback = async (
    plantId: string,
    snapshotId: string,
    feedback: { rating: 'correct' | 'incorrect'; comment?: string }
  ) => {
    if (!token) return;

    const updatedSnapshot = await saveFeedback(token, plantId, snapshotId, feedback);
    setPlants((currentPlants) =>
      currentPlants.map((plant) => ({
        ...plant,
        snapshots: plant.snapshots.map((snapshot) =>
          snapshot.id === snapshotId ? { ...snapshot, analysis: updatedSnapshot.analysis } : snapshot
        ),
      }))
    );
  };

  const handleSendChat = async (question: string, mode: ChatMode, plantId: string | null) => {
    if (!token) return;

    setIsWorking(true);
    setError(null);

    try {
      const response = await sendChat(token, {
        question,
        mode,
        plantId,
        history: chatMessages,
      });

      setChatMessages((currentMessages) => [...currentMessages, ...response.messages]);
    } catch (chatError) {
      console.error(chatError);
      const message = chatError instanceof Error ? chatError.message : 'Unable to answer chat request.';
      setError(message);
      setChatMessages((currentMessages) => [
        ...currentMessages,
        createMessage('assistant', `I hit an error: ${message}`, mode),
      ]);
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreateReminder = async (payload: { plantId: string | null; title: string; notes?: string; dueAt: string; recurrence: ReminderRecurrence }) => {
    if (!token) return;
    setIsWorking(true);
    try {
      const reminder = await createReminder(token, payload);
      setReminders((current) => sortReminders([...current, reminder]));
    } finally {
      setIsWorking(false);
    }
  };

  const handleUpdateReminder = async (reminderId: string, payload: { plantId: string | null; title: string; notes?: string; dueAt: string; recurrence: ReminderRecurrence }) => {
    if (!token) return;
    setIsWorking(true);
    try {
      const reminder = await updateReminder(token, reminderId, payload);
      setReminders((current) => sortReminders(current.map((item) => item.id === reminderId ? reminder : item)));
    } finally {
      setIsWorking(false);
    }
  };

  const handleCompleteReminder = async (reminderId: string) => {
    if (!token) return;
    setIsWorking(true);
    try {
      const reminder = await completeReminder(token, reminderId);
      setReminders((current) => sortReminders(current.map((item) => item.id === reminderId ? reminder : item)));
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!token) return;
    setIsWorking(true);
    try {
      await deleteReminder(token, reminderId);
      setReminders((current) => current.filter((item) => item.id !== reminderId));
    } finally {
      setIsWorking(false);
    }
  };

  const navigateHome = () => {
    setSelectedPlantId(null);
    setCurrentPage('home');
  };

  const openChat = (plantId: string | null = null) => {
    setChatPlantId(plantId);
    setCurrentPage('chat');
  };

  const handleLogout = () => {
    const run = async () => {
      setScreenTransition({ mode: 'app-to-auth', phase: 'fadeout' });
      await wait(TRANSITION_FADE_MS);
      setScreenTransition({ mode: 'app-to-auth', phase: 'forge' });
      await wait(TRANSITION_SWAP_MS);
      setToken(null);
      setUser(null);
      setPlants([]);
      setReminders([]);
      setStorageUsage(null);
      setCurrentPage('home');
      setSelectedPlantId(null);
      setChatPlantId(null);
      setChatMessages([]);
      await wait(TRANSITION_FORGE_MS - TRANSITION_SWAP_MS);
      setScreenTransition({ mode: 'app-to-auth', phase: 'settle' });
      await wait(TRANSITION_SETTLE_MS);
      setScreenTransition(null);
    };

    void run();
  };

  const handleEquipTitle = (title: string) => {
    if (!user) return;
    setEquippedTitles((current) => ({
      ...current,
      [user.id]: title,
    }));
  };

  const handleUpdateDisplayName = async (name: string) => {
    if (!token) return;
    const updatedUser = await updateCurrentUser(token, { name });
    setUser(updatedUser);
  };

  const homeProps = {
    plants,
    pendingPlantCollapse,
    reminders,
    storageUsage,
    dueReminderCount,
    userName: user?.name || 'Grower',
    onAddPlant: () => setCurrentPage('add'),
    onSelectPlant: handleSelectPlant,
    onOpenChat: () => openChat(null),
    onOpenCalendar: () => setCurrentPage('calendar'),
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage {...homeProps} />;
      case 'add':
        return <AddPlantPage onSave={handleAddPlant} onCancel={navigateHome} onSaved={navigateHome} isSaving={isWorking} />;
      case 'detail':
        return selectedPlant ? (
          <DetailPage
            plant={selectedPlant}
            onBack={navigateHome}
            onOpenChat={() => openChat(selectedPlant.id)}
            onUpdate={handleUpdatePlant}
            onUpdateFeedback={handleUpdateFeedback}
            onUpdatePlantName={handleUpdatePlantName}
            onDeleteSnapshot={handleDeleteSnapshot}
            isWorking={isWorking}
          />
        ) : (
          <HomePage {...homeProps} />
        );
      case 'chat':
        return (
          <ChatPage
            plants={plants}
            messages={chatMessages}
            selectedPlantId={chatPlantId}
            onChangePlant={setChatPlantId}
            onBack={navigateHome}
            onSend={handleSendChat}
            isWorking={isWorking}
          />
        );
      case 'calendar':
        return (
          <CalendarPage
            plants={plants}
            reminders={reminders}
            onBack={navigateHome}
            onCreateReminder={handleCreateReminder}
            onUpdateReminder={handleUpdateReminder}
            onCompleteReminder={handleCompleteReminder}
            onDeleteReminder={handleDeleteReminder}
            isWorking={isWorking}
          />
        );
      case 'achievements':
        return (
          <AchievementsPage
            summary={achievementSummary}
            equippedTitle={equippedTitle}
            onEquipTitle={handleEquipTitle}
            onBack={navigateHome}
          />
        );
      case 'profile':
        return user ? (
          <ProfilePage
            user={user}
            plants={plants}
            reminders={reminders}
            storageUsage={storageUsage}
            achievementSummary={achievementSummary}
            equippedTitle={equippedTitle}
            onBack={navigateHome}
            onEquipTitle={handleEquipTitle}
            onUpdateDisplayName={handleUpdateDisplayName}
          />
        ) : null;
      default:
        return null;
    }
  };

  const renderSurface = (surface: SurfaceKind) => {
    if (surface === 'boot') {
      return (
        <div className="app-shell flex min-h-screen items-center justify-center px-6">
          <div className="glass-panel rounded-[2rem] px-8 py-10 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary/25 border-t-primary" />
            <p className="mt-4 text-sm uppercase tracking-[0.3em] text-primary">Booting Plant Guard</p>
          </div>
        </div>
      );
    }

    if (surface === 'auth') {
      return (
        <AuthPage
          mode={authMode}
          onModeChange={setAuthMode}
          onSubmit={handleAuth}
          onGuestAnalyze={guestAnalyze}
          isWorking={isWorking}
          error={error}
        />
      );
    }

    if (!user) {
      return null;
    }

    return (
      <div className="app-shell font-sans text-slate-100">
        <Header
          currentPage={currentPage}
          user={user}
          equippedTitle={equippedTitle}
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
          activeReminderCount={dueReminderCount}
        />
        {error && (
          <div className="mx-auto mt-6 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-panel rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              <p className="font-semibold">Something needs attention</p>
              <p className="mt-1 text-rose-100/90">{error}</p>
            </div>
          </div>
        )}
        <main className="pb-16">{renderPage()}</main>
        {currentPage === 'home' && pendingPlantCollapse?.phase === 'shattering' ? (
          <PlantShatterSequence
            imageUrl={pendingPlantCollapse.plant.snapshots[pendingPlantCollapse.plant.snapshots.length - 1]?.imageUrl || ''}
            plantName={pendingPlantCollapse.plant.name}
          />
        ) : null}
        {currentPage === 'home' ? (
          <PlantFactRobot
            title={robotOverride?.title}
            text={robotOverride?.text}
            footer={robotOverride?.footer}
            moodOverride={robotOverride?.mood}
          />
        ) : null}
      </div>
    );
  };

  const currentSurface: SurfaceKind = isBootstrapping ? 'boot' : !token || !user ? 'auth' : 'app';

  return (
    <div
      className={`page-transition-shell ${screenTransition ? 'page-transition-shell-active' : ''}`}
      style={
        {
          ['--page-fade-ms' as string]: `${TRANSITION_FADE_MS}ms`,
          ['--page-forge-ms' as string]: `${TRANSITION_FORGE_MS}ms`,
          ['--page-settle-ms' as string]: `${TRANSITION_SETTLE_MS}ms`,
        } as React.CSSProperties
      }
    >
      <div
        className={`page-transition-surface ${
          screenTransition
            ? `page-transition-surface-active page-transition-surface-${screenTransition.phase}`
            : ''
        }`}
      >
        {renderSurface(currentSurface)}
      </div>
      {screenTransition ? (
        <div className={`page-shatter-transition page-shatter-${screenTransition.mode} page-shatter-${screenTransition.phase}`} aria-hidden="true">
          {screenTransition.phase === 'forge' ? (
            <>
              <div className="page-shatter-backdrop" />
              <div className="page-shatter-afterglow" />
              <div className="page-shatter-aura" />
              <div className="page-shatter-spectrum" />
              <div className="page-shatter-speedlines" />
              <div className="page-shatter-ribbons" />
              <div className="page-shatter-sigil" />
              <div className="page-shatter-shockwave" />
              <div className="page-shatter-cracks">
                {transitionCracks.map((crack, index) => (
                  <div
                    key={`${screenTransition.mode}-crack-${index}`}
                    className={`page-shatter-crack page-shatter-crack-${crack.tier}`}
                    style={{
                      ['--crack-x' as string]: crack.x,
                      ['--crack-y' as string]: crack.y,
                      ['--crack-len' as string]: crack.len,
                      ['--crack-rot' as string]: crack.rot,
                      ['--crack-delay' as string]: crack.delay,
                      ['--crack-branch' as string]: crack.branch,
                    }}
                  />
                ))}
              </div>
              {transitionPieces.map((piece, index) => (
                <div
                  key={`${screenTransition.mode}-${screenTransition.phase}-${index}`}
                  className={`page-shatter-piece page-shatter-piece-${piece.tier}`}
                  style={{
                    ['--piece-x' as string]: piece.x,
                    ['--piece-y' as string]: piece.y,
                    ['--piece-w' as string]: piece.w,
                    ['--piece-h' as string]: piece.h,
                    ['--piece-tx' as string]: piece.tx,
                    ['--piece-ty' as string]: piece.ty,
                    ['--piece-r' as string]: piece.r,
                    ['--piece-delay' as string]: piece.d,
                    ['--piece-clip' as string]: piece.clip,
                  }}
                >
                  <div className="page-shatter-piece-core" />
                </div>
              ))}
              <div className="page-shatter-flash" />
              <div className="page-shatter-core" />
              <div className="page-shatter-quake" />
              <div className="page-shatter-pop" />
              <div className="page-shatter-prism" />
              <div className="page-shatter-finisher-ring" />
              <div className="page-shatter-finale-flare" />
              <div className="page-shatter-finale-burst" />
              <div className="page-shatter-finale-rings" />
              <div className="page-shatter-finale-stars" />
              <div className="page-shatter-whiteout" />
              <div className="page-shatter-resolve" />
            </>
          ) : screenTransition.phase === 'settle' ? (
            <>
              <div className="page-settle-wash" />
              <div className="page-settle-bloom" />
              <div className="page-settle-sheen" />
            </>
          ) : (
            <div className="page-fadeout-curtain" />
          )}
        </div>
      ) : null}
    </div>
  );
}

export default App;
