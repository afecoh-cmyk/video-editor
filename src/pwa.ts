import { Platform } from 'react-native';

type InstallPrompt = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: InstallPrompt | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallPrompt(): InstallPrompt | null {
  return deferredPrompt;
}

export function clearInstallPrompt() {
  deferredPrompt = null;
  notify();
}

export function isStandaloneApp(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const media = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const ios = 'standalone' in window.navigator && Boolean((window.navigator as { standalone?: boolean }).standalone);
  return Boolean(media || ios);
}

export function isIosWeb(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function registerWebApp() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as unknown as InstallPrompt;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register(withWebBase('/sw.js'));
    });
  }
}

function webBasePath(): string {
  return (process.env.EXPO_PUBLIC_WEB_BASE_PATH || '').replace(/\/$/, '');
}

function withWebBase(path: string): string {
  const rel = path.startsWith('/') ? path : `/${path}`;
  return `${webBasePath()}${rel}`;
}

export function currentAppUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${webBasePath()}`;
}
