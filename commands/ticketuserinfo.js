let Discord = require('discord.js');
let unirest = require('unirest');
const moment = require("moment");
const func = require("../utils/functions.js");
const lang = require("../content/handler/lang.json");
const config = require('../config/config.json');


//module.exports.run = async (client, message, id, postChannel) => {
    module.exports = async function (client, user, postChannel) {

    try {

        let guildUser = await client.guilds.cache.get(config.channel_ids.public_guild_id).members.fetch(user.id)
        let userRoles = await guildUser.roles.cache
        let rolesContent = ""

        for (let role of userRoles) {
            if (role[1].name == "@everyone") continue;
            rolesContent = rolesContent + role[1].name + ` | `
        }

        let embed = new Discord.MessageEmbed()
            .setColor(config.bot_settings.main_color)
            .setTitle(`User Info`)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`**Username:** ${user.username}\n**Account Age:** ${moment(user.createdTimestamp).format('MMMM Do YYYY')} (${moment(user.createdTimestamp).fromNow()})\n**Joined Discord:** ${moment(guildUser.joinedTimestamp).format('MMMM Do YYYY')} (${moment(guildUser.joinedTimestamp).fromNow()})\n\n**Roles:**\n${rolesContent.slice(0, -3)}`)

    await postChannel.send({embeds: [embed]}).catch(e => func.handle_errors(e, client, `ticketuserinfo.js`, null));

    } catch (e) {
        func.handle_errors(e, client, `ticketuserinfo.js`, null);
    }
};
