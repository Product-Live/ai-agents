// Validate the job configuration (the data object of the prepare_inputs task) and read the
// table and screen ids from the launch context. Returns isValid plus the settings, so the
// following tasks read them from ${prepare_inputs.output.result.*}.
var data = $.data || {};
var context = data.context || null;
var view = context && context.view ? context.view : null;
var tableId = view && view.table && view.table.id != null ? view.table.id : null;
var screenId = view && view.screen && view.screen.id != null ? view.screen.id : null;

var PROVIDERS = ['openai', 'mistral', 'anthropic'];
var errors = [];

if (typeof data.provider !== 'string' || PROVIDERS.indexOf(data.provider) === -1) {
    errors.push('provider must be one of ' + PROVIDERS.join(', ') + ' (got: "' + (data.provider || '') + '")');
}
if (typeof data.model !== 'string' || data.model.trim() === '') {
    errors.push('model is required');
}
if (typeof data.metadataKey !== 'string' || data.metadataKey.length < 2) {
    errors.push('metadataKey must be a string with at least 2 characters (got: "' + (data.metadataKey || '') + '")');
}
if (typeof data.suggestionName !== 'string' || data.suggestionName.trim() === '') {
    errors.push('suggestionName is required');
}
if (tableId == null) {
    errors.push('No table is defined in the launch context: relaunch this job from a table.');
}
if (screenId == null) {
    errors.push('No screen is defined in the launch context: relaunch this job from a screen.');
}

var isValid = errors.length === 0;
if (!isValid) {
    log('Validation errors: ' + errors.join('; '));
} else {
    log('Configuration OK: provider=' + data.provider + ', model=' + data.model + ', metadataKey=' + data.metadataKey + ', tableId=' + tableId + ', screenId=' + screenId);
}

return {
    isValid: isValid,
    validationErrors: errors.join('; '),
    tableId: tableId,
    screenId: screenId,
    provider: data.provider,
    model: data.model,
    metadataKey: data.metadataKey,
    suggestionName: data.suggestionName
};
