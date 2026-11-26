// Build one prompt per selected item that has a flagged field with a value.
// Resources: items (JSON), fields (JSON), promptTemplate (TEXT).
// Data: metadataKey. Credentials are bound directly on the AI task in job.json.
// Returns { elements: [{ itemId, prompt }], itemCount, skippedCount, totalItems }.
var resources = $.resources || [];
var metadataKey = ($.data || {}).metadataKey;

function resource(key) {
    for (var i = 0; i < resources.length; i++) {
        if (resources[i].key === key) return resources[i].content;
    }
    return null;
}

// Find results can be arrays, grouped pages or entries with response wrappers.
function asList(content) {
    var list;
    if (Array.isArray(content)) {
        list = content;
    } else if (content && typeof content === 'object') {
        list = [];
        var keys = Object.keys(content);
        for (var i = 0; i < keys.length; i++) {
            var val = content[keys[i]];
            if (Array.isArray(val)) list = list.concat(val);
            else list.push(val);
        }
    } else {
        list = [];
    }
    if (list.length > 0 && list[0] && list[0].response) {
        list = list.map(function (entry) { return entry.response; });
    }
    return list;
}

var items = asList(resource('items'));
var fieldDefs = asList(resource('fields'));
var promptTemplate = resource('promptTemplate') || '';
var targetKeys = {};
for (var c = 0; c < fieldDefs.length; c++) {
    var definition = fieldDefs[c] || {};
    var flag = definition.metadata ? definition.metadata[metadataKey] : undefined;
    if (flag === true || flag === 'true') targetKeys[definition.key] = true;
}

var elements = [];
var skippedCount = 0;
for (var d = 0; d < items.length; d++) {
    var item = items[d] || {};
    var fields = item.fields || [];
    var textFields = [];
    for (var e = 0; e < fields.length; e++) {
        var field = fields[e];
        if (targetKeys[field.key] && field.value && field.value.data) {
            textFields.push({key: field.key, type: field.type, value: field.value.data});
        }
    }
    if (textFields.length === 0) {
        skippedCount++;
        continue;
    }
    elements.push({
        itemId: String(item.id),
        prompt: promptTemplate.replace('{{FIELDS}}', JSON.stringify(textFields, null, 2))
    });
}

log('Built ' + elements.length + ' prompt(s), ' + skippedCount + ' item(s) skipped');
return {elements: elements, itemCount: elements.length, skippedCount: skippedCount, totalItems: items.length};
