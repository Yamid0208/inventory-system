export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastNotification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  timestamp: number;
}
