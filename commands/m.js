const Discord = require("discord.js");
const config = require('../config/config.json');
const func = require("../utils/functions.js");
const lang = require("../content/handler/lang.json");

module.exports = async function (client, message) {

	const messageArray = message.cleanContent.split(' ');
	const args = messageArray.slice(1);

	if (message.channel.type === "DM") return;

	if (message.author.id === client.user.id) return;


	const handlerRaw = require("../content/handler/options.json");
	const handlerKeys = Object.keys(handlerRaw.options);
	let access = 0

	for (let TicketType of handlerKeys) {

		const found = Object.keys(handlerRaw.options).find(x => x.toLowerCase() == TicketType.toLowerCase());
		let typeFile = require(`../content/questions/${handlerRaw.options[found].question_file}`);
		if (message.channel.parentId === typeFile["ticket-category"]) {
			access++
		}
	}

	if (access === 0) return;

	const myPins = await message.channel.messages.fetchPinned();
	const LastPin = myPins.last();

	if (!LastPin) return message.reply (`I can not find the main ticket embed. Please make sure the initial embed is pinned for me to grab data.`).catch(e => func.handle_errors(e, client, `m.js`, null));
	if (!LastPin.embeds[0]) return message.reply(`I can not find the main ticket embed. Is it still the first pinned post in this channel?`).catch(e => func.handle_errors(e, client, `m.js`, null));

	let ticketType = LastPin.embeds[0].title.split(" | ")[0];

	let publicGuild = await client.guilds.fetch(config.channel_ids.public_guild_id)
	let member = await publicGuild.members.fetch(message.author.id);
	let memberName = member.nickname === null ? member.user.username : member.nickname
	let thisUser = message.channel.topic
	let user = await client.users.fetch(thisUser).catch(e => {})

	if (!args[0] && message.attachments.size === 0) {
		return message.channel.send(lang.user_errors["missing-message"] != "" ? lang.user_errors["missing-message"] : `You need to add a message to send!`).catch(e => func.handle_errors(e, client, `m.js`, null));
	}
	if (!args[0] && message.attachments) {
		for (let attachment of message.attachments) {
			const replyEmbed = new Discord.MessageEmbed()
			.setDescription(lang.attachments["user-attachment-recieved"] != "" ? lang.attachments["user-attachment-recieved"].replace(`{{ADMIN}}`, memberName) : `**Attachment recieved from ${memberName}!**`)
			.setColor(config.active_ticket_settings.ticket_staff_embed_color);
		let active = 1	
		await user.send({embeds: [replyEmbed]}).catch((err) => {

			if (err.message === `Cannot send messages to this user`) {
				active = 0
				message.react('❌')
				message.reply(`Could not send that message (${attachment[1].name}) as their DM's are off!`);
				return;
			}
			return;
		})

		if (active === 0) break;

		await user.send({files: [{
			attachment: attachment[1].attachment,
			name: attachment[1].name
		 }]}).catch((err) => {

			if (err.message === `Cannot send messages to this user`) {
				active = 0
				message.react('❌')
				message.reply(`Could not send that message (${attachment[1].name}) as their DM's are off!`);
				return;
			}
			return;
		})

		const TicketreplyEmbed = new Discord.MessageEmbed()
		.setDescription(lang.attachments["staff-attachment-sent"] != "" ? lang.attachments["staff-attachment-sent"] : `**Attachment successfully sent to the user!**`)
		.setColor(config.active_ticket_settings.ticket_staff_embed_color);

		await func.staffStats(ticketType, `ticketmessages`, message.author.id);

		if (client.config.active_ticket_settings.staff_ticket_replies_in_embed === true) {
			await message.delete().catch(e => func.handle_errors(e, client, `m.js`, null))
			await message.channel.send({files: [{
				attachment: attachment[1].attachment,
				name: attachment[1].name
			 }]}).catch((err) => { func.handle_errors(err, client, `m.js`, null) })
		} else {
			await message.react('✅')
		}

		await message.channel.send({embeds: [TicketreplyEmbed]}).catch((err) => { func.handle_errors(err, client, `m.js`, null) })
	}
	return;
}

	if (args[0] && message.attachments.size > 0) {

		const AttachreplyEmbed = new Discord.MessageEmbed()
				.setAuthor({name: memberName, iconURL: member.displayAvatarURL()})
				.setDescription(`${args.join(" ")}`)
				.setColor(config.active_ticket_settings.ticket_staff_embed_color);

				let active = 1			
				await user.send({embeds: [AttachreplyEmbed]}).catch((err) => {

					if (err.message === `Cannot send messages to this user`) {
						active = 0
						message.react('❌')
						return message.reply(`Could not send that message as their DM's are off!`);
					}
					return;
				})	
				if (active === 0) return;

				if (active === 1) {
					if (client.config.active_ticket_settings.staff_ticket_replies_in_embed === true) {
						const AttachTicketreplyEmbed = new Discord.MessageEmbed()
							.setAuthor({name: `${lang.send_ticket_messages.visible != "" ? lang.send_ticket_messages.visible : "(STAFF Visible)"} ${memberName} (${member.user.id})`, iconURL: member.displayAvatarURL()})
							.setDescription(`${args.join(" ")}`)
							.setColor(config.active_ticket_settings.ticket_staff_embed_color);
						message.channel.send({embeds: [AttachTicketreplyEmbed]}).catch(e => func.handle_errors(e, client, `m.js`, null));
					}
				}

		for (let attachment of message.attachments) {
			const replyEmbed = new Discord.MessageEmbed()
			.setDescription(lang.attachments["user-attachment-recieved"] != "" ? lang.attachments["user-attachment-recieved"].replace(`{{ADMIN}}`, memberName) : `**Attachment recieved from ${memberName}!**`)
			.setColor(config.active_ticket_settings.ticket_staff_embed_color);

		await user.send({embeds: [replyEmbed]}).catch((err) => {

			if (err.message === `Cannot send messages to this user`) {
				active = 0
				message.react('❌')
				message.reply(`Could not send that message (${attachment[1].name}) as their DM's are off!`);
				return;
			}
			return;
		})

		await user.send({files: [{
			attachment: attachment[1].attachment,
			name: attachment[1].name
		}]}).catch((err) => {

			if (err.message === `Cannot send messages to this user`) {
				active = 0
				message.react('❌')
				message.reply(`Could not send that message (${attachment[1].name}) as their DM's are off!`);
				return;
			}
			return;
		})

		const TicketreplyEmbed = new Discord.MessageEmbed()
		.setDescription(lang.attachments["staff-attachment-sent"] != "" ? lang.attachments["staff-attachment-sent"] : `**Attachment successfully sent to the user!**`)
		.setColor(config.active_ticket_settings.ticket_staff_embed_color);

		await func.staffStats(ticketType, `ticketmessages`, message.author.id);

		if (client.config.active_ticket_settings.staff_ticket_replies_in_embed === true) {
			await message.delete().catch(e => func.handle_errors(e, client, `m.js`, null))
			await message.channel.send({files: [{
				attachment: attachment[1].attachment,
				name: attachment[1].name
			}]}).catch((err) => { func.handle_errors(err, client, `m.js`, null) })
		} else {
			await message.react('✅')
		}

		await message.channel.send({embeds: [TicketreplyEmbed]}).catch((err) => { func.handle_errors(err, client, `m.js`, null) })

	}
	return;
	}
	var reply = args.join(" ");

	if (!user) return message.reply(lang.misc["no-user-found"] != "" ? lang.misc["no-user-found"] : `Could not find that user to send them a message. Have they left the discord?`);

	const replyEmbed = new Discord.MessageEmbed()
			.setAuthor({name: `${memberName}`, iconURL: member.displayAvatarURL()})							
			.setDescription(`${reply}`)
			.setColor(config.active_ticket_settings.ticket_staff_embed_color);

	let active = 1			
	await user.send({embeds: [replyEmbed]}).catch((err) => {

		if (err.message === `Cannot send messages to this user`) {
			active = 0
			message.react('❌')
			return message.reply(`Could not send that message as their DM's are off!`);
		}
		return;
	})

	if (active === 1) {

		await func.staffStats(ticketType, `ticketmessages`, message.author.id);

		if (client.config.active_ticket_settings.staff_ticket_replies_in_embed === true) {
			await message.delete().catch(e => func.handle_errors(e, client, `m.js`, null))

			const TicketreplyEmbed = new Discord.MessageEmbed()
				.setAuthor({name: `${lang.send_ticket_messages.visible != "" ? lang.send_ticket_messages.visible : "(STAFF Visible)"} ${memberName} (${member.user.id})`, iconURL: member.displayAvatarURL()})
				.setDescription(`${reply}`)
				.setColor(config.active_ticket_settings.ticket_staff_embed_color);
			message.channel.send({embeds: [TicketreplyEmbed]}).catch(e => func.handle_errors(e, client, `m.js`, null));
		} else {
			await message.react('✅')
		}
	}

};