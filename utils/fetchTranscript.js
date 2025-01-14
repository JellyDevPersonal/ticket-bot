const Discord = require('discord.js');
const jsdom = require('jsdom');
const fs = require('fs');
const { JSDOM } = jsdom;

module.exports.fetch = async (message, options) => {
    if (!message) throw new ReferenceError('[Transcript Error] => "message" is not defined')
    if (typeof options !== "object") throw new SyntaxError('[Transcript Error] => typeof "options" must be a object')
    const dom = new JSDOM();
    const document = dom.window.document;
    const moment = require('moment');
    const Options = {
        numberOfMessages: `99`,
        channel: options.channel || Discord.Interaction.channel,
        dateFormat: options.dateFormat || 'E, d MMM yyyy HH:mm:ss Z',
        dateLocale: options.dateLocale || 'en',
    }
    moment.locale(Options.dateLocale);

    let messageCollection = new Discord.Collection();

    for (let i = 0; i < 10 && messageCollection.size < 1000; i++) {
        const newMessages = await options.channel.messages.fetch({ limit: 100, before: messageCollection.lastKey() }).catch(e => { return null });
        
        if (!newMessages || newMessages?.size <= 0) break;
        else messageCollection = messageCollection.concat(newMessages);
    };

    
    const template = fs.readFileSync('./utils/template.html', 'utf8');
    if (!template) return console.log("REEEEEE");
    let topText = `<!---- Downloadable HTML Transcript - DOWNLOAD TO VIEW ---->\n<!---- Total of ${messageCollection.size} messages ---->\n<!---- Ticket Makers DiscordID: ${options.DiscordID} ---->\n`
    let speakingUsers = "Messages from: "
    let info = document.createElement('div')
    info.className = 'info'
    let iconClass = document.createElement('div')
    iconClass.className = 'info__guild-icon-container'
    let guild__icon = document.createElement('img')
    guild__icon.className = 'info__guild-icon'

    if (message.guild?.iconURL()) {
        guild__icon.setAttribute('src', message.guild?.iconURL())
    } else {
        guild__icon.setAttribute('src', 'https://cdn.discordapp.com/attachments/878008751855112192/895637636671229953/icon_clyde_blurple_RGB.png')
    }

    


    iconClass.appendChild(guild__icon)
    info.appendChild(iconClass)

    // Add global div for all Info headers
    let infoHeader = document.createElement('div')
    infoHeader.className = 'infoHeader'
    info.appendChild(infoHeader)

    //Add Guild Div
    let infoGuild = document.createElement('div')
    infoGuild.className = 'infoGuild'
    //Add Guild Title
    let guildTitle = document.createElement('span')
    guildTitle.className = 'HeaderTitle'
    let gName = document.createTextNode(`Guild: `)
    guildTitle.appendChild(gName)
    infoGuild.appendChild(guildTitle)
    //Add Guild Content
    let GuildName = document.createElement('span')
    GuildName.className = 'infoGuildName'
    GuildName.appendChild(document.createTextNode(`${message.guild?.name}`))
    infoGuild.appendChild(GuildName)
    //Add Guild ID
    let GuildID = document.createElement('span')
    GuildID.className = 'IDtimeElement'
    GuildID.appendChild(document.createTextNode(`(${message.guild?.id})`))
    infoGuild.appendChild(GuildID)
    infoHeader.appendChild(infoGuild)

    //Add Channel Div
    let infoChannel = document.createElement('div')
    infoChannel.className = 'infoChannel'
    //Add Channel Title
    let ChannelTitle = document.createElement('span')
    ChannelTitle.className = 'HeaderTitle'
    let cName = document.createTextNode(`Channel: `)
    ChannelTitle.appendChild(cName)
    infoChannel.appendChild(ChannelTitle)
    //Add Channel Content
    let ChannelName = document.createElement('span')
    ChannelName.className = 'infoChannelName'
    ChannelName.appendChild(document.createTextNode(`${options.channel?.name}`))
    infoChannel.appendChild(ChannelName)
    //Add Channel ID
    let ChannelID = document.createElement('span')
    ChannelID.className = 'IDtimeElement'
    ChannelID.appendChild(document.createTextNode(`(${options.channel?.id})`))
    infoChannel.appendChild(ChannelID)
    infoHeader.appendChild(infoChannel)

    //Add Messages Div
    let infoMessages = document.createElement('div')
    infoMessages.className = 'infoMessages'
    //Add Messages Title
    let MessagesTitle = document.createElement('span')
    MessagesTitle.className = 'HeaderTitle'
    let mName = document.createTextNode(`Transcripted Messages: `)
    MessagesTitle.appendChild(mName)
    infoMessages.appendChild(MessagesTitle)
    //Add Messages Content
    let MessagesName = document.createElement('span')
    MessagesName.className = 'infoMessagesName'
    MessagesName.appendChild(document.createTextNode(`${messageCollection.size}`))
    infoMessages.appendChild(MessagesName)
    infoHeader.appendChild(infoMessages)


    const messageCollectionArrayFinal = Array.from(messageCollection.values()).reverse();

    // For each Message do....
    // let text = ""

    const core = document.createElement("div");
    core.appendChild(info);
    // core.appendChild(infoHeader);

    for (let i = 0; i < messageCollectionArrayFinal.length; i++) {
    //await messageCollectionArrayFinal.forEach(async (msg) => {
        let msg = messageCollectionArrayFinal[i]

        if (!speakingUsers.includes(msg.author.tag)) speakingUsers = speakingUsers + `${msg.author.tag}, `

        // Main container with the avatar for each message
        let parentContainer = document.createElement("div")
        parentContainer.className = "parent-container"

        let avatarDiv = document.createElement("div")
        avatarDiv.className = "avatar-container"

        // Change the avatar icon if it is a pinned message
        if (msg.type === "CHANNEL_PINNED_MESSAGE") {

            // Pinned svg icon path

            let img = document.createElement('svg')
            img.setAttribute('class', 'img')
            img.setAttribute('width', '25')
            img.setAttribute('height', '25')
            img.setAttribute('viewBox', '0 0 25 25')

            let imgPath = document.createElement('path')
            imgPath.setAttribute('d', 'm16.908 8.39684-8.29587-8.295827-1.18584 1.184157 1.18584 1.18584-4.14834 4.1475v.00167l-1.18583-1.18583-1.185 1.18583 3.55583 3.55502-4.740831 4.74 1.185001 1.185 4.74083-4.74 3.55581 3.555 1.185-1.185-1.185-1.185 4.1475-4.14836h.0009l1.185 1.185z')
            imgPath.setAttribute('fill', '#b9bbbe')

            img.className = "avatarPinned"

            img.appendChild(imgPath)
            avatarDiv.appendChild(img)
        } else {
            let img = document.createElement('img')
            img.setAttribute('src', msg.author.displayAvatarURL({
                dynamic: true
            }))
            img.className = "avatar"
            avatarDiv.appendChild(img)
        }



        // Add a reply node incase a reply was made
        let replyToNode = document.createElement('div')
        replyToNode.setAttribute('class', 'replyToNode')

        if (msg.content) {
                // If there was a reply, add the container before the avatar and message container.
            if (msg.type == "REPLY") {
                parentContainer.appendChild(replyToNode)
            }
        }

        parentContainer.appendChild(avatarDiv)

        // Main Message Container
        let messageContainer = document.createElement('div')
        messageContainer.className = "message-container"

        // Container for the title (Name, ID, Time)
        let titleDiv = document.createElement("div")
        titleDiv.setAttribute('class', 'titleDiv')
        messageContainer.append(titleDiv)

        // Add the username element
        let nameElement = document.createElement("span")
        nameElement.setAttribute('class', 'nameElement')
        nameElement.appendChild(document.createTextNode(msg.author.tag))

        if (!msg.member) await msg.guild?.members.fetch(msg.author.id).catch(e => { });
        if (msg.member?.roles.cache.size === 1) {
            nameElement.style.color = `#ffffff`
        } else if (msg.member?.roles.cache.size === undefined) {
            nameElement.style.color = `#ffffff`
        } else {
            nameElement.style.color = msg.member?.displayHexColor
        }

        titleDiv.append(nameElement)


        // Add the role box in
        let HighestRoleBlock = document.createElement("span")
        HighestRoleBlock.setAttribute('class', 'HighestRoleBlock')
        let rolename = ``
        let rolecolor = `#5865f2`
        if (msg.author.bot === true) {
            rolename = "BOT"
        } else if (msg.member?.roles.cache.size === 1) {
            rolename = "NO ROLE"
        } else  if (msg.member?.roles.cache.size === undefined) {
            rolename = "NO ROLE"
        } else {
            rolename = msg.member?.roles.highest.name.toUpperCase()
        }

        HighestRoleBlock.appendChild(document.createTextNode(rolename))
        HighestRoleBlock.style.backgroundColor = rolecolor
        titleDiv.append(HighestRoleBlock)

        // Add the user ID and time sent element
        let IDtimeElement = document.createElement("span")
        IDtimeElement.setAttribute('class', 'IDtimeElement')
        IDtimeElement.appendChild(document.createTextNode(`ID: ` + msg.author.id + ` | ` + moment(msg.createdAt).format(Options.dateFormat) + ` ` + moment.locale(Options.dateLocale).toUpperCase()))
        titleDiv.append(IDtimeElement)

        // Add the message content in based off of what it contains.
        if (msg.content.startsWith("```")) {
            let m = msg.content.replace(/```/g, "")
            let codeNode = document.createElement("code")
            codeNode.setAttribute('class', 'textCode')
            let textNode = document.createTextNode(m.replace(/<(\/?script)>/gi, '&lt;$1&gt;').replace(`<`,`&lt;`).replace(`>`,`&gt;`))
            codeNode.appendChild(textNode)
            messageContainer.appendChild(codeNode)
        } else {

            if (msg.content) {
                if (msg.type == "REPLY") {

                    let replyToLine = document.createElement('div')
                    replyToLine.setAttribute('class', 'replyToLine')
                    replyToNode.appendChild(replyToLine)

                    let replyMessage = await messageCollectionArrayFinal.filter(messages => messages.id === msg.reference.messageId)
                    if (!replyMessage[0]) {
                        
                        // No reply found body
                        let replyToIconBody = document.createElement('div')
                        replyToIconBody.setAttribute('class', 'replyToIconBody')

                        // No reply icon
                        let replyToIcon = document.createElement('svg')
                        replyToIcon.setAttribute('class', 'replyToIcon')
                        replyToIcon.setAttribute('width', '12')
                        replyToIcon.setAttribute('height', '8')
                        replyToIcon.setAttribute('viewBox', '0 0 12 8')

                        // no reply svg icon path
                        let replyToIconPath = document.createElement('path')
                        replyToIconPath.setAttribute('d', 'M0.809739 3.59646L5.12565 0.468433C5.17446 0.431163 5.23323 0.408043 5.2951 0.401763C5.35698 0.395482 5.41943 0.406298 5.4752 0.432954C5.53096 0.45961 5.57776 0.50101 5.61013 0.552343C5.64251 0.603676 5.65914 0.662833 5.6581 0.722939V2.3707C10.3624 2.3707 11.2539 5.52482 11.3991 7.21174C11.4028 7.27916 11.3848 7.34603 11.3474 7.40312C11.3101 7.46021 11.2554 7.50471 11.1908 7.53049C11.1262 7.55626 11.0549 7.56204 10.9868 7.54703C10.9187 7.53201 10.857 7.49695 10.8104 7.44666C8.72224 5.08977 5.6581 5.63359 5.6581 5.63359V7.28135C5.65831 7.34051 5.64141 7.39856 5.60931 7.44894C5.5772 7.49932 5.53117 7.54004 5.4764 7.5665C5.42163 7.59296 5.3603 7.60411 5.29932 7.59869C5.23834 7.59328 5.18014 7.57151 5.13128 7.53585L0.809739 4.40892C0.744492 4.3616 0.691538 4.30026 0.655067 4.22975C0.618596 4.15925 0.599609 4.08151 0.599609 4.00269C0.599609 3.92386 0.618596 3.84612 0.655067 3.77562C0.691538 3.70511 0.744492 3.64377 0.809739 3.59646Z')
                        replyToIconPath.setAttribute('fill', 'currentColor')

                        // no reply append all  
                        replyToIconBody.appendChild(replyToIcon)
                        replyToIcon.appendChild(replyToIconPath)
                        replyToNode.appendChild(replyToIconBody)

                        // No reply message deleted
                        let replyToMissing = document.createElement('span')
                        replyToMissing.setAttribute('class', 'replyToMissing')
                        replyToMissing.innerHTML = `<i>Original message was deleted.</i>`
                        replyToNode.appendChild(replyToMissing)

                    } else {
                    // Add the reply user image    
                    let img = document.createElement('img')
                    img.setAttribute('class', 'avatarReply')
                    img.setAttribute('src', replyMessage[0].author.displayAvatarURL({
                        dynamic: true
                    }))
                    replyToNode.appendChild(img)

                    // Add the username element to the reply
                    let nameElement = document.createElement("span")
                    nameElement.setAttribute('class', 'nameElementReply')
                    nameElement.appendChild(document.createTextNode(replyMessage[0].author.tag))
                    nameElement.style.color = replyMessage[0].member?.displayHexColor ? replyMessage[0].member?.displayHexColor : `#ffffff`
                    replyToNode.append(nameElement)

                    // Add the Message element to the reply
                    let messageElement = document.createElement("span")
                    messageElement.setAttribute('class', 'messageElementReply')
                    messageElement.innerHTML = markdownRegex(replyMessage[0].cleanContent.replace(/<(\/?script)>/gi, '&lt;$1&gt;').replace(`<`,`&lt;`).replace(`>`,`&gt;`))
                    replyToNode.append(messageElement)
                    }
                }
                // Add the main content block
                let msgNode = document.createElement('div')
                msgNode.setAttribute('class', 'maincontent')
                msgNode.setAttribute('id', `${msg.id}`)

                // Make a new div so each message has a custom class to be referenced
                /*                                     let msgID = document.createElement('div')
                msgID.setAttribute('class', `${msg.id}`) */

                msgNode.innerHTML = markdownRegex(msg.cleanContent ? msg.cleanContent.replace(/<(\/?script)>/gi, '&lt;$1&gt;').replace(`<`,`&lt;`).replace(`>`,`&gt;`) : msg.content.replace(/<(\/?script)>/gi, '&lt;$1&gt;').replace(`<`,`&lt;`).replace(`>`,`&gt;`))
                // msgNode.appendChild(msgID)
                messageContainer.appendChild(msgNode)
            }

            for (let msgembed of msg.embeds.values()) {
                let EmbedBody = document.createElement('div')
                EmbedBody.setAttribute('class', 'EmbedBody')

                if (msgembed.color) {
                    EmbedBody.style.borderColor = msgembed.hexColor
                } else {
                    EmbedBody.style.borderColor = `#000000`
                }

                if (msgembed.title) {
                    let EmbedTitle = document.createElement('span')
                    EmbedTitle.setAttribute('class', 'EmbedTitle')
                    EmbedTitle.innerHTML = markdownRegex(msgembed.title)
                    EmbedBody.append(EmbedTitle)

                }

                if (msgembed.author) {

                    let EmbedAuthorBody = document.createElement('div')
                    EmbedAuthorBody.setAttribute('class', 'EmbedAuthorBody')

                    if (msgembed.author.iconURL) {
                        let EmbedAuthorImg = document.createElement('img')
                        EmbedAuthorImg.setAttribute('class', 'EmbedAuthorImg')
                        EmbedAuthorImg.setAttribute('src', msgembed.author.iconURL)
                        EmbedAuthorBody.append(EmbedAuthorImg)
                    }

                    if (msgembed.author.name) {
                        let EmbedAuthor = document.createElement('span')
                        EmbedAuthor.setAttribute('class', 'EmbedAuthor')
                        EmbedAuthor.appendChild(document.createTextNode(msgembed.author.name))
                        EmbedAuthorBody.append(EmbedAuthor)
                    }

                    EmbedBody.append(EmbedAuthorBody)


                }

                if (msgembed.description) {
                    let EmbedDesc = document.createElement('span')
                    EmbedDesc.setAttribute('class', 'EmbedDesc')
                    EmbedDesc.innerHTML = markdownRegex(msgembed.description.replace(/<(\/?script)>/gi, '&lt;$1&gt;').replace(`<`,`&lt;`).replace(`>`,`&gt;`))
                    EmbedBody.append(EmbedDesc)
                }

                for (let embedField of msgembed.fields.values()) {
                    
                    let EmbedFieldBody = document.createElement('div')
                    EmbedFieldBody.setAttribute('class', 'EmbedFieldBody')

                    let EmbedFieldTitle = document.createElement('div')
                    EmbedFieldTitle.setAttribute('class', 'EmbedFieldTitle')
                    EmbedFieldTitle.appendChild(document.createTextNode(embedField.name.replace(/<(\/?script)>/gi, '&lt;$1&gt;').replace(`<`,`&lt;`).replace(`>`,`&gt;`)))

                    let EmbedFieldContent = document.createElement('div')
                    EmbedFieldContent.setAttribute('class', 'EmbedFieldContent')
                    EmbedFieldContent.innerHTML = markdownRegex(embedField.value.replace(/<(\/?script)>/gi, '&lt;$1&gt;').replace(`<`,`&lt;`).replace(`>`,`&gt;`))

                    EmbedFieldBody.append(EmbedFieldTitle)
                    EmbedFieldBody.append(EmbedFieldContent)
                    EmbedBody.append(EmbedFieldBody)
                }

                let EmbedFooter = document.createElement('div')
                EmbedFooter.setAttribute('class', 'EmbedFooter')

                if (msgembed.thumbnail) {

                    let imgThumb = document.createElement('img')
                    imgThumb.setAttribute('src', `${msgembed.thumbnail.url}`)

                    EmbedFooter.append(imgThumb)
                }

                if (msgembed.footer) {
                    EmbedFooter.appendChild(document.createTextNode(msgembed.footer.text))
                    EmbedBody.append(EmbedFooter)
                }
                messageContainer.append(EmbedBody)
            }

            for (let attachment of msg.attachments.values()) {
                
                const files = getImageLinks(attachment)

                if (files !== undefined) {
                    let img = document.createElement('img')
                    img.setAttribute('src', `${files}`)
                    messageContainer.appendChild(img)
                } else {

                    let AttachmentFile = document.createElement('a')
                    AttachmentFile.setAttribute('class', 'AttachmentFile')
                    AttachmentFile.appendChild(document.createTextNode(attachment.url))
                    AttachmentFile.title = attachment.url;
                    AttachmentFile.href = attachment.url;
                    messageContainer.appendChild(AttachmentFile)
                }
            }

            if (msg.type === "CHANNEL_PINNED_MESSAGE") {
                let PinnedMsg = document.createElement('div')
                PinnedMsg.setAttribute('class', 'PinnedMsg')
                PinnedMsg.innerHTML = `Pinned <a href="#${msg.reference.messageId}">a message</a> to the channel.`
                messageContainer.appendChild(PinnedMsg)
            }

            if (msg.reactions && msg.reactions.cache.size > 0) {
                let reactions = document.createElement('div')
                reactions.setAttribute('class', 'reactions')



                for (let reactionss of msg.reactions.cache.values()) {

                    let reaction = document.createElement('span')
                    reaction.setAttribute('class', 'reaction')
                    reactions.appendChild(reaction)

                    if (reactionss.emoji?.url) {
                        let reactionurl = document.createElement('img')
                        reactionurl.setAttribute('class', 'emoji-small')
                        reaction.appendChild(reactionurl)
                        var reactiontext = document.createElement('span');
                        reactiontext.setAttribute('class', "reactiontext")
                        reactiontext.appendChild(document.createTextNode(reactionss.count));
                        reaction.append(reactiontext)

                        reactionurl.setAttribute('src', reactionss.emoji?.url || reactionss.emoji?.animated)
                        reactionurl.setAttribute('width', "15px")
                        reactionurl.setAttribute('height', "15px")
                    } else if (reactionss.emoji?.name) {
                        let reactionstring = document.createElement('span')
                        reactionstring.setAttribute('class', 'emoji-text-small')
                        reaction.appendChild(reactionstring)

                        let reactionstringtext = document.createTextNode(reactionss.emoji?.name.toString() + ` ` + reactionss.count)
                        reactionstring.append(reactionstringtext)
                    }
                    messageContainer.appendChild(reactions)
                };
            }

        }

        parentContainer.appendChild(messageContainer)
        // text = text + parentContainer.outerHTML
        core.appendChild(parentContainer);
    }

    topText = topText + `<!---- ` + speakingUsers.substring(0, speakingUsers.length - 2) + `---->\n` + `<!----                            ---->\n` + `<!----                            ---->\n`
    
    return Buffer.from(topText + template + core.innerHTML);
}

function getImageLinks(attachments) {
    const valid = /^.*(gif|png|jpg|jpeg)$/g;
    if (valid.test(attachments.url)) return attachments.url
};

function markdownRegex(content) {
    const re = /<code(?:\s[^>]*)?>[\s\S]*?<\/code>|`{3}([\S\s]*?)`{3}|`([^`]*)`|~~([\S\s]*?)~~|\*{2}([\s\S]*?)\*{2}(?!\*)|\*([^*]*)\*|__([\s\S]*?)__/g;
    let tmp = "";
    do {
        tmp = content;
        content = content.replace(re, (match, a, b, c, d, e, f) => f ? `<u>${f}</u>` : e ? `<i>${e}</i>` : d ? `<b>${d}</b>` : c ? `<s>${c}</s>` : b ? `<code class="inline">${b}</code>` : a ? `<pre><code class="block">${a}</code></pre>` : match);
    }
    while (content != tmp);
    return content;
}