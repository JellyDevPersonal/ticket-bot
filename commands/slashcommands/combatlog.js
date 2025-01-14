const { SlashCommandBuilder } = require('@discordjs/builders');
const { Client: DiscordClient, GatewayIntentBits, MessageEmbed, MessageAttachment } = require('discord.js');
const { Client: RCONClient } = require('rustrcon');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let rconClient; 

function parseCombatLog(rawData) {
    const lines = rawData.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
        const parts = line.split(/\s+/);
        return {
            time: parts[0],
            attacker: parts[1] + ' ' + parts[2],
            target: parts[3] + ' ' + parts[4],
            weapon: parts.slice(5, parts.length - 11).join(' '),
            ammo: parts[parts.length - 11],
            area: parts[parts.length - 10],
            distance: parts[parts.length - 9],
            old_hp: parts[parts.length - 8],
            new_hp: parts[parts.length - 7],
            info: parts[parts.length - 6],
            hits: parts[parts.length - 5],
            integrity: parts[parts.length - 4],
            travel: parts[parts.length - 3],
            mismatch: parts[parts.length - 2],
            desync: parts[parts.length - 1]
        };
    });
}

function formatCombatLog(entries) {
    const pad = (str, length) => str.toString().padEnd(length);
    const padStart = (str, length) => str.toString().padStart(length);

    let formattedLog = 'Time     | Attacker      | Target                  | Weapon                      | Ammo          | Area     | Distance | Old HP | New HP | Info   | Hits | Integrity | Travel | Mismatch | Desync\n';
    formattedLog += '-'.repeat(180) + '\n';

    entries.forEach(entry => {
        formattedLog += `${pad(entry.time, 9)}| ${pad(entry.attacker, 14)}| ${pad(entry.target, 25)}| ${pad(entry.weapon.slice(0, 25), 28)}| ${pad(entry.ammo, 14)}| ${pad(entry.area, 9)}| ${pad(entry.distance + 'm', 9)}| ${padStart(entry.old_hp, 7)}| ${padStart(entry.new_hp, 7)}| ${pad(entry.info, 7)}| ${padStart(entry.hits, 5)}| ${padStart(entry.integrity, 10)}| ${padStart(entry.travel, 7)}| ${padStart(entry.mismatch, 9)}| ${padStart(entry.desync, 7)}\n`;
    });

    return formattedLog;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('combatlog')
        .setDescription('Get the combat log for a Steam ID')
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
            await attemptRCONCommand(interaction, 'combatlog', steamID);
        } catch (error) {
            console.error('Error in execute:', error);
            await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
        }
    }
};

async function attemptRCONCommand(interaction, command, steamId) {
    for (let i = 0; i < 3; i++) { 
        try {
            await interaction.deferReply();
            await rconClient.login();
            await new Promise(resolve => setTimeout(resolve, 500));
            return await new Promise((resolve, reject) => {
                rconClient.once('message', async (response) => {
                    const content = response.content || 'No content available';
                    
                    if (!content.trim()) {
                        await interaction.editReply({ content: 'No combat log data available.', ephemeral: true });
                        resolve();
                        return;
                    }

                    const parsedCombatLog = parseCombatLog(content);
                    const formattedLog = formatCombatLog(parsedCombatLog);

                    const tempDir = path.join(__dirname, 'temp');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir);
                    }

                    const tempFilePath = path.join(tempDir, 'combat-log.txt');
                    try {
                        fs.writeFileSync(tempFilePath, formattedLog);

                        const fileSizeInBytes = fs.statSync(tempFilePath).size;
                        const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);

                        if (fileSizeInMegabytes > 8) {
                            await interaction.editReply({ content: 'The combat log file is too large to send.', ephemeral: true });
                        } else {
                            let retryCount = 0;
                            while (retryCount < 3) {
                                try {
                                    const attachment = new MessageAttachment(tempFilePath, 'combat-log.txt');
                                    await interaction.editReply({ content: `Combat Log for **${steamId}**`, files: [attachment] });
                                    break;
                                } catch (error) {
                                    if (error.code === 500) {
                                        retryCount++;
                                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                                    } else {
                                        throw error;
                                    }
                                }
                            }
                        }
                    } catch (writeError) {
                        await interaction.editReply({ content: 'Failed to write combat log to file.', ephemeral: true });
                        return;
                    }

                    try {
                        fs.unlinkSync(tempFilePath);
                    } catch (unlinkError) {
                        
                    }
                    resolve();
                });
                rconClient.send(`${command} ${steamId}`, 'Rustnite Support', 10);
            }).finally(() => {
                rconClient.destroy();
            });
        } catch (error) {
            if (i === 2) {
                if (interaction.deferred) {
                    await interaction.editReply('Failed to connect to RCON after several attempts.');
                } else {
                    await interaction.reply('Failed to connect to RCON after several attempts.');
                }
                rconClient.destroy();
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 2000)); 
        }
    }
}