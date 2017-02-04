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

  // add error renderer if options contain an error template
  if (options.templateError) {
    var templateError = fs.readFileSync(options.templateError).toString()

    callback.error = render.bind(null, templateError, vocab)
  }

  return callback
}

module.exports = factory
