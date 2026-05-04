import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import './SecurityStatusBadge.css';

function buildTitle({ status, snapshot, denyReason, policy }) {
  if (status === 'checking') return 'Проверка безопасности устройства…';
  if (status === 'denied') return denyReason || 'Доступ ограничен: защита не соответствует политике';
  if (status === 'unknown') return 'Не удалось определить статус';
  if (status === 'allowed') {
    const prov = snapshot?.providerVersion;
    const avs = snapshot?.antivirusProducts?.map((p) => p.name).join(', ');
    const def = snapshot?.overallDefinitionsUpToDate;
    let t = 'Устройство соответствует политике';
    if (avs) t += `. АВ: ${avs}`;
    if (def === false) t += '. Внимание: сигнатуры могут быть устаревшими';
    if (policy?.enforce === false) t = 'Политика не требует строгой проверки' + (prov ? ` (${prov})` : '');
    return t;
  }
  return 'Безопасность';
}

export function SecurityStatusBadge({
  status,
  snapshot,
  denyReason,
  policy,
  onRecheck,
  disabled,
}) {
  const title = buildTitle({ status, snapshot, denyReason, policy });
  const defsStale = snapshot?.overallDefinitionsUpToDate === false;
  let variant = 'unknown';
  if (status === 'checking') variant = 'checking';
  else if (status === 'denied') variant = 'denied';
  else if (status === 'allowed' && defsStale) variant = 'warning';
  else if (status === 'allowed') variant = 'allowed';
  else if (status === 'unknown') variant = 'unknown';

  const Icon =
    status === 'checking'
      ? Loader2
      : status === 'denied'
        ? ShieldAlert
        : status === 'allowed'
          ? ShieldCheck
          : Shield;

  return (
    <span
      className={`security-badge security-badge--${variant}`}
      title={title}
      onClick={onRecheck && !disabled ? onRecheck : undefined}
      style={onRecheck ? { cursor: 'pointer' } : undefined}
      role="status"
    >
      <Icon size={14} className={status === 'checking' ? 'animate-spin' : undefined} />
      <span className="security-badge__title">
        {status === 'checking' && 'Проверка…'}
        {status === 'allowed' && (defsStale ? 'AV: OK, сигнатуры?' : 'Безопасность: OK')}
        {status === 'denied' && 'Безопасность: отказ'}
        {status === 'unknown' && 'Безопасность: ?'}
      </span>
    </span>
  );
}

export default SecurityStatusBadge;
