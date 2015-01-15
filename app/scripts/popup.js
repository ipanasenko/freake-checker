'use strict';

console.log('\'Allo \'Allo! Popup');

var bg = chrome.extension.getBackgroundPage();
var settings = bg.exposedSettings,
	freake = bg.freake;

var insertDataInTemplate = (function () {
	var createRegexp = function (t, options) {
		t = t.replace(/[()\[\]\.^$|?+]/g, '\\$&');
		return new RegExp(t, options);
	};
	return function (template, data) {
		jQuery.each(data, function (key, value) {
			template = template.replace(createRegexp('#' + key + '#', 'gi'), value);
		});
		return template;
	};
}());

console.log(settings.releases);

var template = '\
	<div class="music-small clearfix" data-release-id="#id#">\
		<div class="ms-image">\
			<a href="' + freake + '/#id#"><img src="' + freake + '#cover#" alt="#title#"></a>\
		</div>\
		<div class="ms-info">\
			<h3 class="elps"><a href="' + freake + '/#id#" title="#title#">#performerAndTitle#</a></h3>\
			<div class="ms-rate rate-small">\
				<div class="show"><span class="current" style="width:#rating#px;"></span></div>\
				<div class="info"><span>Votes: #votes#</span></div>\
			</div>\
			<div class="ms-style elps">#styles#</div>\
			<table>\
				<tbody><tr><td class="type">Released:</td><td class="cptz"><a href="' + freake + '/music/filter?r=#released#">#released#</a></td></tr>\
				<!--tr><td class="type">Type:</td><td><a href="' + freake + '/music/filter?t=#type#"><b>#type#</b></a></td></tr-->\
				<!--tr><td class="type">Comments:</td><td><a href="' + freake + '/#id##comm">#comments#</a></td></tr-->\
			</tbody></table>\
			<div class="ms-style elps"><button>mark as viewed</button></div>\
		</div>\
	</div>';

var musicContainer = jQuery('#music-container');
var loadReleases = function () {
	musicContainer.empty();

	var sorted = [];
	console.log(settings.releases);
	jQuery.each(settings.releases, function () {
		if (this.viewed) {
			return;
		}

		sorted.push(this);
	});
	console.log(sorted);
	sorted = sorted.sort(function (a, b) {
		return parseFloat(b.votes) - parseFloat(a.votes);
	});

	var ajaxes = [];

	jQuery.each(sorted.slice(0, 10), function (i, releaseData) {
		var music;
		if (releaseData.actualInfo === true) {
			music = jQuery(insertDataInTemplate(template, releaseData));
		} else {
			releaseData.actualInfo = true;

			music = jQuery('<div class="music-small clearfix">Loading release info...</div>');

			var releaseId = releaseData.id;

			var href = bg.freakefy('/' + releaseId);
			var ajax = jQuery.get(href, function (data) {
				data = jQuery(data);

				var coverImg = data.find('.blc-image img');

				var musicData = {};

				musicData.id = releaseId;
				musicData.cover = coverImg.attr('src');
				musicData.title = coverImg.attr('alt');
				musicData.performerAndTitle = data.find('.post-title h1').text();
				musicData.votes = data.find('#rate-v-' + releaseId).text();
				musicData.rating = data.find('#rate-r-' + releaseId).text() / 5 * 80;
				musicData.styles = data.find('td.type:contains("Style")').next().text();
				musicData.released = data.find('td.type:contains("Released")').next().text();
				//				musicData.comments = data.find('td.type:contains("Comments")').next().text();
				//				musicData.type = data.find('td.type:contains("Type")').next().text();
				musicData.actualInfo = true;

				console.log(musicData);
				settings.releases[releaseId] = musicData;

				music.replaceWith(insertDataInTemplate(template, musicData));
			});

			ajaxes.push(ajax);
		}

		musicContainer.append(music);
	});

	jQuery.when.apply(jQuery, ajaxes).then(function () {
		bg.saveSettings();
	});
};

loadReleases();

jQuery(document).on('click', '.music-small a', function () {
	//	var musicWrapper = jQuery(this).closest('.music-small');
	//	var id = musicWrapper.data('release-id');

	//	bg.setReleaseAsViewed(id, true);

	chrome.tabs.create({
		url: this.href
	});

	//	musicWrapper.remove();
}).on('click', '.music-small button', function () {
	var musicWrapper = jQuery(this).closest('.music-small');
	var id = musicWrapper.data('release-id');

	bg.setReleaseAsViewed(id, true);
	musicWrapper.remove();
}).on('click', '#markAll', function () {
	jQuery('.music-small').each(function () {
		var id = jQuery(this).data('release-id');

		bg.setReleaseAsViewed(id, false);
	});
	bg.saveSettings();
	loadReleases();
}).on('click', '#openAll', function () {
	jQuery('.music-small').each(function (i) {
		var id = jQuery(this).data('release-id'),
			url = jQuery(this).find('a').attr('href');

		setTimeout(function () {
			chrome.tabs.create({
				url: url
			});
		}, i);

		bg.setReleaseAsViewed(id, false);
	});

	bg.saveSettings();
	loadReleases();
});