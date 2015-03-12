'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
    console.log('previousVersion', details.previousVersion);
});

var exposedSettings = {};

var freake = 'http://freake.ru';
var freakefy = function (s) {
    return freake + s;
};

var settingsLoader = jQuery.Deferred();

settingsLoader.done(function (settings) {
    console.log('settings loaded:', settings);
    exposedSettings = settings;
});

var saveSettings = function (releasesFromThisParse) {
    // remove not needed ids from settings, to free some space
    console.log('releasesFromThisParse', releasesFromThisParse);
    if (releasesFromThisParse) {
        console.log(exposedSettings.releases);
        Object.keys(exposedSettings.releases).forEach(function (releaseId) {
            if (releasesFromThisParse.indexOf(+releaseId) === -1) {
                console.log('delete', releaseId);
                delete exposedSettings.releases[releaseId];
            }
        });
        console.log(exposedSettings.releases);
    }

    chrome.storage.sync.set(exposedSettings, function () {
        console.log('saved');
    });

    var notViewed = 0;
    jQuery.each(exposedSettings.releases, function () {
        if (!this.viewed) {
            notViewed += 1;
        }
    });

    console.log('not viewed:', notViewed);
    chrome.browserAction.setBadgeText({
        text: (notViewed || '').toString()
    });
};

var setReleaseAsViewed = function (id, doSave) {
    exposedSettings.releases[id] = {
        viewed: true
    };
    doSave && saveSettings();
};

chrome.storage.sync.get(defaultSettings, function (settings) {
    settingsLoader.resolve(settings);
});

var loadAndParsePage = function (pageUrl, releasesFromThisParse) {
    jQuery.each(exposedSettings.releases || {}, function (releaseId, releaseData) {
        releaseData.actualInfo = false;
    });

    jQuery.get(pageUrl, function (data) {
        data = jQuery(data);

        var musics = data.find('.music-small');
        musics.each(function () {
            var music = jQuery(this),
                releaseId = +music.find('.elps a').attr('href').slice(1);

            releasesFromThisParse.push(releaseId);

            if (exposedSettings.releases[releaseId] && exposedSettings.releases[releaseId].viewed === true) {
                return;
            }

            var votes = +music.find('.ms-rate .info').text().replace(/\D/g, '');

            if (votes < exposedSettings.minVotes) {
                return;
            }

            var coverImg = music.find('.ms-image img');

            var musicData = {};

            musicData.id = releaseId;
            musicData.cover = coverImg.attr('src');
            musicData.title = coverImg.attr('alt');
            musicData.performerAndTitle = music.find('.elps a').text();
            musicData.votes = votes;
            musicData.rating = music.find('.ms-rate .current').css('width').slice(0, -2);
            musicData.styles = music.find('td.type:contains("Style")').next().text();
            musicData.released = music.find('td.type:contains("Released")').next().text();
            musicData.actualInfo = true;

            exposedSettings.releases[releaseId] = musicData;
        });

        var nextPage = data.find('.pagination-this').next().find('a').attr('href');
        if (nextPage) {
            loadAndParsePage(freakefy(nextPage), releasesFromThisParse);
        } else {
            saveSettings(releasesFromThisParse);
        }
    });
};
var initParse = function () {
    var styles = exposedSettings.styles.map(function (style) {
        return 'sid%5B%5D=' + style;
    }).join('&');
    loadAndParsePage(freakefy('/music/filter?' + styles + '&int=d%2C3&s=rate&o=desc'), []);
};
settingsLoader.done(function () {
    initParse();

    chrome.alarms.create('initParse', {
        delayInMinutes: 1,
        periodInMinutes: 30
    });
    chrome.alarms.onAlarm.addListener(function (alarm) {
        if (alarm.name === 'initParse') {
            initParse();
        }
    });

});

