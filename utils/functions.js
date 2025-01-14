const Discord = require("discord.js");
const {QuickDB} = require("quick.db")
const db = new QuickDB();
const func = require("./functions.js")
const lang = require("../content/handler/lang.json");
const messageid = require("../config/messageid.json");
const unirest = require("unirest");

module.exports.handle_errors = async (err, client, file, message) => {

	let ErrorChannel = client.channels.cache.get(client.config.channel_ids.error_channel)

    let errorEmbed = new Discord.MessageEmbed()
    .setColor(0x990000)
    .setTitle(`Error Found!`)

    if (err) {
            errorEmbed.setDescription(`\`\`\`${err.stack ? err.stack.substring(0, 4000) : "Unknown"}\`\`\``)
            errorEmbed.addField(`Name`, err.name == null ? "No Name" : err.name.toString())
            errorEmbed.addField(`Message`, err.msg == null ? "No Message" : err.msg.toString())
            errorEmbed.addField(`Path`, err.path == null ? "No Path" : err.path.toString())
            errorEmbed.addField(`Code`, err.code == null ? "No Code" : err.code.toString())
            errorEmbed.addField(`File Name`, file ? file : "Unknown")
    } else {
            errorEmbed.setDescription(`\`\`\`${message ? message : "Unknown Error (This shouldn't happen)"}\`\`\``)
            errorEmbed.addField(`File Name`, file ? file : `Unknown`)
    }

    if (!ErrorChannel) {
        console.log(err)
        console.log(`[FUNCTIONS - HANDLE_ERRORS] Could not find the error channel to display an error. Please make sure the channel ID is correct!`)
        return;
    }

    await ErrorChannel.send({ embeds: [errorEmbed] }).catch(e => {

        if (e.message == "Unknown Channel") {
            console.log(err)
            console.log(`[FUNCTIONS - HANDLE_ERRORS] Could not find the error channel to display an error. Please make sure the channel ID is correct!`)
        }
    })
}

module.exports.updateResponseTimes = async (openTime, closeTime, ticketType, ButtonType) => {

    let newTicketType = ticketType.replace(/ /g,`_`)
    let ServerResponseTimes = await db.get(`ServerStats.ResponseTimes`)


    let ticketDifference = closeTime - openTime
    if (ServerResponseTimes?.[`${newTicketType}`]?.[`${ButtonType}`]?.totalTimeSpent == null || ServerResponseTimes?.[`${newTicketType}`]?.[`${ButtonType}`]?.totalTimeSpent == undefined) {
        await db.set(`ServerStats.ResponseTimes.${newTicketType}.${ButtonType}.totalTimeSpent`, ticketDifference)
    } else {
        await db.set(`ServerStats.ResponseTimes.${newTicketType}.${ButtonType}.totalTimeSpent`, ServerResponseTimes?.[`${newTicketType}`]?.[`${ButtonType}`]?.totalTimeSpent + ticketDifference)
    }

    if ( ServerResponseTimes?.[`${newTicketType}`]?.[`${ButtonType}`]?.totalTicketsHandled == null ||  ServerResponseTimes?.[`${newTicketType}`]?.[`${ButtonType}`]?.totalTicketsHandled == undefined) {
        await db.set(`ServerStats.ResponseTimes.${newTicketType}.${ButtonType}.totalTicketsHandled`, 1)
    } else {
        await db.set(`ServerStats.ResponseTimes.${newTicketType}.${ButtonType}.totalTicketsHandled`, ServerResponseTimes?.[`${newTicketType}`]?.[`${ButtonType}`].totalTicketsHandled + 1)
    }
}

module.exports.padTo2Digits = async (num) => {
    return num.toString().padStart(2, '0');
}

module.exports.convertMsToTime = async (milliseconds) => {
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
  
    seconds = seconds % 60;
    minutes = minutes % 60;
    
    if (hours == 0 && minutes == 0) return `${await func.padTo2Digits(seconds,)} seconds`;
    if (hours == 0) return `${await func.padTo2Digits(minutes)} minutes and ${await func.padTo2Digits(seconds,)} seconds`;

    return `${await func.padTo2Digits(hours)} hours, ${await func.padTo2Digits(minutes)} minutes and ${await func.padTo2Digits(
      seconds,
    )} seconds`;
}

