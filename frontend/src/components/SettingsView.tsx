/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Settings module — account profile, contact details, password, and
 * notification preferences. Role-aware (labels adapt for Student vs staff).
 *
 * The forms are wired to local state with success toasts, matching the app's
 * current mock-first convention; the contact/password/preference writes still
 * need backend endpoints before they persist (see the data-services layer).
 */
import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  Hash,
  ShieldCheck,
  Bell,
  Save,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { DemoUser } from '../types';
import { FormInput } from './FormInput';
import { ToggleSwitch } from './ToggleSwitch';
import {
  PageHeader,
  PortalCard,
  PortalButton,
  StatusBadge,
  PortalToast,
} from './PortalPrimitives';

interface SettingsViewProps {
  currentUser: DemoUser;
  onLogout: () => void;
}

type Toast = { message: string; tone: 'success' | 'danger' | 'info' } | null;

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onLogout }) => {
  const isStudent = currentUser.role === 'Student';
  const idValue = currentUser.studentId || currentUser.staffId || '—';
  const idLabel = isStudent ? 'Matric No' : 'Staff No';
  const deptLabel = isStudent ? 'Programme' : 'Department';

  const initials =
    currentUser.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'FS';

  // ── Toast (auto-dismiss) ───────────────────────────────────────────────────
  const [toast, setToast] = useState<Toast>(null);
  const showToast = (message: string, tone: 'success' | 'danger' | 'info' = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  // ── Contact details ────────────────────────────────────────────────────────
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState('');

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Email cannot be empty.', 'danger');
      return;
    }
    showToast('Contact details updated.');
  };

  // ── Password ───────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwErrors, setPwErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof pwErrors = {};
    if (!currentPassword) errors.current = 'Enter your current password.';
    if (newPassword.length < 8) errors.next = 'Use at least 8 characters.';
    if (confirmPassword !== newPassword) errors.confirm = 'Passwords do not match.';
    setPwErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Password updated successfully.');
  };

  // ── Notification preferences ───────────────────────────────────────────────
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    announcementAlerts: true,
    deadlineReminders: true,
    weeklySummary: false,
  });
  const setPref = (key: keyof typeof prefs) => (value: boolean) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  return (
    <div id="settings-workspace" className="space-y-6 md:space-y-8 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, security, and notification preferences."
        actions={
          <PortalButton variant="danger" size="md" icon={LogOut} onClick={onLogout}>
            Sign Out
          </PortalButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile summary */}
        <PortalCard className="lg:col-span-1 h-fit">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#091124] to-[#1e2c54] flex items-center justify-center text-indigo-200 font-extrabold text-2xl border border-slate-200 shadow-sm">
              {initials}
            </div>
            <h3 className="mt-4 text-base font-extrabold text-brand-navy tracking-tight">
              {currentUser.fullName}
            </h3>
            <div className="mt-2">
              <StatusBadge tone="brand">{currentUser.role}</StatusBadge>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-150 space-y-4">
            <SummaryRow icon={Mail} label="Email" value={currentUser.email} />
            <SummaryRow icon={Hash} label={idLabel} value={idValue} />
            <SummaryRow
              icon={isStudent ? User : Building2}
              label={deptLabel}
              value={currentUser.department || '—'}
            />
          </div>
        </PortalCard>

        {/* Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account & contact */}
          <PortalCard>
            <SectionTitle icon={User} title="Account & Contact" subtitle="Your personal contact information." />
            <form onSubmit={handleSaveContact} className="mt-5">
              <FormInput id="settings-full-name" label="Full Name" value={currentUser.fullName} disabled />
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-4">
                <FormInput
                  id="settings-email"
                  label="Email Address"
                  type="email"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <FormInput
                  id="settings-phone"
                  label="Phone Number"
                  type="tel"
                  icon={Phone}
                  placeholder="e.g. 012-3456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <PortalButton type="submit" variant="primary" size="md" icon={Save}>
                  Save Changes
                </PortalButton>
              </div>
            </form>
          </PortalCard>

          {/* Security */}
          <PortalCard>
            <SectionTitle icon={ShieldCheck} title="Security" subtitle="Update your account password." />
            <form onSubmit={handleSavePassword} className="mt-5">
              <FormInput
                id="settings-current-pw"
                label="Current Password"
                type="password"
                icon={KeyRound}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={pwErrors.current}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-4">
                <FormInput
                  id="settings-new-pw"
                  label="New Password"
                  type="password"
                  icon={KeyRound}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={pwErrors.next}
                />
                <FormInput
                  id="settings-confirm-pw"
                  label="Confirm New Password"
                  type="password"
                  icon={KeyRound}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={pwErrors.confirm}
                />
              </div>
              <div className="flex justify-end">
                <PortalButton type="submit" variant="primary" size="md" icon={Save}>
                  Update Password
                </PortalButton>
              </div>
            </form>
          </PortalCard>

          {/* Notification preferences */}
          <PortalCard>
            <SectionTitle icon={Bell} title="Notification Preferences" subtitle="Choose what you get notified about." />
            <div className="mt-4 divide-y divide-slate-150">
              <PrefRow
                title="Email notifications"
                description="Receive important updates by email."
                checked={prefs.emailNotifications}
                onChange={setPref('emailNotifications')}
                id="pref-email"
              />
              <PrefRow
                title="Announcement alerts"
                description="Be notified when a new announcement is published."
                checked={prefs.announcementAlerts}
                onChange={setPref('announcementAlerts')}
                id="pref-ann"
              />
              <PrefRow
                title="Deadline reminders"
                description="Get reminders before key academic deadlines."
                checked={prefs.deadlineReminders}
                onChange={setPref('deadlineReminders')}
                id="pref-deadline"
              />
              <PrefRow
                title="Weekly summary"
                description="A digest of activity across your modules every week."
                checked={prefs.weeklySummary}
                onChange={setPref('weeklySummary')}
                id="pref-weekly"
              />
            </div>
            <div className="flex justify-end mt-5">
              <PortalButton
                type="button"
                variant="primary"
                size="md"
                icon={Save}
                onClick={() => showToast('Notification preferences saved.')}
              >
                Save Preferences
              </PortalButton>
            </div>
          </PortalCard>
        </div>
      </div>

      {toast && <PortalToast message={toast.message} tone={toast.tone} />}
    </div>
  );
};

// ── Small local helpers ───────────────────────────────────────────────────────

const SummaryRow: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="flex items-start gap-3 text-left">
    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-150 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-slate-400" />
    </div>
    <div className="min-w-0">
      <span className="form-label block">{label}</span>
      <span className="text-xs font-bold text-slate-800 break-words">{value}</span>
    </div>
  </div>
);

const SectionTitle: React.FC<{ icon: React.ElementType; title: string; subtitle: string }> = ({
  icon: Icon,
  title,
  subtitle,
}) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
      <Icon className="w-4.5 h-4.5 text-brand-navy" />
    </div>
    <div className="min-w-0">
      <h3 className="section-label">{title}</h3>
      <p className="text-[11px] text-slate-500 font-medium">{subtitle}</p>
    </div>
  </div>
);

const PrefRow: React.FC<{
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ id, title, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-3.5">
    <div className="min-w-0">
      <p className="text-xs font-bold text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{description}</p>
    </div>
    <ToggleSwitch id={id} checked={checked} onChange={onChange} className="shrink-0" />
  </div>
);
