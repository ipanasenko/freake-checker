'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
	console.log('previousVersion', details.previousVersion);
});

var exposedSettings = {};

var triggerer = {};

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
	chrome.storage.local.set(exposedSettings, function () {
		console.log('saved');
	});

	var notViewed = 0;
	jQuery.each(exposedSettings.releases, function () {
		if (!this.viewed) {
			notViewed += 1;
		}
	});

	chrome.browserAction.setBadgeText({
		//		text: (Object.keys(exposedSettings.releases).length || '').toString()
		text: (notViewed || '').toString()
	});
};

var setReleaseAsViewed = function (id, doSave) {
	exposedSettings.releases[id] = {
		viewed: true
	};
	doSave && saveSettings();
};

chrome.storage.local.get(['releases'], function (settings) {
	jQuery.extend(settings, {
		releases: {}
	});
	settingsLoader.resolve(settings);
});

var loadAndParsePage = function (pageUrl) {
	jQuery.each(exposedSettings.releases || {}, function (releaseId, releaseData) {
		releaseData.actualInfo = false;
	});


	jQuery.get(pageUrl, function (data) {
		data = jQuery(data);

		settingsLoader.done(function (settings) {

			var musics = data.find('.music-small');
			musics.each(function () {
				var music = jQuery(this),
					releaseId = +music.find('.elps a').attr('href').slice(1);


				if (settings.releases[releaseId] && settings.releases[releaseId].viewed === true) {
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
				//				musicData.comments = music.find('td.type:contains("Comments")').next().text();
				//				musicData.type = music.find('td.type:contains("Type")').next().text();
				musicData.actualInfo = true;

				settings.releases[releaseId] = musicData;
			});

			var nextPage = data.find('.pagination-this').next().find('a').attr('href');
			if (nextPage) {
				loadAndParsePage(freakefy(nextPage));
			} else {
				saveSettings();
			}
		});
	});
};
var initParse = function () {
	loadAndParsePage(freakefy('/music/filter?sid%5B%5D=5&int=d%2C3&s=rate&o=desc'));
};
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