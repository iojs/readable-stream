/* replacement start */
const AbortController = globalThis.AbortController || require('abort-controller').AbortController
const AbortSignal = globalThis.AbortSignal || require('abort-controller').AbortSignal
const EventTarget = globalThis.EventTarget || require('event-target-shim').EventTarget
if (typeof AbortSignal.abort !== 'function') {
  AbortSignal.abort = function () {
    const controller = new AbortController()
    controller.abort()
    return controller.signal
  }
}
/* replacement end */
// Flags: --expose-internals

;('use strict')
const tap = require('tap')
const silentConsole = {
  log() {},
  error() {}
}
require('../common')
const assert = require('assert')
const { addAbortSignal, Readable } = require('../../lib/ours/index')
const { addAbortSignalNoValidate } = require('../../lib/internal/streams/add-abort-signal')
{
  assert.throws(() => {
    addAbortSignal('INVALID_SIGNAL')
  }, /ERR_INVALID_ARG_TYPE/)
  const ac = new AbortController()
  assert.throws(() => {
    addAbortSignal(ac.signal, 'INVALID_STREAM')
  }, /ERR_INVALID_ARG_TYPE/)
}
{
  const r = new Readable({
    read: () => {}
  })
  assert.deepStrictEqual(r, addAbortSignalNoValidate('INVALID_SIGNAL', r))
}

/* replacement start */
process.on('beforeExit', (code) => {
  if (code === 0) {
    tap.pass('test succeeded')
  } else {
    tap.fail(`test failed - exited code ${code}`)
  }
})
/* replacement end */
