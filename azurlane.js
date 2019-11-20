const request = require('request');
const JSDOM = require('jsdom').JSDOM;
const Discord = require('discord.js');
const config = require('./config.js').config;
const headers = {
    'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0"
};
const COLOR = {
    "Normal": 0xdcdcdc,
    "Rare": 0xb0e0e6,
    "Elite": 0xdda0dd,
    "Super Rare": 0xeee8aa,
    "Priority": 0xeee8aa,
    "Unreleased": 0x000000,
    "Decisive": 0xffffff
};
const SHIPS = [];
const SHIPS_CACHE = {};
exports.ships = SHIPS;
exports.handleCommnd = async function(args, msg, PREFIX) {
    console.log("running azurlane sub-system...");
    if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "azurlane (ship|skin) [args]`");
    let lang = "en";
    if (["--en", "--jp", "--cn"].includes(args[args.length - 1])) {
        console.log("user specified language " + args[args.length - 1]);
        lang = args.pop().substring(2);
    }
    switch (args.shift()) {
        case "ship":
        case "s":
        case "info":
        case "i":
            try {
                console.log("Getting Ship " + args.join(" "));
                const ship = await getShipByName(args.join(" "));
                let embed = new Discord.RichEmbed().setTitle(`**${ship.names[lang]}**`).setColor(COLOR[ship.rarity]).setThumbnail(ship.thumbnail).setURL(ship.wikiUrl);
                let stats = ship.stats;
                embed.addField("**ID**", (ship.id) ? ship.id : "**not yet decided**", true)
                    .addField("**Stars**", ship.stars, true)
                    .addField("**Rarity**", "**" + ship.rarity + "**", true)
                    .addField("**Type**", ship.hullType, true)
                    .addField("**Class**", ship.class, true)
                    .addField("**Nationality**", ship.nationality, true)
                    .addField("❤️ Health", stats[0].value, true)
                    .addField("🛡 Armor", stats[1].value, true)
                    .addField("🔧 Reload", stats[2].value, true)
                    .addField("💚 Luck", stats[3].value, true)
                    .addField("⚔️ Firepower", stats[4].value, true)
                    .addField("🦋 Evasion", stats[6].value, true)
                    .addField("Speed", stats[7].value, true)
                    .addField("Anti-air", stats[8].value, true)
                    .addField("Aviation", stats[9].value, true)
                    .addField("Oil Usage", stats[10].value, true)
                    .addField("Accuracy", stats[11].value, true)
                    .addField("Anti-Submarine", stats[12].value, true)
                    .addField("📝 Designed by", ship.authro)
                    .addField("**Avaliable Skins**", ship.skins.map(skin => skin.title).join("\n"));
                embed.setDescription("_All stats shown below are lv120 stats._");
                msg.channel.send(embed);
            } catch (err) {
                console.log(`ship subcommand, err code = ${err.statusCode}, err message = ${err.message}, args = ${args}`);
                msg.channel.send("Invalid ship name.");
            }
            break;
        case "viewskin":
        case "skin":
        case "sk":
        case "vs":
            if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "azurlane skin ship-name|skin-name`");
            try {
                let newArgs = args.join(" ").split(/ *\| */g);
                if (newArgs.length == 1) newArgs = [newArgs[0], "Default"];
                const ship = await getShipByName(newArgs[0]);
                let skin = ship.skins.filter(skin => skin.title.toUpperCase().includes(newArgs[1].toUpperCase()))[0];
                let embed = new Discord.RichEmbed().setTitle(`**${ship.names[lang]}** (${skin.title})`).setColor(COLOR[ship.rarity]).setThumbnail(skin.chibi).setURL(ship.wikiUrl);
                embed.addField("Avaliable Skins", ship.skins.map(lskin => lskin.title === skin.title ? "**" + lskin.title + "**" : lskin.title).join("\n"));
                embed.setImage(skin.image);
                msg.channel.send(embed);
            } catch (err) {
                console.log(`ship subcommand, err code = ${err.statusCode}, err message = ${err.message}, args = ${args}`);
                msg.channel.send("Invalid ship name/skin name.");
            }
            break;
    }
}

