/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { mergeTimeline } from './messengerState';

test('realtime and history responses never duplicate a message', () => {
  const message = { id: 'one', created_at: '2026-11-05T12:00:00Z', content: 'שלום' };
  expect(mergeTimeline([message], [message])).toEqual([message]);
});

test('history and realtime messages retain chronological order', () => {
  const old = { id: 'old', created_at: '2026-01-01T00:00:00Z' };
  const recent = { id: 'recent', created_at: '2026-11-05T12:00:00Z' };
  expect(mergeTimeline([recent], [old]).map(message => message.id)).toEqual(['old', 'recent']);
});