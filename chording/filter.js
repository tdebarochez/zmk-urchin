// source: https://dlip.github.io/posts/hybrid-keyboard-chording-with-zmk/

const events = require('events');
const fs = require('fs');
const readline = require('readline');

(async function processLineByLine() {
  try {
    const rl = readline.createInterface({
      input: fs.createReadStream('words.txt'),
      crlfDelay: Infinity
    });

    let used = {};
    rl.on('line', (line) => {
      let [word, keys] = line.split(' ');

      if (word.length < 3) {
        return;
      }
      let combo = "";
      let index = "";
      if (!keys) {
        keys = word;
        //first letters strategy
        const cs = keys.split('');

        for (let x = 0; x < cs.length; x++) {
          if (combo.split('').includes(cs[x])) {
            continue;
          }
          combo += cs[x];
          // need to sort combo to ensure no dupes with different order
          index = combo.split('').sort().join('');

          if (!used[index]) {
            break;
          }
        }


        // consonants strategy
        if (combo.length > 2) {
          let ccombo = "";
          let ccs = keys.replace(/[aeiou]/g, '').split('');
          //ensure first char is not stripped if vowel
          if (keys.charAt(0) !== ccs[0]) {
            ccs = [keys.charAt(0), ...ccs];
          }

          for (let x = 0; x < ccs.length; x++) {
            // ignore letters occuring multiple letters
            if (ccombo.split('').includes(ccs[x])) {
              continue;
            }
            ccombo += ccs[x];
            // need to sort combo to ensure no dupes with different order
            let cindex = ccombo.split('').sort().join('');

            if (!used[cindex] && (cindex.length < index.length || used[index])) {
              index = cindex;
              combo = ccombo;
              break;
            }
          }
        }
      } else {
        index = keys.split('').sort().join('');
        combo = keys;
      }


      if (used[index]) {
        throw new Error(`Can't use combo '${combo}' for word '${word}' already used by ${used[index]}`)
      }
      used[index] = word;

      console.log(word, combo);
    });

    await events.once(rl, 'close');

  } catch (err) {
    console.error(err);
  }
})();
