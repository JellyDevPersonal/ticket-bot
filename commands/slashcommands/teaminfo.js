const { SlashCommandBuilder } = require('@discordjs/builders');
const { Client: DiscordClient, GatewayIntentBits, MessageEmbed } = require('discord.js');
const { Client: RCONClient } = require('rustrcon');
require('dotenv').config();

let rconClient; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('teaminfo')
        .setDescription('Get team info for a Steam ID on a Rust server')
        .addStringOption(option => 
            option.setName('steamid')
                .setDescription('The Steam ID to check')
                .setRequired(true)),
    async execute(interaction) {
        const steamID = interaction.options.getString('steamid');

        if (!rconClient) {
            rconClient = new RCONClient({
                ip: process.env.RUST_SERVER_IP,
                port: process.env.RUST_SERVER_PORT,
                password: process.env.RUST_RCON_PASSWORD
            });
        }

        try {
            await attemptRCONCommand(interaction, 'clans show', steamID);
        } catch (error) {
            console.error('Error in execute:', error);
            await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
        }
    }
};

async function attemptRCONCommand(interaction, command, steamId) {
    for (let i = 0; i < 3; i++) { 
        try {
            await rconClient.login();
            await new Promise(resolve => setTimeout(resolve, 500));
            return await new Promise((resolve, reject) => {
                rconClient.once('message', (response) => {
                    const content = response.content || 'No content available';
                    
                    const embed = new MessageEmbed()
                        .setColor('#0099ff') 
                        .setTitle(`Team Info for ${steamId}`)
                        .setDescription(`\`\`\`\n${content}\n\`\`\``)
                        .setTimestamp();

                    interaction.reply({ embeds: [embed] });
                    resolve();
                });
                rconClient.send(`${command} ${steamId}`, 'Rustnite Support', 10);
            }).finally(() => {
                rconClient.destroy();
            });
        } catch (error) {
            if (i === 2) {
                await interaction.reply('Failed to connect to RCON after several attempts.');
                rconClient.destroy();
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 2000)); 
        }
    }
}