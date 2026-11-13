// Parse the EAN list typed in the TEXTAREA input: one EAN per line, blanks and duplicates removed.
var raw = $.data.eans == null ? '' : String($.data.eans);
var lines = raw.split(/\r?\n/);
var eans = [];
for (var i = 0; i < lines.length; i++) {
    var ean = lines[i].trim();
    if (ean !== '' && eans.indexOf(ean) === -1) {
        eans.push(ean);
    }
}
if (eans.length === 0) {
    throw new Error("The 'eans' input must contain at least one EAN (one per line)");
}
log('Requested EANs: ' + eans.length);
// eansCsv is the only value the export-items-by-ean job consumes: it feeds the export
// request XSLT, whose parameters are scalar strings. count is only reported in the job output.
return { eansCsv: eans.join(','), count: eans.length };
