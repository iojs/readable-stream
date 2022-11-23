'use strict'

/* replacement start */
const { Buffer } = require('buffer')

/* replacement end */

const { PassThrough, Transform } = require('../../lib/ours/index')
const { kReadableStreamSuiteName, kReadableStreamSuiteHasMultipleTests } = require('./symbols')
module.exports = function (test) {
  test('writable side consumption', function (t) {
    t.plan(3)
    const tx = new Transform({
      highWaterMark: 10
    })
    let transformed = 0
    tx._transform = function (chunk, encoding, cb) {
      transformed += chunk.length
      tx.push(chunk)
      cb()
    }
    for (let i = 1; i <= 10; i++) {
      tx.write(Buffer.alloc(i))
    }
    tx.end()
    t.equal(tx._readableState.length, 10)
    t.equal(transformed, 10)
    t.same(
      tx._writableState.getBuffer().map(function (c) {
        return c.chunk.length
      }),
      [5, 6, 7, 8, 9, 10]
    )
  })
  test('passthrough', function (t) {
    t.plan(4)
    const pt = new PassThrough()
    pt.write(Buffer.from('foog'))
    pt.write(Buffer.from('bark'))
    pt.write(Buffer.from('bazy'))
    pt.write(Buffer.from('kuel'))
    pt.end()
    t.equal(pt.read(5).toString(), 'foogb')
    t.equal(pt.read(5).toString(), 'arkba')
    t.equal(pt.read(5).toString(), 'zykue')
    t.equal(pt.read(5).toString(), 'l')
  })
  test('object passthrough', function (t) {
    t.plan(7)
    const pt = new PassThrough({
      objectMode: true
    })
    pt.write(1)
    pt.write(true)
    pt.write(false)
    pt.write(0)
    pt.write('foo')
    pt.write('')
    pt.write({
      a: 'b'
    })
    pt.end()
    t.equal(pt.read(), 1)
    t.equal(pt.read(), true)
    t.equal(pt.read(), false)
    t.equal(pt.read(), 0)
    t.equal(pt.read(), 'foo')
    t.equal(pt.read(), '')
    t.same(pt.read(), {
      a: 'b'
    })
  })
  test('simple transform', function (t) {
    t.plan(4)
    const pt = new Transform()
    pt._transform = function (c, e, cb) {
      const ret = Buffer.alloc(c.length)
      ret.fill('x')
      pt.push(ret)
      cb()
    }
    pt.write(Buffer.from('foog'))
    pt.write(Buffer.from('bark'))
    pt.write(Buffer.from('bazy'))
    pt.write(Buffer.from('kuel'))
    pt.end()
    t.equal(pt.read(5).toString(), 'xxxxx')
    t.equal(pt.read(5).toString(), 'xxxxx')
    t.equal(pt.read(5).toString(), 'xxxxx')
    t.equal(pt.read(5).toString(), 'x')
  })
  test('simple object transform', function (t) {
    t.plan(7)
    const pt = new Transform({
      objectMode: true
    })
    pt._transform = function (c, e, cb) {
      pt.push(JSON.stringify(c))
      cb()
    }
    pt.write(1)
    pt.write(true)
    pt.write(false)
    pt.write(0)
    pt.write('foo')
    pt.write('')
    pt.write({
      a: 'b'
    })
    pt.end()
    t.equal(pt.read(), '1')
    t.equal(pt.read(), 'true')
    t.equal(pt.read(), 'false')
    t.equal(pt.read(), '0')
    t.equal(pt.read(), '"foo"')
    t.equal(pt.read(), '""')
    t.equal(pt.read(), '{"a":"b"}')
  })
  test('async passthrough', function (t) {
    t.plan(4)
    const pt = new Transform()
    pt._transform = function (chunk, encoding, cb) {
      setTimeout(function () {
        pt.push(chunk)
        cb()
      }, 10)
    }
    pt.write(Buffer.from('foog'))
    pt.write(Buffer.from('bark'))
    pt.write(Buffer.from('bazy'))
    pt.write(Buffer.from('kuel'))
    pt.end()
    pt.on('finish', function () {
      t.equal(pt.read(5).toString(), 'foogb')
      t.equal(pt.read(5).toString(), 'arkba')
      t.equal(pt.read(5).toString(), 'zykue')
      t.equal(pt.read(5).toString(), 'l')
    })
  })
  test('assymetric transform (expand)', function (t) {
    t.plan(7)
    const pt = new Transform()

    // emit each chunk 2 times.
    pt._transform = function (chunk, encoding, cb) {
      setTimeout(function () {
        pt.push(chunk)
        setTimeout(function () {
          pt.push(chunk)
          cb()
        }, 10)
      }, 10)
    }
    pt.write(Buffer.from('foog'))
    pt.write(Buffer.from('bark'))
    pt.write(Buffer.from('bazy'))
    pt.write(Buffer.from('kuel'))
    pt.end()
    pt.on('finish', function () {
      t.equal(pt.read(5).toString(), 'foogf')
      t.equal(pt.read(5).toString(), 'oogba')
      t.equal(pt.read(5).toString(), 'rkbar')
      t.equal(pt.read(5).toString(), 'kbazy')
      t.equal(pt.read(5).toString(), 'bazyk')
      t.equal(pt.read(5).toString(), 'uelku')
      t.equal(pt.read(5).toString(), 'el')
    })
  })
  test('assymetric transform (compress)', function (t) {
    t.plan(3)
    const pt = new Transform()

    // each output is the first char of 3 consecutive chunks,
    // or whatever's left.
    pt.state = ''
    pt._transform = function (chunk, encoding, cb) {
      if (!chunk) {
        chunk = ''
      }
      const s = chunk.toString()
      setTimeout(
        function () {
          this.state += s.charAt(0)
          if (this.state.length === 3) {
            pt.push(Buffer.from(this.state))
            this.state = ''
          }
          cb()
        }.bind(this),
        10
      )
    }
    pt._flush = function (cb) {
      // just output whatever we have.
      pt.push(Buffer.from(this.state))
      this.state = ''
      cb()
    }
    pt.write(Buffer.from('aaaa'))
    pt.write(Buffer.from('bbbb'))
    pt.write(Buffer.from('cccc'))
    pt.write(Buffer.from('dddd'))
    pt.write(Buffer.from('eeee'))
    pt.write(Buffer.from('aaaa'))
    pt.write(Buffer.from('bbbb'))
    pt.write(Buffer.from('cccc'))
    pt.write(Buffer.from('dddd'))
    pt.write(Buffer.from('eeee'))
    pt.write(Buffer.from('aaaa'))
    pt.write(Buffer.from('bbbb'))
    pt.write(Buffer.from('cccc'))
    pt.write(Buffer.from('dddd'))
    pt.end()

    // 'abcdeabcdeabcd'
    pt.on('finish', function () {
      t.equal(pt.read(5).toString(), 'abcde')
      t.equal(pt.read(5).toString(), 'abcde')
      t.equal(pt.read(5).toString(), 'abcd')
    })
  })

  // this tests for a stall when data is written to a full stream
  // that has empty transforms.
  test('complex transform', function (t) {
    t.plan(2)
    let count = 0
    let saved = null
    const pt = new Transform({
      highWaterMark: 3
    })
    pt._transform = function (c, e, cb) {
      if (count++ === 1) {
        saved = c
      } else {
        if (saved) {
          pt.push(saved)
          saved = null
        }
        pt.push(c)
      }
      cb()
    }
    pt.once('readable', function () {
      process.nextTick(function () {
        pt.write(Buffer.from('d'))
        pt.write(Buffer.from('ef'), function () {
          pt.end()
        })
        t.equal(pt.read().toString(), 'abcdef')
        t.equal(pt.read(), null)
      })
    })
    pt.write(Buffer.from('abc'))
  })
  test('passthrough event emission', function (t) {
    t.plan(11)
    const pt = new PassThrough()
    let emits = 0
    pt.on('readable', function () {
      // console.error('>>> emit readable %d', emits);
      emits++
    })
    pt.write(Buffer.from('foog'))

    // console.error('need emit 0');
    pt.write(Buffer.from('bark'))
    setTimeout(() => {
      // console.error('should have emitted readable now 1 === %d', emits)
      t.equal(emits, 1)
      t.equal(pt.read(5).toString(), 'foogb')
      t.equal(pt.read(5) + '', 'null')

      // console.error('need emit 1');

      pt.write(Buffer.from('bazy'))
      // console.error('should have emitted, but not again');
      pt.write(Buffer.from('kuel'))

      // console.error('should have emitted readable now 2 === %d', emits);
      setTimeout(() => {
        t.equal(emits, 2)
        t.equal(pt.read(5).toString(), 'arkba')
        t.equal(pt.read(5).toString(), 'zykue')
        t.equal(pt.read(5), null)

        // console.error('need emit 2');

        pt.end()
        setTimeout(() => {
          t.equal(emits, 3)
          t.equal(pt.read(5).toString(), 'l')
          t.equal(pt.read(5), null)

          // console.error('should not have emitted again');
          t.equal(emits, 3)
        })
      })
    })
  })
  test('passthrough event emission reordered', function (t) {
    t.plan(10)
    const pt = new PassThrough()
    let emits = 0
    pt.on('readable', function () {
      // console.error('emit readable', emits);
      emits++
    })
    pt.write(Buffer.from('foog'))
    // console.error('need emit 0');
    pt.write(Buffer.from('bark'))
    setTimeout(() => {
      // console.error('should have emitted readable now 1 === %d', emits);
      t.equal(emits, 1)
      t.equal(pt.read(5).toString(), 'foogb')
      t.equal(pt.read(5), null)

      // console.error('need emit 1');
      pt.once('readable', function () {
        t.equal(pt.read(5).toString(), 'arkba')
        t.equal(pt.read(5), null)

        // console.error('need emit 2');
        pt.once('readable', function () {
          t.equal(pt.read(5).toString(), 'zykue')
          t.equal(pt.read(5), null)
          pt.once('readable', function () {
            t.equal(pt.read(5).toString(), 'l')
            t.equal(pt.read(5), null)
            t.equal(emits, 4)
          })
          pt.end()
        })
        pt.write(Buffer.from('kuel'))
      })
      pt.write(Buffer.from('bazy'))
    })
  })
  test('passthrough facaded', function (t) {
    t.plan(1)

    // console.error('passthrough facaded');
    const pt = new PassThrough()
    const datas = []
    pt.on('data', function (chunk) {
      datas.push(chunk.toString())
    })
    pt.on('end', function () {
      t.same(datas, ['foog', 'bark', 'bazy', 'kuel'])
    })
    pt.write(Buffer.from('foog'))
    setTimeout(function () {
      pt.write(Buffer.from('bark'))
      setTimeout(function () {
        pt.write(Buffer.from('bazy'))
        setTimeout(function () {
          pt.write(Buffer.from('kuel'))
          setTimeout(function () {
            pt.end()
          }, 10)
        }, 10)
      }, 10)
    }, 10)
  })
  test('object transform (json parse)', function (t) {
    t.plan(5)

    // console.error('json parse stream');
    const jp = new Transform({
      objectMode: true
    })
    jp._transform = function (data, encoding, cb) {
      try {
        jp.push(JSON.parse(data))
        cb()
      } catch (er) {
        cb(er)
      }
    }

    // anything except null/undefined is fine.
    // those are "magic" in the stream API, because they signal EOF.
    const objects = [
      {
        foo: 'bar'
      },
      100,
      'string',
      {
        nested: {
          things: [
            {
              foo: 'bar'
            },
            100,
            'string'
          ]
        }
      }
    ]
    let ended = false
    jp.on('end', function () {
      ended = true
    })
    forEach(objects, function (obj) {
      jp.write(JSON.stringify(obj))
      const res = jp.read()
      t.same(res, obj)
    })
    jp.end()
    // read one more time to get the 'end' event
    jp.read()
    process.nextTick(function () {
      t.ok(ended)
    })
  })
  test('object transform (json stringify)', function (t) {
    t.plan(5)

    // console.error('json parse stream');
    const js = new Transform({
      objectMode: true
    })
    js._transform = function (data, encoding, cb) {
      try {
        js.push(JSON.stringify(data))
        cb()
      } catch (er) {
        cb(er)
      }
    }

    // anything except null/undefined is fine.
    // those are "magic" in the stream API, because they signal EOF.
    const objects = [
      {
        foo: 'bar'
      },
      100,
      'string',
      {
        nested: {
          things: [
            {
              foo: 'bar'
            },
            100,
            'string'
          ]
        }
      }
    ]
    let ended = false
    js.on('end', function () {
      ended = true
    })
    forEach(objects, function (obj) {
      js.write(obj)
      const res = js.read()
      t.equal(res, JSON.stringify(obj))
    })
    js.end()
    // read one more time to get the 'end' event
    js.read()
    process.nextTick(function () {
      t.ok(ended)
    })
  })
  function forEach(xs, f) {
    for (let i = 0, l = xs.length; i < l; i++) {
      f(xs[i], i)
    }
  }
}
module.exports[kReadableStreamSuiteName] = 'stream2-transform'
module.exports[kReadableStreamSuiteHasMultipleTests] = true
