import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildIcsCalendar } from './ics';

describe('buildIcsCalendar', () => {
  test('escapes and folds long ASCII lines within 75 octets', () => {
    const longTitle = 'x'.repeat(200);
    const ics = buildIcsCalendar('Test Cal', [
      {
        id: 'uid-1',
        title: longTitle,
        description: null,
        start_time: '2026-04-13T20:00:00Z',
        end_time: null,
        updated_at: '2026-04-13T19:00:00Z',
      },
    ]);

    const lines = ics.split('\r\n');
    for (const line of lines) {
      assert.ok(line.length <= 75);
    }
    const summaryLines = lines.filter(l => l === ' ' + 'x'.repeat(74));
    assert.ok(summaryLines.length > 0);
    assert.ok(ics.includes('BEGIN:VCALENDAR'));
    assert.ok(ics.includes('END:VCALENDAR'));
  });

  test('folds UTF-8 multi-byte content by octets, not characters', () => {
    const description = '\u{1f389}'.repeat(40);
    const ics = buildIcsCalendar('Test Cal', [
      {
        id: 'uid-2',
        title: 'Simple',
        description,
        start_time: '2026-04-13T20:00:00Z',
        end_time: null,
        updated_at: '2026-04-13T19:00:00Z',
      },
    ]);

    const lines = ics.split('\r\n');
    for (const line of lines) {
      assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
    }
    const unfolded = ics.replace(/\r\n /g, '');
    assert.ok(unfolded.includes(`DESCRIPTION:${description}\r\n`));
    assert.equal(new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(ics)), ics);
  });

  test('continuation lines start with a single space after CRLF', () => {
    const title = 'a'.repeat(150);
    const ics = buildIcsCalendar('Cal', [
      {
        id: 'uid-3',
        title,
        description: null,
        start_time: '2026-04-13T20:00:00Z',
        end_time: null,
        updated_at: '2026-04-13T19:00:00Z',
      },
    ]);

    const lines = ics.split('\r\n');
    const summaryFolded = lines.find(l => l.startsWith('SUMMARY'));
    assert.notEqual(summaryFolded, undefined);
    const foldCount = (ics.match(/\r\n /g) || []).length;
    assert.ok(foldCount > 0);
  });
});
