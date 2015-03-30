var bg = chrome.extension.getBackgroundPage();

var saveSettings = function (settings) {
  chrome.storage.local.set(settings, function () {
    jQuery('#status').html('Saved');
    setTimeout(function () {
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

window.onunload = function () {
  bg.initParse();
};

jQuery.get(freake).done(function (data) {
  data = jQuery(data);

  var form = data.find('#form-music-filter');

  form.find('select').not('.multiselect').remove();
  form.find('button').parent().remove();

  jQuery('#styles').append(form);

  restoreSettings().done(function () {
    jQuery('#minVotes').change(function () {
      saveSettings(parseSettingsFromPage());
    });

    jQuery('.multiselect').multiselect({
      noneSelectedText: 'All genres'
    }).bind('multiselectclick multiselectcheckall multiselectuncheckall', function () {
      setTimeout(function () {
        saveSettings(parseSettingsFromPage());
      }, 0);
    });
  });
});
