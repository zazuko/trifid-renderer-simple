'use strict'

var fs = require('fs')
var mustache = require('mustache')

function render (template, vocab, locals) {
  locals.vocab = JSON.stringify(vocab)

  return mustache.render(template, locals)
}

function factory (options) {
  var template = fs.readFileSync(options.template).toString()

  var vocab = {}

  if (options.vocab) {
    vocab = JSON.parse(fs.readFileSync(options.vocab).toString())
  }

  var callback = render.bind(null, template, vocab)

  callback.accept = 'application/ld+json'

  return callback
}

module.exports = factory