module.exports.staffStats = async (ticketType, directory, userid) => {

    let userStats = await db.get(`StaffStats.${userid}`)

	if (userStats?.[`${ticketType}`]?.[`${directory}`] == null || userStats?.[`${ticketType}`]?.[`${directory}`] == undefined) {
		await db.set(`StaffStats.${userid}.${ticketType}.${directory}`, 1);
	} else {
		await db.set(`StaffStats.${userid}.${ticketType}.${directory}`, userStats?.[`${ticketType}`]?.[`${directory}`] + 1);
	}

    if (userStats?.totalActions == null || userStats?.totalActions == undefined) {
        await db.set(`StaffStats.${userid}.totalActions`, 1);
    } else {
        await db.set(`StaffStats.${userid}.totalActions`, userStats?.totalActions + 1);
    }

    if (userStats?.[`${ticketType}`]?.[`total`] == null || userStats?.[`${ticketType}`]?.[`total`] == undefined) {
		await db.set(`StaffStats.${userid}.${ticketType}.total`, 1);
	} else {
		await db.set(`StaffStats.${userid}.${ticketType}.total`, userStats?.[`${ticketType}`]?.[`total`] + 1);
	}

    await db.set(`StaffStats.${userid}.lastAction`, Date.now());

}


module.exports.GrabUserStaffStats = async (userid, TicketType) => {

    let userStats = await db.get(`StaffStats.${userid}`);

    let soloUserStats = {
        totalActions: ``,
        acceptedActions: userStats?.[TicketType]?.accepted ? userStats?.[TicketType]?.accepted : 0,
        deniedActions: userStats?.[TicketType]?.denied ? userStats?.[TicketType]?.denied : 0,
        customCloseActions: userStats?.[TicketType]?.customclose ? userStats?.[TicketType]?.customclose : 0,
        openTicketActions: userStats?.[TicketType]?.openticket ? userStats?.[TicketType]?.openticket : 0,
        closeTicketActions: userStats?.[TicketType]?.closeticket ? userStats?.[TicketType]?.closeticket : 0,
        ticketMessagesHiddenActions: userStats?.[TicketType]?.ticketmessageshidden ? userStats?.[TicketType]?.ticketmessageshidden : 0,
        ticketMessagesVisibleActions: userStats?.[TicketType]?.ticketmessages ? userStats?.[TicketType]?.ticketmessages : 0
        
    }
    soloUserStats.totalActions = soloUserStats.acceptedActions + soloUserStats.deniedActions + soloUserStats.customCloseActions + soloUserStats.openTicketActions + soloUserStats.closeTicketActions + soloUserStats.ticketMessagesHiddenActions + soloUserStats.ticketMessagesVisibleActions
    return soloUserStats;
}

module.exports.CombineActionCountsUser = async (userid, actiontype) => {

    let userStats = await db.get(`StaffStats.${userid}`);
    let UserActionStats = 0
    const handlerRaw = require("../content/handler/options.json");
	const handlerKeys = Object.keys(handlerRaw.options);	

    for (let TicketType of handlerKeys) {
        if (userStats?.[`${TicketType}`]?.[`${actiontype}`] == null) continue;
        UserActionStats = UserActionStats + userStats?.[`${TicketType}`]?.[`${actiontype}`]
    }

    return UserActionStats;
}

module.exports.closeDataAddDB = async (userid, ticketUniqueID, closeType, closeUser, closeUserID, closeTime, closeReason) => {

    await db.set(`PlayerStats.${userid}.ticketLogs.${ticketUniqueID}.closeType`, closeType)
    await db.set(`PlayerStats.${userid}.ticketLogs.${ticketUniqueID}.closeUser`, closeUser)
    await db.set(`PlayerStats.${userid}.ticketLogs.${ticketUniqueID}.closeUserID`, closeUserID)
    await db.set(`PlayerStats.${userid}.ticketLogs.${ticketUniqueID}.closeTime`, closeTime)
    await db.set(`PlayerStats.${userid}.ticketLogs.${ticketUniqueID}.closeReason`, closeReason)
}

