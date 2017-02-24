/* global React */

'use strict'

var termRegEx = /(#|\/)([^#\/]*)$/

var LinkClass = React.createClass({
  render: function () {
    var iri = this.props.href
    var origin = window.location.origin

    // open IRIs with the same origin in the same tab, all others in a new tab
    if (iri.slice(0, origin.length) === origin) {
      return React.DOM.a({href: iri}, this.props.children)
    } else {
      return React.DOM.a({href: iri, target: '_blank'}, this.props.children)
    }
  }
})

var link = React.createFactory(LinkClass)

function iriLabel (iri) {
  var parts = termRegEx.exec(iri)

  if (!parts || parts.length === 0) {
    return null
  }

  return parts[parts.length - 1]
}

function subjectLabel (subject, predicates) {
  return predicates.reduce(function (label, predicate) {
    return label || predicate in subject ? subject[predicate][0]['@value'] : null
  }, null)
}

function subjectSortId (subject, predicates) {
  var label = subjectLabel(subject, predicates) || subject['@id']

  if (subject['@id'].slice(0, 2) !== '_:') {
    return '0' + label // IRIs
  } else {
    return '1' + label // blank nodes
  }
}

function subjectSort (predicates) {
  return function (a, b) {
    return subjectSortId(a, predicates).localeCompare(subjectSortId(b, predicates))
  }
}

function predicateLabel (iri, vocab) {
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
  return link({href: iri}, React.DOM.b({}, label || iri))
}

function renderIri (iri, label) {
  return link({href: iri}, label || iri)
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

    var title = subjectLabel(subject, this.props.labelPredicates)

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
        typeElements.push(link({href: type}, type))

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
          React.DOM.td({className: 'table-predicate col-lg-4'}, renderPredicate(predicate, predicateLabel(predicate, vocab))),
          React.DOM.td({className: 'table-object col-lg-8'}, renderNode(object, '@id' in object ? iriLabel(object['@id']) : null))
        ))
      })
    })

    var body = React.DOM.tbody({}, rows)

    return React.DOM.table({id: this.props.subject['@id'], className: 'table table-striped table-graph'}, head, body)
  }
})

var createJsonLdSubjectTable = React.createFactory(JsonLdSubjectTable)

var JsonLdTables = React.createClass({
  render: function () {
    var vocab = this.props.vocab

    var subjects = this.props.graph.sort(subjectSort(this.props.labelPredicates))

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
    return jsonld.promises.expand(flat).then(function (json) {
      // if data contains quads, use the first graph
      if (json.length && '@graph' in json[0]) {
        json = json[0]['@graph']
      }

      return json
    })
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
  var labelPredicates = ['http://schema.org/name']

  var title = createJsonLdTitle({graph: graph, labelPredicates: labelPredicates})
  React.render(title, document.getElementById('title'))

  var sticky = createJsonLdSticky({graph: graph})
  React.render(sticky, document.getElementById('sticky'))

  var tables = createJsonLdTables({graph: graph, vocab: vocab, labelPredicates: labelPredicates})
  React.render(tables, document.getElementById('graph'))
}).catch(function (error) {
  console.error(error)
})
