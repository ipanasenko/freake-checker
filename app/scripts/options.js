function saveSettings(settings) {
    chrome.storage.sync.set(settings, function () {
        jQuery('#status').html('Saved');
    });
}

function restoreSettings() {
    chrome.storage.sync.get(defaultSettings, function (settings) {
        settings.styles.forEach(function (style) {
            jQuery('input[value="' + style + '"]').click();
        });

        jQuery('#minVotes').val(settings.minVotes);
    });
}

jQuery.get(freake).done(function (data) {
    data = jQuery(data);

    var form = data.find('#form-music-filter');

    form.find('select').not('.multiselect').remove();
    form.find('button').parent().remove();

    var saveButton = jQuery('<button type="submit" class="btn black x">Save</button>').click(function () {
        var selectedStyles = form.find('option:checked').map(function () {
            return +this.value;
        });
        selectedStyles = Array.prototype.slice.call(selectedStyles);

        var minVotes = +jQuery('#minVotes').val();

        saveSettings({
            styles: selectedStyles,
            minVotes: minVotes
        });
    });

    jQuery('#styles').append(form, saveButton);

    restoreSettings();

    jQuery('.multiselect').multiselect({
        noneSelectedText: 'All genres'
    });
});
