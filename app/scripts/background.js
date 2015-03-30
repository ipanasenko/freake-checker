'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
  console.log('previousVersion', details.previousVersion);
});

var setBadge = function (text) {
  chrome.browserAction.setBadgeText({
    text: text
  });
};

var loadingBadge = (function () {
  var showLoading = false;
  return {
    show: function () {
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
        setTimeout(function () {
          text.push(text.shift());
          update();
        }, 100);
      }());
    },
    hide: function () {
      showLoading = false;
    }
  }
}());

var saveSettings = function (settings, releasesFromThisParse) {
  // remove not needed ids from settings, to free some space
  console.log('releasesFromThisParse', releasesFromThisParse);
  if (releasesFromThisParse) {
    console.log(settings.releases);
    Object.keys(settings.releases).forEach(function (releaseId) {
      if (releasesFromThisParse.indexOf(+releaseId) === -1) {
        console.log('delete', releaseId);
        delete settings.releases[releaseId];
      }
    });
    console.log(settings.releases);
  }

  chrome.storage.local.set(settings, function () {
    console.log('saved');
  });

  var notViewed = 0;
  jQuery.each(settings.releases, function () {
    if (!this.viewed) {
      notViewed += 1;
    }
  });

  console.log('not viewed:', notViewed);
  loadingBadge.hide();
  setBadge((notViewed || '').toString());
};

var setReleaseAsViewed = function (settings, id, doSave) {
  settings.releases[id] = {
    viewed: true
  };
  doSave && saveSettings(settings);
};

var loadSettings = function () {
  var settingsLoader = jQuery.Deferred();

  settingsLoader.done(function (settings) {
    console.log('settings loaded:', settings);
  });

  chrome.storage.local.get(defaultSettings, function (settings) {
    settingsLoader.resolve(settings);
  });
  return settingsLoader.promise();
};

var parseProgress = null;
var loadAndParsePage = function (pageUrl, settings, releasesFromThisParse) {
  jQuery.each(settings.releases || {}, function (releaseId, releaseData) {
    releaseData.actualInfo = false;
  });

  jQuery.get(pageUrl, function (data) {
    data = jQuery(data);

    data.find('.music-small').each(function () {
      var music = jQuery(this),
          releaseId = +music.find('.elps a').attr('href').slice(1);

      releasesFromThisParse.push(releaseId);

      if (settings.releases[releaseId] && settings.releases[releaseId].viewed === true) {
        return;
      }

      var votes = +music.find('.ms-rate .info').text().replace(/\D/g, '');

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
      musicData.rating = music.find('.ms-rate .current').css('width').slice(0, -2);
      musicData.styles = music.find('td.type:contains("Style")').next().text();
      musicData.released = music.find('td.type:contains("Released")').next().text();
      musicData.actualInfo = true;

      settings.releases[releaseId] = musicData;
    });

    if (parseProgress.state() === 'rejected') {
      console.log('cancelled');
      parseProgress = null;
      initParse();
      return;
    }

    var nextPage = data.find('.pagination li:not(.pagination-ext):has(span)').next().find('a').attr('href');
    if (nextPage) {
      loadAndParsePage(freakefy(nextPage), settings, releasesFromThisParse);
    } else {
      saveSettings(settings, releasesFromThisParse);
      parseProgress = null;
    }
  });
};

var initParse = function () {
  if (parseProgress) {
    console.log('canceling');
    parseProgress.reject();
    return;
  }

  console.log('staring');
  parseProgress = jQuery.Deferred();
  loadingBadge.show();

  loadSettings().done(function (settings) {
    var styles = settings.styles.map(function (style) {
      return 'sid%5B%5D=' + style;
    }).join('&');
    loadAndParsePage(freakefy('/music/filter?' + styles + initialMusicFilter), settings, []);
  });
};

initParse();
chrome.alarms.create('initParse', {
  delayInMinutes: 30,
  periodInMinutes: 30
});
chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'initParse') {
    initParse();
  }
});

