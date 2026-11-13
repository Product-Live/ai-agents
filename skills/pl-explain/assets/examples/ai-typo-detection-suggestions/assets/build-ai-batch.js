// Build the task list of the run_ai_prompts batch: one ai-prompt-execute entry per selected item
// that holds at least one flagged field with a value.
//
// Resources: items (JSON), fields (JSON, the field definitions of the table), promptTemplate (TEXT).
// Data: metadataKey, provider, model, apiKey, screenId, suggestionName.
//
// Returns { tasks: { tasks: [...] }, tasksCount, skippedCount, totalItems }. The nested
// tasks object is injected whole into request.json of task-batch-execute.
var resources = $.resources || [];
var data = $.data || {};
var metadataKey = data.metadataKey;
var provider = data.provider;
var model = data.model;
var apiKey = data.apiKey;
var suggestionName = data.suggestionName;

function resource(key) {
    for (var i = 0; i < resources.length; i++) {
        if (resources[i].key === key) {
            return resources[i].content;
        }
    }
    return null;
}

// A find result is normally an array; tolerate grouped pages and { response } wrappers
function asList(content) {
    var list;
    if (Array.isArray(content)) {
        list = content;
    } else if (content && typeof content === 'object') {
        list = [];
        var keys = Object.keys(content);
        for (var i = 0; i < keys.length; i++) {
            var val = content[keys[i]];
            if (Array.isArray(val)) {
                list = list.concat(val);
            } else {
                list.push(val);
            }
        }
    } else {
        list = [];
    }
    if (list.length > 0 && list[0] && list[0].response) {
        list = list.map(function (entry) {
            return entry.response;
        });
    }
    return list;
}

var items = asList(resource('items'));
var fieldDefs = asList(resource('fields'));
var promptTemplate = resource('promptTemplate') || '';

log('Items: ' + items.length + ', field definitions: ' + fieldDefs.length + ', suggestion name: ' + suggestionName);

// Target keys: field definitions whose metadata[metadataKey] is true or "true"
var targetKeys = {};
var targetKeysList = [];
for (var c = 0; c < fieldDefs.length; c++) {
    var fd = fieldDefs[c] || {};
    var flag = fd.metadata ? fd.metadata[metadataKey] : undefined;
    if (flag === true || flag === 'true') {
        targetKeys[fd.key] = true;
        targetKeysList.push(fd.key);
    }
}
log('Fields flagged with ' + metadataKey + ': ' + (targetKeysList.length > 0 ? targetKeysList.join(', ') : 'NONE'));
if (targetKeysList.length === 0) {
    log('WARNING: no field definition carries the metadata "' + metadataKey + '" set to true. Set it on the fields to check (table settings > fields > metadata).');
}

var tasks = [];
var skippedCount = 0;

for (var d = 0; d < items.length; d++) {
    var item = items[d] || {};
    var fields = item.fields || [];
    var textFields = [];

    for (var e = 0; e < fields.length; e++) {
        var field = fields[e];
        if (targetKeys[field.key] && field.value && field.value.data) {
            textFields.push({
                key: field.key,
                type: field.type,
                value: field.value.data
            });
        }
    }

    if (textFields.length === 0) {
        skippedCount++;
        continue;
    }

    var prompt = promptTemplate.replace('{{FIELDS}}', JSON.stringify(textFields, null, 2));

    // The inputs object is exactly what the ai-prompt-execute task would receive in its own
    // inputParameters. temperature is deliberately not set: several current models reject it.
    tasks.push({
        key: 'item-' + item.id,
        inputs: {
            provider: provider,
            model: model,
            prompt: prompt,
            apiKey: apiKey,
            responseFormat: 'json_object',
            maxTokens: 1024
        }
    });
}

log('Built ' + tasks.length + ' AI task(s), ' + skippedCount + ' item(s) skipped (no flagged field with a value)');

return {
    tasks: {
        tasks: tasks
    },
    tasksCount: tasks.length,
    skippedCount: skippedCount,
    totalItems: items.length
};
