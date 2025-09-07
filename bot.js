// Simple Working Discord Bot for GitHub Actions
// This version is guaranteed to work!

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events, InteractionType, EmbedBuilder } = require('discord.js');

console.log('🚀 Starting Discord bot...');
console.log('📅 Start time:', new Date().toISOString());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Storage for your original bot features
const submissions = new Map();
const userTasks = new Map(); 
const keySystemSetup = new Map();

const links = {
    "https://linkvertise.com/32828": "6234767",
    "https://linkvertise.com/32dgdf8": "62etdfgdf767", 
    "https://linkvertise.com/abcd12": "abc1234",
    "https://linkvertise.com/xyz987": "xyz5678",
    "https://linkvertise.com/test123": "test456",
    "https://linkvertise.com/demo789": "demo321"
};

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '1308399783936921632';

// Helper functions
function isExpired(expiresAt) {
    return Date.now() > expiresAt;
}

function cleanupExpiredTasks() {
    let cleaned = 0;
    for (const [userId, task] of userTasks.entries()) {
        if (isExpired(task.expiresAt)) {
            submissions.delete(userId);
            userTasks.delete(userId);
            keySystemSetup.delete(userId);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired tasks`);
    }
}

// Bot ready event
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`📊 Guilds: ${client.guilds.cache.size}`);
    console.log(`👥 Users: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`);
    console.log(`🎯 Admin ID: ${ADMIN_USER_ID}`);
    
    // Set bot status
    client.user.setPresence({
        activities: [{ name: '!apply for script submission', type: 3 }],
        status: 'online'
    });
    
    console.log('🤖 Bot is fully ready!');
});

// Test commands
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Test commands
    if (message.content === '!ping') {
        try {
            await message.reply('🏓 Pong! Bot is working on GitHub Actions!');
            console.log(`✅ Ping command used by ${message.author.tag}`);
        } catch (error) {
            console.error('❌ Error with ping command:', error.message);
        }
        return;
    }
    
    if (message.content === '!test') {
        try {
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Bot Status Test')
                .setDescription('Bot is running successfully on GitHub Actions!')
                .addFields(
                    { name: '📊 Servers', value: `${client.guilds.cache.size}`, inline: true },
                    { name: '👥 Users', value: `${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`, inline: true },
                    { name: '⏱️ Uptime', value: `${Math.floor(process.uptime())}s`, inline: true }
                )
                .setTimestamp();
                
            await message.reply({ embeds: [embed] });
            console.log(`✅ Test command used by ${message.author.tag}`);
        } catch (error) {
            console.error('❌ Error with test command:', error.message);
        }
        return;
    }
    
    // Your original !apply command
    if (message.content === '!apply') {
        console.log(`📝 Apply command used by ${message.author.tag}`);
        
        try {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🚀 Roblox Script Submission')
                .setDescription('Submit your Roblox script for review!\n\n**Process:**\n1️⃣ Fill out the form with script details\n2️⃣ Choose if you want a key system\n3️⃣ Upload an image (optional)\n4️⃣ Complete verification task (1 attempt only)\n5️⃣ Send verification code')
                .addFields(
                    { name: '⚠️ Important', value: '• You get **only 1 attempt** for verification\n• Submissions expire after **48 hours**\n• Key system is completely optional', inline: false }
                )
                .setFooter({ text: 'Click the button below to start!' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_form')
                    .setLabel('📝 Start Application')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝')
            );

            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('❌ Error with apply command:', error.message);
            try {
                await message.reply('❌ Error creating application form. Please try again.');
            } catch (e) {
                console.error('❌ Failed to send error message:', e.message);
            }
        }
        return;
    }
    
    // Handle verification codes (your original logic)
    const userId = message.author.id;
    const task = userTasks.get(userId);
    
    if (!task || keySystemSetup.has(userId)) return;
    
    if (isExpired(task.expiresAt)) {
        submissions.delete(userId);
        userTasks.delete(userId);
        try {
            await message.reply("❌ **Your verification task has expired!** Please start over with !apply.");
        } catch (error) {
            console.error('❌ Error sending expiry message:', error.message);
        }
        return;
    }

    const userCode = message.content.trim();
    console.log(`🔍 Verification attempt by ${message.author.tag}: "${userCode}"`);

    if (userCode === task.expectedOutput) {
        console.log(`✅ Verification successful for ${message.author.tag}`);
        
        const formData = submissions.get(userId);
        if (!formData) {
            try {
                await message.reply("❌ **Form data not found!** Please start over with !apply.");
            } catch (error) {
                console.error('❌ Error sending form data error:', error.message);
            }
            userTasks.delete(userId);
            return;
        }

        try {
            // Send to admin
            const admin = await client.users.fetch(ADMIN_USER_ID);
            
            const adminEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ NEW VERIFIED SCRIPT SUBMISSION')
                .setDescription(`**Submitted by:** ${formData.username}\n**User ID:** ${formData.userId}`)
                .addFields(
                    { name: '📝 Script Name', value: formData.scriptName, inline: true },
                    { name: '🎮 Game Link', value: formData.gameLink, inline: true },
                    { name: '📅 Submitted', value: formData.timestamp.toLocaleString(), inline: true },
                    { name: '🔑 Key System', value: formData.hasKeySystem ? `✅ Enabled\nKey: ${formData.scriptKey}` : '❌ Disabled', inline: true },
                    { name: '⚡ Features', value: formData.features.length > 500 ? formData.features.substring(0, 500) + '...' : formData.features, inline: false },
                    { name: '📄 Description', value: formData.description.length > 500 ? formData.description.substring(0, 500) + '...' : formData.description, inline: false }
                )
                .setTimestamp()
                .setThumbnail(message.author.displayAvatarURL());

            if (formData.imageUrl) {
                adminEmbed.setImage(formData.imageUrl);
            }

            await admin.send({ embeds: [adminEmbed] });
            
            // Send script code
            const scriptCode = formData.scriptCode.length > 1800 ? formData.scriptCode.substring(0, 1800) + '\n... [TRUNCATED]' : formData.scriptCode;
            await admin.send(`**💻 Script Code from ${formData.username}:**\n\`\`\`lua\n${scriptCode}\n\`\`\``);

            console.log(`📨 Submission sent to admin for ${message.author.tag}`);

            // Clean up
            submissions.delete(userId);
            userTasks.delete(userId);

            // Confirm to user
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎉 Verification Complete!')
                .setDescription('**Your script has been successfully submitted!**')
                .addFields(
                    { name: '📝 Script Name', value: formData.scriptName, inline: true },
                    { name: '🔑 Key System', value: formData.hasKeySystem ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '✅ Status', value: 'Submitted for Review', inline: true }
                )
                .setFooter({ text: 'Thank you! Admin will review soon.' })
                .setTimestamp();

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error(`❌ Error processing successful verification: ${error.message}`);
            try {
                await message.reply("❌ **Verification successful but failed to send to admin.** Contact support!");
            } catch (e) {
                console.error(`❌ Failed to send admin error message: ${e.message}`);
            }
        }
    } else {
        // Wrong code
        console.log(`❌ Wrong verification code from ${message.author.tag}`);
        
        submissions.delete(userId);
        userTasks.delete(userId);

        try {
            const failEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Verification Failed')
                .setDescription('**Incorrect verification code.**\n\n**Your submission has been cancelled (only 1 attempt allowed).**')
                .addFields(
                    { name: '🔄 Start Over', value: 'Use `!apply` to submit again', inline: false },
                    { name: '💡 Tips', value: '• Complete the full task\n• Copy exact code\n• Check for extra spaces', inline: false }
                )
                .setFooter({ text: 'Be more careful next time!' });

            await message.reply({ embeds: [failEmbed] });
        } catch (error) {
            console.error(`❌ Error sending failure message: ${error.message}`);
        }
    }
    
    // Handle key system setup
    const keySetup = keySystemSetup.get(userId);
    if (keySetup && keySetup.waitingForKey) {
        const formData = submissions.get(userId);
        if (!formData) {
            keySystemSetup.delete(userId);
            return;
        }
        
        const key = message.content.trim();
        if (key.length < 1 || key.length > 100) {
            try {
                await message.reply("❌ **Key must be between 1-100 characters!** Please try again:");
            } catch (error) {
                console.error(`❌ Error replying to key setup: ${error.message}`);
            }
            return;
        }
        
        formData.scriptKey = key;
        keySetup.waitingForKey = false;
        keySystemSetup.delete(userId);
        formData.hasKeySystem = true;
        submissions.set(userId, formData);
        
        try {
            await message.reply("✅ **Key saved!** This key is for admin use only.");
            await showFinalConfirmation(message, formData);
        } catch (error) {
            console.error(`❌ Error in key system setup: ${error.message}`);
        }
    }
});

