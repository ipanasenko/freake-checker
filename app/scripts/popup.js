'use strict';

const bg = chrome.extension.getBackgroundPage();
const musicContainer = jQuery('#music-container');

const createRegexp = function(t, options) {
  t = t.replace(/[()\[\]\.^$|?+]/g, '\\$&');
  return new RegExp(t, options);
};

bg.loadSettings().done(function(settings) {
  const insertDataInTemplate = function(template, data) {
    jQuery.each(data, function(key, value) {
      template = template.replace(createRegexp('#' + key + '#', 'gi'), value);
    });
    return template;
  };

  const template = `
    <div class="music-small clearfix" data-release-id="#id#">
      <div class="ms-image">
        <a href="${freake}/#id#">
          <img src="#cover#" alt="#title#">
        </a>
      </div>
      <div class="ms-info">
        <h3 class="elps">
          <a href="${freake}/#id#" title="#title#">#performerAndTitle#</a>
        </h3>
        <div class="ms-rate rate-small">
          <div class="show"><span class="current" style="width:#rating#px;"></span></div>
          <div class="info"><span>Votes: #votes#</span></div>
        </div>
        <div class="ms-style elps">#styles#</div>
        <table>
          <tbody><tr><td class="type">Released:</td><td class="cptz">
            <a href="${freake}/music/filter?r=#released#">#released#</a>
          </td></tr>
        </tbody></table>
        <div class="ms-style elps"><button>mark as viewed</button></div>
      </div>
    </div>
	`;

  const loadReleases = function(releases) {
    releases = releases || bg.releases;

    if (!releases) {
      musicContainer.html('loading...');
      return;
    }

    musicContainer.empty();

    let sorted = [];
    jQuery.each(releases, function() {
      if (this.viewed) {
        return;
      }
      sorted.push(this);
    });

    sorted = sorted.sort(function(a, b) {
      return parseFloat(b.votes) - parseFloat(a.votes);
    });

    jQuery.each(sorted.slice(0, settings.perPage), function(i, releaseData) {
      const music = jQuery(insertDataInTemplate(template, releaseData));

      musicContainer.append(music);
    });
  };

  loadReleases();

  chrome.runtime.onMessage.addListener(function(request) {
    loadReleases(request.releases);
  });

  const setReleaseAsViewed = function(settings, id, doSave) {
    settings.releases[id] = {
      viewed: true,
    };

    if (doSave) {
      bg.saveSettings(settings);
    }
  };

  jQuery(document)
    .on('click', 'a', function(event) {
      event.preventDefault();
    })
    .on('click', '.music-small a', function() {
      chrome.tabs.create({
        url: this.href,
      });
    })
    .on('click', '.music-small button', function() {
      const musicWrapper = jQuery(this).closest('.music-small');
      const id = musicWrapper.data('release-id');

      setReleaseAsViewed(settings, id, true);
      musicWrapper.remove();
    })
    .on('click', '#markAll', function() {
      jQuery('.music-small').each(function() {
        const id = jQuery(this).data('release-id');

        setReleaseAsViewed(settings, id, false);
      });

      bg.saveSettings(settings);
      loadReleases();
    })
    .on('click', '#openAll', function() {
      jQuery('.music-small').each(function() {
        const url = jQuery(this)
          .find('a')
          .attr('href');

        chrome.tabs.create({ url });
      });
    });
});
