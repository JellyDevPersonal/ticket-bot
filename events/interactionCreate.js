require("dotenv").config({ path: "./config/.env"});
const config = require("../config/config.json");
const transcript = require("../utils/fetchTranscript.js");
const { readdirSync } = require("fs");
const Discord = require("discord.js");
const unirest = require("unirest");
const func = require("../utils/functions.js");
const lang = require("../content/handler/lang.json");
const {QuickDB} = require("quick.db")
const db = new QuickDB();

module.exports = async function (client, interaction) {
    if (interaction.isCommand()) {

    const command = client.commands.get(interaction.commandName + `_slash`)
    if (!command) return;

    try {
        await command.execute(interaction, client);
        } catch(err) {
            if (err) func.handle_errors(err, client, `interactionCreate.js`, null)

            await interaction.reply({
                content:`An error occured while executing that command!`,
                ephemeral: true
            })
        }
    }

try {

        if (interaction.customId === "feedbackModal") {
            await interaction.deferReply().catch(e => {func.handle_errors(e, client, `interactionCreate.js`, null)})

            let feedbackChannel = client.channels.cache.find(x => x.id === client.config.channel_ids.feedback_channel)

            if (!feedbackChannel) {

                func.handle_errors(null, client, `interactionCreate.js`, `The Feedback channel could not be found, please assign it in the configs. Canceling feedback report.`)
                return interaction.editReply(lang.feedback_messages["feedback-error-no-channel"] != "" ? lang.feedback_messages["feedback-error-no-channel"] : "Thanks for your feedback, sadly our systems aren't working properly and it did not get saved. Please let a member of staff know!").catch(e => {func.handle_errors(e, client, `interactionCreate.js`, null)})

            }

            const handlerRaw = require("../content/handler/options.json");
            let ticketType = interaction.message.embeds[0].footer.text.split("|")[1].substring(1);

            let validOption = ""
            for (let options of Object.keys(handlerRaw.options)) {

                if (options == ticketType) {
                    validOption = handlerRaw.options[`${options}`] 
                }
        }

        const questionFilesystem = require(`../content/questions/${validOption.question_file}`);
        if (!questionFilesystem) return func.handle_errors(null, client, `interactionCreate.js`, `There is a missing question file for ${ticketType}, have you changed the name or file directory recently?`)

            let feedbackModalResponse = new Discord.MessageEmbed()
            .setTitle(`Ticket Feedback`)
            .setDescription(`Feedback from: *${interaction.user.username} (${interaction.user.id})*`)
            .setColor(client.config.bot_settings.main_color)
            .setTimestamp()
            .setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})

            for (let i = 0; i < interaction.components.length; i++) {
                feedbackModalResponse.addField(`${questionFilesystem.feedback_questions[i]}`, `${interaction.components[i].components[0].value == "" ? "No response" : interaction.components[i].components[0].value}`)
            }

            await interaction.editReply(questionFilesystem.successful_feedback_message == "" ? "Thanks for your feedback!" : questionFilesystem.successful_feedback_message)
           
            const feedbackRowDone = new Discord.MessageActionRow()
            feedbackRowDone.addComponents(
                new Discord.MessageButton()
                    .setCustomId(`feedbackbutton`)
                    .setLabel(`Feedback Sent!`)
                    .setStyle("SECONDARY")
                    .setEmoji("📋")
                    .setDisabled(true),
            );

           await interaction.message.edit({embeds: [interaction.message.embeds[0]], components: [feedbackRowDone]})
           
           
            return feedbackChannel.send({embeds: [feedbackModalResponse]}).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
        }

        if (interaction.customId === 'closeTicketModal') {
            await interaction.deferReply().catch(e => {func.handle_errors(e, client, `interactionCreate.js`, null)})

            const myPins = await interaction.message.channel.messages.fetchPinned();
            const LastPin = myPins.last();

            if (!LastPin) return func.handle_errors(null, client, `interactionCreate.js`, `Can not find the pinned embed. Please make sure the initial embed is pinned for me to grab data. Channel: ${interaction.channel.name}(${interaction.channel.id}).`);
            if (!LastPin.embeds[0]) return func.handle_errors(null, client, `interactionCreate.js`, `Can not find the pinned embed. Please make sure the initial embed is pinned for me to grab data. Channel: ${interaction.channel.name}(${interaction.channel.id}).`)


            let closeModalResponse = new Discord.MessageEmbed()
					.setTitle(lang.close_ticket["close-ticket-channel-embed-title"] != "" ? lang.close_ticket["close-ticket-channel-embed-title"].replace(`{{ADMIN}}`, interaction.member.user.username) : `${interaction.member.user.username} closed the ticket with reason:`)
					.setDescription(interaction.fields.getTextInputValue('closeReason') != "" ? `\`\`\`${interaction.fields.getTextInputValue('closeReason')}\`\`\`` : lang.close_ticket['close-default-reason'] != "" ? lang.close_ticket['close-default-reason'] : "\`\`\`No Reason Provided\`\`\`")
					.setColor(client.config.bot_settings.main_color)
					.setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})

            await interaction.editReply({ embeds: [closeModalResponse] });

            const currentChannel = client.channels.cache.find(x => x.id == interaction.message.channelId)
            const handlerRawCloseFinal = require("../content/handler/options.json");
            let split = LastPin.embeds[0].footer.text.split("|");
            let uniqueTicketID = split[0].trim();
            const DiscordID = uniqueTicketID.split(`-`)[0];
            let publicGuild = await client.guilds.fetch(config.channel_ids.public_guild_id).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
            let recepient = await publicGuild.members.fetch(DiscordID).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
            const ticketTypeCloseFinal = LastPin.embeds[0].title.split(" | ")[0]
            const foundCloseFinal = Object.keys(handlerRawCloseFinal.options).find(x => x.toLowerCase() == ticketTypeCloseFinal.toLowerCase());
            let typeFile = require(`../content/questions/${handlerRawCloseFinal.options[foundCloseFinal].question_file}`);
            let transcriptChannel = typeFile[`transcript-channel`];

            let reason = interaction.fields.getTextInputValue('closeReason') != "" ? `\`\`\`${interaction.fields.getTextInputValue('closeReason')}\`\`\`` : lang.close_ticket['close-default-reason'] != "" ? lang.close_ticket['close-default-reason'] : "\`\`\`No Reason Provided\`\`\`"
            const logs_channel = await interaction.message.guild.channels.cache.find(x => x.id === transcriptChannel);
            const embedFinal = LastPin.embeds[0]
            embedFinal.setAuthor({name: lang.close_ticket["close-transcript-embed-title"] != "" ? lang.close_ticket["close-transcript-embed-title"].replace(`{{ADMIN}}`, `${interaction.member.user.username}/${interaction.member.user.id}`) + `\n${embedFinal?.author?.name}` : `Ticket Closed by ${interaction.member.user.username}/${interaction.member.user.id} \n${embedFinal?.author?.name}`, iconURL: interaction.member.user.displayAvatarURL()});
            embedFinal.addField(lang.close_ticket["close-transcript-embed-reason-title"] != "" ? lang.close_ticket["close-transcript-embed-reason-title"] : "Close Reason", reason, true)
            embedFinal.addField(lang.close_ticket["close-transcript-embed-response-title"] != "" ? lang.close_ticket["close-transcript-embed-response-title"] : "Response Time", `\`\`\`` + await func.convertMsToTime(Date.now() - embedFinal.timestamp) + `\`\`\``, true)

            func.updateResponseTimes(embedFinal.timestamp, Date.now(), ticketTypeCloseFinal, "TicketClose")

            await func.staffStats(ticketTypeCloseFinal, `closeticket`, interaction.member.user.id);

                if (recepient) {

                let ticketType = "";
                const options = require("../content/handler/options.json");
                const optionsB = Object.keys(options.options);
                optionsB.forEach(optionA => {
                    if (interaction.message.channel.name.includes(optionA.toLowerCase().split(" ").join("-"))) ticketType = optionA;
                });

                const SendReason = new Discord.MessageEmbed()
				.setFooter({text: client.user.username + ` | ` + ticketType, iconURL: client.user.displayAvatarURL()})
				.setColor(client.config.bot_settings.main_color);

 				if (config.active_ticket_settings.sendUserCloseReason === false) {
					SendReason.setTitle(lang.close_ticket["player-close-embed-title-no-reason"] != "" ? lang.close_ticket["player-close-embed-title-no-reason"].replace(`{{TICKETTYPE}}`, ticketType) : `Your ${ticketType} ticket has been closed`)
				
				} else {
					SendReason.setTitle(lang.close_ticket["player-close-embed-title"] != "" ? lang.close_ticket["player-close-embed-title"].replace(`{{TICKETTYPE}}`, ticketType) : `Your ${ticketType} ticket has been closed with the following response:`)
					SendReason.setDescription(`${reason}`)
					
				}


					if (typeFile.allow_feedback == true) {

						const feedbackRow = new Discord.MessageActionRow()
						feedbackRow.addComponents(
							new Discord.MessageButton()
								.setCustomId(`feedbackbutton`)
								.setLabel(lang.feedback_messages["ticket-feedback-button-title"] != "" ? lang.feedback_messages["ticket-feedback-button-title"] : "Send Ticket Feedback")
								.setStyle("SECONDARY")
								.setEmoji("📋"),
						);

                        await recepient.send({embeds: [SendReason], components: [feedbackRow]}).catch(async (err) => {

							if (err.message === `Cannot send messages to this user`) {
								func.handle_errors(null, client, `interactionCreate.js`, `I can not send the user a DM as their DMs are turned off. Channel: ${interaction.channel.name}(${interaction.channel.id}).`);
							} else {func.handle_errors(err, client, `interactionCreate.js`, null)}
						})

					} else {

						await recepient.send({embeds: [SendReason]}).catch(async (err) => {

							if (err.message === `Cannot send messages to this user`) {
								func.handle_errors(null, client, `interactionCreate.js`, `I can not send the user a DM as their DMs are turned off. Channel: ${interaction.channel.name}(${interaction.channel.id}).`);
							} else {func.handle_errors(err, client, `interactionCreate.js`, null)}
						})
					}
     
                }

                if (logs_channel) {
                    let messageID = await logs_channel.send({content:`<@${DiscordID}>`, embeds: [embedFinal]}).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
                    await db.set(`PlayerStats.${recepient.id}.ticketLogs.${uniqueTicketID}.transcriptLink`, `https://discord.com/channels/${interaction.message.guild.id}/${logs_channel.id}/${messageID.id}`)
					
                    await transcript.fetch(interaction.message, {
                        channel: interaction.message.channel,
                        numberOfMessages: 99,
                        dateFormat: "MMM Do YYYY, h:mm:ss a", // moment date format, default is 'E, d MMM yyyy HH:mm:ss Z'
                        dateLocale: "en", // moment locale, default is "en"
                        DiscordID: DiscordID,
                    }).then((data) => {
                        if (!data) return func.handle_errors(null, client, `interactionCreate.js`, `No transcript data can be found. Channel: ${interaction.channel.name}(${interaction.channel.id}).`)
                        const file = new Discord.MessageAttachment(data, `${currentChannel.name}.html`);
                        logs_channel.send({files: [file]}).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
                    });
                } else func.handle_errors(null, client, `interactionCreate.js`, `Could not find transcript channel for ${found}, got \`${transcriptChannel} as an ID.\``)

                await func.closeDataAddDB(recepient.id, uniqueTicketID, `Close Ticket`, interaction.user.username, interaction.user.id, Date.now() / 1000, reason);
                await currentChannel.delete().catch(e => { func.handle_errors(e, client, `interactionCreate.js`, null) });

            
        }

        if (interaction.customId === "CustomResponseModal") {
            await interaction.deferUpdate().catch(e => {func.handle_errors(e, client, `interactionCreate.js`, null)})

            const handlerRawCustomFinal = require("../content/handler/options.json");
            let ticketTypeCustomFinal = interaction?.message?.embeds[0].title.split(" | ")[0];
            if (ticketTypeCustomFinal == null || ticketTypeCustomFinal == undefined) {

                let errormsg = await interaction.channel.send({content: "The embed can not be found!" }).catch(e => { func.handle_errors(e, client, `interactionCreate.js`, null) });
               
                setTimeout(async () => {
                    return await errormsg.delete().catch(e => func.handle_errors(e, client, `interactionCreate.js`, null))
                }, client.config.timeouts.user_error_message_timeout_in_seconds * 1000);
                return;
            }
            const uniqueTicketID = interaction.message.embeds[0].footer.text.split("|")[0].trim();
            const DiscordID = uniqueTicketID.split(`-`)[0];
            let publicGuild = await client.guilds.fetch(config.channel_ids.public_guild_id).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
            let recepient = await publicGuild.members.fetch(DiscordID).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
            if (recepient) {

            const foundCustomFinal = Object.keys(handlerRawCustomFinal.options).find(x => x.toLowerCase() == ticketTypeCustomFinal.toLowerCase());
            let typeFile = require(`../content/questions/${handlerRawCustomFinal.options[foundCustomFinal].question_file}`);
            let transcriptChannel = typeFile[`transcript-channel`];

            let reason = interaction.fields.getTextInputValue('customresponse') != "" ? `\`\`\`${interaction.fields.getTextInputValue('customresponse')}\`\`\`` : lang.close_ticket['close-default-reason'] != "" ? lang.close_ticket['close-default-reason'] : "\`\`\`No Reason Provided\`\`\`"
            const logs_channel = await interaction.message.guild.channels.cache.find(x => x.id === transcriptChannel);
            const embedFinal = interaction.message.embeds[0]

            func.updateResponseTimes(interaction.message.embeds[0].timestamp, Date.now(), ticketTypeCustomFinal, "CustomClose")
                
            await func.staffStats(ticketTypeCustomFinal, `customclose`, interaction.user.id);
            

                if (logs_channel) {
                    embedFinal.setAuthor({name: lang.custom_reply_close_ticket["close-transcript-embed-title"] != "" ? lang.custom_reply_close_ticket["close-transcript-embed-title"].replace(`{{ADMIN}}`, `${interaction.user.username}/${interaction.user.id}`) + `\n${embedFinal?.author?.name}`: `Custom Reply by ${interaction.user.username}/${interaction.user.id} \n${embedFinal?.author?.name}`, iconURL: interaction.user.displayAvatarURL()});
                    embedFinal.addField(lang.custom_reply_close_ticket["close-transcript-embed-reason-title"] != "" ? lang.custom_reply_close_ticket["close-transcript-embed-reason-title"] : `Reply`, reason, true)
                    embedFinal.addField(lang.custom_reply_close_ticket["close-transcript-embed-response-title"] != "" ? lang.custom_reply_close_ticket["close-transcript-embed-response-title"] : `Response Time`, `\`\`\`` + await func.convertMsToTime(Date.now() - embedFinal.timestamp) + `\`\`\``, true)
                    let messageID = await logs_channel.send({content: `<@${recepient.id}>`, embeds: [embedFinal] })?.catch(e => {func.handle_errors(e, client, `interactionCreate.js`, null) });
                
                    await db.set(`PlayerStats.${recepient.id}.ticketLogs.${uniqueTicketID}.transcriptLink`, `https://discord.com/channels/${interaction.message.guild.id}/${logs_channel.id}/${messageID.id}`)
					
                };
                await db.set(`PlayerStats.${recepient.id}.ticketLogs.${uniqueTicketID}.firstActionTime`, Date.now() / 1000)
                await db.set(`PlayerStats.${recepient.id}.ticketLogs.${uniqueTicketID}.firstActionTimeAdminName`, interaction.user.username)
                await db.set(`PlayerStats.${recepient.id}.ticketLogs.${uniqueTicketID}.firstActionTimeAdminID`, interaction.user.id)
                await func.closeDataAddDB(recepient.id, uniqueTicketID, `Custom Close Message`, interaction.user.username, interaction.user.id, Date.now() / 1000, reason);

                await interaction.message.delete().catch(e => {func.handle_errors(e, client, `interactionCreate.js`, null)})

                let response = new Discord.MessageEmbed()
                .setTitle(lang.custom_reply_close_ticket["player-close-embed-title"] != "" ? lang.custom_reply_close_ticket["player-close-embed-title"].replace(`{{TICKETTYPE}}`, ticketTypeCustomFinal) : `Your ${ticketTypeCustomFinal} ticket has been closed with the following response:`)
                .setDescription(`${reason}`)
                .setColor(client.config.bot_settings.main_color)
                .setFooter({text: client.user.username + ` | ` + ticketTypeCustomFinal, iconURL: client.user.displayAvatarURL()})

                if (typeFile.allow_feedback == true) {

                    const feedbackRow = new Discord.MessageActionRow()
                    feedbackRow.addComponents(
                        new Discord.MessageButton()
                            .setCustomId(`feedbackbutton`)
                            .setLabel(lang.feedback_messages["ticket-feedback-button-title"] != "" ? lang.feedback_messages["ticket-feedback-button-title"] : "Send Ticket Feedback")
                            .setStyle("SECONDARY")
                            .setEmoji("📋"),
                    );

                    recepient.send({embeds: [response], components: [feedbackRow]}).catch(async (err) => {

                        if (err.message === `Cannot send messages to this user`) {
                            func.handle_errors(null, client, `interactionCreate.js`, `I can not send the user a DM as their DMs are turned off. Channel: ${interaction.channel.name}(${interaction.channel.id}).`);
                        } else {func.handle_errors(err, client, `interactionCreate.js`, null)}
                    })

                } else {

                    recepient.send({embeds: [response]}).catch(async (err) => {

                        if (err.message === `Cannot send messages to this user`) {
                            func.handle_errors(null, client, `interactionCreate.js`, `I can not send the user a DM as their DMs are turned off. Channel: ${interaction.channel.name}(${interaction.channel.id}).`);
                        } else {func.handle_errors(err, client, `interactionCreate.js`, null)}
                    })
                }
            } else {
                await interaction.message.delete().catch(e => {func.handle_errors(e, client, `interactionCreate.js`, null)})
                let errormsg = await interaction.channel.send({content: lang.misc["no-user-found"] != "" ? lang.misc["no-user-found"] : "Could not find that user to send them a message. Have they left the discord?", ephemeral: true}).catch(e => { func.handle_errors(e, client, `interactionCreate.js`, null) });
                setTimeout(async () => {
                    return await errormsg.delete().catch(e => func.handle_errors(e, client, `interactionCreate.js`, null))
                }, client.config.timeouts.user_error_message_timeout_in_seconds * 1000);
            }
        }

    } catch (e) {
        func.handle_errors(e, client, `interactionCreate.js`, null)
    }

