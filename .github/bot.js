// bot.js - Updated for GitHub Actions hosting
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events, InteractionType, EmbedBuilder } = require('discord.js');

// GitHub Actions compatibility
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
console.log(`🌐 Running in ${isGitHubActions ? 'GitHub Actions' : 'local'} environment`);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// --- Temporary storage ---
const submissions = new Map();
const userTasks = new Map();
const keySystemSetup = new Map();

// --- Predefined links and outputs ---
const links = {
    "https://linkvertise.com/32828": "6234767",
    "https://linkvertise.com/32dgdf8": "62etdfgdf767",
    "https://linkvertise.com/abcd12": "abc1234",
    "https://linkvertise.com/xyz987": "xyz5678",
    "https://linkvertise.com/test123": "test456",
    "https://linkvertise.com/demo789": "demo321"
};

// Admin user ID
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '1308399783936921632';

// --- Helper Functions ---
function isExpired(expiresAt) {
    return Date.now() > expiresAt;
}

function cleanupExpiredTasks() {
    let cleanedCount = 0;
    for (const [userId, task] of userTasks.entries()) {
        if (isExpired(task.expiresAt)) {
            submissions.delete(userId);
            userTasks.delete(userId);
            keySystemSetup.delete(userId);
            cleanedCount++;
        }
    }
    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired tasks`);
    }
}

// Clean up expired tasks every 10 minutes
setInterval(cleanupExpiredTasks, 10 * 60 * 1000);

// --- GitHub Actions specific functions ---
function logStats() {
    const stats = {
        guilds: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        activeSubmissions: submissions.size,
        pendingTasks: userTasks.size,
        uptime: Math.floor(process.uptime())
    };
    
    console.log(`📊 Bot Stats: ${stats.guilds} guilds, ${stats.users} users, ${stats.activeSubmissions} submissions, uptime: ${stats.uptime}s`);
    return stats;
}

// Log stats every 30 minutes for GitHub Actions monitoring
if (isGitHubActions) {
    setInterval(logStats, 30 * 60 * 1000);
}

// --- Bot Ready ---
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`📊 Connected to ${client.guilds.cache.size} guilds`);
    console.log(`👥 Serving ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} users`);
    console.log(`👤 Admin ID: ${ADMIN_USER_ID}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (isGitHubActions) {
        console.log(`🔄 GitHub Actions mode - Will run for up to 6 hours`);
        console.log(`⏰ Session started at: ${new Date().toISOString()}`);
    }
    
    // Set bot presence
    client.user.setPresence({
        activities: [{ name: '!apply for script submission', type: 3 }], // WATCHING type
        status: 'online',
    });
    
    // Initial stats log
    logStats();
});

// --- Command to send apply button ---
client.on('messageCreate', async (message) => {
    if (message.content === "!apply" && !message.author.bot) {
        console.log(`📝 Apply command used by ${message.author.tag} in ${message.guild?.name || 'DM'}`);
        
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

        try {
            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error(`❌ Error sending apply embed: ${error.message}`);
        }
    }
});

// --- Handle message-based key system setup ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const userId = message.author.id;
    const keySetup = keySystemSetup.get(userId);
    
    if (!keySetup) return;
    
    const formData = submissions.get(userId);
    if (!formData) {
        keySystemSetup.delete(userId);
        return;
    }
    
    if (keySetup.waitingForKey) {
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
            await message.reply("✅ **Key saved!** This key is for admin use only to verify and ensure no additional activities.");
            await showFinalConfirmation(message, formData);
        } catch (error) {
            console.error(`❌ Error in key system setup: ${error.message}`);
        }
    }
});

