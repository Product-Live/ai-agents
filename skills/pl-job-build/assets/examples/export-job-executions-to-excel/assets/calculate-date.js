// Compute the start date of the report.
// $.data.days comes from a TEXT user input, so it is a string ("30"); parse it and fall back to 30.
var days = parseInt($.data.days, 10);
if (isNaN(days) || days <= 0) {
    log('Invalid or missing "days" value (' + $.data.days + '), defaulting to 30');
    days = 30;
}

var startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
log('Report window: executions created after ' + startDate.toISOString() + ' (' + days + ' days)');

return {
    startDateISO: startDate.toISOString(),
    daysRequested: days
};
