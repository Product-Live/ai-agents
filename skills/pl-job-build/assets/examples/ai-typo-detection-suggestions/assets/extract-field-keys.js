// Collect the unique field keys carried by the selected items, and count the items.
// The items resource is the JSON attachment of data-item-find (findMode USER_SELECTION).
var resources = $.resources || [];
var itemsResource = null;
for (var r = 0; r < resources.length; r++) {
    if (resources[r].key === 'items') {
        itemsResource = resources[r];
    }
}
var rawItems = itemsResource ? itemsResource.content : [];

// Normalise: an array, or an object whose values are arrays (grouped pages), or a single object
var items;
if (Array.isArray(rawItems)) {
    items = rawItems;
} else if (rawItems && typeof rawItems === 'object') {
    items = [];
    var objKeys = Object.keys(rawItems);
    for (var i = 0; i < objKeys.length; i++) {
        var val = rawItems[objKeys[i]];
        if (Array.isArray(val)) {
            items = items.concat(val);
        } else {
            items.push(val);
        }
    }
} else {
    items = [];
}

// Unwrap { response: item } entries if present
if (items.length > 0 && items[0] && items[0].response) {
    items = items.map(function (item) {
        return item.response;
    });
}

var keySet = {};
var keys = [];
for (var j = 0; j < items.length; j++) {
    var fields = (items[j] && items[j].fields) || [];
    for (var k = 0; k < fields.length; k++) {
        if (!keySet[fields[k].key]) {
            keySet[fields[k].key] = true;
            keys.push(fields[k].key);
        }
    }
}

log('Extracted ' + keys.length + ' unique field key(s) from ' + items.length + ' item(s)');

return {
    keys: keys,
    keyCount: keys.length,
    itemCount: items.length
};
