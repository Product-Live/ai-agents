// Parse the collected results of analyze_items and build suggestion_create operations.
//
// Data: loopOutput (numbered entries containing collect_ai_result.result), screenId,
// suggestionName. Each collected result has itemId, success and optional content.
//
// Each AI answer is expected to be {"corrections": [{"fieldKey", "fieldType", "correctedValue"}]}.
// A failed entry, a missing content, an unparsable answer or an unexpected shape counts as one
// error and does not stop the others.
var data = $.data || {};
var loopOutput = data.loopOutput || {};
var results = Object.keys(loopOutput).filter(function (key) {
    return /^[0-9]+$/.test(key);
}).sort(function (left, right) {
    return Number(left) - Number(right);
}).map(function (key) {
    var entry = loopOutput[key] || {};
    return entry.collect_ai_result ? entry.collect_ai_result.result : null;
});
var screenId = String(data.screenId);
var suggestionName = data.suggestionName;

var operations = [];
var processedCount = 0;
var errorCount = 0;
var suggestionsCount = 0;
var opKey = 1;

for (var i = 0; i < results.length; i++) {
    var result = results[i] || {};

    if (!result.success) {
        errorCount++;
        log('Item ' + result.itemId + ': the AI request failed');
        continue;
    }

    var content = result.content;
    if (content == null) {
        errorCount++;
        log('Item ' + result.itemId + ': no content in the answer');
        continue;
    }

    var parsed;
    if (typeof content === 'string') {
        try {
            parsed = JSON.parse(content);
        } catch (e) {
            errorCount++;
            log('Item ' + result.itemId + ': the answer is not valid JSON');
            continue;
        }
    } else if (typeof content === 'object') {
        parsed = content;
    } else {
        errorCount++;
        log('Item ' + result.itemId + ': unsupported answer content');
        continue;
    }

    if (parsed == null || typeof parsed !== 'object' || !Array.isArray(parsed.corrections)) {
        errorCount++;
        log('Item ' + result.itemId + ': the answer must contain a corrections array');
        continue;
    }

    processedCount++;
    var corrections = parsed.corrections;
    if (corrections.length === 0) {
        continue;
    }

    var itemId = String(result.itemId);

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
    operationCount: operations.length,
    operations: operations,
    processedCount: processedCount,
    errorCount: errorCount
};
