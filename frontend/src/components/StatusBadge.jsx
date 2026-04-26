export default function StatusBadge({ status, phase }) {
  const value = phase || status;
  const map = {
    LIVE: { cls: 'badge-live', label: 'Live' },
    ACTIVE: { cls: 'badge-live', label: 'Live' },
    SCHEDULED: { cls: 'badge-scheduled', label: 'Scheduled' },
    CLOSED: { cls: 'badge-closed', label: 'Closed' },
    FORCE_CLOSED: { cls: 'badge-force', label: 'Force closed' },
  };
  const item = map[value] || { cls: 'badge-neutral', label: value || 'Unknown' };

  return (
    <span className={`status-badge ${item.cls}`}>
      <span />
      {item.label}
    </span>
  );
}
