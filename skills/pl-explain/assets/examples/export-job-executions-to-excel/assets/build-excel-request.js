// Build the Generate-Excel request consumed by file-generation-xlsx.
//
// Resources (loaded as JSON by the task):
//   executions : the result of data-job-execution-find, an array of job_execution objects
//                { id, jobId, status, createdAt, startedAt, endedAt, info: { title }, input: { context: { userId } } }
//   users      : the result of data-user-find, an array of user objects
//                { id, firstName, lastName, email, status, role }
//
// The script returns a string: with "response": "FILE" the string is written verbatim
// to the output file named by outputFileName, and ${ref.output.result} is that file.

var resources = $.resources || [];

function resource(key) {
    for (var i = 0; i < resources.length; i++) {
        if (resources[i].key === key) {
            return resources[i].content;
        }
    }
    return null;
}

// A find result is normally an array; be tolerant of an object wrapper.
function asList(content) {
    if (Array.isArray(content)) {
        return content;
    }
    if (content && typeof content === 'object') {
        var keys = Object.keys(content);
        for (var i = 0; i < keys.length; i++) {
            if (Array.isArray(content[keys[i]])) {
                return content[keys[i]];
            }
        }
    }
    return [];
}

var executions = asList(resource('executions'));
var users = asList(resource('users'));
log('Loaded ' + executions.length + ' execution(s) and ' + users.length + ' user(s) for the last ' + $.data.daysRequested + ' day(s)');

var usersById = {};
for (var u = 0; u < users.length; u++) {
    usersById[String(users[u].id)] = users[u];
}

function escapeXml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatDate(value) {
    if (!value) {
        return '';
    }
    return new Date(value).toISOString().replace('T', ' ').substring(0, 19);
}

function textCell(line, column, value) {
    return '<Cell-Text line="' + line + '" column="' + column + '">' + escapeXml(value) + '</Cell-Text>';
}

function numberCell(line, column, value) {
    return '<Cell-Number line="' + line + '" column="' + column + '">' + value + '</Cell-Number>';
}

var headers = [
    'Job Execution ID', 'Job Name', 'Status', 'Started At', 'Ended At',
    'Duration (seconds)', 'Created By (user id)', 'Created By (name)', 'Created By (email)'
];

var cells = [];
for (var h = 0; h < headers.length; h++) {
    cells.push(textCell(1, h + 1, headers[h]));
}

var line = 1;
for (var e = 0; e < executions.length; e++) {
    var exec = executions[e] || {};
    line++;

    var duration = null;
    if (exec.startedAt && exec.endedAt) {
        duration = Math.round((new Date(exec.endedAt) - new Date(exec.startedAt)) / 1000);
    }

    var info = exec.info || {};
    var context = (exec.input && exec.input.context) || {};
    var userId = context.userId ? String(context.userId) : '';
    var user = usersById[userId];
    var userName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
    var userEmail = user && user.email ? user.email : '';

    cells.push(textCell(line, 1, exec.id || ''));
    cells.push(textCell(line, 2, info.title || exec.jobId || ''));
    cells.push(textCell(line, 3, exec.status || ''));
    cells.push(textCell(line, 4, formatDate(exec.startedAt)));
    cells.push(textCell(line, 5, formatDate(exec.endedAt)));
    cells.push(duration === null ? textCell(line, 6, '') : numberCell(line, 6, duration));
    cells.push(textCell(line, 7, userId));
    cells.push(textCell(line, 8, userName));
    cells.push(textCell(line, 9, userEmail));
}

log('Report rows: ' + (line - 1));

var xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Generate-Excel>\n' +
    '  <File>\n' +
    '    <File-Name>job-executions-report.xlsx</File-Name>\n' +
    '    <Template-Key>report</Template-Key>\n' +
    '    <Sheets>\n' +
    '      <Sheet>\n' +
    '        <Sheet-Name>Job Executions</Sheet-Name>\n' +
    '        <Cells>\n' +
    '          ' + cells.join('\n          ') + '\n' +
    '        </Cells>\n' +
    '      </Sheet>\n' +
    '    </Sheets>\n' +
    '  </File>\n' +
    '</Generate-Excel>';

return xml;
