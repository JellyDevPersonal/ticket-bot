require("dotenv").config({ path: "./config/.env" });
const { Client,Collection,Intents } = require("discord.js");
const config = require("./config/config.json");

const client = new Client({ intents: [
	Intents.FLAGS.GUILDS,
	Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
	Intents.FLAGS.GUILD_MEMBERS,
	Intents.FLAGS.GUILD_MESSAGES,
	Intents.FLAGS.DIRECT_MESSAGES
], partials: ["MESSAGE", "CHANNEL", "REACTION", "GUILD_MEMBER"]	});

client.commands = new Collection();
client.blocked_users = new Set();
client.cooldown = new Set();
client.config = config;


let startTime = new Date().getTime();
client.login(process.env.BOT_TOKEN).then(() => {

	eval(require("./utils/handler_manager")(client));
	let endTime = new Date().getTime();

	let difference = Math.round(endTime - startTime);
	console.log(`Successfully logged in as ${client.user.username}! Took ${difference}ms`);
});
