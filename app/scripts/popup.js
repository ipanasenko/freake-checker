'use strict';

var bg = chrome.extension.getBackgroundPage(), musicContainer = jQuery('#music-container');

bg.loadSettings().done(function (settings) {
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
			</tbody></table>\
			<div class="ms-style elps"><button>mark as viewed</button></div>\
		</div>\
	</div>';

  var loadReleases = function (releases) {
    releases = releases || bg.releases;

    if (!releases) {
      musicContainer.html('loading...');
      return;
    }

    musicContainer.empty();

    var sorted = [];
    jQuery.each(releases, function () {
      if (this.viewed) {
        return;
      }
      sorted.push(this);
    });

    sorted = sorted.sort(function (a, b) {
      return parseFloat(b.votes) - parseFloat(a.votes);
    });

    jQuery.each(sorted.slice(0, 10), function (i, releaseData) {
      var music = jQuery(insertDataInTemplate(template, releaseData));

      musicContainer.append(music);
    });
  };

  loadReleases();
  chrome.runtime.onMessage.addListener(function (request) {
    loadReleases(request.releases);
  });

  var setReleaseAsViewed = function (settings, id, doSave) {
    settings.releases[id] = {
      viewed: true
    };

    if (doSave) {
      bg.saveSettings(settings);
    }
  };

  jQuery(document)
    .on('click', 'a', function (e) {
      e.preventDefault();
    })
    .on('click', '.music-small a', function () {
      chrome.tabs.create({
        url: this.href
      });
    })
    .on('click', '.music-small button', function () {
      var musicWrapper = jQuery(this).closest('.music-small');
      var id = musicWrapper.data('release-id');

      setReleaseAsViewed(settings, id, true);
      musicWrapper.remove();
    })
    .on('click', '#markAll', function () {
      jQuery('.music-small').each(function () {
        var id = jQuery(this).data('release-id');

        setReleaseAsViewed(settings, id, false);
      });
      bg.saveSettings(settings);
      loadReleases();
    })
    .on('click', '#openAll', function () {
      jQuery('.music-small').each(function (i) {
        var id = jQuery(this).data('release-id'),
          url = jQuery(this).find('a').attr('href');

        setTimeout(function () {
          chrome.tabs.create({
            url: url
          });
        }, i);

        setReleaseAsViewed(settings, id, false);
      });

      bg.saveSettings(settings);
      loadReleases();
    });
});