const Discord = require('discord.js');
const config = require('../config/config.json');
const transcript = require("../utils/fetchTranscript.js");
const func = require("../utils/functions.js");
const lang = require("../content/handler/lang.json");
const {QuickDB} = require("quick.db")
const db = new QuickDB();




module.exports = async function (client, message) {

	if (message.channel.type === "GUILD_PUBLIC_THREAD" || message.channel.type === "DM" || message.channel.type === "GUILD_PRIVATE_THREAD") return func.handle_errors(null, client, `close.js`, `Message channel type is a thread for channel ${message.channel.name}(${message.channel.id}). I can not close a thread as it is not an official ticket channel.`)
	if (message.channel?.name?.split("-").length <= 1) return func.handle_errors(null, client, `close.js`, `The name for the channel has been changed and I can not recognise it as a ticket channel anymore. Channel: ${message.channel.name}(${message.channel.id}).`)
	if (!message.channel.topic) return func.handle_errors(null, client, `close.js`, `The description for the channel has been changed and I can not recognise who to send responses to anymore. Channel: ${message.channel.name}(${message.channel.id}).`)

	const currentChannel = client.channels.cache.find(x => x.id == message.channelId)
	const handlerRaw = require("../content/handler/options.json");
	const myPins = await message.channel.messages.fetchPinned();
	const LastPin = myPins.last();
	if (!LastPin) return func.handle_errors(null, client, `close.js`, `I can not find the pinned embed. Please make sure the initial embed is pinned for me to grab data to close the ticket. Channel: ${message.channel.name}(${message.channel.id}).`)
	if (!LastPin.embeds[0]) return func.handle_errors(null, client, `close.js`, `I can not find the pinned embed. Please make sure the initial embed is pinned for me to grab data to close the ticket. Channel: ${message.channel.name}(${message.channel.id}).`)

	let split = LastPin.embeds[0].footer.text.split("|");
	let ticketType = LastPin.embeds[0].title.split(" | ")[0];
	let uniqueTicketID = split[0].trim();
	const DiscordID = uniqueTicketID.split(`-`)[0];
	const found = Object.keys(handlerRaw.options).find(x => x.toLowerCase() == ticketType.toLowerCase());
	let typeFile = require(`../content/questions/${handlerRaw.options[found].question_file}`);
	let accessRoleIDs = typeFile["access-role-id"];
	let transcriptChannel = typeFile[`transcript-channel`];
	let accepted = 0

	for (let role of accessRoleIDs) {
	if (message.member.roles.cache.find(x => x.id == role)) accepted++
	}
	if (message.member.roles.cache.find(x => x.id == client.config.role_ids.default_admin_role_id)) accepted++

	if (message.member) if (accepted > 0) {

		const options = require("../content/handler/options.json");
		const optionsB = Object.keys(options.options);

		const CloseTicketRequest = new Discord.MessageEmbed()
			.setTitle(lang.close_ticket['close-command-confirmation-title'] != "" ? lang.close_ticket['close-command-confirmation-title'] : `**Request to close the application**`)
			.setDescription(lang.close_ticket['close-command-confirmation-description'] != "" ? lang.close_ticket['close-command-confirmation-description'] : `Please confirm you want to close the ticket by typing \`close\` `)
			.setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})
			.setColor(0x208cdd);

		let m = message.channel.send({embeds: [CloseTicketRequest]}).then(async m => {

			const filter = response => {
				return response.content.toLowerCase() === `close`;
			}

			message.channel.awaitMessages({ filter, max: 1, time: client.config.timeouts.close_command_timeout_in_seconds * 1000, errors: ['time'],

			}).then(async collected => {
				let reason = message.content.substring(7);
				if (reason == "") reason = lang.close_ticket['close-default-reason'] != "" ? lang.close_ticket['close-default-reason'] : "No Reason Provided.";
				let capMessage = ""
				if (reason.length > 4000) capMessage = await message.channel.send({content: "Reason is over 4000 characters. Message Capped."})

				if (capMessage != "") {
					setTimeout(async () => {
						return await capMessage.delete().catch(e => func.handle_errors(e, client, `close.js`, null))
					
					}, client.config.timeouts.user_error_message_timeout_in_seconds * 1000);
				}

				const logs_channel = await message.guild.channels.cache.find(x => x.id === transcriptChannel);
				const embedFinal = LastPin.embeds[0]
				embedFinal.setAuthor({name: lang.close_ticket["close-transcript-embed-title"] != "" ? lang.close_ticket["close-transcript-embed-title"].replace(`{{ADMIN}}`, `${message.author.username}/${message.author.id}`) + `\n${embedFinal?.author?.name}`: `Ticket Closed by ${message.author.username}/${message.author.id} \n${embedFinal?.author?.name}`, iconURL: message.author.displayAvatarURL()});
				embedFinal.addField(lang.close_ticket["close-transcript-embed-reason-title"] != "" ? lang.close_ticket["close-transcript-embed-reason-title"] : `Close Reason`, `\`\`\`${reason}\`\`\``, true)
				embedFinal.addField(lang.close_ticket["close-transcript-embed-response-title"] != "" ? lang.close_ticket["close-transcript-embed-response-title"] : `Response Time`, `\`\`\`` + await func.convertMsToTime(Date.now() - embedFinal.timestamp) + `\`\`\``, true)

				const split = await embedFinal.footer.text.split("|");
				let uniqueTicketID = split[0].trim();
				const recepientId = uniqueTicketID.split(`-`)[0];

				let recepient = await client.users.fetch(recepientId).catch(e => func.handle_errors(e, client, `close.js`, null));

				let ticketType = "";
				let validOption = "";
				optionsB.forEach(optionA => {
					if (message.channel.name.includes(optionA.toLowerCase().split(" ").join("-"))) {
						validOption = options.options[`${optionA}`]
						ticketType = optionA;
					}
				});

				if (logs_channel) {
					let messageID = await logs_channel.send({content: `<@${split[0].split(`-`)[0]}>`,embeds: [embedFinal]}).catch(e => func.handle_errors(e, client, `close.js`, null));
					await db.set(`PlayerStats.${recepientId}.ticketLogs.${uniqueTicketID}.transcriptLink`, `https://discord.com/channels/${message.guild.id}/${logs_channel.id}/${messageID.id}`)
					await transcript.fetch(message, {
						channel: message.channel,
						numberOfMessages: 99,
						dateFormat: "MMM Do YYYY, h:mm:ss a", // moment date format, default is 'E, d MMM yyyy HH:mm:ss Z'
						dateLocale: "en", // moment locale, default is "en"
						DiscordID: DiscordID,
					}).then((data) => {
						if (!data) return console.log("[C-Handler] No transcript data can be found.");
						const file = new Discord.MessageAttachment(data, `${currentChannel.name}.html`);
						logs_channel.send({files: [file]}).catch(e => func.handle_errors(e, client, `close.js`, null));
					});
				} else 	{
					func.handle_errors(null, client, `close.js`, `I could not find the transcript channel for ${found}, got \`${transcriptChannel} as an ID.\` Channel: ${message.channel.name}(${message.channel.id}).`)
				}	

				func.updateResponseTimes(embedFinal.timestamp, Date.now(), ticketType, "TicketClose")

				let userStats = await db.get(`StaffStats.${message.author.id}`)
				if (userStats?.closeticket == null || userStats?.closeticket == undefined) {
					await db.set(`StaffStats.${message.author.id}.closeticket`, 1);
				} else {
					await db.set(`StaffStats.${message.author.id}.closeticket`, userStats.closeticket + 1 );
				}

				await message.channel.delete().catch(e => func.handle_errors(e, client, `close.js`, null));		

				const SendReason = new Discord.MessageEmbed()
				.setFooter({text: client.user.username + ` | ` + ticketType, iconURL: client.user.displayAvatarURL()})
				.setColor(client.config.bot_settings.main_color);

 				if (config.active_ticket_settings.sendUserCloseReason === false) {
					SendReason.setTitle(lang.close_ticket["player-close-embed-title-no-reason"] != "" ? lang.close_ticket["player-close-embed-title-no-reason"].replace(`{{TICKETTYPE}}`, ticketType) : `Your ${ticketType} ticket has been closed`)
				
				} else {
					SendReason.setTitle(lang.close_ticket["player-close-embed-title"] != "" ? lang.close_ticket["player-close-embed-title"].replace(`{{TICKETTYPE}}`, ticketType) : `Your ${ticketType} ticket has been closed with the following response:`)
					SendReason.setDescription(`\`\`\`${reason}\`\`\``)
					
				}
	 
				 const questionFilesystem = require(`../content/questions/${validOption.question_file}`);
				 if (!questionFilesystem) return func.handle_errors(null, client, `close.js`, `I can not find question file for this ticket. Have you changed the name or the directory recently? Channel: ${message.channel.name}(${message.channel.id}).`)	


			 if (questionFilesystem.allow_feedback == true) {

				 const feedbackRow = new Discord.MessageActionRow()
				 feedbackRow.addComponents(
					 new Discord.MessageButton()
						 .setCustomId(`feedbackbutton`)
						 .setLabel(lang.feedback_messages["ticket-feedback-button-title"] != "" ? lang.feedback_messages["ticket-feedback-button-title"] : `Send Ticket Feedback`)
						 .setStyle("SECONDARY")
						 .setEmoji("📋"),
				 );

				 recepient.send({embeds: [SendReason], components: [feedbackRow]}).catch(async (err) => {

					 if (err.message === `Cannot send messages to this user`) {
						 func.handle_errors(null, client, `close.js`, `I can not send the user a DM as their DMs are turned off. Channel: ${message?.channel?.name}(${message?.channel?.id}).`)
					 } else {func.handle_errors(err, client, `close.js`, null)}
				 })

			 } else {

				 recepient.send({embeds: [SendReason]}).catch(async (err) => {

					 if (err.message === `Cannot send messages to this user`) {
						 func.handle_errors(null, client, `close.js`, `I can not send the user a DM as their DMs are turned off. Channel: ${message?.channel?.name}(${message?.channel?.id}).`)
					 } else {func.handle_errors(err, client, `close.js`, null)}
				 })
			 }

			 await func.closeDataAddDB(recepient.id, uniqueTicketID, `Close Ticket`, message.author.username, message.author.id, Date.now() / 1000, reason);

			}).catch((e) => {
				func.handle_errors(e, client, `close.js`, null);
			});

		}).catch((e) => {
			message.channel.send('The request to close the ticket has timed out.');
			func.handle_errors(e, client, `close.js`, null);
		});
	}
};