// --- Handle all interactions ---
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // 1️⃣ Open form modal
        if (interaction.isButton() && interaction.customId === 'open_form') {
            console.log(`👤 ${interaction.user.tag} opened form modal`);
            
            if (submissions.has(interaction.user.id)) {
                const task = userTasks.get(interaction.user.id);
                if (task && isExpired(task.expiresAt)) {
                    submissions.delete(interaction.user.id);
                    userTasks.delete(interaction.user.id);
                    keySystemSetup.delete(interaction.user.id);
                } else {
                    await interaction.reply({ 
                        content: "❌ **You already have a pending submission!**\nComplete your current task or wait for it to expire (48 hours).", 
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
                .setPlaceholder('List the main features of your script...')
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
                .setPlaceholder('Describe your script, how it works, etc...')
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

        // 2️⃣ Handle form submission
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
            console.log(`💾 Form data saved for ${interaction.user.tag}`);

            const keySystemEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('🔑 Key System Setup')
                .setDescription('**Do you want your script to have a key system?**\n\nKey systems require users to enter a specific key to access your script.')
                .addFields(
                    { name: '✅ With Key System', value: '• More secure\n• You provide the key\n• Users must enter key to use script', inline: true },
                    { name: '❌ No Key System', value: '• Public access\n• No key required\n• Anyone can use the script', inline: true }
                )
                .setFooter({ text: 'Choose your preferred option below' });

            const keySystemRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('enable_key_system')
                    .setLabel('✅ Enable Key System')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔐'),
                new ButtonBuilder()
                    .setCustomId('disable_key_system')
                    .setLabel('❌ No Key System')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚫')
            );

            await interaction.reply({ embeds: [keySystemEmbed], components: [keySystemRow], ephemeral: true });
        }

        // 3️⃣ Handle key system enabled
        else if (interaction.isButton() && interaction.customId === 'enable_key_system') {
            console.log(`🔑 ${interaction.user.tag} enabled key system`);
            
            keySystemSetup.set(interaction.user.id, { waitingForKey: true });
            
            await interaction.reply({
                content: "🔑 **Key System Enabled!**\n\nPlease type your script key in the chat (the key users will need to enter):",
                ephemeral: true
            });
            
            await interaction.followUp({
                content: `🔑 **${interaction.user}**, please send your script key now (1-100 characters):`,
                ephemeral: false
            });
        }

        // 4️⃣ Handle key system disabled
        else if (interaction.isButton() && interaction.customId === 'disable_key_system') {
            console.log(`❌ ${interaction.user.tag} disabled key system`);
            
            const formData = submissions.get(interaction.user.id);
            if (!formData) {
                await interaction.reply({ content: "❌ **Form data not found!** Please start over.", ephemeral: true });
                return;
            }

            formData.hasKeySystem = false;
            formData.scriptKey = '';
            submissions.set(interaction.user.id, formData);

            await showFinalConfirmationInteraction(interaction, formData);
        }

        // 5️⃣ Handle image upload request
        else if (interaction.isButton() && interaction.customId === 'upload_image') {
            await interaction.reply({
                content: "📷 **Upload your image now!**\n\nSend an image in this channel within 2 minutes. First image will be saved.",
                ephemeral: true
            });

            const imageFilter = (message) => {
                return message.author.id === interaction.user.id && message.attachments.size > 0;
            };

            const collector = interaction.channel.createMessageCollector({
                filter: imageFilter,
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
                        message.reply("✅ **Image uploaded successfully!** You can now confirm your submission.");
                    }
                }
            });
        }

        // 6️⃣ Handle final confirmation
        else if (interaction.isButton() && interaction.customId === 'confirm_submission') {
            console.log(`✅ Final confirmation clicked by ${interaction.user.tag}`);
            
            const formData = submissions.get(interaction.user.id);
            if (!formData) {
                await interaction.reply({ 
                    content: "❌ **Form data not found!** Please start over with !apply.", 
                    ephemeral: true 
                });
                return;
            }

            if (isExpired(formData.expiresAt)) {
                submissions.delete(interaction.user.id);
                await interaction.reply({
                    content: "❌ **Your submission has expired!** Please start over with !apply.",
                    ephemeral: true
                });
                return;
            }

            // Select random verification task
            const linkEntries = Object.entries(links);
            const randomIndex = Math.floor(Math.random() * linkEntries.length);
            const [randomLink, expectedCode] = linkEntries[randomIndex];

            userTasks.set(interaction.user.id, {
                link: randomLink,
                expectedOutput: expectedCode,
                expiresAt: formData.expiresAt
            });

            console.log(`🔗 Verification task assigned to ${interaction.user.tag}: ${randomLink} -> ${expectedCode}`);

            const verificationEmbed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('🔐 Final Step: Verification')
                .setDescription('**Complete this verification to submit your script.**')
                .addFields(
                    { name: '🔗 Verification Link', value: `**[Click Here to Complete Task](${randomLink})**`, inline: false },
                    { name: '📝 Instructions:', value: '1. Click the link above\n2. Complete the Linkvertise task\n3. Copy the code you get\n4. Send that code in this chat', inline: false },
                    { name: '⚠️ IMPORTANT:', value: '• **ONLY 1 ATTEMPT** - no second chances!\n• Code is case-sensitive\n• Expires <t:' + Math.floor(formData.expiresAt / 1000) + ':R>', inline: false }
                )
                .setFooter({ text: 'ONE CHANCE ONLY - Be careful!' })
                .setTimestamp();

            await interaction.update({ embeds: [verificationEmbed], components: [] });

            await interaction.followUp({
                content: `🔗 **Direct Link:** ${randomLink}\n\n⚠️ **Remember: Only 1 attempt! Type the code you receive**`,
                ephemeral: true
            });
        }

    } catch (error) {
        console.error(`❌ Error in interaction handler: ${error.message}`);
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ **Something went wrong!** Please try again or contact support.',
                    ephemeral: true
                });
            } catch (e) {
                console.error(`❌ Failed to send error response: ${e.message}`);
            }
        }
    }
});