function findExactShip(name) {
    return SHIPS.find(ship => ship.name.toUpperCase() === name.toUpperCase());
}

function findShip(name) {
    return SHIPS.find(ship => ship.name.toUpperCase().includes(name.toUpperCase()));
}

function getShipByName(name) {
    return new Promise((resolve, reject) => {
        let cacheShip = findExactShip(name);
        if (!cacheShip) cacheShip = findShip(name);
        if (cacheShip) {
            if (SHIPS_CACHE.hasOwnProperty(cacheShip.id)) {
                console.log("Found it in cache. Serving Cache Content");
                resolve(SHIPS_CACHE[cacheShip.id]);
                return;
            }
            request({
                url: "https://azurlane.koumakan.jp/" + cacheShip.name,
                headers: headers
            }, (error, res, body) => {
                if (error) reject(error);
                const doc = new JSDOM(body).window.document;
                const arts = doc.querySelector("#Art tbody").getElementsByTagName("a");
                const tabs = doc.querySelectorAll(".azl_box_body .tabber .tabbertab");
                let ship = {
                    wikiUrl: "https://azurlane.koumakan.jp/" + cacheShip.name,
                    id: cacheShip.id,
                    names: {
                        en: cacheShip.name,
                        cn: doc.querySelector('[lang="zh"]').textContent,
                        jp: doc.querySelector('[lang="ja"]').textContent,
                        kr: doc.querySelector('[lang="ko"]').textContent
                    },
                    thumbnail: "https://azurlane.koumakan.jp" + doc.querySelector("div:nth-child(1) > div:nth-child(2) > .image > img").getAttribute("src"),
                    skins: Array.from(tabs).map((skinTab, i) => {
                        return {
                            title: skinTab.getAttribute("title"),
                            image: "https://azurlane.koumakan.jp" + skinTab.getElementsByTagName("img")[0].getAttribute("src"),
                            chibi: arts[i * 2 + 1].getAttribute("href")
                        };
                    }),
                    buildTime: doc.querySelector("tr:nth-child(1) > td:nth-child(2) > a").textContent,
                    rarity: cacheShip.rarity,
                    stars: doc.querySelector("div:nth-child(1) > div:nth-child(3) > .wikitable:nth-child(1) tr:nth-child(2) > td").textContent.trim(),
                    class: doc.querySelector("div:nth-child(3) > .wikitable tr:nth-child(3) > td:nth-child(2) > a").textContent,
                    nationality: cacheShip.nationality,
                    hullType: doc.querySelector(".wikitable tr:nth-child(3) a:nth-child(2)").textContent,
                    stats: Object.values(doc.querySelectorAll(".tabbertab:nth-child(3) > .wikitable tbody td")).map(cell => cell.textContent.trim()),
                    author: doc.querySelector(".nomobile:nth-child(1) tr:nth-child(2) a").textContent,
                };
                console.log(`Ship Loaded: ${JSON.stringify(ship)}`);
                SHIPS_CACHE[cacheShip.id] = ship;
                resolve(ship);
            });
        } else {
            reject(Error("There is no such ship."))
        };
    });
}

exports.getShipByName = getShipByName;
exports.initiate = function() {
    return new Promise((resolve, reject) => {
        request({
            url: "https://azurlane.koumakan.jp/List_of_Ships",
            headers: headers
        }, (error, res, body) => {
            const doc = new JSDOM(body).window.document;
            let table_ships = doc.querySelectorAll("#mw-content-text .mw-parser-output table tbody tr");
            table_ships.forEach(table_ship => {
                let columns = table_ship.childNodes;
                SHIPS.push({
                    id: columns[0].textContent,
                    name: columns[1].textContent,
                    rarity: columns[2].textContent,
                    type: columns[3].textContent,
                    nationality: columns[4].textContent
                });
            });
            console.log("Loaded " + SHIPS.length + " Ships");
            resolve(SHIPS);
        });
    });
}