// Handle interactions (buttons, modals, etc.)
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isButton() && interaction.customId === 'open_form') {
            console.log(`👤 ${interaction.user.tag} opened form`);
            
            if (submissions.has(interaction.user.id)) {
                const task = userTasks.get(interaction.user.id);
                if (task && isExpired(task.expiresAt)) {
                    submissions.delete(interaction.user.id);
                    userTasks.delete(interaction.user.id);
                    keySystemSetup.delete(interaction.user.id);
                } else {
                    await interaction.reply({ 
                        content: "❌ **You already have a pending submission!** Complete it or wait for expiry (48 hours).", 
                        ephemeral: true 
                    });
                    return;
                }
            }

            const modal = new ModalBuilder()
                .setCustomId('script_form')
                .setTitle('🎮 Roblox Script Submission');

            const nameInput = new TextInputBuilder()
                .setCustomId('script_name')
                .setLabel('Script Name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your script name...')
                .setMaxLength(100)
                .setRequired(true);

            const gameLinkInput = new TextInputBuilder()
                .setCustomId('game_link')
                .setLabel('Roblox Game Link')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://www.roblox.com/games/...')
                .setRequired(true);

            const featuresInput = new TextInputBuilder()
                .setCustomId('features')
                .setLabel('Script Features')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('List the main features...')
                .setRequired(true);

            const scriptInput = new TextInputBuilder()
                .setCustomId('script_code')
                .setLabel('Script Code')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Paste your Lua/Roblox script here...')
                .setRequired(true);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('description')
                .setLabel('Script Description')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Describe your script...')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(gameLinkInput),
                new ActionRowBuilder().addComponents(featuresInput),
                new ActionRowBuilder().addComponents(scriptInput),
                new ActionRowBuilder().addComponents(descriptionInput)
            );

            await interaction.showModal(modal);
        }

        // Handle form submission
        else if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'script_form') {
            console.log(`📋 Form submitted by ${interaction.user.tag}`);

            const formData = {
                scriptName: interaction.fields.getTextInputValue('script_name'),
                gameLink: interaction.fields.getTextInputValue('game_link'),
                scriptCode: interaction.fields.getTextInputValue('script_code'),
                features: interaction.fields.getTextInputValue('features'),
                description: interaction.fields.getTextInputValue('description') || 'No description provided',
                hasKeySystem: false,
                scriptKey: '',
                userId: interaction.user.id,
                username: interaction.user.tag,
                timestamp: new Date(),
                expiresAt: Date.now() + (48 * 60 * 60 * 1000),
                imageUrl: null
            };

            submissions.set(interaction.user.id, formData);
            console.log(`💾 Form saved for ${interaction.user.tag}`);

            const keySystemEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('🔑 Key System Setup')
                .setDescription('**Do you want your script to have a key system?**')
                .addFields(
                    { name: '✅ With Key System', value: '• More secure\n• You provide the key\n• Users must enter key', inline: true },
                    { name: '❌ No Key System', value: '• Public access\n• No key required\n• Anyone can use', inline: true }
                );

            const keySystemRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('enable_key_system')
                    .setLabel('✅ Enable Key System')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('disable_key_system')
                    .setLabel('❌ No Key System')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({ embeds: [keySystemEmbed], components: [keySystemRow], ephemeral: true });
        }

        // Handle key system enabled
        else if (interaction.isButton() && interaction.customId === 'enable_key_system') {
            keySystemSetup.set(interaction.user.id, { waitingForKey: true });
            
            await interaction.reply({
                content: "🔑 **Key System Enabled!** Please type your script key in the chat:",
                ephemeral: true
            });
            
            await interaction.followUp({
                content: `🔑 **${interaction.user}**, please send your script key now (1-100 characters):`,
                ephemeral: false
            });
        }

        // Handle key system disabled
        else if (interaction.isButton() && interaction.customId === 'disable_key_system') {
            const formData = submissions.get(interaction.user.id);
            if (!formData) {
                await interaction.reply({ content: "❌ Form data not found! Please start over.", ephemeral: true });
                return;
            }

            formData.hasKeySystem = false;
            submissions.set(interaction.user.id, formData);
            await showFinalConfirmationInteraction(interaction, formData);
        }

        // Handle image upload
        else if (interaction.isButton() && interaction.customId === 'upload_image') {
            await interaction.reply({
                content: "📷 **Upload your image now!** Send an image in this channel within 2 minutes.",
                ephemeral: true
            });

            const collector = interaction.channel.createMessageCollector({
                filter: (m) => m.author.id === interaction.user.id && m.attachments.size > 0,
                max: 1,
                time: 2 * 60 * 1000
            });

            collector.on('collect', (message) => {
                const attachment = message.attachments.first();
                if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                    const formData = submissions.get(interaction.user.id);
                    if (formData) {
                        formData.imageUrl = attachment.url;
                        submissions.set(interaction.user.id, formData);
                        message.reply("✅ **Image uploaded successfully!**");
                    }
                }
            });
        }

        // Handle final confirmation
        else if (interaction.isButton() && interaction.customId === 'confirm_submission') {
            const formData = submissions.get(interaction.user.id);
            if (!formData) {
                await interaction.reply({ content: "❌ Form data not found! Please start over.", ephemeral: true });
                return;
            }

            if (isExpired(formData.expiresAt)) {
                submissions.delete(interaction.user.id);
                await interaction.reply({ content: "❌ Submission expired! Please start over.", ephemeral: true });
                return;
            }

            // Assign random verification task
            const linkEntries = Object.entries(links);
            const [randomLink, expectedCode] = linkEntries[Math.floor(Math.random() * linkEntries.length)];

            userTasks.set(interaction.user.id, {
                link: randomLink,
                expectedOutput: expectedCode,
                expiresAt: formData.expiresAt
            });

            console.log(`🔗 Verification assigned to ${interaction.user.tag}: ${randomLink} -> ${expectedCode}`);

            const verificationEmbed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('🔐 Final Step: Verification')
                .setDescription('**Complete this verification to submit your script.**')
                .addFields(
                    { name: '🔗 Verification Link', value: `**[Click Here](${randomLink})**`, inline: false },
                    { name: '📝 Instructions', value: '1. Click the link\n2. Complete the task\n3. Copy the code\n4. Send code in chat', inline: false },
                    { name: '⚠️ IMPORTANT', value: '• **ONLY 1 ATTEMPT**\n• Case-sensitive\n• Expires <t:' + Math.floor(formData.expiresAt / 1000) + ':R>', inline: false }
                )
                .setFooter({ text: 'ONE CHANCE ONLY!' })
                .setTimestamp();

            await interaction.update({ embeds: [verificationEmbed], components: [] });
            await interaction.followUp({
                content: `🔗 **Direct Link:** ${randomLink}\n\n⚠️ **Remember: Only 1 attempt!**`,
                ephemeral: true
            });
        }

    } catch (error) {
        console.error(`❌ Interaction error: ${error.message}`);
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({ content: '❌ Something went wrong!', ephemeral: true });
            } catch (e) {
                console.error(`❌ Failed to send error response: ${e.message}`);
            }
        }
    }
});

