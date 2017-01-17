/* global React */

'use strict'

var termRegEx = /(#|\/)([^#\/]*)$/

function iriLabel (iri) {
  var parts = termRegEx.exec(iri)

  if (!parts || parts.length === 0) {
    return null
  }

  return parts[parts.length - 1]
}

var predicateLabel = function (iri, vocab) {
  var predicate = 'http://www.w3.org/2000/01/rdf-schema#label'
  var language = navigator.language || navigator.userLanguage

  for (var i = 0; i < vocab.length; i++) {
    var subject = vocab[i]

    if (subject['@id'] === iri && predicate in subject) {
      var objects = subject[predicate]

      for (var j = 0; j < objects.length; j++) {
        if (!('@language' in objects[j]) || objects[j]['@language'] === language) {
          return objects[j]['@value']
        }
      }
    }
  }

  return iriLabel(iri)
}

function renderPredicate (iri, label) {
  return React.DOM.a({
    href: iri
  }, React.DOM.b({}, label || iri))
}

function renderIri (iri, label) {
  return React.DOM.a({href: iri}, label || iri)
}

function renderBlankNode (blankNode) {
  return React.DOM.a({href: '#' + blankNode}, blankNode)
}

function renderLiteral (literal) {
  if (typeof literal === 'string') {
    return React.DOM.span({}, literal)
  } else {
    if ('@language' in literal) {
      return React.DOM.span({}, literal['@value'] + ' @' + literal['@language'])
    } else if ('@type' in literal) {
      return React.DOM.span({}, literal['@value'] + ' (', renderIri(literal['@type'], iriLabel(literal['@type'])), ')')
    } else {
      return React.DOM.span({}, literal['@value'].toString())
    }
  }
}

function renderNode (node, label) {
  if (typeof node === 'object') {
    if ('@id' in node) {
      if (node['@id'].indexOf('_:') !== 0) {
        return renderIri(node['@id'], label)
      } else {
        return renderBlankNode(node['@id'])
      }
    } else {
      return renderLiteral(node)
    }
  } else {
    return renderLiteral(node)
  }
}

var JsonLdTitle = React.createClass({
  render: function () {
    var subject = this.props.graph.filter(function (subject) {
      return subject['@id'] === window.location.href
    }).shift()

    if (!subject) {
      return React.DOM.div({})
    }

    var title = this.props.predicates.reduce(function (title, predicate) {
      return title || predicate in subject ? subject[predicate][0]['@value'] : null
    }, null)

    if (!title) {
      return React.DOM.div({})
    }

    return React.DOM.h1({}, title)
  }
})

var createJsonLdTitle = React.createFactory(JsonLdTitle)

var JsonLdSticky = React.createClass({
  render: function () {
    var resource = React.DOM.h3({className: 'list-group-item-heading'}, 'Resource: ' + window.location.href)

    var subject = this.props.graph.filter(function (subject) {
      return subject['@id'] === window.location.href
    }).shift()

    var typeElements = []

    if (subject && subject['@type']) {
      typeElements.push('a ')

      subject['@type'].forEach(function (type, index, types) {
        typeElements.push(React.DOM.a({href: type}, type))

        if (index !== types.length - 1) {
          typeElements.push(', ')
        }
      })
    }

    var type = React.DOM.p({className: 'list-group-item-text'}, typeElements)

    return React.DOM.span({className: 'list-group-item'}, resource, type)
  }
})

var createJsonLdSticky = React.createFactory(JsonLdSticky)

var JsonLdSubjectTable = React.createClass({
  render: function () {
    var subjects = this.props.subject
    var vocab = this.props.vocab
    var rows = []

    var head = React.DOM.thead({className: 'table-subject'})

    if (subjects['@id'] !== window.location.href) {
      head = React.DOM.thead({},
        React.DOM.tr({},
          React.DOM.th({colSpan: 2}, renderNode(this.props.subject))))
    }

    Object.keys(subjects).forEach(function (predicate) {
      var objects = subjects[predicate]

      if (predicate.indexOf('@') === 0) {
        if (predicate === '@type') {
          predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'

          objects = objects.map(function (type) {
            return {'@id': type};
          })
        } else {
          return
        }
      }

      objects.forEach(function (object) {
        rows.push(React.DOM.tr({key: predicate + JSON.stringify(object)},
          React.DOM.td({className: 'table-predicate'}, renderPredicate(predicate, predicateLabel(predicate, vocab))),
          React.DOM.td({className: 'table-object'}, renderNode(object, '@id' in object ? iriLabel(object['@id']) : null), React.DOM.hr({}))
        ))
      })
    })

    var body = React.DOM.tbody({}, rows)

    return React.DOM.table({id: this.props.subject['@id']}, head, body)
  }
})

var createJsonLdSubjectTable = React.createFactory(JsonLdSubjectTable)

var JsonLdTables = React.createClass({
  render: function () {
    var vocab = this.props.vocab

    // move blank nodes to the end
    var subjects = this.props.graph.sort(function (a, b) {
      if (a['@id'].indexOf('_:') === 0 && b['@id'].indexOf('_:') !== 0) {
        return 1
      } else if (a['@id'].indexOf('_:') !== 0 && b['@id'].indexOf('_:') === 0) {
        return -1
      }

      return a['@id'].localeCompare(b['@id'])
    })

    var tables = subjects.map(function (subject) {
      return createJsonLdSubjectTable({
        key: subject['@id'],
        subject: subject,
        vocab: vocab
      })
    })

    return React.DOM.div({}, tables)
  }
})

var createJsonLdTables = React.createFactory(JsonLdTables)

function embeddedJsonLd () {
  var element = document.getElementById('data')

  if (!element) {
    return Promise.reject()
  }

  var json = JSON.parse(element.innerHTML)

  return jsonld.promises.flatten(json, {}).then(function (flat) {
    return jsonld.promises.expand(flat)
  })
}

function embeddedVocab () {
  var element = document.getElementById('vocab')

  if (!element) {
    return Promise.resolve({})
  }

  var json = JSON.parse(element.innerHTML)

  return jsonld.promises.expand(json)
}

var dcVocab = {}

Promise.all([
  embeddedVocab(),
  embeddedJsonLd()
]).then(function (results) {
  var vocab = results[0]
  var graph = results[1]

  var title = createJsonLdTitle({graph: graph, predicates: ['http://schema.org/name']})
  React.render(title, document.getElementById('title'))

  var sticky = createJsonLdSticky({graph: graph})
  React.render(sticky, document.getElementById('sticky'))

  var tables = createJsonLdTables({graph: graph, vocab: vocab})
  React.render(tables, document.getElementById('graph'))
}).catch(function (error) {
  console.error(error)
})
