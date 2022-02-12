const fs = require('fs');
const https = require('https');
const cheerio = require('cheerio');
const readXlsxFile = require('read-excel-file/node');

// skip the FIRST_INPUT and start from MAIN_INPUT_JSON
const START_FROM_INPUT = false;
// skip the RANGES completely and go directly to the SPECIAL list
const SKIP_ZIP_CODES_SCRAPING = false;
// if both these constants are set to true, then the script is useful for updating
// an already existing list with the new SPECIAL list

// JSON file
const MAIN_INPUT_JSON = './in.json';
// XLSX file
const FIRST_INPUT = './municipalities_01_01_2022.xlsx';
// JSON file
const OUTPUT_JSON = './out.json';

// how many requests does the program handle (at most) every time it gets the new zip codes
const STEPS = 2048;
// how much time does the program wait untill all the defined steps are completed
const WAIT_MS = 5000;

// array of ranges within the script searches for zip codes
const RANGES = require('./ranges.json');
// array of additional zip codes that the script can't find online
const SPECIAL = require('./special.json');

const final = (START_FROM_INPUT) ? (require(MAIN_INPUT_JSON)) : ({
    regions: [],
    provinces: [],
    municipalities: [],
    zips: []
});

function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function repeatStringMod(n, len) {
    let res = `${n}`;
    if (res.length < len) return `${repeatString('0', len - res.length)}${res}`;
    else return res.substring(0, len);
}
function repeatString(text, n) {
    let res = '';
    for (let i = 0; i < n; i++) res += text;
    return res;
}

function findProvince(_province) {
    for (let i = 0; i < final.provinces.length; i++) if (final.provinces[i].province === _province) return i;
    return -1;
}
function findRegion(_region) {
    for (let i = 0; i < final.regions.length; i++) if (final.regions[i].region === _region) return i;
    return -1;
}

function fixName(name) {
    let pos = name.search('/');
    if (pos !== -1) return name.substring(0, pos);
    return name;
}

function getHTML(url) {
    return new Promise((resolve, reject) => {
        let req = https.request(url, msg => {
            let res = '';
            msg.on('error', err => {
                console.log(err);
                reject();
            });
            msg.on('data', data => res += data.toString());
            msg.on('end', () => resolve(res));
        });
        req.on('error', err => {
            console.log(err);
            reject();
        });
        req.end();
    });
}
function getZipMunicipality(zip) {
    return new Promise(async (resolve, reject) => {
        try {
            let res = [];
            for (let i = 1; ; i++) {
                let html = await getHTML(`https://www.comuniecitta.it/cerca-cap?chiave=${zip}&pg=${i}`);
                let $ = cheerio.load(html);
                let container = $('table').toArray()[0];

                let trs = $(container).find('tr').toArray();
                trs.splice(0, 1);
                if (trs.length === 0) return resolve(res);
                for (let tr of trs) {
                    let municipality = $($(tr).find('td a').toArray()[0]).text();
                    if (!(res.includes(municipality)) && municipality !== '') res.push(municipality);
                    else return resolve(res);
                }
            }
        } catch {
            reject();
        }
    });
}

function addMunicipalityZip(zip, municipality) {
    if (municipality === '' || zip === '') return;
    for (let i = 0; i < final.municipalities.length; i++) {
        if (final.municipalities[i].municipality === municipality) {
            if (!(final.zips.includes(zip))) final.zips.push(zip);
            if (!(final.municipalities[i].zips.includes(zip))) final.municipalities[i].zips.push(zip);
            return;
        }
    }
}

async function main() {
    let t0 = new Date().getTime();

    // populate list
    let rows = await readXlsxFile(FIRST_INPUT);
    rows.splice(0, 1);
    if (!START_FROM_INPUT) for (let row of rows) {
        let region = fixName(row[10]);
        let province = fixName(row[11]);
        let municipality = fixName(row[6]);

        final.municipalities.push({
            municipality,
            province,
            region,
            zips: []
        });

        let provincePos = findProvince(province);
        if (provincePos == -1) {
            // add new province
            final.provinces.push({
                province,
                region,
                municipalities: [municipality]
            });
        } else {
            // province already exists at index provincePos
            final.provinces[provincePos].municipalities.push(municipality);
        }

        let regionPos = findRegion(region);
        if (regionPos == -1) {
            // add new region
            final.regions.push({
                region,
                provinces: [province]
            });
        } else {
            // region already exists at index regionPos
            if (!(final.regions[regionPos].provinces.includes(province))) final.regions[regionPos].provinces.push(province);
        }
    }

    // get zip codes
    let repeats = [];
    if (!SKIP_ZIP_CODES_SCRAPING) for (let range of RANGES) {
        let max = range[1];
        let min = range[0];
        for (let i = min; i <= max;) {
            let n = 0;
            let steps = 0;
            if (i === max) steps = 1;
            else if ((i + STEPS) < max) steps = STEPS;
            else if ((i + STEPS) === max) steps = STEPS + 1;
            else if ((i + STEPS) > max) steps = (max - i) + 1;

            for (let j = 0; j < steps && i <= max; j++) {
                let zip = repeatStringMod(`${i}`, 5);
                getZipMunicipality(zip).then(municipalities => {
                    for (let municipality of municipalities) {
                        console.log(`${zip}: ${municipality}`);
                        addMunicipalityZip(zip, municipality);
                    }
                    n++;
                }).catch(() => {
                    repeats.push(zip);
                    n++;
                });
                i++;
            }
            while (n < steps) {
                console.log(`Waiting... (${n} out of ${steps} - total advancement: ${i - 1} - max: ${max})`);
                await wait(WAIT_MS);
            }
        }
    }

    // get zip codes with errors
    while (repeats.length !== 0) {
        let _repeats = [];

        let n = 0;
        let steps = repeats.length;
        for (let zip of repeats) {
            getZipMunicipality(zip).then(municipalities => {
                for (let municipality of municipalities) {
                    console.log(`${zip}: ${municipality}`);
                    addMunicipalityZip(zip, municipality);
                }
                n++;
            }).catch(() => {
                _repeats.push(zip);
                n++;
            });
        }
        while (n < steps) {
            console.log(`Waiting... (${n} out of ${steps}`);
            await wait(WAIT_MS);
        }
        repeats = _repeats;
    }

    // get special zip codes (not found on the website)
    for (let el of SPECIAL) {
        addMunicipalityZip(el.zip, el.municipality);
    }

    // sort lists
    final.zips.sort((a, b) => {
        if (a > b) return 1;
        if (a < b) return -1;
        return 0;
    });
    final.municipalities.sort((a, b) => {
        if (a.municipality > b.municipality) return 1;
        if (a.municipality < b.municipality) return -1;
        return 0;
    });
    for (let i = 0; i < final.municipalities.length; i++) {
        final.municipalities[i].zips.sort((a, b) => {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        });
    }
    final.provinces.sort((a, b) => {
        if (a.province > b.province) return 1;
        if (a.province < b.province) return -1;
        return 0;
    });
    for (let i = 0; i < final.provinces.length; i++) {
        final.provinces[i].municipalities.sort((a, b) => {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        });
    }
    final.regions.sort((a, b) => {
        if (a.region > b.region) return 1;
        if (a.region < b.region) return -1;
        return 0;
    });
    for (let i = 0; i < final.regions.length; i++) {
        final.regions[i].provinces.sort((a, b) => {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        });
    }

    // write output files
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(final), { encoding: 'utf-8' });

    // diagnostics
    let t1 = new Date().getTime();
    console.log(`The script completed in ${(t1 - t0) / 1000} s`);

    return Promise.resolve();
}
main();