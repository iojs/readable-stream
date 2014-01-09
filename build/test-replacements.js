module.exports.all = [
    [
        /require\(['"]stream['"]\)/g
      , 'require(\'../../\')'
    ]

    // some tests need stream.Stream but readable.js doesn't offer that
    // and we've undone it with the previous replacement

  , [
        /stream\.Stream|require\('\.\.\/\.\.\/'\)\.Stream/g
      , 'require(\'stream\').Stream'
    ]

  , [
        /require\(['"](_stream_\w+)['"]\)/g
      , 'require(\'../../lib/$1\')'
    ]

  , [
        /Stream.(Readable|Writable|Duplex|Transform|PassThrough)/g
      , 'require(\'../../\').$1'
    ]

]


module.exports['common.js'] = [
    [
        /(exports.mustCall[\s\S]*)/m
      ,   '$1\n'
        + 'if (!util._errnoException) {\n'
        + '  var uv;\n'
        + '  util._errnoException = function(err, syscall) {\n'
        + '    if (util.isUndefined(uv)) try { uv = process.binding(\'uv\'); } catch (e) {}\n'
        + '    var errname = uv ? uv.errname(err) : \'\';\n'
        + '    var e = new Error(syscall + \' \' + errname);\n'
        + '    e.code = errname;\n'
        + '    e.errno = errname;\n'
        + '    e.syscall = syscall;\n'
        + '    return e;\n'
        + '  };\n'
        + '}\n'
    ]
]

// this test has some trouble with the nextTick depth when run
// to stdout, it's also very noisy so we'll quiet it
module.exports['test-stream-pipe-multi.js'] = [
    [
        /console\.error/g
      , '//console.error'
    ]

  , [
        /process\.nextTick/g
      , 'setImmediate'
    ]
]

// just noisy
module.exports['test-stream2-large-read-stall.js'] = [
    [
        /console\.error/g
      , ';false && console.error'
    ]
]

// 'tty_wrap' is too different to bother testing in pre-0.11
// this bypasses it and replicates a console.error() test
module.exports['test-stream2-stderr-sync.js'] = [
    [
        /(function child0\(\) \{)/
      ,   '$1\n'
        + '  if (/^v0\.(10|8)\./.test(process.version))\n'
        + '    return console.error(\'child 0\\nfoo\\nbar\\nbaz\');\n'
    ]
]
