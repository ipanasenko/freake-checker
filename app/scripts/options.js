/* global freake */
/* global defaultSettings */
/* global chrome */
/* global jQuery */
var bg = chrome.extension.getBackgroundPage(), changesHaveBeenMade = false;

var parseSettingsFromPage = function () {
  var form = jQuery('#form-music-filter'),
    selectedStyles = form.find('option:checked').map(function () {
      return +this.value;
    }),
    minVotes = +jQuery('#minVotes').val();

  return {
    styles: Array.prototype.slice.call(selectedStyles),
    minVotes: minVotes
  };
};

var tId;
var saveSettings = function () {
  chrome.storage.local.set(parseSettingsFromPage(), function () {
    changesHaveBeenMade = true;
    jQuery('#status').html('Saved');

    clearTimeout(tId);
    tId = setTimeout(function () {
      jQuery('#status').empty();
    }, 2000);
  });
};

var restoreSettings = function () {
  var def = jQuery.Deferred();

  chrome.storage.local.get(defaultSettings, function (settings) {
    jQuery('#minVotes').val(settings.minVotes);
    settings.styles.forEach(function (style) {
      jQuery('option[value="' + style + '"]').prop('selected', true);
    });

    def.resolve(settings);
  });

  return def.promise();
};

window.onunload = function () {
  if (changesHaveBeenMade) {
    bg.initParse();
  }
};

jQuery.get(freake).done(function (data) {
  data = jQuery(data);

  var form = data.find('#form-music-filter');

  form.find('select').not('.multiselect').remove();
  form.find('button').parent().remove();

  jQuery('#styles').append(form);

  restoreSettings().done(function () {
    jQuery('#minVotes').change(function () {
      saveSettings();
    });

    jQuery('.multiselect').multiselect({
      noneSelectedText: 'All genres'
    }).bind('multiselectclick multiselectcheckall multiselectuncheckall', function () {
      setTimeout(function () {
        saveSettings();
      }, 0);
    });
  });
});
