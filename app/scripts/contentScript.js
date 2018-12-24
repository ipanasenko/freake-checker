'use strict';

const copyText = text => {
  const input = document.createElement('input');

  input.style.width = '1px';
  input.style.height = '1px';
  input.style.position = 'absolute';
  input.style.top = '-9999px';

  document.body.appendChild(input);

  input.value = text.replace(/\s&\s/g, ' ');

  input.select();

  document.execCommand('copy');

  document.body.removeChild(input);
};

const getPressedKeys = event => {
  let keys = '';

  (event.ctrlKey || event.metaKey) && (keys += 'c');
  event.shiftKey && (keys += 's');
  event.altKey && (keys += 'a');

  keys += event.keyCode;

  return keys;
};

document.addEventListener(
  'keypress',
  event => {
    const keyComb = getPressedKeys(event);

    if (keyComb !== 'cs3') {
      return;
    }

    copyText(document.querySelector('.post-title h1').innerText);
  },
  false,
);
