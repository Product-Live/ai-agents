var items = $.data.items || [];
var partitions = $.data.partitions || [];
var fieldKey = $.data.fieldKey;
var optionKey = $.data.optionKey || '';
var tableKey = $.data.tableKey;
var screenKey = $.data.screenKey || '';
var appDomain = $.data.appDomain || 'app.product-live.com';

// In partitionSelection=TABLE mode, data-item-find merges the partitions and the
// returned items carry no partition key. itemMetadata.partitionId is the only way
// back, so the keys the access links need come from data-partition-find.
var partitionKeyById = {};
for (var i = 0; i < partitions.length; i++) {
    partitionKeyById[String(partitions[i].id)] = partitions[i].key;
}

// One access link per partition, not per item: every match shares the same option
// value, so an item-level filter would return the whole partition anyway.
var countByPartition = {};
var partitionOrder = [];
var unresolved = 0;

for (var j = 0; j < items.length; j++) {
    var metadata = items[j].itemMetadata || {};
    var key = partitionKeyById[String(metadata.partitionId)];
    if (!key) {
        unresolved++;
        continue;
    }
    if (countByPartition[key] === undefined) {
        countByPartition[key] = 0;
        partitionOrder.push(key);
    }
    countByPartition[key]++;
}

log('Found ' + items.length + ' item(s) with ' + fieldKey + ' = ' + optionKey + ' in ' + partitionOrder.length + ' partition(s)');
if (unresolved > 0) {
    log('WARNING: ' + unresolved + ' item(s) carried a partition id absent from the partition list and are not linked');
}

// Option keys are the stable <Option key="..."> values, always ASCII, so btoa()
// cannot fail here the way it would on a localized option title.
var filterJson = '[{"fieldKey":"' + fieldKey + '","operator":"equals","criteria":{"list":["' + optionKey + '"]}}]';
var filterB64 = btoa(filterJson);

var html = [];
html.push('<html><head><style>');
html.push('body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; color: rgba(0,0,0,0.88); padding: 0 4px; }');
html.push('b { display: block; margin-bottom: 4px; }');
html.push('ul { padding-left: 20px; margin: 0 0 12px 0; }');
html.push('li { margin-bottom: 2px; }');
html.push('</style></head><body>');

if (items.length > 0 && partitionOrder.length > 0) {
    html.push('<b>' + items.length + ' item(s) found with ' + fieldKey + ' = ' + optionKey + '</b>');
    html.push('<ul>');

    for (var k = 0; k < partitionOrder.length; k++) {
        var partitionKey = partitionOrder[k];
        var link = 'https://' + appDomain + '/redirect?tableKey=' + tableKey + '&partitionKey=' + partitionKey;
        if (screenKey) {
            link += '&screenKey=' + screenKey;
        }
        link += '&filters=' + filterB64;

        var label = partitionKey + ' - ' + countByPartition[partitionKey] + ' item(s)';
        html.push('<li><a href="' + link + '" target="_blank">' + label + '</a></li>');
    }

    html.push('</ul>');
} else {
    html.push('<p>No item found with ' + fieldKey + ' = ' + optionKey + '.</p>');
}

html.push('</body></html>');

return {
    html: html.join('\n'),
    messageHeight: Math.min(Math.max(80 + partitionOrder.length * 22, 150), 600),
    foundCount: items.length,
    partitionCount: partitionOrder.length
};
