/**
 * Date formatting helpers for SQLite date/time columns.
 * The database stores timezone-naive timestamps, so we emit local
 * date/time strings instead of ISO-8601 UTC strings.
 */

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDate(value) {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}

function formatDbDateTime(value) {
  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(':');
}

function formatDbDate(value) {
  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-');
}

module.exports = { formatDbDateTime, formatDbDate };
