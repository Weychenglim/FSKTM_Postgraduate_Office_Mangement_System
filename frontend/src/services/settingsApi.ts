import type { DemoUser } from '../types';
import { clearAuthToken, getAuthSessionVersion, request } from './apiClient';

export interface NotificationPreferences { announcementAlerts: boolean }
export interface AccountSettings {
  user: DemoUser;
  preferences: NotificationPreferences;
  capabilities: { emailNotifications: boolean; deadlineReminders: boolean; weeklySummary: boolean };
}

export const getSettings = () => request<AccountSettings>('/auth/settings/');
export const saveContact = (phone: string) => request<AccountSettings>('/auth/settings/', {
  method: 'PATCH', body: JSON.stringify({ phone }),
});
export const savePreferences = (preferences: NotificationPreferences) => request<AccountSettings>('/auth/settings/', {
  method: 'PATCH', body: JSON.stringify({ preferences }),
});
export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  const sessionVersion = getAuthSessionVersion();
  await request('/auth/settings/password/', {
    method: 'POST', body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (getAuthSessionVersion() !== sessionVersion) return false;
  clearAuthToken();
  return true;
}
