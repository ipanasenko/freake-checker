/* global freake */
/* global defaultSettings */
/* global chrome */
/* global jQuery */
const bg = chrome.extension.getBackgroundPage();
let changesHaveBeenMade = false;

const parseSettingsFromPage = function() {
  const form = jQuery('#form-music-filter');
  const selectedStyles = form.find('option:checked').map(function() {
    return Number(this.value);
  });
  const minVotes = Number(jQuery('#minVotes').val());
  const perPage = Number(jQuery('#perPage').val());

  return {
    styles: Array.prototype.slice.call(selectedStyles),
    minVotes,
    perPage,
  };
};

let tId;
const saveSettings = function() {
  chrome.storage.local.set(parseSettingsFromPage(), function() {
    changesHaveBeenMade = true;
    jQuery('#status').html('Saved');

    clearTimeout(tId);
    tId = setTimeout(function() {
      jQuery('#status').empty();
    }, 2000);
  });
};

const restoreSettings = function() {
  const def = jQuery.Deferred();

  chrome.storage.local.get(defaultSettings, function(settings) {
    jQuery('#minVotes').val(settings.minVotes);
    jQuery('#perPage').val(settings.perPage);
    settings.styles.forEach(function(style) {
      jQuery('option[value="' + style + '"]').prop('selected', true);
    });

    def.resolve(settings);
  });

  return def.promise();
};

window.onunload = function() {
  if (changesHaveBeenMade) {
    bg.initParse();
  }
};

jQuery.get(freake).done(function(data) {
  data = jQuery(data);

  const form = data.find('#form-music-filter');

  form
    .find('select')
    .not('.multiselect')
    .remove();
  form
    .find('button')
    .parent()
    .remove();

  jQuery('#styles').append(form);

  restoreSettings().done(function() {
    jQuery('#minVotes').change(function() {
      saveSettings();
    });

    jQuery('#perPage').change(function() {
      saveSettings();
    });

    jQuery('.multiselect')
      .multiselect({
        noneSelectedText: 'All genres',
      })
      .bind('multiselectclick multiselectcheckall multiselectuncheckall', function() {
        setTimeout(function() {
          saveSettings();
        }, 0);
      });
  });
});
