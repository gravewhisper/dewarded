import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatDay } from './format.ts'

test('day format is day, short month and year in UTC', () => {
  assert.equal(formatDay(new Date('2026-10-29T23:30:00Z')), '29 Oct 2026')
  assert.equal(formatDay(new Date('2026-01-01T00:00:00Z')), '1 Jan 2026')
})

test('full date format keeps minutes and the UTC marker', () => {
  assert.equal(formatDate(new Date('2026-10-29T13:34:00Z')), '2026-10-29 13:34 UTC')
})
