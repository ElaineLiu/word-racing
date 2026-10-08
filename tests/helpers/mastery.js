import { vi } from 'vitest';

// Establish real independent evidence on two dates for mastery-dependent fixtures.
export function masterAcrossDates(tracker, word, id, complexMode = 'RADIO_MSG') {
  const alreadyFake = vi.isFakeTimers();
  const originalTime = new Date();
  if (!alreadyFake) vi.useFakeTimers();
  for (let day = 0; day < 2; day++) {
    const date = new Date(originalTime);
    date.setDate(date.getDate() + day);
    vi.setSystemTime(date);
    tracker.updateStatus(word, 'PIT_BOARD', true, id);
    tracker.updateStatus(word, complexMode, true, id);
  }
  vi.setSystemTime(originalTime);
  if (!alreadyFake) vi.useRealTimers();
}
