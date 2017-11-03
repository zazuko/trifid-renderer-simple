'use strict'

var fs = require('fs')
var jsonld = require('jsonld')

function render (template, options, req, res) {
  res.locals.statusCode = res.statusCode
  res.locals.vocab = JSON.stringify(options.vocab || {})

  try {
    res.locals.graph = JSON.parse(res.locals.graph)
  } catch (e) {
    res.locals.graph = {}
  }

  if (res.locals.jsonldContext) {
    res.locals.graph['@context'] = res.locals.jsonldContext
  }

  return jsonld.promises.compact(res.locals.graph, options.context).then(function (compacted) {
    res.locals.graph = JSON.stringify(compacted)

    res.render(template)
  }).catch(function (err) {
    console.error(err.stack || err.message)

    res.render(template)
  })
}

function factory (options) {
  if (options.context) {
    options.context = JSON.parse(fs.readFileSync(options.context).toString())
  } else {
    options.context = {'@vocab': 'http://schema.org/'}
  }

  if (options.vocab) {
    options.vocab = JSON.parse(fs.readFileSync(options.vocab).toString())
  }

  var callback = render.bind(null, options.template, options)

  callback.accept = 'application/ld+json'

  // add error renderer if options contain an error template
  if (options.templateError) {
    callback.error = render.bind(null, options.templateError, options)
  }

  return callback
}

module.exports = factory
