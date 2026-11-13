// $.resources is an array of { key, content }; content is already parsed according to loadAs:
//   XML  -> an object tree built from the XML document
//   TEXT -> the raw string
//   JSON -> the parsed value
function resource(key) {
    for (var i = 0; i < $.resources.length; i++) {
        if ($.resources[i].key === key) {
            return $.resources[i].content;
        }
    }
    return null;
}

var xml = resource('xml');
var txt = resource('txt');
var json = resource('json');

log('XML loaded: ' + JSON.stringify(xml));
log('TXT loaded: ' + txt);
log('JSON loaded: ' + JSON.stringify(json));

// Returning an object with "response": "FILE" serialises it into resources.json
return { xml: xml, txt: txt, json: json };
