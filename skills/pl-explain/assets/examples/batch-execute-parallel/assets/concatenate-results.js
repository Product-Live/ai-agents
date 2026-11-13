// Concatenate the results of a task-batch-execute run into a single JSON document.
//
// $.data.results is the inline result list of the batch (one entry per batch task, in input
// order): { key, index, status, success, output }. Here every batch task is a data-*-find
// returning { totalElements, result: { json: [...] }, message }, so the entities of each find
// are read from output.result.json and grouped under the batch task key ("accounts", "users").
var results = $.data.results || [];
var sections = {};
var totalElements = 0;
var failedTasks = [];

for (var i = 0; i < results.length; i++) {
    var entry = results[i] || {};
    var key = entry.key || 'task_' + (i + 1);

    if (entry.success !== true) {
        log('Batch task "' + key + '" did not succeed (status=' + entry.status + '), skipped');
        failedTasks.push(key);
        continue;
    }

    var output = entry.output || {};
    var elements = output.result != null && output.result.json != null ? output.result.json : [];
    sections[key] = {
        totalElements: elements.length,
        elements: elements
    };
    totalElements += elements.length;
    log('Batch task "' + key + '" returned ' + elements.length + ' element(s)');
}

log('Concatenation complete: ' + totalElements + ' element(s) from ' + results.length + ' batch task(s)');

// With "response": "FILE", the returned object is serialised into accounts-and-users.json
return {
    totalElements: totalElements,
    failedTasks: failedTasks,
    sections: sections
};
