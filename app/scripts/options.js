function saveOptions(styles) {
    chrome.storage.sync.set({
        styles: styles
    }, function () {
        jQuery('#status').html('Saved');
    });
}

function restoreOptions() {
    chrome.storage.sync.get({
        styles: []
    }, function (items) {
        items.styles.forEach(function (style) {
            jQuery('input[value="' + style + '"]').click();
        });
    });
}

var freake = 'http://freake.ru';

document.addEventListener('DOMContentLoaded', function () {
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
            saveOptions(selectedStyles);
        });

        jQuery('#styles').append(form, saveButton);

        restoreOptions();

        jQuery('.multiselect').multiselect({
            noneSelectedText: 'All genres'
        });


    });
});
