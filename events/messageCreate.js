const config = require("../config/config.json");
const Discord = require("discord.js");
const func = require("../utils/functions.js");
const lang = require("../content/handler/lang.json");

module.exports = async function (client, message) {
    try {

        if (message.author.bot || client.blocked_users.has(message.author.id)) return;
        if (message.channel.type === "DM") {

            const handlerRaw = require("../content/handler/options.json");
            const handlerKeys = Object.keys(handlerRaw.options);
            let categoryIDs = "";
        
            for (let TicketType of handlerKeys) {
        
                const found = Object.keys(handlerRaw.options).find(x => x.toLowerCase() == TicketType.toLowerCase());
                let typeFile = require(`../content/questions/${handlerRaw.options[found].question_file}`);
                categoryIDs = categoryIDs + `${typeFile["ticket-category"]} `

            }

            let guild = client.guilds.cache.find(x => x.id == config.channel_ids.staff_guild_id);
            let c = guild.channels.cache.find(channel => channel.name.includes(`${message.author.id}`) && categoryIDs.includes(channel.parentId))

            if (c) {

                for (let attachment of message.attachments) {
                    
                    let extensionChecks = 0

                    for (extension of client.config.file_extensions.allowed_file_extensions) {
                        if (attachment[1].attachment.substring(attachment[1].attachment.length - extension.length).toLowerCase() === extension.toLowerCase()) extensionChecks++
                    }

                    if (extensionChecks === 0) {

                        const replyErrorEmbed = new Discord.MessageEmbed()
                        .setDescription(lang.attachments["staff-blacklisted-extension"] != "" ? lang.attachments["staff-blacklisted-extension"].replace(`{{ATTACHMENT}}`, `${attachment[1].name}`) : `**User tried sending a file with a blacklisted extension!**\n\`(${attachment[1].name})\``)
                        .setColor(config.active_ticket_settings.ticket_user_embed_color);
            
                        await c.send({embeds: [replyErrorEmbed]}).catch(e => { func.handle_errors(e, client, `messageCreate.js`, null) });

                        const TicketreplyEmbed = new Discord.MessageEmbed()
                        .setDescription(lang.attachments["user-blacklisted-extension"] != "" ? lang.attachments["user-blacklisted-extension"].replace(`{{ATTACHMENT}}`, `${attachment[1].name}`) : `**Attachment \`(${attachment[1].name})\` contains a blacklisted extension and was not sent!**`)
                        .setColor(config.active_ticket_settings.ticket_user_embed_color);
    
                        await message.channel.send({embeds: [TicketreplyEmbed]}).catch((err) => { func.handle_errors(err, client, `messageCreate.js`, null) })
                        await message.react('❌')
                        return;

                    }               

                    const replyEmbed = new Discord.MessageEmbed()
                    .setDescription(lang.attachments["staff-attachment-recieved"] != "" ? lang.attachments["staff-attachment-recieved"] : `**Attachment recieved from the user!**`)
                    .setColor(config.active_ticket_settings.ticket_user_embed_color);
        
                await c.send({embeds: [replyEmbed]}).catch(e => { func.handle_errors(e, client, `messageCreate.js`, null) });
        
                await c.send({files: [{
                    attachment: attachment[1].attachment,
                    name: attachment[1].name
                }]}).catch(e => { func.handle_errors(e, client, `messageCreate.js`, null) });
            }

            if (message.attachments.size > 0) {
                const TicketreplyEmbed = new Discord.MessageEmbed()
                .setDescription(lang.attachments["user-attachment-sent"] != "" ? lang.attachments["user-attachment-sent"] : `**Attachment(s) successfully sent to the staff team!**`)
                .setColor(config.active_ticket_settings.ticket_user_embed_color);

                await message.channel.send({embeds: [TicketreplyEmbed]}).catch((err) => { func.handle_errors(err, client, `messageCreate.js`, null) })
            }

            await message.react('✅')
                if (message.content != "") {

                    if (message.content.length > 1900) {

                        for (let i = 0; i < message.content.length; i += 1900) {
                            const toSend = message.content.substring(i, Math.min(message.content.length, i + 1900));
                            var replyNoEveryone = toSend.replace(`@everyone`, `@ everyone`)
                            var replyNoHere = replyNoEveryone.replace(`@here`, `@ here`)
                            var replyNoPing = replyNoHere.replace(`<@`, `<@ `)

                            const replyEmbed = new Discord.MessageEmbed()
                                .setDescription(`**${message.author.username} (${message.author.id}):** ${replyNoPing}`)
                                .setColor(config.bot_settings.main_color);

                            c.send({embeds: [replyEmbed]}).catch((err) => func.handle_errors(err, client, `messageCreate.js`, null));
                        }

                    } else {
                        var replyNoEveryone = message.content.replace(`@everyone`, `@ everyone`)
                        var replyNoHere = replyNoEveryone.replace(`@here`, `@ here`)
                        var replyNoPing = replyNoHere.replace(`<@`, `<@ `)

                        const replyEmbed = new Discord.MessageEmbed()
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setDescription(`${replyNoPing}`)
                                .setColor(config.active_ticket_settings.ticket_user_embed_color);

                            c.send({embeds: [replyEmbed]}).catch((err) => func.handle_errors(err, client, `messageCreate.js`, null));
                    }
                }
            } else {
                let TicketCount = 0
                let messageIDs = ""
                for (let TicketType of handlerKeys) {
        
                    const found = Object.keys(handlerRaw.options).find(x => x.toLowerCase() == TicketType.toLowerCase());
                    let typeFile = require(`../content/questions/${handlerRaw.options[found].question_file}`);
    
                    let postChannel = guild.channels.cache.find(channel => channel.id === typeFile[`post-channel`])
                    if (!postChannel) continue;

                    let messages = await postChannel.messages.fetch().catch(e => {func.handle_errors(e, client, `messageCreate.js`, null)})

                    for (let messageSingle of messages) {
                        if (messageIDs.includes(messageSingle[1].id)) continue;
                        messageIDs = messageIDs + messageSingle[1].id + ` - `
                        if (messageSingle[1].embeds[0]?.footer?.text.includes(message.author.id)) TicketCount++
                    }
                }

                let ticketCountEmbed = new Discord.MessageEmbed()
                    .setTitle(lang.active_tickets["player-active-title"] != "" ? lang.active_tickets["player-active-title"].replace(`{{COUNT}}`, TicketCount) : `You currently have ${TicketCount} ticket(s) being looked at by the team.`)
                    .setDescription(lang.active_tickets["player-active-description"] != "" ? lang.active_tickets["player-active-description"].replace(`{{TICKETCHANNEL}}`, `<#${client.config.channel_ids.post_embed_channel_id}>`) : `If you would like to open a ticket, please head to <#${client.config.channel_ids.post_embed_channel_id}>.\n`)
                    .setColor(client.config.bot_settings.main_color)
                    .setFooter({text: client.user.username, iconURL: client.user.displayAvatarURL()})

                await message.channel.send({embeds: [ticketCountEmbed]})

            }
        } else {

            if (!message.content.startsWith(client.config.bot_settings.prefix)) return;

            let command_name = message.content.toLowerCase().slice(client.config.bot_settings.prefix.length).trim().split(" ")[0];
            if (!client.commands.has(command_name)) return;
            if (command_name.toLowerCase() === "ticketinfo" || command_name.toLowerCase() === "ticketcheetos" || command_name.toLowerCase() === "ticketuserinfo") return;

            const command = client.commands.get(command_name);
            if (command && 'execute' in command) {
                try {
                    await command.execute(client, message);
                } catch (error) {
                    console.error(`Error executing ${command_name}:`, error);
                    message.reply('There was an error trying to execute that command!');
                }
            }
        }
        
    } catch (exception) {
        func.handle_errors(exception, client, `messageCreate.js`, null)
    };
};