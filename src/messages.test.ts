import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ERROR_MESSAGES, errorMessage } from './messages.ts'

test('an error code named after a property every object has shows the generic message', () => {
  for (const code of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf']) {
    assert.equal(errorMessage(code), 'Something went wrong.', code)
  }
})

test('a known error code shows its own message', () => {
  assert.equal(errorMessage('busy'), ERROR_MESSAGES.busy)
  assert.notEqual(ERROR_MESSAGES.busy, 'Something went wrong.')
})