// Helper function for message-based final confirmation
async function showFinalConfirmation(message, formData) {
    const confirmEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Submission Ready!')
        .setDescription('**Review your submission:**')
        .addFields(
            { name: '📝 Script Name', value: formData.scriptName, inline: true },
            { name: '🎮 Game Link', value: formData.gameLink, inline: true },
            { name: '🔑 Key System', value: formData.hasKeySystem ? `✅ Enabled\nKey: ||${formData.scriptKey}||` : '❌ Disabled', inline: true },
            { name: '⚡ Features', value: formData.features.length > 100 ? formData.features.substring(0, 100) + '...' : formData.features, inline: false },
            { name: '📄 Description', value: formData.description.length > 100 ? formData.description.substring(0, 100) + '...' : formData.description, inline: false },
            { name: '⏰ Expires', value: `<t:${Math.floor(formData.expiresAt / 1000)}:R>`, inline: false }
        )
        .setFooter({ text: 'Upload image (optional) then confirm to proceed' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('upload_image')
            .setLabel('📷 Upload Image')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🖼️'),
        new ButtonBuilder()
            .setCustomId('confirm_submission')
            .setLabel('✅ Confirm & Start Verification')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔗')
    );

    try {
        await message.reply({ embeds: [confirmEmbed], components: [row] });
    } catch (error) {
        console.error(`❌ Error showing final confirmation: ${error.message}`);
    }
}

// Helper function for interaction-based final confirmation
async function showFinalConfirmationInteraction(interaction, formData) {
    const confirmEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Submission Ready!')
        .setDescription('**Review your submission:**')
        .addFields(
            { name: '📝 Script Name', value: formData.scriptName, inline: true },
            { name: '🎮 Game Link', value: formData.gameLink, inline: true },
            { name: '🔑 Key System', value: formData.hasKeySystem ? `✅ Enabled\nKey: ||${formData.scriptKey}||` : '❌ Disabled', inline: true },
            { name: '⚡ Features', value: formData.features.length > 100 ? formData.features.substring(0, 100) + '...' : formData.features, inline: false },
            { name: '📄 Description', value: formData.description.length > 100 ? formData.description.substring(0, 100) + '...' : formData.description, inline: false },
            { name: '⏰ Expires', value: `<t:${Math.floor(formData.expiresAt / 1000)}:R>`, inline: false }
        )
        .setFooter({ text: 'Upload image (optional) then confirm to proceed' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('upload_image')
            .setLabel('📷 Upload Image')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🖼️'),
        new ButtonBuilder()
            .setCustomId('confirm_submission')
            .setLabel('✅ Confirm & Start Verification')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔗')
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
}

// 7️⃣ Listen for verification codes
client.on('messageCreate', async (message) => {
    if (message.author.bot || message.content.startsWith('!')) return;

    const userId = message.author.id;
    const task = userTasks.get(userId);

    if (!task) return;
    if (keySystemSetup.has(userId)) return;

    if (isExpired(task.expiresAt)) {
        submissions.delete(userId);
        userTasks.delete(userId);
        try {
            await message.reply("❌ **Your verification task has expired!** Please start over with !apply.");
        } catch (error) {
            console.error(`❌ Error sending expiry message: ${error.message}`);
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
                console.error(`❌ Error sending form data error: ${error.message}`);
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
                    { name: '⚡ Features', value: formData.features, inline: false },
                    { name: '📄 Description', value: formData.description, inline: false }
                )
                .setTimestamp()
                .setThumbnail(message.author.displayAvatarURL());

            if (formData.imageUrl) {
                adminEmbed.setImage(formData.imageUrl);
            }

            await admin.send({ embeds: [adminEmbed] });
            
            // Send script code in separate message to avoid Discord limits
            const codeMessage = `**💻 Script Code from ${formData.username}:**\n\`\`\`lua\n${formData.scriptCode.length > 1900 ? formData.scriptCode.substring(0, 1900) + '\n... [TRUNCATED]' : formData.scriptCode}\n\`\`\``;
            await admin.send(codeMessage);

            console.log(`📨 Submission sent to admin for ${message.author.tag}`);

            // Clean up data
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
        // Wrong code - ONE ATTEMPT ONLY
        console.log(`❌ Wrong verification code from ${message.author.tag}`);
        
        submissions.delete(userId);
        userTasks.delete(userId);

        const failEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Verification Failed')
            .setDescription('**Incorrect verification code.**\n\n**Your submission has been cancelled (only 1 attempt allowed).**')
            .addFields(
                { name: '🔄 Start Over', value: 'Use `!apply` to submit again', inline: false },
                { name: '💡 Tips', value: '• Complete the full task\n• Copy exact code\n• Check for extra spaces', inline: false }
            )
            .setFooter({ text: 'Be more careful next time!' });

        try {
            await message.reply({ embeds: [failEmbed] });
        } catch (error) {
            console.error(`❌ Error sending failure message: ${error.message}`);
        }
    }
});

// Enhanced error handling for GitHub Actions
client.on('error', (error) => {
    console.error(`❌ Discord client error: ${error.message}`);
});

client.on('shardError', error => {
    console.error(`❌ Shard error: ${error.message}`);
});

client.on('warn', info => {
    console.warn(`⚠️ Discord warning: ${info}`);
});

// Process error handlers
process.on('unhandledRejection', (error) => {
    console.error(`❌ Unhandled promise rejection: ${error.message}`);
});

process.on('uncaughtException', (error) => {
    console.error(`❌ Uncaught exception: ${error.message}`);
    process.exit(1);
});

// Graceful shutdown for GitHub Actions
process.on('SIGTERM', () => {
    console.log('🔄 Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// GitHub Actions session monitoring
if (isGitHubActions) {
    // Log session info every hour
    setInterval(() => {
        const uptime = Math.floor(process.uptime());
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        console.log(`⏰ GitHub Actions session uptime: ${hours}h ${minutes}m`);
        logStats();
    }, 60 * 60 * 1000);
    
    // Warning at 5.5 hours (30 minutes before timeout)
    setTimeout(() => {
        console.log('⚠️ GitHub Actions session will end in 30 minutes');
        console.log('🔄 Next session will start automatically in 6 hours from original start time');
    }, 5.5 * 60 * 60 * 1000);
}

// Login to Discord
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN environment variable is not set!');
    process.exit(1);
}

console.log('🔐 Logging in to Discord...');
client.login(token)
    .then(() => console.log('✅ Login successful!'))
    .catch(error => {
        console.error(`❌ Login failed: ${error.message}`);
        process.exit(1);
    });
