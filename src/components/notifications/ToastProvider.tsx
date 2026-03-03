'use client';

import { createContext, useContext, useCallback, ReactNode } from 'react';
import { sileo, Toaster } from 'sileo';
import 'sileo/styles.css';

interface ToastAction {
  content: string;
  onAction: () => void;
}

interface ToastContextType {
  showToast: (message: { content: string; error?: boolean; duration?: number; action?: ToastAction }) => void;
  showSuccess: (content: string, action?: ToastAction) => void;
  showError: (content: string) => void;
  showInfo: (content: string) => void;
  showWarning: (content: string) => void;
  showLoading: (content: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const showToast = useCallback((message: { content: string; error?: boolean; duration?: number; action?: ToastAction }) => {
    const opts = {
      title: message.content,
      duration: message.duration ?? 3000,
      ...(message.action ? { button: { title: message.action.content, onClick: message.action.onAction } } : {}),
    };
    if (message.error) {
      sileo.error(opts);
    } else {
      sileo.success(opts);
    }
  }, []);

  const showSuccess = useCallback((content: string, action?: ToastAction) => {
    sileo.success({
      title: content,
      duration: 3000,
      ...(action ? { button: { title: action.content, onClick: action.onAction } } : {}),
    });
  }, []);

  const showError = useCallback((content: string) => {
    sileo.error({ title: content, duration: 5000 });
  }, []);

  const showInfo = useCallback((content: string) => {
    sileo.info({ title: content, duration: 4000 });
  }, []);

  const showWarning = useCallback((content: string) => {
    sileo.warning({ title: content, duration: 4000 });
  }, []);

  const showLoading = useCallback((content: string) => {
    sileo.show({ title: content, type: 'loading', duration: null });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning, showLoading }}>
      <Toaster position="bottom-right" theme="light" />
      {children}
    </ToastContext.Provider>
  );
}