module.exports.openTicket = async (client, interaction, questionFile, recepientMember, administratorMember, ticketType, embed) => {


    let postchannel = client.channels.cache.get(questionFile[`post-channel`])
    postchannelCategory = postchannel.parentId
    ticketCategory = questionFile[`ticket-category`]
    let accessRoleIDs = questionFile[`access-role-id`]
    let staffGuild = await client.guilds.cache.get(client.config.channel_ids.staff_guild_id)

    if (administratorMember == null) {
        if (questionFile["role-pings-on-new-ticket"]) {

            let pingTags = `<@&${client.config.role_ids.default_admin_role_id}>`

            for (let role of accessRoleIDs) {
                if (role == "") continue;
                pingTags = pingTags + ` <@&${role}>`
            }

            administratorMember = `Auto Ticket (${pingTags})`
        } else {
            administratorMember = "Auto Ticket"
        }
    }

    let creatorName = recepientMember.username.trim().replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, `\n`);
    creatorName = creatorName.substring(0, 8).replace(`-`, ``).replace(` `, ``);;
    let creatorID = recepientMember.id

    let overwrites = [
        {
            id: staffGuild.id,
            deny: ['VIEW_CHANNEL', 'ADD_REACTIONS'],
        },
        {
            id: client.user.id,
            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ADD_REACTIONS'],
        },
        {
            id: client.config.role_ids.default_admin_role_id,
            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
        }
    ];

    for (let role of accessRoleIDs) {

    if(role != "") {
        let accessRole = staffGuild.roles.cache.find(x => x.id == role)
        if(!accessRole) {
            func.handle_errors(null, client, `functions.js`, `Can not add "access role" to channel permissions as it doesn't exist!`)

        } else {
            let add = {
                id: role,
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            }
            overwrites.push(add)
        }
    }
}   

    let ticketChannel = await staffGuild.channels.create(`${creatorName}-${creatorID}-${ticketType}`, {
        type: "text",
        topic: recepientMember.id,
        parent: (ticketCategory) ? ticketCategory : postchannelCategory ||  null,
        permissionOverwrites: overwrites,
    });

    const closeRow = new Discord.MessageActionRow()
    closeRow.addComponents(
        new Discord.MessageButton()
            .setCustomId(`ticketclose`)
            .setLabel(lang.close_ticket["close-ticket-button-title"] != "" ? lang.close_ticket["close-ticket-button-title"] : `Close Ticket`)
            .setStyle("DANGER")
            .setEmoji("📝"),
    );

    await ticketChannel.send({ embeds: [embed], components: [closeRow], content: lang.ticket_creation["initial-message-content"] != "" ? lang.ticket_creation["initial-message-content"].replace(`{{USERNAME}}`, recepientMember).replace(`{{TICKETTYPE}}`, ticketType).replace(`{{ADMIN}}`, administratorMember).replace(/{{PREFIX}}/g, client.config.bot_settings.prefix) : `${recepientMember}'s ${ticketType} ticket was opened here by ${administratorMember}\n**Use ${client.config.bot_settings.prefix}r to reply annonymously or ${client.config.bot_settings.prefix}m to reply with your name, anything said without the prefix will not be sent to the user**`}).then((firstpost) => firstpost.pin())?.catch(e => { });

    if (interaction.message.id != messageid.messageId) await interaction.message.delete().catch(e => {func.handle_errors(e, client, `functions.js`, null)});
    
    if (administratorMember) {
        await func.staffStats(ticketType, `openticket`, administratorMember.id);
    }

    let openedTicket = new Discord.MessageEmbed()
    .setTitle(lang.ticket_creation["player-embed-title"] != "" ? lang.ticket_creation["player-embed-title"] : `Ticket Opened`)
    .setDescription(lang.ticket_creation["player-embed-description"] != "" ? lang.ticket_creation["player-embed-description"] : `A ticket has been opened for you, please type here in your DMs to send messages to the staff team!`)
    .setColor(client.config.bot_settings.main_color)
    .setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})

    recepientMember.send({embeds: [openedTicket]}).catch(async (err) => {

        if (err.message === `Cannot send messages to this user`) {
            let errormsg = await ticketChannel.send(`${recepientMember.username}/${recepientMember.id} has their DMs closed, could not send opened ticket message to them!`).catch(e => func.handle_errors(e, client, `functions.js`, null));
        } else {func.handle_errors(err, client, `functions.js`, null)}
    })

    if (questionFile["display-user-discord-info"] == true) {
            client.commands.get(`ticketuserinfo`)(client, recepientMember, ticketChannel);
     }

     if (questionFile["check-cheetos"] == true) {
        if (!client.config.bot_settings.ownerID || client.config.bot_settings.ownerID == "") {
            func.handle_errors(null, client, `functions.js`, `Your ownerID config variable was not found! You can not access cheetos without it.`)
        } else {
            // Run the users Discord ID through the CC command
            client.commands.get(`ticketcheetos`)(client, recepientMember.id, ticketChannel);
        }
     }

     if (questionFile["check-steamid"] == true) {
        if (questionFile["needVerified"] === false) return func.handle_errors(null, client, `functions.js`, `check-steamid is enabled but needVerified is disabled, which means I do not have a SteamID to check!\n\n(TicketType: ${ticketType})`)
        if (!client.config.tokens.Linking_System_API_Key_Or_Secret || client.config.tokens.Linking_System_API_Key_Or_Secret == "") return func.handle_errors(null, client, `functions.js`, `check-steamid is enabled and Linking_System_API_Key_Or_Secret is not set in the config so could not access the API!`)

        if (client.config.linking_settings.linkingSystem === 1) {

            let SteamIDGrab = await unirest.get(`${client.config.linking_settings.verify_link}/api.php?action=findByDiscord&id=${recepientMember.id}&secret=${client.config.tokens.Linking_System_API_Key_Or_Secret}`)
            if (!SteamIDGrab?.body?.toString().startsWith("7656119")) return func.handle_errors(null, client, `functions.js`, `Could not find a valid SteamID! Cancelled Steam check.`)
            client.commands.get(`ticketinfo`)(client, SteamIDGrab?.body, ticketChannel, interaction, ticketType);
            

        } else if (client.config.linking_settings.linkingSystem === 2) {

            let SteamIDGrab = await unirest.get(`https://api.steamcord.io/players?discordId=${recepientMember.id}`).headers({'Authorization': `Bearer ${client.config.tokens.Linking_System_API_Key_Or_Secret}`, 'Content-Type': 'application/json'})
            if (!SteamIDGrab.body[0]?.steamAccounts[0]?.steamId.toString().startsWith("7656119")) return func.handle_errors(null, client, `functions.js`, `Could not find a valid SteamID! Cancelled Steam check.`)
            client.commands.get(`ticketinfo`)(client, SteamIDGrab.body[0]?.steamAccounts[0]?.steamId.toString(), ticketChannel, interaction, ticketType);
            

        }  else if (client.config.linking_settings.linkingSystem === 3) {

            let SteamIDGrab = await unirest.get(`https://link.platformsync.io/api.php?id=${recepientMember.id}&token=${client.config.tokens.Linking_System_API_Key_Or_Secret}`)
            if (!SteamIDGrab.body?.steam_id?.startsWith("7656119")) return func.handle_errors(null, client, `functions.js`, `Could not find a valid SteamID! Cancelled Steam check.`)
            client.commands.get(`ticketinfo`)(client, SteamIDGrab.body.steam_id.toString(), ticketChannel, interaction, ticketType);
            

        }
    }
    }