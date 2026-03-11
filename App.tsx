import { useEffect, useMemo, useState } from 'react';
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
  updateReminder,
} from './services/api';
import { ChatMessage, ChatMode, Plant, Reminder, ReminderRecurrence, StorageUsage, User } from './types';
import Header from './components/Header';
import HomePage from './components/HomePage';
import AddPlantPage from './components/AddPlantPage';
import DetailPage from './components/DetailPage';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage';
import CalendarPage from './components/CalendarPage';
import PlantFactRobot from './components/PlantFactRobot';

type Page = 'home' | 'add' | 'detail' | 'chat' | 'calendar';
type AuthMode = 'login' | 'register';

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

  useEffect(() => {
    if (!token) {
      setUser(null);
      setPlants([]);
      setReminders([]);
      setStorageUsage(null);
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

  const selectedPlant = useMemo(
    () => plants.find((plant) => plant.id === selectedPlantId) || null,
    [plants, selectedPlantId]
  );
  const dueReminderCount = useMemo(
    () =>
      reminders.filter((reminder) => !reminder.completedAt && new Date(reminder.dueAt).getTime() <= Date.now()).length,
    [reminders]
  );

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

    try {
      const authResponse =
        authMode === 'register'
          ? await register({
              name: payload.name || '',
              username: payload.username,
              password: payload.password,
            })
          : await login({
              username: payload.username,
              password: payload.password,
            });

      setToken(authResponse.token);
      setUser(authResponse.user);
      await refreshMeta(authResponse.token);
      setCurrentPage('home');
    } catch (authError) {
      console.error(authError);
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
      setCurrentPage('home');
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
      setPlants((currentPlants) =>
        currentPlants.map((plant) =>
          plant.id === plantId ? { ...plant, snapshots: [...plant.snapshots, snapshot] } : plant
        )
      );
      setStorageUsage(await getStorageUsage(token));
      setSelectedPlantId(plantId);
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

    await deleteSnapshot(token, plantId, snapshotId);
    setPlants((currentPlants) =>
      currentPlants
        .map((plant) =>
          plant.id === plantId
            ? { ...plant, snapshots: plant.snapshots.filter((snapshot) => snapshot.id !== snapshotId) }
            : plant
        )
        .filter((plant) => plant.snapshots.length > 0)
    );
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
    setToken(null);
    setUser(null);
    setPlants([]);
    setReminders([]);
    setStorageUsage(null);
    setCurrentPage('home');
    setSelectedPlantId(null);
    setChatPlantId(null);
    setChatMessages([]);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            plants={plants}
            reminders={reminders}
            storageUsage={storageUsage}
            dueReminderCount={dueReminderCount}
            userName={user?.name || 'Grower'}
            onAddPlant={() => setCurrentPage('add')}
            onSelectPlant={handleSelectPlant}
            onOpenChat={() => openChat(null)}
            onOpenCalendar={() => setCurrentPage('calendar')}
          />
        );
      case 'add':
        return <AddPlantPage onSave={handleAddPlant} onCancel={navigateHome} isSaving={isWorking} />;
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
        ) : null;
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
      default:
        return null;
    }
  };

  if (isBootstrapping) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-6">
        <div className="glass-panel rounded-[2rem] px-8 py-10 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary/25 border-t-primary" />
          <p className="mt-4 text-sm uppercase tracking-[0.3em] text-primary">Booting Plant Monitor V5</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
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

  return (
    <div className="app-shell font-sans text-text-primary">
      <Header
        currentPage={currentPage}
        user={user}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        activeReminderCount={dueReminderCount}
      />
      {error && (
        <div className="mx-auto mt-6 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="glass-panel rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        </div>
      )}
      <main className="pb-16">{renderPage()}</main>
      <PlantFactRobot />
    </div>
  );
}

export default App;