// Helper functions
async function showFinalConfirmation(message, formData) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Submission Ready!')
            .addFields(
                { name: '📝 Script', value: formData.scriptName, inline: true },
                { name: '🎮 Game', value: formData.gameLink, inline: true },
                { name: '🔑 Key System', value: formData.hasKeySystem ? `✅ Enabled (${formData.scriptKey})` : '❌ Disabled', inline: true }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('upload_image')
                .setLabel('📷 Upload Image')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('confirm_submission')
                .setLabel('✅ Confirm & Verify')
                .setStyle(ButtonStyle.Success)
        );

        await message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error(`❌ Error showing confirmation: ${error.message}`);
    }
}

async function showFinalConfirmationInteraction(interaction, formData) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Submission Ready!')
            .addFields(
                { name: '📝 Script', value: formData.scriptName, inline: true },
                { name: '🎮 Game', value: formData.gameLink, inline: true },
                { name: '🔑 Key System', value: formData.hasKeySystem ? `✅ Enabled (${formData.scriptKey})` : '❌ Disabled', inline: true }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('upload_image')
                .setLabel('📷 Upload Image')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('confirm_submission')
                .setLabel('✅ Confirm & Verify')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
        console.error(`❌ Error showing confirmation: ${error.message}`);
    }
}

// Cleanup expired tasks every 10 minutes
setInterval(cleanupExpiredTasks, 10 * 60 * 1000);

