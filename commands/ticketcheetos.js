let Discord = require('discord.js');
let unirest = require('unirest');
const moment = require("moment");
const func = require("../utils/functions.js");
const lang = require("../content/handler/lang.json");


//module.exports.run = async (client, message, id, postChannel) => {
    module.exports = async function (client, id, postChannel) {

    try {

        if (!id) return;
        if (isNaN(id)) return;

        if (!client.config.tokens.cheetosToken || client.config.tokens.cheetosToken === "") return func.handle_errors(null, client, `ticketcheetos.js`, `No cheat cord API found but the check-cheetos option is enabled! Either disable the check-cheetos config or provide an API key.`)
        if (!client.config.bot_settings.ownerID || client.config.bot_settings.ownerID == "") func.handle_errors(null, client, `ticketcheetos.js`, `Your ownerID config variable was not found! You can not access cheetos without it.`)
        
        unirest.get(`https://cheetos.gg/api.php?action=search&id=${id}`)
            .header("Auth-Key", client.config.tokens.cheetosToken)
            .header ("DiscordID", client.config.bot_settings.ownerID)
            .end(async function (resultb) {

                if (resultb?.body === "Null") {
                    let embed = new Discord.MessageEmbed()
                    .setColor(0x990000)
                    .setTitle(lang.cheetos['ticket-cheetos-links-empty'] != "" ? lang.cheetos['ticket-cheetos-links-empty'].replace(`{{USER}}`, id) : `${id} has 0 links via Cheetos!`)
                    .setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})
                    return postChannel.send({
                    embeds: [embed]
                }).catch(e => func.handle_errors(e, client, `ticketcheetos.js`, null)); 
                }
                if (resultb?.body?.includes(`Unexpected response`)) {
                    return postChannel.send(`There was an unknown error running the cheetos API, please check to see if it is up and running, or try again later.`).catch(e => func.handle_errors(e, client, `ticketcheetos.js`, null));
                }

                if (resultb?.body != "Null") {

                    if (typeof resultb?.body === 'string' || resultb?.body instanceof String) {
                        postChannel.send(`Could not complete the cheetos check.\nReason: \`${resultb?.body}\``).catch(e => func.handle_errors(e, client, `ticketcheetos.js`, null));
                        return func.handle_errors(null, client, `ticketcheetos.js`, `Unexpected response from the API: "${resultb?.body}"`)
                    }

                    function epochConvert(timestamp) {

                        var theDate = new Date(timestamp * 1000);
                        let dateString = theDate.toGMTString();
                        return `${moment(dateString).format('MMMM Do YYYY, h:mm:ss a').toString()}`

                    };
                    let DiscordNumber = resultb?.body?.length
                    //Split the big array into little arrays of 5 objects
                    var perChunk = 25 // items per chunk    

                    var result = await resultb?.body.reduce((resultArray, item, index) => {
                        const chunkIndex = Math.floor(index / perChunk)

                        if (!resultArray[chunkIndex]) {
                            resultArray[chunkIndex] = [] // start a new chunk
                        }

                        resultArray[chunkIndex].push(item)

                        return resultArray
                    }, [])
                    //END OF Split
                    
                    for (let Discords of result) {

                        let embed = new Discord.MessageEmbed()
                            .setFooter({text: `cheetos.gg`, iconURL: client.user.displayAvatarURL()})
                            .setColor(0x208cdd)
                            .setTitle(lang.cheetos['ticket-cheetos-links-not-empty'] != "" ? lang.cheetos['ticket-cheetos-links-not-empty'].replace(`{{USER}}`, id).replace(`{{COUNT}}`, DiscordNumber) : `${id} has ${DiscordNumber} links via Cheetos!`)

                        await Discords.forEach(async SingleDiscord => {
                            embed.addField(`${SingleDiscord.Name} / ${SingleDiscord.ID}`, `\`\`\`ml\nUsername: "${SingleDiscord.Username}"\nRoles: "${SingleDiscord.Roles === "" ? "No Roles Available" : SingleDiscord.Roles}"\nTime Added: "${SingleDiscord.TimestampAdded === 0 ? "Unknown" : await epochConvert(SingleDiscord.TimestampAdded)}"\`\`\``)

                    })

                    await postChannel.send({embeds: [embed]}).catch(e => func.handle_errors(e, client, `ticketcheetos.js`, null));

                    }

            
                }
            })





    } catch (e) {
        handle_errors(e);
    }
};
