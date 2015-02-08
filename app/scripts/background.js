'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
    console.log('previousVersion', details.previousVersion);
});

var exposedSettings = {};

var MIN_VOTES = 20;
var freake = 'http://freake.ru';
var freakefy = function (s) {
    return freake + s;
};

var settingsLoader = jQuery.Deferred();

settingsLoader.done(function (settings) {
    console.log('settings loaded:', settings);
    exposedSettings = settings;
});

var saveSettings = function () {
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

chrome.storage.sync.get(['releases', 'styles'], function (settings) {
    settings = jQuery.extend({
        releases: {},
        styles: []
    }, settings);
    settingsLoader.resolve(settings);
});

var loadAndParsePage = function (pageUrl) {
    jQuery.each(exposedSettings.releases || {}, function (releaseId, releaseData) {
        releaseData.actualInfo = false;
    });

    jQuery.get(pageUrl, function (data) {
        data = jQuery(data);

        var musics = data.find('.music-small');
        musics.each(function () {
            var music = jQuery(this),
                releaseId = +music.find('.elps a').attr('href').slice(1);


            if (exposedSettings.releases[releaseId] && exposedSettings.releases[releaseId].viewed === true) {
                return;
            }

            var votes = +music.find('.ms-rate .info').text().replace(/\D/g, '');

            if (votes < MIN_VOTES) {
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
            loadAndParsePage(freakefy(nextPage));
        } else {
            console.log('exposedSettings.releases', exposedSettings.releases);
            saveSettings();
        }
    });
};
var initParse = function () {
    var styles = exposedSettings.styles.map(function (style) {
        return 'sid%5B%5D=' + style;
    }).join('&');
    loadAndParsePage(freakefy('/music/filter?' + styles + '&int=d%2C3&s=rate&o=desc'));
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

