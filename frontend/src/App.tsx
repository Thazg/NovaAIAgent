import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Toaster } from './components/ui/sonner';
import { StartupScreen } from './components/layout/StartupScreen';

function App() {
  const [isReady, setIsReady] = useState(false);

  return (
    <>
      {!isReady && <StartupScreen onReady={() => setIsReady(true)} />}
      <Layout />
      <Toaster position="top-center" />
    </>
  );
}

export default App;
