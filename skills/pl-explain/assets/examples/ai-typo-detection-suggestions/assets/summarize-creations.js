// Count actual suggestion ids; missing or rejected responses remain errors.
// Data: results (per-operation responses, or [] after task failure), expectedCount.
var results = Array.isArray($.data.results) ? $.data.results : [];
var createdCount = results.filter(function (entry) {
    return entry && entry.response && entry.response.id;
}).length;
return {createdCount: createdCount, errorCount: Math.max(0, Number($.data.expectedCount) - createdCount)};
