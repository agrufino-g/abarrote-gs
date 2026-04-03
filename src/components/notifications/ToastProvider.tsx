'use client';

import { createContext, useContext, useCallback, ReactNode } from 'react';
import { sileo, Toaster } from 'sileo';
import 'sileo/styles.css';

interface ToastMessage {
  title: string;
  description?: string;
}

type ToastContent = string | ToastMessage;

interface ToastAction {
  content: string;
  onAction: () => void;
}

interface ToastContextType {
  showToast: (message: { content: string; description?: string; error?: boolean; duration?: number; action?: ToastAction }) => void;
  showSuccess: (content: ToastContent, action?: ToastAction) => void;
  showError: (content: ToastContent) => void;
  showInfo: (content: ToastContent) => void;
  showWarning: (content: ToastContent) => void;
  showLoading: (content: ToastContent) => void;
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
  const resolveContent = (tc: ToastContent) => 
    typeof tc === 'string' ? { title: tc } : { title: tc.title, description: tc.description };

  const showToast = useCallback((message: { content: string; description?: string; error?: boolean; duration?: number; action?: ToastAction }) => {
    const opts = {
      title: message.content,
      description: message.description,
      duration: message.duration ?? 3000,
      ...(message.action ? { button: { title: message.action.content, onClick: message.action.onAction } } : {}),
    };
    if (message.error) {
      sileo.error(opts);
    } else {
      sileo.success(opts);
    }
  }, []);

  const showSuccess = useCallback((content: ToastContent, action?: ToastAction) => {
    sileo.success({
      ...resolveContent(content),
      duration: 3000,
      ...(action ? { button: { title: action.content, onClick: action.onAction } } : {}),
    });
  }, []);

  const showError = useCallback((content: ToastContent) => {
    sileo.error({ ...resolveContent(content), duration: 6000 });
  }, []);

  const showInfo = useCallback((content: ToastContent) => {
    sileo.info({ ...resolveContent(content), duration: 4000 });
  }, []);

  const showWarning = useCallback((content: ToastContent) => {
    sileo.warning({ ...resolveContent(content), duration: 5000 });
  }, []);

  const showLoading = useCallback((content: ToastContent) => {
    // Sileo's loading doesn't explicitly support description well, but we pass it anyway just in case
    sileo.show({ ...resolveContent(content), type: 'loading', duration: null });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning, showLoading }}>
      <Toaster position="bottom-right" theme="light" />
      {children}
    </ToastContext.Provider>
  );
}