try {

    if (interaction.componentType == "BUTTON") {

    if (interaction.customId == "feedbackbutton") {

        const handlerRaw = require("../content/handler/options.json");
        let ticketType = interaction.message.embeds[0].footer.text.split("|")[1].substring(1);

        let validOption = ""
        for (let options of Object.keys(handlerRaw.options)) {

            if (options == ticketType) {
                validOption = handlerRaw.options[`${options}`] 
            }
        }

        const questionFilesystem = require(`../content/questions/${validOption.question_file}`);
        if (!questionFilesystem) return func.handle_errors(null, client, `interactionCreate.js`, `Missing question file for ${ticketType}. Have you changed the name or directory recently?`)

        const feedbackModal = new Discord.Modal()
            .setCustomId('feedbackModal')
            .setTitle(lang.feedback_messages["ticket-feedback-modal-title"] != "" ? lang.feedback_messages["ticket-feedback-modal-title"] : "Ticket Feedback");

        for (let i = 0; i < 5; i++) {
            if (!questionFilesystem.feedback_questions[i] || questionFilesystem.feedback_questions[i] == "") continue;
            if (questionFilesystem.feedback_questions[i].length > 45) {
                func.handle_errors(null, client, `interactionCreate.js`, `Feedback question in ${ticketType} is over 45 characters and can not be used. Please lower the character count. Question: "${questionFilesystem.feedback_questions[i]}"`)
                continue;
            }

        let closeReason = new Discord.TextInputComponent()
            .setCustomId(`feedbackquestion` + i.toString())
            .setLabel(questionFilesystem.feedback_questions[i])
            .setStyle('PARAGRAPH');
        let firstActionRow = new Discord.MessageActionRow().addComponents(closeReason);
        feedbackModal.addComponents(firstActionRow);
        }

        return await interaction.showModal(feedbackModal);

    }
        let guild = await client.guilds.fetch(config.channel_ids.staff_guild_id)
		let allChannels = await guild.channels.cache;
		const member = await interaction.guild.members.cache.find(x => x.id == interaction.member.user.id);

    if (interaction.customId == "ticketclose") {
        if (!interaction.message.guild || interaction.message.author.id != client.user.id || client.user.id == interaction.member.user.id || !interaction.message) return;
        if (interaction.message.channel?.type === "GUILD_PUBLIC_THREAD" || interaction.message.channel?.type === "DM" || interaction.message.channel?.type === "GUILD_PRIVATE_THREAD") return func.handle_errors(null, client, `interactionCreate.js`, `Message channel type is a thread for channel ${interaction.channel.name}(${interaction.channel.id}). I can not close a thread as it is not an official ticket channel.`)
        if (interaction.message.channel?.name?.split("-").length <= 1) return func.handle_errors(null, client, `interactionCreate.js`, `The name for the channel has been changed and I can not recognise it as a ticket channel anymore. Channel: ${interaction.channel.name}(${interaction.channel.id}).`)
        if (!interaction.message.channel.topic) return func.handle_errors(null, client, `interactionCreate.js`, `The description for the channel has been changed and I can not recognise who to send responses to anymore. Channel: ${interaction.channel.name}(${interaction.channel.id}).`)

        const handlerRaw = require("../content/handler/options.json");
        const myPins = await interaction.channel.messages.fetchPinned();
        const LastPin = myPins.last();
        if (!LastPin) return func.handle_errors(null, client, `interactionCreate.js`, `Can not find the pinned embed. Please make sure the initial embed is pinned for me to grab data. Channel: ${interaction.channel.name}(${interaction.channel.id}).`)
        if (!LastPin.embeds[0]) return func.handle_errors(null, client, `interactionCreate.js`, `Can not find the pinned embed. Please make sure the initial embed is pinned for me to grab data. Channel: ${interaction.channel.name}(${interaction.channel.id}).`)

        let ticketTypeClose = LastPin.embeds[0].title.split(" | ")[0]
        const foundClose = Object.keys(handlerRaw.options).find(x => x.toLowerCase() == ticketTypeClose.toLowerCase());
        let typeFile = require(`../content/questions/${handlerRaw.options[foundClose].question_file}`);
        let accessRoleIDs = typeFile["access-role-id"];
        let accepted = 0

        for (let role of accessRoleIDs) {
			if (interaction.member.roles.cache.find(x => x.id == role)) accepted++
			}
        if (interaction.member.roles.cache.find(x => x.id == client.config.role_ids.default_admin_role_id)) accepted++
        
        if (accepted > 0) {

            const modal = new Discord.Modal()
			    .setCustomId('closeTicketModal')
			    .setTitle(lang.close_ticket["close-modal-title"] != "" ? lang.close_ticket["close-modal-title"] : 'Close Ticket');
            const closeReason = new Discord.TextInputComponent()
                .setCustomId('closeReason')
                .setLabel(lang.close_ticket["close-modal-reason-title"] != "" ? lang.close_ticket["close-modal-reason-title"] : "What is the reason for closing this ticket?")
                .setStyle('PARAGRAPH');
            const firstActionRow = new Discord.MessageActionRow().addComponents(closeReason);
            modal.addComponents(firstActionRow);
		    return await interaction.showModal(modal);
            
        } else {
            let role = interaction.message.guild.roles.cache.find(role => role.id === client.config.role_ids.default_admin_role_id)
            await interaction.reply({content: lang.misc["incorrect-roles-for-action"] != "" ? lang.misc["incorrect-roles-for-action"].replace(`{{ROLENAME}}`, `\`${role.name}\``) : `It seems you do not have the correct roles to perform that action! You need the \`${role.name}\` role or an "access-role" if one is set!`, ephemeral: true}).catch(err => func.handle_errors(err, client, `interactionCreate.js`, null));
            
        }
    }

    if (!interaction.message.guild || interaction.message.author.id != client.user.id || client.user.id == interaction.member.user.id || !interaction.message) return;
        
        const files = readdirSync("./content/questions/");
		let valid = [];
		files.forEach(element => {
			const file = require(`../content/questions/${element}`);
			valid.push(file["post-channel"]);
		});

        if (valid.includes(interaction.message.channel.id) && ["supportaccept", "supportdeny", "supportcustom", "supportticket"].includes(interaction.customId)) {
            const split = await interaction.message.embeds[0].footer.text.split("|");
            let uniqueTicketID = split[0].trim();
			const recepientId = uniqueTicketID.split(`-`)[0];
			const ticketType = interaction.message.embeds[0].title.split(" | ")[0];

            const handlerRaw = require("../content/handler/options.json");
			const found = Object.keys(handlerRaw.options).find(x => x.toLowerCase() == ticketType.toLowerCase());
			let typeFile = require(`../content/questions/${handlerRaw.options[found].question_file}`);
			let accessRoleIDs = typeFile["access-role-id"];
            let accepted = 0
	
			for (let role of accessRoleIDs) {
			if (member.roles.cache.find(x => x.id == role)) accepted++
			}
			if (member.roles.cache.find(x => x.id == client.config.role_ids.default_admin_role_id)) accepted++

			if (member) if (accepted > 0) {

				let recepient = client.users.cache.find(x => x.id == recepientId);
				if (!recepient) recepient = await client.users.fetch(recepientId);
				if (!recepient) return func.handle_errors(null, client, `interactionCreate.js`, `Ignoring user ${recepientId}. Could not identify user object from the embed.`)

				switcher(client, interaction, interaction.member.user, ticketType, interaction.customId, member, recepient, accessRoleIDs, found);

			} else {
                let role = interaction.message.guild.roles.cache.find(role => role.id === client.config.role_ids.default_admin_role_id)
                await interaction.reply({content: lang.misc["incorrect-roles-for-action"] != "" ? lang.misc["incorrect-roles-for-action"].replace(`{{ROLENAME}}`, `\`${role.name}\``) : `It seems you do not have the correct roles to perform that action! You need the \`${role.name}\` role or an "access-role" if one is set!`, ephemeral: true}).catch(err => func.handle_errors(err, client, `interactionCreate.js`, null));
            }

        } else {

            await interaction.deferReply({ ephemeral: true }).catch(err => func.handle_errors(err, client, `interactionCreate.js`, null));

            if (client.blocked_users.has(interaction.member.user.id) || client.cooldown.has(interaction.member.user.id)) {
                await interaction.editReply({content: lang.user_errors["fast-ticket-creation"] != "" ? lang.user_errors["fast-ticket-creation"] : "You can not make another ticket that quickly!", ephemeral: true}).catch(err => func.handle_errors(err, client, `interactionCreate.js`, null));
				return;
			};

            let blacklistedRole = await interaction.message.guild.roles.fetch(client.config.role_ids.ticket_blacklisted_role_id).catch(err => func.handle_errors(err, client, `interactionCreate.js`, null));
            if (interaction.member.roles.cache.find(x => x.id == blacklistedRole)) {
                await interaction.editReply({content: lang.ticket_creation["blacklisted-user-error"] != "" ? lang.ticket_creation["blacklisted-user-error"] : "You are not allowed to use this system.", ephemeral: true}).catch(err => func.handle_errors(err, client, `interactionCreate.js`, null));
				return;
            }

            const handlerRaw = require("../content/handler/options.json");
            let validOption = ""
            let ticketType = ""
            for (let options of Object.keys(handlerRaw.options)) {

                if (handlerRaw.options[`${options}`].unique_button_identifier.toLowerCase().replace(` `,``) == interaction.customId) {
                    validOption = handlerRaw.options[`${options}`] 
                    ticketType = options
                }
            }

            if (validOption == "" || ticketType == "") return;

            const questionFilesystem = require(`../content/questions/${validOption.question_file}`);
            if (!questionFilesystem) return func.handle_errors(null, client, `interactionCreate.js`, `Missing question file for ${ticketType}. Have you changed the name or directory recently?`)



			if (questionFilesystem.needVerified === true) {

                if (!client.config.tokens.Linking_System_API_Key_Or_Secret || client.config.tokens.Linking_System_API_Key_Or_Secret == "") {
                        func.handle_errors(null, client, `interactionCreate.js`, `needVerified is enabled and Linking_System_API_Key_Or_Secret is not set in the config so could not access the API!`)
                        return interaction.editReply({content: lang.misc["api-access-denied"] != "" ? lang.misc["api-access-denied"] : `The API could not be accessed so we could not verify your accounts. Ticket Cancelled.`, ephemeral: true}).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
                    }
                    
                // Simple Link is 1
                if (client.config.linking_settings.linkingSystem === 1) {
                    let SteamIDGrab = await unirest.get(`${client.config.linking_settings.verify_link}/api.php?action=findByDiscord&id=${interaction.member.user.id}&secret=${client.config.tokens.Linking_System_API_Key_Or_Secret}`)
                    if (SteamIDGrab.body) {
                        if (SteamIDGrab.body?.toString) {
                            if (SteamIDGrab?.body?.toString().startsWith("7656119")) {
                                SteamID = SteamIDGrab.body
                            } else {
                                return interaction.editReply({content: lang.user_errors["verification-needed"] != "" ? lang.user_errors["verification-needed"].replace(`{{USER}}`, `<@${interaction.member.user.id}>`).replace(`{{TICKETTYPE}}`, `\`${ticketType}\``).replace(`{{VERIFYLINK}}`, `${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}`) : `<@${interaction.member.user.id}>, you need to verify to make a '${ticketType}' ticket. ${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}'`, ephemeral: true})
                            }
                        }
                    } else {
                        func.handle_errors(null, client, `interactionCreate.js`, `Could not access API! Have you selected the correct linking system?\n\n**Linking System:** Simple Link`)
                        return interaction.editReply({content: lang.misc["api-access-denied"] != "" ? lang.misc["api-access-denied"] : `The API could not be accessed so we could not verify your accounts. Ticket Cancelled.`, ephemeral: true}).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
                    
                    }
    
                // Steamcord is 2
                } else if (client.config.linking_settings.linkingSystem === 2) {
                    
                    let SteamIDGrab = await unirest.get(`https://api.steamcord.io/players?discordId=${interaction.member.user.id}`).headers({'Authorization': `Bearer ${client.config.tokens.Linking_System_API_Key_Or_Secret}`, 'Content-Type': 'application/json'})
                    if (SteamIDGrab.body) {
                        if (SteamIDGrab.body.length > 0) {
                        if (SteamIDGrab.body[0]?.steamAccounts[0]?.steamId) {
                            if (SteamIDGrab.body[0]?.steamAccounts[0]?.steamId.toString().startsWith("7656119")) {
                            } else {
                                return interaction.editReply({content: lang.user_errors["verification-needed"] != "" ? lang.user_errors["verification-needed"].replace(`{{USER}}`, `<@${interaction.member.user.id}>`).replace(`{{TICKETTYPE}}`, `\`${ticketType}\``).replace(`{{VERIFYLINK}}`, `${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}`) : `<@${interaction.member.user.id}>, you need to verify to make a '${ticketType}' ticket. ${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}'`, ephemeral: true})
                            }
                        } else {
                            return interaction.editReply({content:  lang.user_errors["no-steamid-verification-needed"] != "" ? lang.user_errors["no-steamid-verification-needed"].replace(`{{USER}}`, `<@${interaction.member.user.id}>`).replace(`{{TICKETTYPE}}`, `\`${ticketType}\``).replace(`{{VERIFYLINK}}`, `${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}`) : `<@${interaction.member.user.id}>, no SteamID found! You need to verify to make a '${ticketType}' ticket. ${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}'`, ephemeral: true})
                    
                        }
                    } else {
                        return interaction.editReply({content: lang.user_errors["verification-needed"] != "" ? lang.user_errors["verification-needed"].replace(`{{USER}}`, `<@${interaction.member.user.id}>`).replace(`{{TICKETTYPE}}`, `\`${ticketType}\``).replace(`{{VERIFYLINK}}`, `${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}`) : `<@${interaction.member.user.id}>, you need to verify to make a '${ticketType}' ticket. ${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}'`, ephemeral: true})
                    }
                    } else {
                        func.handle_errors(null, client, `interactionCreate.js`, `Could not access API! Have you selected the correct linking system and/or is your subscription active?\n\n**Linking System:** Steamcord`)
                        return interaction.editReply({content: lang.misc["api-access-denied"] != "" ? lang.misc["api-access-denied"] : `The API could not be accessed so we could not verify your accounts. Ticket Cancelled.`, ephemeral: true}).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
                    }
                    
                    // Platform Sync is 3
                } else if (client.config.linking_settings.linkingSystem === 3) {
                    
                    let SteamIDGrab = await unirest.get(`https://link.platformsync.io/api.php?id=${interaction.member.user.id}&token=${client.config.tokens.Linking_System_API_Key_Or_Secret}`)
                    if (SteamIDGrab.body) {
                        if (!SteamIDGrab.body?.Error) {
                            if (SteamIDGrab.body?.linked == true) {
                                if (SteamIDGrab.body?.steam_id) {
                                    if (SteamIDGrab.body?.steam_id?.toString().startsWith("7656119")) {
                                    } else {
                                        return interaction.editReply({content: lang.user_errors["verification-needed"] != "" ? lang.user_errors["verification-needed"].replace(`{{USER}}`, `<@${interaction.member.user.id}>`).replace(`{{TICKETTYPE}}`, `\`${ticketType}\``).replace(`{{VERIFYLINK}}`, `${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}`) : `<@${interaction.member.user.id}>, you need to verify to make a '${ticketType}' ticket. ${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}'`, ephemeral: true})
                                    }
                                } else {
                                    return interaction.editReply({content: lang.user_errors["no-steamid-verification-needed"] != "" ? lang.user_errors["no-steamid-verification-needed"].replace(`{{USER}}`, `<@${interaction.member.user.id}>`).replace(`{{TICKETTYPE}}`, `\`${ticketType}\``).replace(`{{VERIFYLINK}}`, `${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}`) : `<@${interaction.member.user.id}>, no SteamID found! You need to verify to make a '${ticketType}' ticket. ${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}'`, ephemeral: true})
                            
                                }
                            } else {
                                return interaction.editReply({content: lang.user_errors["verification-needed"] != "" ? lang.user_errors["verification-needed"].replace(`{{USER}}`, `<@${interaction.member.user.id}>`).replace(`{{TICKETTYPE}}`, `\`${ticketType}\``).replace(`{{VERIFYLINK}}`, `${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}`) : `<@${interaction.member.user.id}>, you need to verify to make a '${ticketType}' ticket. ${client.config.linking_settings.verify_link === "" ? "" : `${client.config.linking_settings.verify_link}`}'`, ephemeral: true})
                            }
                        } else {
                            func.handle_errors(null, client, `interactionCreate.js`, `Could not access API! Is your API Key correct and is it a paid subscription?\n\n**Linking System:** Platform Sync`)
                            return interaction.editReply({content: lang.misc["api-access-denied"] != "" ? lang.misc["api-access-denied"] : `The API could not be accessed so we could not verify your accounts. Ticket Cancelled.`, ephemeral: true}).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
                        
                        }   
                    } else {
                        func.handle_errors(null, client, `interactionCreate.js`, `Could not access API! Have you selected the correct linking system?\n\n**Linking System:** Platform Sync`)
                        return interaction.editReply({content: lang.misc["api-access-denied"] != "" ? lang.misc["api-access-denied"] : `The API could not be accessed so we could not verify your accounts. Ticket Cancelled.`, ephemeral: true}).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
                    }
    
                }
		}

            let postchannel = await client.guilds.cache.get(client.config.channel_ids.staff_guild_id).channels.fetch(questionFilesystem["post-channel"])
            let maxCount = 0
            for (let eachMessage of await postchannel.messages.fetch({limit: 100})) {
                if (eachMessage.pinned) continue;
                if (eachMessage[1]?.embeds[0]?.footer?.text.includes(interaction.member.user.id)) {
                    if (eachMessage[1]?.embeds[0]?.footer?.text.toLowerCase().includes(ticketType.toLowerCase())) {
                        maxCount++
                    }
                } 
            }

            if (maxCount >= questionFilesystem["max-active-tickets"]) {
				let errormsg = await interaction.editReply({content: lang.user_errors["too-many-pending-tickets"] != "" ? lang.user_errors["too-many-pending-tickets"].replace(`{{USER}}`, `<@${interaction.member.user.id}>`) : `<@${interaction.member.user.id}>, you have too many tickets open, please wait for them to be resolved.`, ephemeral: true}).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
				return;
		}


			let filteredChannels = allChannels.filter(x => x.name.includes(interaction.member.user.id))
			if (filteredChannels.size >= 1) {
				let errormsg = await interaction.editReply({content: lang.user_errors["ticket-already-open"] != "" ? lang.user_errors["ticket-already-open"].replace(`{{USER}}`, `<@${interaction.member.user.id}>`) : `<@${interaction.member.user.id}>, you have an open ticket, you can not open a new one.`, ephemeral: true}).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
				return;
		}

			client.cooldown.add(interaction.member.user.id);
			client.blocked_users.add(interaction.member.user.id);
			return require("../utils/backbone")(client, interaction, interaction.member.user, ticketType, validOption, questionFilesystem);

        }

        async function switcher(client, interaction, user, ticketType, customId, administratorMember, recepientMember, accessRoleIDs, found) {
            try {

                const embed = interaction.message.embeds[0];
                const handlerRaw = require("../content/handler/options.json");
                let typeFile = require(`../content/questions/${handlerRaw.options[found].question_file}`);
                let transcriptChannel = typeFile[`transcript-channel`];
                const logs_channel = await interaction.message.guild.channels.cache.find(x => x.id === transcriptChannel);
                const uniqueTicketID = interaction.message.embeds[0].footer.text.split("|")[0].trim();

                if (customId == "supportaccept") {

                    await interaction.deferUpdate().catch(err => func.handle_errors(err, client, `interactionCreate.js`, null));
                    embed.setAuthor({name: lang.accepted_ticket["accepted-transcript-embed-title"] != "" ? lang.accepted_ticket["accepted-transcript-embed-title"].replace(`{{ADMIN}}`, `${user.username}/${user.id}`) + `\n${embed?.author?.name}` : `Accepted by ${user.username}/${user.id} \n${embed?.author?.name}`, iconURL: user.displayAvatarURL()});
                    embed.addField(lang.accepted_ticket["accepted-transcript-embed-response-title"] != "" ? lang.accepted_ticket["accepted-transcript-embed-response-title"] : `Response Time`, `\`\`\`` + await func.convertMsToTime(Date.now() - interaction.message.embeds[0].timestamp) + `\`\`\``)

						if (logs_channel) {
							let messageID = await logs_channel.send({content: `<@${recepientMember.id}>`, embeds: [embed] }).catch(e => {func.handle_errors(e, client, `interactionCreate.js`, null) });
                            await db.set(`PlayerStats.${recepientMember.id}.ticketLogs.${uniqueTicketID}.transcriptLink`, `https://discord.com/channels/${interaction.message.guild.id}/${logs_channel.id}/${messageID.id}`)
					
                        }; 
                        await db.set(`PlayerStats.${recepientMember.id}.ticketLogs.${uniqueTicketID}.firstActionTime`, Date.now() / 1000)
                        await db.set(`PlayerStats.${recepientMember.id}.ticketLogs.${uniqueTicketID}.firstActionTimeAdminName`, user.username)
                        await db.set(`PlayerStats.${recepientMember.id}.ticketLogs.${uniqueTicketID}.firstActionTimeAdminID`, user.id)
                        await func.closeDataAddDB(recepientMember.id, uniqueTicketID, `Accept Ticket`, user.username, user.id, Date.now() / 1000, `N/A`);
                        await interaction.message.delete().catch(e => {func.handle_errors(e, client, `interactionCreate.js`, null)});
					
						let reply = `Your active ${ticketType} ticket was read and accepted. Thank you.`;
						if (found) {
							const handlerRaw = require("../content/handler/options.json");
							let file = require(`../content/questions/${handlerRaw.options[found].question_file}`);
							reply = file["accept-message"];
						} else {
                            func.handle_errors(null, client, `interactionCreate.js`, `Could not accept/deny ticket correctly. Could not find files for that ticket type (${ticketType})`)
						}

                        func.updateResponseTimes(interaction.message.embeds[0].timestamp, Date.now(), ticketType, "Accepted")

                        await func.staffStats(ticketType, `accepted`, user.id);
                        

					let endresponse = new Discord.MessageEmbed()
					.setTitle(lang.accepted_ticket["player-accepted-embed-title"] != "" ? lang.accepted_ticket["player-accepted-embed-title"].replace(`{{TICKETTYPE}}`, ticketType) : `Your ${ticketType} ticket has been closed with the following response:`)
					.setDescription(`\`\`\`${reply}\`\`\``)
					.setColor(client.config.bot_settings.main_color)
					.setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})

					await recepientMember.send({embeds: [endresponse]}).catch(async (err) => {

						if (err.message === `Cannot send messages to this user`) {
							let errormsg = await interaction.message.channel.send(`${recepientMember.username}/${recepientMember.id} has their DMs closed, could not send close reason to them!`).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
							setTimeout(async () => {
								return await errormsg.delete().catch(e => func.handle_errors(e, client, `interactionCreate.js`, null))
							}, client.config.timeouts.user_error_message_timeout_in_seconds * 1000);
						} else {func.handle_errors(err, client, `interactionCreate.js`, null)}
					})

                } else if (customId == "supportdeny") {

                    await interaction.deferUpdate().catch(err => func.handle_errors(err, client, `interactionCreate.js`, null));
                    embed.setAuthor({name: lang.denied_ticket["denied-transcript-embed-title"] != "" ? lang.denied_ticket["denied-transcript-embed-title"].replace(`{{ADMIN}}`, `${user.username}/${user.id}`) + `\n${embed?.author.name}`: `Denied by ${user.username}/${user.id} \n${embed?.author.name}`, iconURL: user.displayAvatarURL()});
                    embed.addField(lang.denied_ticket["denied-transcript-embed-response-title"] != "" ? lang.denied_ticket["denied-transcript-embed-response-title"] : `Response Time`, `\`\`\`` + await func.convertMsToTime(Date.now() - interaction.message.embeds[0].timestamp) + `\`\`\``)

						if (logs_channel) {
							let messageID = await logs_channel.send({content: `<@${recepientMember.id}>`, embeds: [embed] }).catch(e => { func.handle_errors(e, client, `interactionCreate.js`, null)});
                            await db.set(`PlayerStats.${recepientMember.id}.ticketLogs.${uniqueTicketID}.transcriptLink`, `https://discord.com/channels/${interaction.message.guild.id}/${logs_channel.id}/${messageID.id}`)
					
                        }; 
                        await db.set(`PlayerStats.${recepientMember.id}.ticketLogs.${uniqueTicketID}.firstActionTime`, Date.now() / 1000)
                        await db.set(`PlayerStats.${recepientMember.id}.ticketLogs.${uniqueTicketID}.firstActionTimeAdminName`, user.username)
                        await db.set(`PlayerStats.${recepientMember.id}.ticketLogs.${uniqueTicketID}.firstActionTimeAdminID`, user.id)
                        await func.closeDataAddDB(recepientMember.id, uniqueTicketID, `Deny Ticket`, user.username, user.id, Date.now() / 1000, `N/A`);
                        await interaction.message.delete().catch(e => {func.handle_errors(e, client, `interactionCreate.js`, null)});
					
						let reply = `Your active ${ticketType} ticket was denied.`;
						if (found) {
							const handlerRaw = require("../content/handler/options.json");
							let file = require(`../content/questions/${handlerRaw.options[found].question_file}`);
							reply = file["deny-message"];
						} else {
                            func.handle_errors(null, client, `interactionCreate.js`, `Could not accept/deny ticket correctly. Could not find files for that ticket type (${ticketType})`)
						}
	
                        func.updateResponseTimes(interaction.message.embeds[0].timestamp, Date.now(), ticketType, "Denied")

                        await func.staffStats(ticketType, `denied`, user.id);
                        

					let endresponse = new Discord.MessageEmbed()
					.setTitle(lang.denied_ticket["player-denied-embed-title"] != "" ? lang.denied_ticket["player-denied-embed-title"].replace(`{{TICKETTYPE}}`, ticketType) : `Your ${ticketType} ticket has been closed with the following response:`)
					.setDescription(`\`\`\`${reply}\`\`\``)
					.setColor(client.config.bot_settings.main_color)
					.setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})

					await recepientMember.send({embeds: [endresponse]}).catch(async (err) => {

						if (err.message === `Cannot send messages to this user`) {
							let errormsg = await interaction.message.channel.send(`${recepientMember.username}/${recepientMember.id} has their DMs closed, could not send close reason to them!`).catch(e => func.handle_errors(e, client, `interactionCreate.js`, null));
							setTimeout(async () => {
								return await errormsg.delete().catch(e => func.handle_errors(e, client, `interactionCreate.js`, null))
							}, client.config.timeouts.user_error_message_timeout_in_seconds * 1000);
						} else {func.handle_errors(err, client, `interactionCreate.js`, null)}
					})

                } else if (customId == "supportcustom") {

                    let accepted = 0
	
                    for (let role of accessRoleIDs) {
                    if (interaction.member.roles.cache.find(x => x.id == role)) accepted++
                    }
                    if (interaction.member.roles.cache.find(x => x.id == client.config.role_ids.default_admin_role_id)) accepted++
        
                    if (accepted > 0) {

                        const customResponseModal = new Discord.Modal()
                            .setCustomId('CustomResponseModal')
                            .setTitle(lang.custom_reply_close_ticket["close-modal-title"] != "" ? lang.custom_reply_close_ticket["close-modal-title"] : 'Custom Reply');
                        const customResponseReason = new Discord.TextInputComponent()
                            .setCustomId('customresponse')
                            .setLabel(lang.custom_reply_close_ticket["close-modal-reason-title"] != "" ? lang.custom_reply_close_ticket["close-modal-reason-title"] : "What would you like to say to the user?")
                            .setStyle('PARAGRAPH');
                        const firstActionRow = new Discord.MessageActionRow().addComponents(customResponseReason);
                        customResponseModal.addComponents(firstActionRow);
                        return await interaction.showModal(customResponseModal);
                        
                    }

                } else if (customId == "supportticket") {

                    await interaction.deferUpdate().catch(err => func.handle_errors(err, client, `interactionCreate.js`, null));

                    if (found) {
                        const handlerRaw = require("../content/handler/options.json");
                        questionFile = require(`../content/questions/${handlerRaw.options[found].question_file}`);
                    }

                    await db.set(`PlayerStats.${recepientMember.id}.ticketLogs.${uniqueTicketID}.firstActionTime`, Date.now() / 1000)
                    await db.set(`PlayerStats.${recepientMember.id}.ticketLogs.${uniqueTicketID}.firstActionTimeAdminName`, user.username)
                    await db.set(`PlayerStats.${recepientMember.id}.ticketLogs.${uniqueTicketID}.firstActionTimeAdminID`, user.id)

                    await func.openTicket(client, interaction, questionFile, recepientMember, administratorMember, ticketType, embed, user);
   
                }
            } catch (e) {
                func.handle_errors(e, client, `interactionCreate.js`, null);
            };
        }
    }
    } catch (e) {
        func.handle_errors(e, client, `interactionCreate.js`, null);
    };

};
