'use strict'

var fs = require('fs')
var jsonld = require('jsonld')
var mustache = require('mustache')

function render (template, context, vocab, locals) {
  locals.vocab = JSON.stringify(vocab)

  try {
    locals.graph = JSON.parse(locals.graph)
  } catch (e) {
    locals.graph = {}
  }

  return jsonld.promises.compact(locals.graph, context).then(function (compacted) {
    locals.graph = JSON.stringify(compacted)

    return mustache.render(template, locals)
  }).catch(function (err) {
    console.error(err.stack || err.message)

    return mustache.render(template, locals)
  })
}

function factory (options) {
  var template = fs.readFileSync(options.template).toString()

  var context = {'@vocab': 'http://schema.org/'}

  if (options.context) {
    context = JSON.parse(fs.readFileSync(options.context).toString())
  }

  var vocab = {}

  if (options.vocab) {
    vocab = JSON.parse(fs.readFileSync(options.vocab).toString())
  }

  var callback = render.bind(null, template, context, vocab)

  callback.accept = 'application/ld+json'

  // add error renderer if options contain an error template
  if (options.templateError) {
    var templateError = fs.readFileSync(options.templateError).toString()

    callback.error = render.bind(null, templateError, context, vocab)
  }

  return callback
}

module.exports = factory
