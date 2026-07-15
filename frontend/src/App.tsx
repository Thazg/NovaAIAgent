import { useState } from 'react';
import { useChatStore } from './store/useChatStore';
import { Layout } from './components/layout/Layout';
import { Toaster } from './components/ui/sonner';
import { StartupScreen } from './components/layout/StartupScreen';
import { UploadGate } from './components/layout/UploadGate';
import { LoginScreen } from './components/auth/LoginScreen';

function App() {
  const token = useChatStore((s) => s.token);
  const [isReady, setIsReady] = useState(false);
  const [gatePassed, setGatePassed] = useState(false);

  if (!token) {
    return (
      <>
        <LoginScreen />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <>
      {!isReady && <StartupScreen onReady={() => setIsReady(true)} />}
      {isReady && !gatePassed && <UploadGate onContinue={() => setGatePassed(true)} />}
      {gatePassed && <Layout />}
      <Toaster position="top-center" />
    </>
  );
}

export default App;
