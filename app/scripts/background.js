'use strict';

chrome.runtime.onInstalled.addListener(function(details) {});

var releases;

const setBadge = function(text) {
  chrome.browserAction.setBadgeText({
    text: text,
  });
};

const loadingBadge = (function() {
  let showLoading = false;
  return {
    show: function() {
      if (showLoading) {
        return;
      }
      showLoading = true;

      setBadge('...');
    },
    hide: function() {
      showLoading = false;
    },
  };
})();

const sendMessage = function(releases) {
  chrome.runtime.sendMessage({ releases });
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

  let notViewed = 0;
  jQuery.each(settings.releases, function() {
    if (!this.viewed) {
      notViewed += 1;
    }
  });

  loadingBadge.hide();
  setBadge((notViewed || '').toString());
};

var loadSettings = function() {
  const settingsLoader = jQuery.Deferred();

  settingsLoader.done(function(settings) {});

  chrome.storage.local.get(defaultSettings, function(settings) {
    settingsLoader.resolve(settings);
  });
  return settingsLoader.promise();
};

let parseProgress = null;
const loadAndParsePage = function(pageUrl, settings, releasesFromThisParse) {
  jQuery
    .get(pageUrl, function(data) {
      let shouldStop = false;

      data = jQuery(
        data.replace(/(<img src=")(\/upload[^"]+)("[^>]+>)/g, (all, before, src, after) =>
          `${before}${freakefy(src)}${after}`.replace('<img', '<span class="ex-img"'),
        ),
      );

      data.find('.music-small').each(function() {
        const music = jQuery(this);
        const releaseId = Number(
          music
            .find('.elps a')
            .attr('href')
            .slice(1),
        );

        releasesFromThisParse.push(releaseId);

        if (settings.releases[releaseId] && settings.releases[releaseId].viewed === true) {
          return;
        }

        const votes = +music
          .find('.ms-rate .info')
          .text()
          .replace(/\D/g, '');

        if (votes < settings.minVotes) {
          if (votes <= settings.minVotes / 2) {
            shouldStop = true;
          }

          return;
        }

        const coverImg = music.find('.ms-image .ex-img');

        const musicData = {};

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

      const nextPage = data
        .find('.pagination li:not(.pagination-ext):has(span)')
        .next()
        .find('a')
        .attr('href');

      if (nextPage && !shouldStop) {
        setTimeout(() => {
          loadAndParsePage(freakefy(nextPage), settings, releasesFromThisParse);
        }, 1000);
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
    const styles = settings.styles
      .map(function(style) {
        return 'sid%5B%5D=' + style;
      })
      .join('&');
    loadAndParsePage(freakefy('/music/filter?' + styles + initialMusicFilter), settings, []);
  });
};

const finishParse = function() {
  if (parseProgress) {
    parseProgress.reject();
  }
  parseProgress = null;
  chrome.alarms.create('initParse', { delayInMinutes: 120 });
};

initParse();

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'initParse') {
    initParse();
  }
});
