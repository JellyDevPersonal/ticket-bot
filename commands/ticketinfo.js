const Discord = require("discord.js");
const config = require('../config/config.json');
const unirest = require('unirest');
const moment = require("moment");
const func = require("../utils/functions.js");

module.exports = async function (client, id, postChannel, interaction, ticketType) {

try {

	const ErrorChannel = client.channels.cache.get(config.channel_ids.error_channel)
	const steamId = id;
	const firstmessage = await postChannel.send(`Grabbing information for ${steamId}, please be patient!`);
	if (config.tokens.battlemetricsToken == "" || config.tokens.battlemetricsToken == undefined) {
		
		firstmessage.delete().catch((err) => {
			if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
		});

		return postChannel.send("Error! No Battlemetrics token found!").catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
	}

	// Get the Battlemetrics ID from the SteamID
	let data = {"data": [{"type": "identifier","attributes": {"type": `steamID`,"identifier": `${steamId}`}}]}
	const BMIDSearch = await unirest.post(`https://api.battlemetrics.com/players/match?access_token=${config.tokens.battlemetricsToken}`).type('json').send(data)
	if (BMIDSearch.status != 200) {
		
		firstmessage.edit("Error within the bot! SteamID search Cancelled.")
        if (BMIDSearch.status === 429) return ErrorChannel.send(`**Error - Status 429 @ BMIDSearch:**\nToo many requests sent at the same time on this token.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
        if (BMIDSearch.status === 503) return ErrorChannel.send(`**Error - Status 503 @ BMIDSearch:**\nBattlemetrics may be offline, check the website.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
        if (BMIDSearch.status === 504) return ErrorChannel.send(`**Error - Status 504 @ BMIDSearch:**\nConnection timed out.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
		if (BMIDSearch.status === 401) return ErrorChannel.send(`**Error - Status 401 @ BMIDSearch:**\nThis search can not be authorised. Is your token correct and does it have the right permissions?`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
		if (BMIDSearch.status === 520) return ErrorChannel.send(`**Error - Status 520 @ BMIDSearch:**\nGeneric CloudFlare error, no direct reason found.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
        return ErrorChannel.send(`**Error - Status ${BMIDSearch.status} @ BMIDSearch:**\nUnknown Error.\n\n\`\`\`${BMIDSearch.body ? JSON.stringify(BMIDSearch.body).substring(0, 1700) : ""}\`\`\``).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
	}
	if (BMIDSearch.body.data.length == "0") {

		firstmessage.delete().catch((err) => {
			if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
		});

		return postChannel.send("That SteamID could not be found!").catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
	}

	const handlerRaw = require("../content/handler/options.json");
	const found = Object.keys(handlerRaw.options).find(x => x.toLowerCase() == ticketType.toLowerCase());
	let typeFile = require(`../content/questions/${handlerRaw.options[found].question_file}`);

	// Battlemetrics ID and Steam Info
	const BMID = BMIDSearch.body.data[0].relationships.player.data.id
	const steamName = BMIDSearch.body.data[0].attributes.metadata.profile.personaname
	const avatar = BMIDSearch.body.data[0].attributes.metadata.profile.avatarfull
	const publicity = BMIDSearch.body.data[0].attributes.metadata.profile.communityvisibilitystate
	const lastSeen = BMIDSearch.body.data[0].attributes.lastSeen

	// Grab ban data and check it's valid
	let banInformation = await GetBans(BMID);
	if (banInformation === undefined) return firstmessage.delete().catch((err) => {
		if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
	});

	let noteInformation = "";
	let noteCount = "";
	let orgNoteCount = "";
	if (config.misc.bm_org_id && config.misc.bm_org_id != "") {
	// Grab note data and check it's valid
	let {noteInformationfirst, noteCountfirst, orgNoteCountfirst} = await GetNotes(BMID, config.misc.bm_org_id);
	noteInformation = noteInformationfirst
	noteCount = noteCountfirst
	orgNoteCount = orgNoteCountfirst
	if (noteInformation === undefined) return firstmessage.delete().catch((err) => {
		if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
	});
}

	// Grab hours data and check it's valid
	let {orgHours, aimtrainHours, allHours, totalServers, orgServers} = await GetHoursandServerInfo(BMID);
	if (orgHours === "Unknown") return firstmessage.delete().catch((err) => {
		if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
	});

	// Grab the KDs and F7 reports and check it's valid
	let {KDTotal, KDDay, killsTotal, deathsTotal, kills24hr, deaths24hr, F7Total, F7Day} = await GetKDandF7(BMID);
	if (KDTotal === undefined) return firstmessage.delete().catch((err) => {
		if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
	});

	// Grab the game ban and check it's valid
	let gameBan = await GetGameBan(steamId);
	if (gameBan === undefined) gameBan = "Unknown";

	async function GetBans(BMID) {

		firstmessage.edit(`Grabbing Bans for ${steamId}, please be patient!`).catch((err) => {
            if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
        });

		// Get the ban data for that Battlemetrics ID
		const banData = await unirest.get(`https://api.battlemetrics.com/bans?filter[player]=${BMID}&page[size]=100&access_token=${config.tokens.battlemetricsToken}`)
		if (banData.status != 200) {
			postChannel.send("Error within the bot! SteamID search Cancelled.").catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (banData.status === 429) ErrorChannel.send(`**Error - Status 429 @ banData:**\nToo many requests sent at the same time on this token.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (banData.status === 503) ErrorChannel.send(`**Error - Status 503 @ banData:**\nBattlemetrics may be offline, check the website.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (banData.status === 504) ErrorChannel.send(`**Error - Status 504 @ banData:**\nConnection timed out.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (banData.status === 401) ErrorChannel.send(`**Error - Status 401 @ banData:**\nThis search can not be authorised. Is your token correct and does it have the right permissions?`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (banData.status === 520) ErrorChannel.send(`**Error - Status 520 @ banData:**\nGeneric CloudFlare error, no direct reason found.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (banData.status != 429 || banData.status != 503 || banData.status != 504 || banData.status != 520 || banData.status != 401) ErrorChannel.send(`**Error - Status ${banData.status} @ banData:**\nUnknown Error.\n\n\`\`\`${banData.body ? JSON.stringify(banData.body).substring(0, 1700) : ""}\`\`\``).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			return undefined;
		}
		// Check if any bans exist
		if (banData.body.data.length == 0) {
			return "No bans on record.";
		} else {
			return banData.body.data;
		}

	}
	
	async function GetNotes(BMID, orgId) {

		firstmessage.edit(`Grabbing Notes for ${steamId}, please be patient!`).catch((err) => {
            if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
        });

		// Get the note data for that Battlemetrics ID
		const NoteData = await unirest.get(`https://api.battlemetrics.com/players/${BMID}/relationships/notes?page[size]=100&access_token=${config.tokens.battlemetricsToken}`)
		if (NoteData.status != 200) {
			postChannel.send("Error within the bot! SteamID search Cancelled.").catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (NoteData.status === 429) ErrorChannel.send(`**Error - Status 429 @ NoteData:**\nToo many requests sent at the same time on this token.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (NoteData.status === 503) ErrorChannel.send(`**Error - Status 503 @ NoteData:**\nBattlemetrics may be offline, check the website.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (NoteData.status === 504) ErrorChannel.send(`**Error - Status 504 @ NoteData:**\nConnection timed out.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (NoteData.status === 401) ErrorChannel.send(`**Error - Status 401 @ NoteData:**\nThis search can not be authorised. Is your token correct and does it have the right permissions?`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (NoteData.status === 520) ErrorChannel.send(`**Error - Status 520 @ NoteData:**\nGeneric CloudFlare error, no direct reason found.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (NoteData.status != 429 || NoteData.status != 503 || NoteData.status != 504 || NoteData.status != 520 || NoteData.status != 401) ErrorChannel.send(`**Error - Status ${NoteData.status} @ NoteData:**\nUnknown Error.\n\n\`\`\`${NoteData.body ? JSON.stringify(NoteData.body).substring(0, 1700) : ""}\`\`\``).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			return {noteInformationfirst:undefined, noteCountfirst:undefined, orgNoteCountfirst:undefined};
		}
		// Check if any notes exist
		let finalNotes = [];
		if (NoteData.body.data.length == 0) {
			return {noteInformationfirst:"No notes on record.", noteCountfirst:0, orgNoteCountfirst:0};
		} else {

			for (let notes of NoteData.body.data) {
				if (notes.relationships.organization.data.id === orgId) finalNotes.push(notes);
			}

			if (finalNotes.length === 0) {
				return {noteInformationfirst:"No notes on record.", noteCountfirst:NoteData.body.data.length, orgNoteCountfirst:0};
			} else {
				let notearray = finalNotes.map(note => `\`\`\`${note.attributes.note}\`\`\``).join(`\n`)
				if (finalNotes.length > 1) {
					// Split the notes up the closest to the character cap, while still keeping full notes and not spliting one in half
					let i = 0;
					const toSendalmost = notearray.substring(i, Math.min(notearray.length, i + 1000));
					const charsize = toSendalmost.lastIndexOf('\n\`\`\`')
					const toSend = notearray.substring(i, Math.min(notearray.length, i + charsize + 1));
					return {noteInformationfirst:toSend, noteCountfirst:NoteData.body.data.length, orgNoteCountfirst:finalNotes.length};
				} else {
					return {noteInformationfirst:notearray, noteCountfirst:NoteData.body.data.length, orgNoteCountfirst:finalNotes.length};
				}
			}
		}
	}
	
	async function GetHoursandServerInfo(BMID) {

		firstmessage.edit(`Grabbing Hours and Server Info for ${steamId}, please be patient!`).catch((err) => {
            if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
        });

		// Get the server(s) data for that Battlemetrics ID
		const totalHours = await unirest.get(`https://api.battlemetrics.com/players/${BMID}?include=server&access_token=${config.tokens.battlemetricsToken}`)
		if (totalHours.status != 200) {
			postChannel.send("Error within the bot! SteamID search Cancelled.").catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (totalHours.status === 429) ErrorChannel.send(`**Error - Status 429 @ totalHours:**\nToo many requests sent at the same time on this token.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (totalHours.status === 503) ErrorChannel.send(`**Error - Status 503 @ totalHours:**\nBattlemetrics may be offline, check the website.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (totalHours.status === 504) ErrorChannel.send(`**Error - Status 504 @ totalHours:**\nConnection timed out.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (totalHours.status === 401) ErrorChannel.send(`**Error - Status 401 @ totalHours:**\nThis search can not be authorised. Is your token correct and does it have the right permissions?`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (totalHours.status === 520) ErrorChannel.send(`**Error - Status 520 @ totalHours:**\nGeneric CloudFlare error, no direct reason found.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (totalHours.status != 429 || totalHours.status != 503 || totalHours.status != 504 || totalHours.status != 520 || totalHours.status != 401)ErrorChannel.send(`**Error - Status ${totalHours.status} @ totalHours:**\nUnknown Error.\n\n\`\`\`${totalHours.body ? JSON.stringify(totalHours.body).substring(0, 1700) : ""}\`\`\``).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			return {orgHours:"Unknown", aimtrainHours:"Unknown", allHours:"Unknown", totalServers:"Unknown"};
		}

		let aimhoursfunc = 0
		let totalhoursfunc = 0
		let orghoursfunc = 0
		let totalServersfunc = 0

		// For each server, make sure its rust and spread the hours between the according categories
		for (let eachserver of totalHours.body.included) {

			if (eachserver.relationships.game.data.id != "rust") {
				continue;
			}
			totalServersfunc++

			if (eachserver.attributes.name.toLowerCase().includes(`aim`) || eachserver.attributes.name.toLowerCase().includes(`training grounds`) || eachserver.attributes.name.toLowerCase().includes(`ukn`) || eachserver.attributes.name.toLowerCase().includes(`aimtrain`)) {
				aimhoursfunc = aimhoursfunc + eachserver.meta.timePlayed
				totalhoursfunc = totalhoursfunc + eachserver.meta.timePlayed

			} else if (eachserver?.relationships?.organization?.data?.id == client.config.misc.bm_org_id) {
				orghoursfunc = orghoursfunc + eachserver.meta.timePlayed
				totalhoursfunc = totalhoursfunc + eachserver.meta.timePlayed

			} else {
				totalhoursfunc = totalhoursfunc + eachserver.meta.timePlayed
			}
		}
		let orgHours = orghoursfunc / 60 / 60
		let aimtrainHours = aimhoursfunc / 60 / 60
		let allHours = totalhoursfunc / 60 / 60

		let orgServers = [];

			for (let server of totalHours?.body?.included) {
				if (server.relationships?.organization?.data?.id != config.misc.bm_org_id) continue;

				let addServerData = {
					serverName: `${server.attributes.name}`,
					serverId: `${server.id}`,
					online: `${server.meta.online}`,
					timePlayed: `${server.meta.timePlayed}`,
					lastSeen: `${server.meta.lastSeen}`
				}

				orgServers.push(addServerData)

			}

		return {orgHours:orgHours, aimtrainHours:aimtrainHours, allHours:allHours, totalServers:totalServersfunc, orgServers:orgServers};

	}

	async function GetKDandF7(BMID) {

		firstmessage.edit(`Grabbing K/D and Reports for ${steamId}, please be patient!`).catch((err) => {
            if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
        });

		var kills = 0;
		var deaths = 0;
		var killsOneDay = 0;
		var deathsOneDay = 0;
		var f7reports = 0;
		var f7reportsOneDay = 0;
		var oneDay = new Date().getTime() - (1 * 24 * 60 * 60 * 1000);
		let url = `https://api.battlemetrics.com/activity?tagTypeMode=and&filter[types][blacklist]=event:query&filter[players]=${BMID}&include=organization,user&page[size]=1000`


		await dataLoop();
		async function dataLoop() {

		const KDandF7Data = await unirest.get(`${url}&access_token=${config.tokens.battlemetricsToken}`)
		if (KDandF7Data.status != 200) {
			postChannel.send("Error within the bot! SteamID search Cancelled.").catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (KDandF7Data.status === 429) ErrorChannel.send(`**Error - Status 429 @ KDandF7Data:**\nToo many requests sent at the same time on this token.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (KDandF7Data.status === 503) ErrorChannel.send(`**Error - Status 503 @ KDandF7Data:**\nBattlemetrics may be offline, check the website.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (KDandF7Data.status === 504) ErrorChannel.send(`**Error - Status 504 @ KDandF7Data:**\nConnection timed out.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (KDandF7Data.status === 401) ErrorChannel.send(`**Error - Status 401 @ KDandF7Data:**\nThis search can not be authorised. Is your token correct and does it have the right permissions?`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (KDandF7Data.status === 520) ErrorChannel.send(`**Error - Status 520 @ KDandF7Data:**\nGeneric CloudFlare error, no direct reason found.`).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			if (KDandF7Data.status != 429 || KDandF7Data.status != 503 || KDandF7Data.status != 504 || KDandF7Data.status != 520 || KDandF7Data.status != 401) ErrorChannel.send(`**Error - Status ${KDandF7Data.status} @ KDandF7Data:**\nUnknown Error.\n\n\`\`\`${KDandF7Data.body ? JSON.stringify(KDandF7Data.body).substring(0, 1700) : ""}\`\`\``).catch(e => func.handle_errors(e, client, `ticketinfo.js`, null));
			return {KDTotal: undefined, KDDay: undefined, killsTotal: undefined, deathsTotal: undefined, kills24hr: undefined, deaths24hr: undefined, F7Total: undefined, F7Day: undefined};
		}

		for(var i = 0; i < KDandF7Data.body.data.length; i++) {

			if (KDandF7Data.body.data[i].attributes.messageType == "rustLog:playerDeath:PVP") {
				var timestamp = KDandF7Data.body.data[i].attributes.timestamp;
				var timestampFinal = new Date(timestamp);
				 if (KDandF7Data.body.data[i].attributes.data.killer_id == BMID) {
					 kills++
					 if (oneDay < Date.parse(timestampFinal)) killsOneDay++
				 } else {
					 deaths++
					 if (oneDay < Date.parse(timestampFinal)) deathsOneDay++
				 }
			}

			if (KDandF7Data.body.data[i].attributes.messageType == "rustLog:playerReport") {
				var timestamp = KDandF7Data.body.data[i].attributes.timestamp;
				var timestampFinal = new Date(timestamp);
				if (KDandF7Data.body.data[i].attributes.data.forPlayerId == BMID) {
					f7reports++
					if (oneDay < Date.parse(timestampFinal)) f7reportsOneDay++
				}
			}

		}

        if (KDandF7Data.body?.links?.next) {
            url = KDandF7Data.body.links.next
   
            await dataLoop();
            return;
        }
		
	}
		var kd = (kills / deaths).toFixed(2);
		var kdOneDay = (killsOneDay / deathsOneDay).toFixed(2);

		if (kd == "Infinity") {
			kd = + kills + ".00"
		} else if (kd == "NaN") {
			kd = 0.00;
		}

		if (kdOneDay == "Infinity") {
			kdOneDay = + killsOneDay + ".00"
		} else if (kdOneDay == "NaN") {
			kdOneDay = 0.00;
		}

		return {KDTotal:kd, KDDay:kdOneDay, killsTotal:kills, deathsTotal:deaths, kills24hr:killsOneDay, deaths24hr:deathsOneDay, F7Total:f7reports, F7Day:f7reportsOneDay};
	}

	async function GetGameBan(SteamID) {

		firstmessage.edit(`Grabbing Game Ban Status for ${steamId}, please be patient!`).catch((err) => {
            if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
        });

		let result = await unirest.get(`https://www.nexusonline.co.uk/bans/profile/?id=${SteamID}&json=true`)
		if (result.body == undefined) return undefined;
		if (result.body == "Error connecting to MySQL server: Too many connections") return undefined;
		let nextResult = JSON.parse(result.body)

		if (config.tokens.steamToken === "" || !config.tokens.steamToken) {

			if (nextResult.ban_date === undefined) { 
				return "Not Banned" 
			} else {

				let date1 = new Date(nextResult.ban_date)
				let date2 = new Date(Date.now())
				var Difference_In_Time = date2.getTime() - date1.getTime();
				var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
				let finalResult = `True - ${Difference_In_Days.toFixed(0) - 1} days ago`
				return finalResult;

			}
		}

		let SteamResult = await unirest.get(`http://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${config.tokens.steamToken}&steamids=${SteamID}`)
	
		if (SteamResult.status != 200) {
			return undefined;
		}   
	
		if (SteamResult.body?.players[0]?.NumberOfGameBans == 0 && nextResult.ban_date === undefined) return "Not Banned";
		if (SteamResult.body?.players[0]?.NumberOfGameBans == 0 && nextResult.ban_date != undefined) return "Not Banned (Temp?)";
		if (!SteamResult.body?.players[0]) return undefined;
	
		let date1 = new Date(nextResult.ban_date)
		let date2 = new Date(Date.now())
		var Difference_In_Time = date2.getTime() - date1.getTime();
		var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
		let finalResult = nextResult.ban_date === undefined ? "Not Banned" : `True - ${Difference_In_Days.toFixed(0) - 1} days ago`
		return finalResult;
	}

	let x = 1
	let finalBanInformation = banInformation == "No bans on record." ? "No Bans Found" : banInformation.map(ban =>`${x++}. [${ban.attributes.reason}](https://www.battlemetrics.com/rcon/bans/edit/${ban.id})`).join(`\n`)
		// Send the final embed to the discord and notes embed if applicable.
		let FinalEmbed = new Discord.MessageEmbed()
			.setColor(config.bot_settings.main_color)
			.setThumbnail(avatar != null ? avatar : `https://i.imgur.com/6YJ5an9.png`)
			.setTitle(`Information on ${steamId}!`)
			.setDescription(`**Bans (${banInformation == "No bans on record." ? "0" : banInformation.length})**\n${finalBanInformation.substring(0, 4000)}`)
			.addField(`Username`, steamName ? steamName : "Unknown Name", true)
			.addField(`Gameban?`, gameBan ? `[${gameBan}](https://www.nexusonline.co.uk/bans/profile/?id=${steamId})` : `[Unknown](https://www.nexusonline.co.uk/bans/profile/?id=${steamId})`, true)
			.addField(`Links`, `[${publicity >= 3 ? `Public Steam Profile` : `Private Steam Profile`}](https://steamcommunity.com/profiles/${steamId})\n[BM RCON Profile](https://www.battlemetrics.com/rcon/players/${BMID})\n[BM Public Profile](https://www.battlemetrics.com/players/${BMID})`, true)
			.addField(`Statistics`, `**K/D Total:** ${KDTotal} (${killsTotal}/${deathsTotal})\n**K/D Past 24 Hours:** ${KDDay} (${kills24hr}/${deaths24hr})\n**F7 Reported Total:** ${F7Total}\n **F7 Reported Past 24 Hours:** ${F7Day}`, true)
			.addField(`Game Hours`, `**Total Servers Played:** ${totalServers}\n**Hours in Rust:** ${allHours.toFixed(1)}\n**Hours in Aimtrain:** ${aimtrainHours.toFixed(1)}\n**Org Hours:** ${orgHours.toFixed(1)}\n`, true)
			.addField(`${orgNoteCount == ""  ? "0" : orgNoteCount} Org Notes (${noteCount == "" ? "0" : noteCount} global)`, noteInformation == "No notes on record." || noteInformation == "" ? "No Notes Found" : noteInformation)
			.setFooter({text: `Last Seen on Battlemetrics: ${moment(lastSeen).format('MMMM Do YYYY, h:mm:ss a')}`})

			if (typeFile[`check-server-activity`][`enabled`] == true) {

				let FinalEmbedServers = new Discord.MessageEmbed()
				.setColor(config.bot_settings.main_color)
				.setThumbnail(avatar != null ? avatar : `https://i.imgur.com/6YJ5an9.png`)
				.setTitle(`Server Information`)
				

				let i = 0
				for (let server of orgServers) {
					if (typeFile[`check-server-activity`][`show-only-online-server`] === true && server.online === `false`) continue;
					i++
					let fieldContent = ""

					if (typeFile[`check-server-activity`][`show-online-status`] == true) fieldContent = fieldContent + `Online?: "${server.online}"\n`
					if (typeFile[`check-server-activity`][`show-hours`] == true) fieldContent = fieldContent + `Server Hours: "${(server.timePlayed / 60 / 60).toFixed(1)}"\n`
					if (typeFile[`check-server-activity`][`show-last-seen`] == true) fieldContent = fieldContent + `Last Played: "${moment(server.lastSeen).format('LLL')}"`

					if (fieldContent != "") {
						FinalEmbedServers.addField(`${server.online == "true" ? ":green_circle:" : ":red_circle:"} ${server.serverName}`,`\`\`\`ml\n${fieldContent}\`\`\``)
					}
				}
				if (i == 0) {
					FinalEmbedServers.setDescription(`The user is not on any server within the organization.`)
				}

				if (i > 0 && typeFile[`check-server-activity`][`show-online-status`] == false && typeFile[`check-server-activity`][`show-hours`] == false && typeFile[`check-server-activity`][`show-last-seen`] == false) {

					FinalEmbedServers.setDescription(`${orgServers.map(server => `${server.online == "true" ? ":green_circle:" : ":red_circle:"} **${server.serverName}**`).join(`\n`)}`)
				}
	
				firstmessage.delete().catch((err) => {
					if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
				});
				return postChannel.send({embeds: [FinalEmbed, FinalEmbedServers]}).catch(err => {
					if (err.code === Discord.Constants.APIErrors.UNKNOWN_CHANNEL) return;
				});

			} else {

				firstmessage.delete().catch((err) => {
					if (err.code === Discord.Constants.APIErrors.UNKNOWN_MESSAGE) return;
				});
				return postChannel.send({embeds: [FinalEmbed]}).catch(err => {
					if (err.code === Discord.Constants.APIErrors.UNKNOWN_CHANNEL) return;
				});

			}

} catch (e) {
	func.handle_errors(e, client, `ticketinfo.js`, null)
	}
};