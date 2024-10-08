// source: https://dlip.github.io/posts/hybrid-keyboard-chording-with-zmk/

const events = require('events');
const fs = require('fs');
const readline = require('readline');

function translateKeys(x) {
    switch (x) {
        case "'":
            return 'FR_QUOT';
            break;
        case '`':
            return 'BSPC';
            break;
        case '_':
            return 'SPC';
            break;
        case '.':
            return 'DOT';
            break;
        case '@':
            return 'AT';
            break;
        default:
            return 'FR_' + x;
    }
}

function stripInvalidChars(x) {
    return x.replace(/\W/g, '')
}

function mapBindings(x) {
    if (x.match(/[A-Z]/)) {
        return `&sk LSHIFT &kp ${x.toUpperCase()}`
    }

    return `&kp ${translateKeys(x).toUpperCase()}`
}

(async function processLineByLine() {
    try {
        const keymap = process.argv[2];
        if (!keymap) {
            throw new Error(`Missing keymap filename, please pass as first argument`);
        }
        if (!fs.existsSync(keymap)) {
            throw new Error(`Unable to find keymap file ${keymap}`);
        }
        let rl = readline.createInterface({
            input: fs.createReadStream('chords.txt'),
            crlfDelay: Infinity
        });

        let macros = '';
        let combos = '';
        let used = {};

        rl.on('line', (line) => {
            let [word, keys] = line.split(' ');
            let index = keys.split('').sort().join('');
            if (used[index]) {
                throw new Error(`Can't use combo '${keys}' for word '${word}' already used by ${used[index]}`)
            }
            used[index] = word;
            const macro = 'm_' + word.split('').map(stripInvalidChars).join('');
            const inputs = keys.toUpperCase().split('');
            const bindings = word.split('').map(mapBindings).join(' ') + ' &kp SPACE';
            macros += `                ${macro}: ${macro} {
                        compatible = "zmk,behavior-macro";
                        #binding-cells = <0>;
                        bindings = <${bindings}>;
                };
`

            const positions = 'P_' + inputs.join(' P_');
            combos += `                combo_${macro} {
                        timeout-ms = <COMBO_TIMEOUT>;
                        key-positions = <P_COMBO ${positions}>;
                        bindings = <&${macro}>;
                };
`
        });

        await events.once(rl, 'close');

        rl = readline.createInterface({
            input: fs.createReadStream(keymap),
            crlfDelay: Infinity
        });

        let output = '';
        let mode = 'normal';
        let foundMacros = false;
        let foundCombos = false;
        rl.on('line', (line) => {
            if (mode === 'normal') {
                output += line + '\n';
                if (line.includes('CHORDING MACROS START')) {
                    mode = 'macros';
                } else if (line.includes('CHORDING COMBOS START')) {
                    mode = 'combos';
                }
            } else if (mode === 'macros') {
                if (line.includes('CHORDING MACROS END')) {
                    foundMacros = true;
                    output += macros + '\n' + line + '\n';
                    mode = 'normal';
                }
            } else if (mode === 'combos') {
                if (line.includes('CHORDING COMBOS END')) {
                    foundCombos = true;
                    output += combos + '\n' + line + '\n';
                    mode = 'normal';
                }
            }
        });

        await events.once(rl, 'close');

        if (!foundMacros) {
            throw new Error(`Unable to find MACROS START/END, please add the comments to your keymap:
        macros {
          // CHORDING MACROS START
          // CHORDING MACROS END
        }
      `)
        }
        if (!foundCombos) {
            throw new Error(`Unable to find COMBOS START/END, please add the comments to your keymap:
        combos {
          compatible = "zmk,combos";
          // CHORDING COMBOS START
          // CHORDING COMBOS END
        }
      `)
        }
        fs.writeFileSync(keymap, output, { encoding: "utf8", flag: "w", mode: 0o644 });
    } catch (err) {
        console.error(err);
    }
})();