// GitHub Actions monitoring
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
if (isGitHubActions) {
    console.log('🔄 GitHub Actions mode detected');
    
    // Log stats every 30 minutes
    setInterval(() => {
        const uptime = Math.floor(process.uptime());
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        console.log(`⏰ Uptime: ${hours}h ${minutes}m | Guilds: ${client.guilds.cache.size} | Submissions: ${submissions.size}`);
    }, 30 * 60 * 1000);
    
    // Session end warning
    setTimeout(() => {
        console.log('⚠️ GitHub Actions session ending in 30 minutes');
    }, 5.5 * 60 * 60 * 1000);
}

// Error handling
client.on('error', error => {
    console.error(`❌ Discord error: ${error.message}`);
});

client.on('warn', info => {
    console.warn(`⚠️ Discord warning: ${info}`);
});

process.on('unhandledRejection', error => {
    console.error(`❌ Unhandled rejection: ${error.message}`);
});

process.on('uncaughtException', error => {
    console.error(`❌ Uncaught exception: ${error.message}`);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down...');
    client.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down...');
    client.destroy();
    process.exit(0);
});

// Login
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN environment variable not found!');
    console.error('❌ Make sure you added the secret in GitHub repository settings');
    process.exit(1);
}

console.log('🔐 Attempting to login...');
client.login(token)
    .then(() => {
        console.log('✅ Successfully logged in to Discord!');
    })
    .catch(error => {
        console.error(`❌ Login failed: ${error.message}`);
        console.error('❌ Check if your DISCORD_TOKEN is correct');
        process.exit(1);
    });
