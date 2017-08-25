'use strict'

var fs = require('fs')
var jsonld = require('jsonld')

function render (template, context, vocab, req, res) {
  res.locals.statusCode = res.statusCode
  res.locals.vocab = JSON.stringify(vocab)

  try {
    res.locals.graph = JSON.parse(res.locals.graph)
  } catch (e) {
    res.locals.graph = {}
  }

  if (res.locals.jsonldContext) {
    res.locals.graph['@context'] = res.locals.jsonldContext
  }

  return jsonld.promises.compact(res.locals.graph, context).then(function (compacted) {
    res.locals.graph = JSON.stringify(compacted)

    res.render(template)
  }).catch(function (err) {
    console.error(err.stack || err.message)

    res.render(template)
  })
}

function factory (options) {
  var context = {'@vocab': 'http://schema.org/'}

  if (options.context) {
    context = JSON.parse(fs.readFileSync(options.context).toString())
  }

  var vocab = {}

  if (options.vocab) {
    vocab = JSON.parse(fs.readFileSync(options.vocab).toString())
  }

  var callback = render.bind(null, options.template, context, vocab)

  callback.accept = 'application/ld+json'

  // add error renderer if options contain an error template
  if (options.templateError) {
    callback.error = render.bind(null, options.templateError, context, vocab)
  }

  return callback
}

module.exports = factory
