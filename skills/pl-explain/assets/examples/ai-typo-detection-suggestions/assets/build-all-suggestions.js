// Parse the results of the run_ai_prompts batch and build the suggestion_create operations.
//
// Data: batchResults (the inline result list of task-batch-execute: one entry per item,
// { key, index, status, success, output: { content, ... } | error }), screenId, suggestionName.
//
// Each AI answer is expected to be {"corrections": [{"fieldKey", "fieldType", "correctedValue"}]}.
// A failed entry, a missing content, an unparsable answer or an unexpected shape counts as one
// error and does not stop the others.
var data = $.data || {};
var batchResults = data.batchResults || [];
var screenId = String(data.screenId);
var suggestionName = data.suggestionName;

var operations = [];
var processedCount = 0;
var errorCount = 0;
var suggestionsCount = 0;
var opKey = 1;

for (var i = 0; i < batchResults.length; i++) {
    var result = batchResults[i] || {};

    if (!result.success) {
        errorCount++;
        log('Item ' + result.key + ' failed: ' + JSON.stringify(result.error));
        continue;
    }

    var content = result.output != null ? result.output.content : null;
    if (content == null) {
        errorCount++;
        log('Item ' + result.key + ': no content in the answer');
        continue;
    }

    var parsed;
    if (typeof content === 'string') {
        try {
            parsed = JSON.parse(content);
        } catch (e) {
            errorCount++;
            log('Item ' + result.key + ': the answer is not valid JSON: ' + e);
            continue;
        }
    } else if (typeof content === 'object') {
        parsed = content;
    } else {
        errorCount++;
        log('Item ' + result.key + ': unsupported answer content');
        continue;
    }

    if (parsed == null || typeof parsed !== 'object' || !Array.isArray(parsed.corrections)) {
        errorCount++;
        log('Item ' + result.key + ': the answer must contain a corrections array');
        continue;
    }

    processedCount++;
    var corrections = parsed.corrections;
    if (corrections.length === 0) {
        continue;
    }

    // The batch key is "item-<id>"
    var itemId = String(result.key).replace('item-', '');

    var fields = [];
    for (var j = 0; j < corrections.length; j++) {
        var correction = corrections[j];
        if (correction == null || !correction.fieldKey || !correction.correctedValue) {
            continue;
        }
        fields.push({
            key: correction.fieldKey,
            type: correction.fieldType || 'SINGLE-LINE-TEXT',
            value: {
                data: correction.correctedValue
            }
        });
    }

    if (fields.length === 0) {
        continue;
    }

    suggestionsCount += fields.length;
    operations.push({
        key: String(opKey++),
        element: {
            object: 'suggestion_create',
            itemId: itemId,
            screenId: screenId,
            hasCreatedItem: false,
            emitterName: suggestionName,
            fields: fields
        }
    });
}

log('Processed: ' + processedCount + ', errors: ' + errorCount + ', corrected values: ' + suggestionsCount + ' across ' + operations.length + ' item(s)');

return {
    hasSuggestions: operations.length > 0,
    suggestionsCount: suggestionsCount,
    operations: operations,
    processedCount: processedCount,
    errorCount: errorCount
};
