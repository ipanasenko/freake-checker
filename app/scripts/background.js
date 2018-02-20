'use strict';

chrome.runtime.onInstalled.addListener(function(details) {});

var releases;

var setBadge = function(text) {
  chrome.browserAction.setBadgeText({
    text: text,
  });
};

var loadingBadge = (function() {
  var showLoading = false;
  return {
    show: function() {
      if (showLoading) {
        return;
      }
      showLoading = true;

      var text = '    ...'.split('');

      (function update() {
        if (!showLoading) {
          return;
        }

        setBadge(text.join(''));
        setTimeout(function() {
          text.push(text.shift());
          update();
        }, 100);
      })();
    },
    hide: function() {
      showLoading = false;
    },
  };
})();

var sendMessage = function(releases) {
  chrome.runtime.sendMessage({ releases: releases });
};

var saveSettings = function(settings, releasesFromThisParse) {
  // remove not needed ids from settings, to free some space
  if (releasesFromThisParse) {
    Object.keys(settings.releases).forEach(function(releaseId) {
      if (releasesFromThisParse.indexOf(+releaseId) === -1) {
        delete settings.releases[releaseId];
      }
    });
  }

  chrome.storage.local.set(settings, function() {});

  releases = settings.releases;
  sendMessage(releases);

  var notViewed = 0;
  jQuery.each(settings.releases, function() {
    if (!this.viewed) {
      notViewed += 1;
    }
  });

  loadingBadge.hide();
  setBadge((notViewed || '').toString());
};

var loadSettings = function() {
  var settingsLoader = jQuery.Deferred();

  settingsLoader.done(function(settings) {});

  chrome.storage.local.get(defaultSettings, function(settings) {
    settingsLoader.resolve(settings);
  });
  return settingsLoader.promise();
};

var parseProgress = null;
var loadAndParsePage = function(pageUrl, settings, releasesFromThisParse) {
  jQuery
    .get(pageUrl, function(data) {
      data = jQuery(
        data.replace(/(<img src=")(\/upload[^"]+)("[^>]+>)/g, function(all, before, src, after) {
          return `${before}${freakefy(src)}${after};`;
        }),
      );

      data.find('.music-small').each(function() {
        var music = jQuery(this);
        var releaseId = +music
          .find('.elps a')
          .attr('href')
          .slice(1);

        releasesFromThisParse.push(releaseId);

        if (settings.releases[releaseId] && settings.releases[releaseId].viewed === true) {
          return;
        }

        var votes = +music
          .find('.ms-rate .info')
          .text()
          .replace(/\D/g, '');

        if (votes < settings.minVotes) {
          return;
        }

        var coverImg = music.find('.ms-image img');

        var musicData = {};

        musicData.id = releaseId;
        musicData.cover = coverImg.attr('src');
        musicData.title = coverImg.attr('alt');
        musicData.performerAndTitle = music.find('.elps a').text();
        musicData.votes = votes;
        musicData.rating = music
          .find('.ms-rate .current')
          .css('width')
          .slice(0, -2);
        musicData.styles = music
          .find('td.type:contains("Style")')
          .next()
          .text();
        musicData.released = music
          .find('td.type:contains("Released")')
          .next()
          .text();

        settings.releases[releaseId] = musicData;
      });

      if (parseProgress && parseProgress.state() === 'rejected') {
        parseProgress = null;
        initParse();
        return;
      }

      var nextPage = data
        .find('.pagination li:not(.pagination-ext):has(span)')
        .next()
        .find('a')
        .attr('href');

      if (nextPage) {
        loadAndParsePage(freakefy(nextPage), settings, releasesFromThisParse);
      } else {
        saveSettings(settings, releasesFromThisParse);
        finishParse();
      }
    })
    .error(function() {
      saveSettings(settings);
      finishParse();
    });
};

var initParse = function() {
  if (parseProgress) {
    parseProgress.reject();
    parseProgress = null;
    loadingBadge.hide();
    return;
  }

  parseProgress = jQuery.Deferred();
  loadingBadge.show();

  loadSettings().done(function(settings) {
    var styles = settings.styles
      .map(function(style) {
        return 'sid%5B%5D=' + style;
      })
      .join('&');
    loadAndParsePage(freakefy('/music/filter?' + styles + initialMusicFilter), settings, []);
  });
};

var finishParse = function() {
  parseProgress.reject();
  parseProgress = null;
  chrome.alarms.create('initParse', { delayInMinutes: 30 });
};

initParse();

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'initParse') {
    initParse();
  }
});
