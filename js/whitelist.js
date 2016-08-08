/*******************************************************************************

    µBlock - a browser extension to block requests.
    Copyright (C) 2014 Raymond Hill

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/uBlock
*/

/* global vAPI, uDom, uBlockDashboard */

/******************************************************************************/

(function() {

'use strict';

/******************************************************************************/

var messager = vAPI.messaging.channel('blacklist.js');

/******************************************************************************/

var cachedBlacklist = '';

// Could make it more fancy if needed. But speed... It's a compromise.
var reUnwantedChars = /[\x00-\x09\x0b\x0c\x0e-\x1f!"$'()<>{}|\\^\[\]`~]/;

/******************************************************************************/

var blacklistChanged = function() {
    var textarea = uDom.nodeFromId('blacklist');
    var s = textarea.value.trim();
    var changed = s === cachedBlacklist;
    var bad = reUnwantedChars.test(s);
    uDom.nodeFromId('blacklistApply').disabled = changed || bad;
    uDom.nodeFromId('blacklistRevert').disabled = changed;
    textarea.classList.toggle('bad', bad);
};

/******************************************************************************/

var renderBlacklist = function() {
    var onRead = function(blacklist) {
        cachedBlacklist = blacklist.trim();
        uDom.nodeFromId('blacklist').value = cachedBlacklist + '\n';
        blacklistChanged();
    };
    messager.send({ what: 'getBlacklist' }, onRead);
};

/******************************************************************************/

var handleImportFilePicker = function() {
    var fileReaderOnLoadHandler = function() {
        var textarea = uDom('#blacklist');
        textarea.val([textarea.val(), this.result].join('\n').trim());
        blacklistChanged();
    };
    var file = this.files[0];
    if ( file === undefined || file.name === '' ) {
        return;
    }
    if ( file.type.indexOf('text') !== 0 ) {
        return;
    }
    var fr = new FileReader();
    fr.onload = fileReaderOnLoadHandler;
    fr.readAsText(file);
};

/******************************************************************************/

var startImportFilePicker = function() {
    var input = document.getElementById('importFilePicker');
    // Reset to empty string, this will ensure an change event is properly
    // triggered if the user pick a file, even if it is the same as the last
    // one picked.
    input.value = '';
    input.click();
};

/******************************************************************************/

var exportBlacklistToFile = function() {
    var val = uDom('#blacklist').val().trim();
    if ( val === '' ) {
        return;
    }
    var now = new Date();
    var filename = vAPI.i18n('blacklistExportFilename')
        .replace('{{datetime}}', now.toLocaleString())
        .replace(/ +/g, '_');
    vAPI.download({
        'url': 'data:text/plain;charset=utf-8,' + encodeURIComponent(val + '\n'),
        'filename': filename
    });
};

/******************************************************************************/

var applyChanges = function() {
    cachedBlacklist = uDom.nodeFromId('blacklist').value.trim();
    var request = {
        what: 'setBlacklist',
        blacklist: cachedBlacklist
    };
    messager.send(request, renderBlacklist);
};

var revertChanges = function() {
    uDom.nodeFromId('blacklist').value = cachedBlacklist + '\n';
    blacklistChanged();
};

/******************************************************************************/

var getCloudData = function() {
    return uDom.nodeFromId('blacklist').value;
};

var setCloudData = function(data, append) {
    if ( typeof data !== 'string' ) {
        return;
    }
    var textarea = uDom.nodeFromId('blacklist');
    if ( append ) {
        data = uBlockDashboard.mergeNewLines(textarea.value.trim(), data);
    }
    textarea.value = data.trim() + '\n';
    blacklistChanged();
};

self.cloud.onPush = getCloudData;
self.cloud.onPull = setCloudData;

/******************************************************************************/

uDom('#importBlacklistFromFile').on('click', startImportFilePicker);
uDom('#importFilePicker').on('change', handleImportFilePicker);
uDom('#exportBlacklistToFile').on('click', exportBlacklistToFile);
uDom('#blacklist').on('input', blacklistChanged);
uDom('#blacklistApply').on('click', applyChanges);
uDom('#blacklistRevert').on('click', revertChanges);

renderBlacklist();

/******************************************************************************/

})();
