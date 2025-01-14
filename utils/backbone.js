const Discord = require("discord.js");
const { writeFileSync, existsSync, mkdirSync, unlinkSync } = require("fs");
let unirest = require('unirest');
const func = require("./functions.js")
const lang = require("../content/handler/lang.json");
const {QuickDB} = require("quick.db")
const db = new QuickDB();


module.exports = async function (client, interaction, user, ticketType, validOption, questionFilesystem) {
	try {

		let embedpre = new Discord.MessageEmbed()
		.setDescription(questionFilesystem["pre-message"] == "" ? "**Hi there, please read the questions below carefully and answer them to the best of your ability.**" : `**${questionFilesystem["pre-message"]}**`)
		.setColor(0x990000)
		.setFooter({text: `${lang.misc["pre-embed-footer"] != "" ? lang.misc["pre-embed-footer"] : "If you wish to stop this process, type `stop` or wait 10 minutes and it will cancel."}`, iconURL: client.user.displayAvatarURL()})
        .setImage("https://media.discordapp.net/attachments/1100509571342147644/1200965934895091793/Support.gif?ex=67709caf&is=676f4b2f&hm=0bd530dcccaccf5e80d8edeeb78188ebbf686be8cf24cd6456c9557ad06e8a81&=");

		let errorFound = 0
		await user.send({embeds: [embedpre]}).catch(async (err) => {
			if (err.message === `Cannot send messages to this user`) {
				errorFound++
				let errormsg = await interaction.editReply({content: lang.user_errors["can-not-dm"] != "" ? lang.user_errors["can-not-dm"].replace(`{{USER}}`, `<@${user.id}>`) : `<@${user.id}>, I could not DM you, please make sure your DMs are open!`, ephemeral: true}).catch(e => func.handle_errors(e, client, `backbone.js`, null));
				return;
			}
			return;
		})

		if (errorFound == 1) return;
		await interaction.editReply({content: lang.ticket_creation["ticket-creation-confirmation"] != "" ? lang.ticket_creation["ticket-creation-confirmation"] : `Your ticket has been successfully opened in our DMs!`, ephemeral: true}).catch(e => func.handle_errors(e, client, `backbone.js`, null));
		// Causing Unknown Interaction errors possibly?
		// await interaction.deferUpdate().catch(err => func.handle_errors(err, client, `backbone.js`, null));

		let responses = "";
		var stop = false;

		for (var x = 0; x < questionFilesystem.questions.length; x++) {
			if (stop) break;
			const question = questionFilesystem.questions[x];

			let embed = new Discord.MessageEmbed()
			.setTitle(question)
			.setColor(0x208cdd)
			.setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})
			const sent = await user.send({embeds: [embed]}).catch(async (err) => {
				if (err.message === `Cannot send messages to this user`) return;
				func.handle_errors(e, client, `backbone.js`, null)
			})

			const filter = response => {
				return response.content != null && !response.author.bot;
			}

			if (!sent || !sent?.channel) {
				stop = true
				break;
			}
			const reply = await sent?.channel?.awaitMessages({filter, max: 1, time: 600 * 1000, errors: [ "time" ] }).catch(_obj => { return false });

			if (!reply || !reply?.first() || reply?.first()?.content?.toLowerCase() == "stop") {
				stop = true
				break;
			}

			const extraData = reply?.first()?.attachments?.first()?.url ? reply.first().attachments?.first()?.url : "";
			responses = responses.concat(`\n\n**${question}**\n${extraData} \`\`\`${reply.first().content}\`\`\``);
		};

		if (stop) return user.send(lang.user_errors["session-timed-out"] != "" ? lang.user_errors["session-timed-out"] : "Your session was cancelled or timed out.").catch(async (err) => {
			if (err.message === `Cannot send messages to this user`) return;
		});
		const guild = await client.guilds.cache.find(x => x.id == client.config.channel_ids.staff_guild_id);
		if (!guild) return func.handle_errors(null, client, `backbone.js`, `staff_guild_id was not found, is it correct in the config?`)
		const ticketChannel = await guild.channels.cache.find(x => x.id == questionFilesystem["post-channel"]);
		if (!ticketChannel) return func.handle_errors(null, client, `backbone.js`, `TicketsChannel (post-channel in your question file) was not found, is it correct in the config?`)
		
		let embedpost = new Discord.MessageEmbed()
		.setDescription(questionFilesystem["post-message"] == "" ? "**Thanks for your responses, please be patient and we will get back to you as soon as we can. The bot will not post any more messages from you to the team unless told otherwise.**" : `**${questionFilesystem["post-message"]}**`)
		.setColor(0x00A300)
		.setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})

		await user.send({embeds: [embedpost]}).catch(async (err) => {
			if (err.message === `Cannot send messages to this user`) return;
			func.handle_errors(e, client, `backbone.js`, null)
		});

		let overflow = responses.length > 2000;
		let DiscordNumber = 0
		let title = ""
		let author = ""

		let SteamID = ""
		if (questionFilesystem.needVerified === true) { 

			if (!client.config.tokens.Linking_System_API_Key_Or_Secret || client.config.tokens.Linking_System_API_Key_Or_Secret == "") return func.handle_errors(null, client, `backbone.js`, `needVerified is enabled and Linking_System_API_Key_Or_Secret is not set in the config so could not access the API!`)

			// Simple Link is 1
			if (client.config.linking_settings.linkingSystem === 1) {

				let SteamIDGrab = await unirest.get(`${client.config.linking_settings.verify_link}/api.php?action=findByDiscord&id=${user.id}&secret=${client.config.tokens.Linking_System_API_Key_Or_Secret}`)

				if (SteamIDGrab.body) {

					if (SteamIDGrab.body?.toString) {
						if (SteamIDGrab?.body?.toString().startsWith("7656119")) SteamID = SteamIDGrab.body

					}
				} else {
					func.handle_errors(null, client, `backbone.js`, `Could not access API! Have you selected the correct linking system?`)
					
				}

			// Steamcord is 2
			} else if (client.config.linking_settings.linkingSystem === 2) {

				let SteamIDGrab = await unirest.get(`https://api.steamcord.io/players?discordId=${user.id}`).headers({'Authorization': `Bearer ${client.config.tokens.Linking_System_API_Key_Or_Secret}`, 'Content-Type': 'application/json'})
				if (SteamIDGrab.body) {
					if (SteamIDGrab.body[0]?.steamAccounts[0]?.steamId) {
						if (SteamIDGrab.body[0]?.steamAccounts[0]?.steamId.toString().startsWith("7656119")) SteamID = SteamIDGrab.body[0]?.steamAccounts[0]?.steamId
					}
				} else {
					func.handle_errors(null, client, `backbone.js`, `Could not access API! Have you selected the correct linking system?`)
				}
			
			// Platform Sync is 3
			} else if (client.config.linking_settings.linkingSystem === 3) {

				let SteamIDGrab = await unirest.get(`https://link.platformsync.io/api.php?id=${user.id}&token=${client.config.tokens.Linking_System_API_Key_Or_Secret}`)
				if (SteamIDGrab.body) {
						if (SteamIDGrab.body?.linked == true) {
							if (SteamIDGrab.body?.steam_id) {
								if (SteamIDGrab?.body?.steam_id?.startsWith("7656119")) SteamID = SteamIDGrab.body.steam_id
							}
						}
				} else {
					func.handle_errors(null, client, `backbone.js`, `Could not access API! Have you selected the correct linking system?`)
				}

			}

		}

		if (questionFilesystem["check-cheetos"] == true && client.config.tokens.cheetosToken != "") {
			if (!client.config.bot_settings.ownerID || client.config.bot_settings.ownerID == "") {
				func.handle_errors(null, client, `backbone.js`, `Your ownerID config variable was not found! You can not access cheetos without it.`)
				title = `${ticketType}`
				author = `${SteamID === "" ? `${user.username}` :`${user.username} (${SteamID})`}`
				} else {
					let resultb = await unirest.get(`https://cheetos.gg/api.php?action=search&id=${user.id}`).header("Auth-Key", client.config.tokens.cheetosToken).header("DiscordID", client.config.bot_settings.ownerID)
					if (resultb?.body === "Null") {
						DiscordNumber = 0
						cheetosTitle = lang.cheetos["cheetos-links"] != "" ? lang.cheetos["cheetos-links"].replace(`{{COUNT}}`, `${DiscordNumber}`) : `${DiscordNumber} links from Cheetos`
					} else if (resultb?.body?.includes(`Unexpected response`) || resultb?.status != 200) {
						cheetosTitle = lang.cheetos["cheetos-links"] != "" ? lang.cheetos["cheetos-links"].replace(`{{COUNT}}`, `Unknown`) : `Unknown links from Cheetos`
					} else { 
						if (typeof resultb?.body === 'string' || resultb.body instanceof String) {
							func.handle_errors(null, client, `backbone.js`, `Unexpected response: "${resultb?.body}\nStatus Message: ${resultb?.statusMessage}"`)
							DiscordNumber = "Unknown"
						} else {
							DiscordNumber = resultb?.body?.length
						}
						cheetosTitle = lang.cheetos["cheetos-links"] != "" ? lang.cheetos["cheetos-links"].replace(`{{COUNT}}`, `${DiscordNumber}`) : `${DiscordNumber} links from Cheetos`
					}

					title = `${ticketType} | ${cheetosTitle}`
					author = `${SteamID === "" ? `${user.username}` :`${user.username} (${SteamID})`}`

				}

		} else {
			title = `${ticketType}`
			author = `${SteamID === "" ? `${user.username}` :`${user.username} (${SteamID})`}`
		}

		// Get the users total ticket count and add it to the title

		let playerTicketsCount = await db.get(`PlayerStats.${user.id}.ticketsCount`)
		let totalCount = 1
		let ticketUniqueID = ""
		let abbreviation = validOption.abbreviation
		if (validOption.abbreviation === "") abbreviation = `TKT`

		if (playerTicketsCount) {
			let newListCount = Object.values(playerTicketsCount)
			for (let countTicketType of newListCount) {
			   totalCount = totalCount + countTicketType
		   }

			// set up the unique ticket ID here
			let ticketCountType = playerTicketsCount[`${ticketType.replace(/ /g, `_`)}`]
			if (isNaN(ticketCountType) === true) ticketCountType = 0
			ticketUniqueID = `${user.id}-${abbreviation}-${ticketCountType + 1}`
		} else {
			ticketUniqueID = `${user.id}-${abbreviation}-1`
		}

		if (abbreviation === `TKT`) ticketUniqueID = `${user.id}-${abbreviation}-${totalCount}`

		if (isNaN(totalCount) === true) totalCount = 1

		const embed = new Discord.MessageEmbed()
		.setAuthor({ name: author + ` | Ticket #${totalCount}`, iconURL: user.displayAvatarURL()})
		.setTitle(title)
        .setDescription(responses.substring(0, 4000))
		.setColor(client.config.bot_settings.main_color)
		.setTimestamp()
		.setFooter({text:`${ticketUniqueID} | Ticket Opened:`, iconURL: client.user.displayAvatarURL()});

		let accessRoleIDs = questionFilesystem["access-role-id"]
		let pingTags = `<@${user.id}>`

		for (let role of accessRoleIDs) {
			if (role == "") continue;
			pingTags = ` <@&${role}>` + pingTags
		}
		
		if (questionFilesystem["open-as-ticket"] == true) {

			await func.openTicket(client, interaction, questionFilesystem, user, null, ticketType, embed);

		} else {

		const row = new Discord.MessageActionRow()
		if (questionFilesystem.active_ticket_button_content.accept.enabled == true) {
			if (questionFilesystem.active_ticket_button_content.accept.emoji != "") {
				row.addComponents(new Discord.MessageButton().setCustomId(`supportaccept`).setLabel(questionFilesystem.active_ticket_button_content.accept.title == "" ? "Accept" : questionFilesystem.active_ticket_button_content.accept.title).setStyle("SUCCESS").setEmoji(questionFilesystem.active_ticket_button_content.accept.emoji));
			} else {
				row.addComponents(new Discord.MessageButton().setCustomId(`supportaccept`).setLabel(questionFilesystem.active_ticket_button_content.accept.title == "" ? "Accept" : questionFilesystem.active_ticket_button_content.accept.title).setStyle("SUCCESS"));
			}
		}

		if (questionFilesystem.active_ticket_button_content.deny.enabled == true) {
			if (questionFilesystem.active_ticket_button_content.deny.emoji != "") {
				row.addComponents(new Discord.MessageButton().setCustomId(`supportdeny`).setLabel(questionFilesystem.active_ticket_button_content.deny.title == "" ? "Deny" : questionFilesystem.active_ticket_button_content.deny.title).setStyle("DANGER").setEmoji(questionFilesystem.active_ticket_button_content.deny.emoji));
			} else {
				row.addComponents(new Discord.MessageButton().setCustomId(`supportdeny`).setLabel(questionFilesystem.active_ticket_button_content.deny.title == "" ? "Deny" : questionFilesystem.active_ticket_button_content.deny.title).setStyle("DANGER"));
			}
		}

		if (questionFilesystem.active_ticket_button_content.custom_response_message.enabled == true) {
			if (questionFilesystem.active_ticket_button_content.custom_response_message.emoji != "") {
				row.addComponents(new Discord.MessageButton().setCustomId(`supportcustom`).setLabel(questionFilesystem.active_ticket_button_content.custom_response_message.title == "" ? "Custom Close Response" : questionFilesystem.active_ticket_button_content.custom_response_message.title).setStyle("PRIMARY").setEmoji(questionFilesystem.active_ticket_button_content.custom_response_message.emoji));
			} else {
				row.addComponents(new Discord.MessageButton().setCustomId(`supportcustom`).setLabel(questionFilesystem.active_ticket_button_content.custom_response_message.title == "" ? "Custom Close Response" : questionFilesystem.active_ticket_button_content.custom_response_message.title).setStyle("PRIMARY"));
			}
		}

		if (questionFilesystem.active_ticket_button_content.make_a_ticket.enabled == true) {
			if (questionFilesystem.active_ticket_button_content.make_a_ticket.emoji != "") {
				row.addComponents(new Discord.MessageButton().setCustomId(`supportticket`).setLabel(questionFilesystem.active_ticket_button_content.make_a_ticket.title == "" ? "Open Support Ticket" : questionFilesystem.active_ticket_button_content.make_a_ticket.title).setStyle("PRIMARY").setEmoji(questionFilesystem.active_ticket_button_content.make_a_ticket.emoji));
			} else {
				row.addComponents(new Discord.MessageButton().setCustomId(`supportticket`).setLabel(questionFilesystem.active_ticket_button_content.make_a_ticket.title == "" ? "Open Support Ticket" : questionFilesystem.active_ticket_button_content.make_a_ticket.title).setStyle("PRIMARY"));
			}
		}

		let sent = null;
		if (overflow) {
			if (!existsSync("./temp")) mkdirSync("./temp");
			const dirpath = `./temp/${user.id}.txt`;
			writeFileSync(dirpath, responses, { encoding: "utf-8" });
			sent = await ticketChannel.send({ content: questionFilesystem["role-pings-on-new-ticket"] == true ? pingTags : `<@${user.id}>`, embeds: [embed], components: [row], files: [ dirpath ] }).catch(e => func.handle_errors(e, client, `backbone.js`, null));
			unlinkSync(dirpath);
		} else {
			sent = await ticketChannel.send({ content: questionFilesystem["role-pings-on-new-ticket"] == true ? pingTags : `<@${user.id}>`, embeds: [embed], components: [row] }).catch(e => func.handle_errors(e, client, `backbone.js`, null));
		};

	}

	if (playerTicketsCount?.[ticketType?.replace(/ /g, `_`)] === undefined) {
		await db.set(`PlayerStats.${user.id}.ticketsCount.${ticketType.replace(/ /g, `_`)}`, 1)
	} else {
		await db.set(`PlayerStats.${user.id}.ticketsCount.${ticketType.replace(/ /g, `_`)}`, playerTicketsCount[`${ticketType.replace(/ /g, `_`)}`] + 1)
	}

		await db.set(`PlayerStats.${user.id}.ticketLogs.${ticketUniqueID}.ticketUniqueID`, ticketUniqueID)
		await db.set(`PlayerStats.${user.id}.ticketLogs.${ticketUniqueID}.userID`, user.id)
		await db.set(`PlayerStats.${user.id}.ticketLogs.${ticketUniqueID}.username`, user.username)
		await db.set(`PlayerStats.${user.id}.ticketLogs.${ticketUniqueID}.responses`, responses)
		await db.set(`PlayerStats.${user.id}.ticketLogs.${ticketUniqueID}.createdAt`, Date.now() / 1000)
		await db.set(`PlayerStats.${user.id}.ticketLogs.${ticketUniqueID}.ticketType`, ticketType)

	} catch (e) {
		func.handle_errors(e, client, `backbone.js`, null);
	} finally {
		client.blocked_users.delete(user.id);
		setTimeout(() => {
			client.cooldown.delete(user.id);
		}, client.config.timeouts.timeout_cooldown_in_seconds * 1000);
	};
};