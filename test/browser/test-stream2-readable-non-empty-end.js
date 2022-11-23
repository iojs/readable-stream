'use strict'

/* replacement start */
const { Buffer } = require('buffer')

/* replacement end */

const { Readable } = require('../../lib/ours/index')
const { kReadableStreamSuiteName } = require('./symbols')
module.exports = function (t) {
  t.plan(4)
  let len = 0
  const chunks = new Array(10)
  for (let i = 1; i <= 10; i++) {
    chunks[i - 1] = Buffer.alloc(i)
    len += i
  }
  const test = new Readable()
  let n = 0
  test._read = function (size) {
    const chunk = chunks[n++]
    setTimeout(function () {
      test.push(chunk === undefined ? null : chunk)
    })
  }
  test.on('end', thrower)
  function thrower() {
    throw new Error('this should not happen!')
  }
  let bytesread = 0
  test.on('readable', function () {
    const b = len - bytesread - 1
    const res = test.read(b)
    if (res) {
      bytesread += res.length
      // console.error('br=%d len=%d', bytesread, len);
      setTimeout(next)
    }
    test.read(0)
  })
  test.read(0)
  function next() {
    // now let's make 'end' happen
    test.removeListener('end', thrower)
    test.on('end', function () {
      t.ok(true, 'end emitted')
    })

    // one to get the last byte
    let r = test.read()
    t.ok(r)
    t.equal(r.length, 1)
    r = test.read()
    t.equal(r, null)
  }
}
module.exports[kReadableStreamSuiteName] = 'stream2-readable-non-empty-end'
