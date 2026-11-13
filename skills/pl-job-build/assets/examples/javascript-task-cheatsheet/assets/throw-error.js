// Throwing fails the task. This is the way to enforce a business rule from a script:
// the error message is visible in the task logs. The task is declared optional in
// job.json, so the job continues and ${throw_error.status} can be read by later tasks.
var items = $.data.items || [];
if (items.length === 0) {
    throw new Error('No item received: at least one item is required');
}
return { count: items.length };
