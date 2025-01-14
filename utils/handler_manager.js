const { readdirSync } = require("fs");
const func = require("./functions.js")
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9")

module.exports = function (client) {
    let commands = readdirSync("./commands/").filter(x => x.endsWith(".js") && x !== 'r.js').map(x => x.split(".")[0]); // Exclude r.js from this list
    let events = readdirSync("./events/").filter(x => x.endsWith(".js")).map(x => x.split(".")[0]);
    
    // Load slash commands from main slashcommands folder
    let slashcommands = readdirSync("./commands/slashcommands/").filter(x => x.endsWith(".js") && !x.includes('/'));
    
    // Load snippets from the snippets subfolder
    let snippetCommands = readdirSync("./commands/slashcommands/snippets/").filter(x => x.endsWith(".js"));
    
    let CommandsList = [];

    // Load regular commands
    commands.forEach(file => {
        client.commands.set(file, require(`../commands/${file}`));
        console.log(`Initialized ${file} Command`);
    });

    
    try {
        const rCommand = require('../commands/r.js');
        client.commands.set('r', {
            execute: rCommand.executeTextCommand,
            executeSlashCommand: rCommand.executeSlashCommand
        });
        console.log("Initialized r Command for both text and slash");
        
        if (rCommand.data) { 
            CommandsList.push(rCommand.data.toJSON());
        } else {
            console.log("r.js does not have a 'data' property for slash command registration.");
        }
    } catch (error) {
        console.error('Failed to load r command:', error);
    }

    // Load main slash commands
    slashcommands.forEach(file => {
        const command = require(`../commands/slashcommands/${file}`);
        client.commands.set(command.data.name + `_slash`, command);
        CommandsList.push(command.data.toJSON());
        console.log(`Initialized ${file} Slash-Command`);
    });

    // Load snippet commands
    snippetCommands.forEach(file => {
        const command = require(`../commands/slashcommands/snippets/${file}`);
        client.commands.set(command.data.name + `_slash`, command);
        CommandsList.push(command.data.toJSON());
        console.log(`Initialized ${file} Snippet Command`);
    });

    // Load events
    events.forEach(file => {
        client.on(file, require(`../events/${file}`).bind(null, client));
        console.log(`Initialized ${file} Event`);
    });

    const restClient = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN);

    restClient.put(Routes.applicationGuildCommands(client.user.id, client.config.channel_ids.staff_guild_id),
    { body: CommandsList })
    .then(() => console.log("Sucessfully registered local Commands!"))
    .catch(console.error);
};