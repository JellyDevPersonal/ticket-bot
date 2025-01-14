const Discord = require("discord.js");
const config = require('../config/config.json');
const moment = require("moment");
let unirest = require('unirest');
const func = require("../utils/functions.js");


module.exports = async function (client, message) { 

    let access = 0
    for (id of config.role_ids.role_ids_ban_cmd) {
        if (!message.member.roles.cache.find(x => x.id == id)) continue;
        access++
    }
    if (access === 0) return;
    if (!config.tokens.battlemetricsToken || config.tokens.battlemetricsToken === "") return func.handle_errors(null, client, `bans.js`, `Battlemetrics API key is missing in the config! I can not run the bans command without it.`)

	const messageArray = message.cleanContent.split(' ');
	const args = messageArray.slice(1);

    if (!args[0] || isNaN(args[0]) || args[0].length != 17) {

        let usageEmbed = new Discord.MessageEmbed()
        .setColor(0x990000)
        .setTitle('Correct Usage')
        .setDescription(`\`${config.bot_settings.prefix}bans <SteamID64>\``, true)
        .setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})
    return message.channel.send({embeds: [usageEmbed]}).catch(e => func.handle_errors(e, client, `bans.js`, null));
    }


    let result = await unirest.post(`https://api.battlemetrics.com/players/match?access_token=${config.tokens.battlemetricsToken}`).type('json')
    .send({
        "data": [{
            "type": "identifier",
            "attributes": {
                "type": "steamID",
                "identifier": `${args[0]}`
            }
        }]
    })

    if (!result) return func.handle_errors(null, client, `bans.js`, `There was an error in the first API request and no results were returned!`)
    if (result.status != 200) {
        let embed = new Discord.MessageEmbed()
        embed.setTitle(`Error in the first API!`)
        embed.setColor(0x990000)
        embed.setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})
        if (result.status === 429) embed.addField(`Status 429`, `Too many requests sent at the same time on this token.`)
        if (result.status === 503) embed.addField(`Status 503`, `Battlemetrics may be offline, check the website.`)
        if (result.status === 504) embed.addField(`Status 504`, `Connection timed out.`)
        if (result.status === 401) embed.addField(`Status 401`, `This search can not be authorised. Is your token correct and does it have the right permissions?`)
        if (result.status === 520) embed.addField(`Status 520`, `Generic CloudFlare error, no direct reason found.`)
        return message.channel.send({embeds: [embed]}).catch(e => func.handle_errors(e, client, `bans.js`, null));
    }

    if (result.body.data.length == "0") {
        let embed = new Discord.MessageEmbed()
        embed.setTitle(`No user found with that ID!`)
        embed.setColor(0x990000)
        embed.setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})
        return message.channel.send({embeds: [embed]}).catch(e => func.handle_errors(e, client, `bans.js`, null));
    }

    let userBMID = result.body.data[0].relationships.player.data.id

    let result2 = await unirest.get(`https://api.battlemetrics.com/bans?filter[player]=${userBMID}&page[size]=100&access_token=${config.tokens.battlemetricsToken}`)

    if (!result) return func.handle_errors(null, client, `bans.js`, `There was an error in the Second API request and no results were returned!`)
    if (result2.status != 200) {
        let embed = new Discord.MessageEmbed()
        embed.setTitle(`Error in the Second API!`)
        embed.setColor(0x990000)
        embed.setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})
        if (result2.status === 429) embed.addField(`Status 429`, `Too many requests sent at the same time on this token.`)
        if (result2.status === 503) embed.addField(`Status 503`, `Battlemetrics may be offline, check the website.`)
        if (result2.status === 504) embed.addField(`Status 504`, `Connection timed out.`)
        if (result2.status === 401) embed.addField(`Status 401`, `This search can not be authorised. Is your token correct and does it have the right permissions?`)
        if (result2.status === 520) embed.addField(`Status 520`, `Generic CloudFlare error, no direct reason found.`)
        return message.channel.send({embeds: [embed]}).catch(e => func.handle_errors(e, client, `bans.js`, null));
    }

    if (result2.body.data.length == 0) {
        let NoAltEmbed = new Discord.MessageEmbed()

            .setColor(0x990000)
            .setTitle(`No Bans Found for ${args[0]}!`)
            .setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})
        return message.channel.send({embeds: [NoAltEmbed]}).catch(e => func.handle_errors(e, client, `bans.js`, null));
    }

    for (ban of result2.body.data) {

        if (ban.meta == null) ban.meta = "Unknown Username"
        if (ban.meta.player == undefined) ban.meta.player = "Unknown Username"
        if (ban.attributes.note == null) ban.attributes.note = "No notes available"
        if (ban.attributes.expires == null) ban.attributes.expires = "Permanent"
        let notestring = ban.attributes.note || "No notes available"
        let namestring = ban.meta.player || "Unknown Player Name"

        let embed = new Discord.MessageEmbed()
        .setColor(config.bot_settings.main_color)
        .setTitle(`Battlemetrics Ban for ${args[0]}`)
        .addField('Name', namestring, true)
        .addField('SteamID64', `[${args[0]}](https://steamcommunity.com/profiles/${args[0]})`, true)
        .addField(`BanID`, `[${ban.id}](https://www.battlemetrics.com/rcon/bans/edit/${ban.id})`, true)
        .addField('Ban Reason', ban.attributes.reason)
        .addField(`Ban Date`, `${moment(ban.attributes.timestamp).format('MMMM Do YYYY, h:mm:ss a')}`, true)
        .addField(`Expires`, ban.attributes.expires == "Permanent" ? ban.attributes.expires : moment(ban.attributes.expires).format('MMMM Do YYYY, h:mm:ss a'), true)
        .setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})
        
        if (notestring.length >= 1020) {
        embed.addField(`Notes`, `\`\`\`test\n${notestring.substring(0, 920)}... \n\nThese notes are limited by the character count.\`\`\``)
        } else {
        embed.addField(`Notes`, `\`\`\`test\n${notestring}\`\`\``)
        }

        message.channel.send({embeds :[embed]}).catch(e => func.handle_errors(e, client, `bans.js`, null));
    }   

}
