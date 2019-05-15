'use strict';

// imports
const request = require('request-promise-native');
const fs = require('fs');
const {fields, fill} = require('pdf-form-fill');

// golly gee mister i sure love node
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// async flag for await
(async () => {
    // Get deck information from encoredecks
    var options = {
        url: 'http://184.105.3.85:8080/api/deck/' + process.argv[2],
        json: true
    };
    let returnedDeck = await request(options);

    // set output paths
    let srcPdfPath = './reg-form.pdf';
    let tgtPdfPath = './output.pdf';

    // Get form structure and strip unneeded information from it
    let form_structure = await fields(srcPdfPath);
    let fillSkeleton = {};
    Object.keys(form_structure).forEach(key => {
        fillSkeleton[key] = key;
    });

    // Set quantities and code from encoredecks
    let parsedDeck = [];
    for (let card of returnedDeck.cards) {
        let findIndex = parsedDeck.findIndex(obj => obj._id == card._id);
        if (findIndex < 0) {
            card.ws_code = card.set + '/' + card.side + card.release + '-' + card.sid;
            card.ws_qty = 1;
            parsedDeck.push(card);
        } else {
            parsedDeck[findIndex].ws_qty += 1;
        }
    }

    // Fill non-card information
    let fillObj = {};
    fillObj["Deck Name"] = returnedDeck.name;
    fillObj["Player Name"] = returnedDeck.userid.name;
    fillObj["Title"] = returnedDeck.sets[0].set;

    // Add character cards
    let charCount = 1, eventCount = 1, cxCount = 1;
    for (let card of parsedDeck) {
        if (card.cardtype == "CH") {
            fillObj["Qty" + charCount] = card.ws_qty;
            fillObj["No." + charCount] = card.ws_code;
            fillObj["Lvl." + charCount] = "" + card.level;
            fillObj["Row" + charCount] = card.name;
            charCount += 1;
        }
        else if (card.cardtype == "EV") {
            fillObj["Row" + eventCount + "_2"] = card.ws_qty;
            fillObj["Row" + eventCount + "_3"] = card.ws_code;
            fillObj["Row" + eventCount + "_4"] = card.level;
            fillObj["Row" + eventCount + "_5"] = card.name;
            eventCount += 1;
        } 
        else if (card.cardtype == "CX") {
            fillObj["Cx  Row" + cxCount] = card.ws_qty;
            fillObj["Cx  No. Row" + cxCount] = card.ws_code;
            if (cxCount > 1) {
                fillObj["ex_" + cxCount] = card.name;
            } else {
                fillObj["ex"] = card.name;
            }
            cxCount += 1;
        }
    }

    const output = fs.createWriteStream(tgtPdfPath);
    fill(srcPdfPath, fillObj, {flatten: false})
        .then(stream => stream.pipe(output));
})();