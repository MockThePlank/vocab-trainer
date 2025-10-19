import { ToastType } from '../types';

/**
 * Shows a toast notification message
 * @param message - Message to display
 * @param type - Type of toast (success, error, info)
 */
export function showToast(message: string, type: ToastType = 'info'): void {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 300);
  }, 3000);
}
