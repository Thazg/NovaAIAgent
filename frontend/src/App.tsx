import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Toaster } from './components/ui/sonner';
import { StartupScreen } from './components/layout/StartupScreen';
import { UploadGate } from './components/layout/UploadGate';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [gatePassed, setGatePassed] = useState(false);

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
