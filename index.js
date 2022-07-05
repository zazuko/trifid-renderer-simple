import fs from 'fs'
import jsonld from 'jsonld'

class SimpleRenderer {
  constructor (options) {
    this.context = { '@vocab': 'http://schema.org/' }
    this.vocab = '{}'
    this.template = options.template
    this.templateError = options.templateError

    if (options.context) {
      this.context = JSON.parse(fs.readFileSync(options.context).toString())
    }

    if (options.vocab) {
      // parse and stringify for compact form
      this.vocab = JSON.stringify(JSON.parse(fs.readFileSync(options.vocab).toString()))
    }

    this.accept = 'application/ld+json'
  }

  render (req, res) {
    this.renderTemplate(this.template, req, res)
  }

  error (req, res) {
    // use error template if define otherwise template
    this.renderTemplate(this.templateError || this.template, req, res)
  }

  renderTemplate (template, req, res) {
    res.locals.statusCode = res.statusCode
    res.locals.vocab = this.vocab

    let graph = {}

    try {
      graph = JSON.parse(res.locals.graph)
    } catch (e) {}

    if (res.locals.jsonldContext) {
      graph['@context'] = res.locals.jsonldContext
    }

    jsonld.promises.compact(graph, this.context).then((compacted) => {
      res.locals.graph = JSON.stringify(compacted)

      res.render(template)
    }).catch((err) => {
      console.error(err.stack || err.message)

      res.render(template)
    })
  }
}

export default SimpleRenderer
