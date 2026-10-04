import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

// localStorageからクライアントIDを取得（未設定時はダミーID）
const savedClientId = localStorage.getItem('GOOGLE_CLIENT_ID') || 'dummy-client-id.apps.googleusercontent.com';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={savedClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);