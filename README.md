# trifid-renderer-simple

A simple renderer for Trifid.
To inject the graph into the response HTML, Mustache is used to render the HTML template. 

## Usage

Only the `template` options must be provided.
The `renderer` prefix can be used to point to files in the `trifid-renderer-simple` package folder.
The `vocab` property can be used to provide a JSON-LD file that contains RDF Schema triples with labels for the predicates. 

## Example

The following example tells Trifid to use the `trifid-renderer-simple` renderer and points to the default template and vocab: 

```
"renderer": {
  "module": "trifid-renderer-simple",
  "template": "renderer:templates/index.html",
  "vocab": "renderer:vocab.json" 
}
```
