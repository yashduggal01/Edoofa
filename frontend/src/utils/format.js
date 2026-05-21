export function money(value) {
  if (value === null || value === undefined || value === '') return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function number(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
}

export function dateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fullDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function minutesLabel(value) {
  if (value === null || value === undefined) return '-';
  const minutes = Number(value);
  if (minutes < 0) return 'Closed';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
