const { SlashCommandBuilder } = require('@discordjs/builders');
const config = require('../../../config/config.json');
const allowedRoleIDs = config.snippets.allowed_role_ids_for_snippets || [];
const rCommand = require('../../../commands/r.js');
const lang = require('../../../content/handler/lang.json')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vdfcheck')
        .setDescription('Send the VDF check message in this channel'),

    async execute(interaction) {
        const memberRoles = interaction.member.roles.cache;
        const hasAllowedRole = memberRoles.some(role => allowedRoleIDs.includes(role.id));

        if (!hasAllowedRole) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const replyConfig = {
            message: lang.snippets.vdfcheck,
            successMessage: 'VDF check message sent.',
            color: config.active_ticket_settings.ticket_staff_embed_color
        };

        await rCommand.executeSlashCommand(interaction, replyConfig);
    }
};