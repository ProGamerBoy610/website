const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events, InteractionType, EmbedBuilder } = require('discord.js');

// Create Discord client
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// Bot storage
const submissions = new Map(); // userId => formData
const userTasks = new Map(); // userId => { link, expectedOutput, expiresAt }
const keySystemSetup = new Map(); // userId => { waitingForKey: boolean }

// Predefined links and outputs for verification
const links = {
    "https://linkvertise.com/32828": "6234767",
    "https://linkvertise.com/32dgdf8": "62etdfgdf767",
    "https://linkvertise.com/abcd12": "abc1234",
    "https://linkvertise.com/xyz987": "xyz5678",
    "https://linkvertise.com/test123": "test456",
    "https://linkvertise.com/demo789": "demo321"
};

// Your Discord user ID for admin notifications
const ADMIN_USER_ID = '1308399783936921632';

// Helper Functions
function isExpired(expiresAt) {
    return Date.now() > expiresAt;
}

function cleanupExpiredTasks() {
    for (const [userId, task] of userTasks.entries()) {
        if (isExpired(task.expiresAt)) {
            submissions.delete(userId);
            userTasks.delete(userId);
            keySystemSetup.delete(userId);
            console.log(`🧹 Cleaned up expired task for user ${userId}`);
        }
    }
}

// Clean up expired tasks every 10 minutes
setInterval(cleanupExpiredTasks, 10 * 60 * 1000);

// Bot ready event
client.once('ready', () => {
    console.log(`✅ Bot is online as ${client.user.tag}!`);
    console.log(`📊 Connected to ${client.guilds.cache.size} servers`);
    console.log(`👤 Admin ID: ${ADMIN_USER_ID}`);
    console.log('🚀 Bot is ready to receive commands!');
});

// Handle !apply command
client.on('messageCreate', async (message) => {
    if (message.content === "!apply" && !message.author.bot) {
        console.log(`📝 Apply command used by ${message.author.tag}`);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🚀 Roblox Script Submission')
            .setDescription('Submit your Roblox script for review!\n\n**Process:**\n1️⃣ Fill out the form with script details\n2️⃣ Choose if you want a key system\n3️⃣ Upload an image (optional)\n4️⃣ Complete verification task (1 attempt only)\n5️⃣ Send verification code')
            .addFields(
                { name: '⚠️ Important', value: '• You get **only 1 attempt** for verification\n• Submissions expire after **48 hours**\n• Key system is completely optional', inline: false }
            )
            .setFooter({ text: 'Click the button below to start!' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_form')
                .setLabel('📝 Start Application')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// Handle key system setup messages
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const keySetup = keySystemSetup.get(userId);

    if (!keySetup || !keySetup.waitingForKey) return;

    const formData = submissions.get(userId);
    if (!formData) {
        keySystemSetup.delete(userId);
        return;
    }

    // User is sending the key
    const key = message.content.trim();
    if (key.length < 1 || key.length > 100) {
        await message.reply("❌ **Key must be between 1-100 characters!** Please try again:");
        return;
    }

    formData.scriptKey = key;
    keySetup.waitingForKey = false;
    keySystemSetup.delete(userId);
    formData.hasKeySystem = true;
    submissions.set(userId, formData);

    await message.reply("✅ **Key saved!** This key is for admin verification purposes.");
    await showFinalConfirmation(message, formData);
});

// Handle all button/modal interactions
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // Open form modal
        if (interaction.isButton() && interaction.customId === 'open_form') {
            console.log(`👤 ${interaction.user.tag} clicked open form button`);

            // Check if user already has pending submission
            if (submissions.has(interaction.user.id)) {
                const task = userTasks.get(interaction.user.id);
                if (task && isExpired(task.expiresAt)) {
                    // Clean up expired submission
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
            console.log(`💾 Form data saved for user ${interaction.user.tag}`);

            // Show key system choice
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

        // Handle key system enabled
        else if (interaction.isButton() && interaction.customId === 'enable_key_system') {
            console.log(`🔑 ${interaction.user.tag} enabled key system`);

            keySystemSetup.set(interaction.user.id, { waitingForKey: true });

            await interaction.reply({
                content: "🔑 **Key System Enabled!**\n\nPlease type your script key in the chat now:",
                ephemeral: true
            });

            await interaction.followUp({
                content: `🔑 **${interaction.user}**, please send your script key (1-100 characters):`,
                ephemeral: false
            });
        }

        // Handle key system disabled
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

        // Handle image upload
        else if (interaction.isButton() && interaction.customId === 'upload_image') {
            await interaction.reply({
                content: "📷 **Upload your image now!**\n\nSend an image in this channel within 2 minutes.",
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
                        message.reply("✅ **Image uploaded successfully!**");
                    }
                }
            });
        }

        // Handle final confirmation
        else if (interaction.isButton() && interaction.customId === 'confirm_submission') {
            console.log(`✅ Final confirmation by ${interaction.user.tag}`);

            const formData = submissions.get(interaction.user.id);
            if (!formData) {
                await interaction.reply({ content: "❌ **Form data not found!** Please start over.", ephemeral: true });
                return;
            }

            if (isExpired(formData.expiresAt)) {
                submissions.delete(interaction.user.id);
                await interaction.reply({ content: "❌ **Submission expired!** Please start over.", ephemeral: true });
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

            console.log(`🔗 Verification task: ${interaction.user.tag} -> ${randomLink} = ${expectedCode}`);

            const verificationEmbed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('🔐 Final Step: Verification')
                .setDescription('**Complete this verification to submit your script.**')
                .addFields(
                    { name: '🔗 Verification Link', value: `**[Click Here](${randomLink})**`, inline: false },
                    { name: '📝 Instructions', value: '1. Click the link above\n2. Complete the task\n3. Copy the code you receive\n4. Send that code in this chat', inline: false },
                    { name: '⚠️ IMPORTANT', value: '• **ONLY 1 ATTEMPT**\n• Code is case-sensitive\n• Task expires in 48 hours', inline: false }
                )
                .setFooter({ text: 'Send the verification code in chat!' });

            await interaction.update({ embeds: [verificationEmbed], components: [] });
        }

    } catch (error) {
        console.error('❌ Interaction error:', error);
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({ content: '❌ **Error occurred!** Please try again.', ephemeral: true });
            } catch (e) {
                console.error('Failed to send error response:', e);
            }
        }
    }
});

// Handle verification codes
client.on('messageCreate', async (message) => {
    if (message.author.bot || message.content.startsWith('!')) return;

    const userId = message.author.id;
    const task = userTasks.get(userId);

    if (!task) return;
    if (keySystemSetup.has(userId)) return; // Skip if setting up key

    if (isExpired(task.expiresAt)) {
        submissions.delete(userId);
        userTasks.delete(userId);
        await message.reply("❌ **Verification expired!** Use `!apply` to start over.");
        return;
    }

    const userCode = message.content.trim();
    console.log(`🔍 Verification attempt: ${message.author.tag} sent "${userCode}" (expected: "${task.expectedOutput}")`);

    if (userCode === task.expectedOutput) {
        console.log(`✅ Verification successful: ${message.author.tag}`);

        const formData = submissions.get(userId);
        if (!formData) {
            await message.reply("❌ **Form data lost!** Please start over with `!apply`.");
            userTasks.delete(userId);
            return;
        }

        try {
            // Send to admin
            const admin = await client.users.fetch(ADMIN_USER_ID);

            const adminEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ NEW VERIFIED SCRIPT SUBMISSION')
                .setDescription(`**From:** ${formData.username} (${formData.userId})`)
                .addFields(
                    { name: '📝 Script Name', value: formData.scriptName, inline: true },
                    { name: '🎮 Game Link', value: formData.gameLink, inline: true },
                    { name: '📅 Submitted', value: formData.timestamp.toLocaleString(), inline: true },
                    { name: '🔑 Key System', value: formData.hasKeySystem ? `✅ Enabled\n**Key:** ${formData.scriptKey}` : '❌ Disabled', inline: false },
                    { name: '⚡ Features', value: formData.features, inline: false },
                    { name: '📄 Description', value: formData.description, inline: false }
                )
                .setTimestamp()
                .setThumbnail(message.author.displayAvatarURL());

            if (formData.imageUrl) {
                adminEmbed.setImage(formData.imageUrl);
            }

            await admin.send({ embeds: [adminEmbed] });

            // Send script code in separate message (to avoid embed limits)
            const scriptMessage = `**💻 Script Code from ${formData.username}:**\n\`\`\`lua\n${formData.scriptCode.substring(0, 1900)}\`\`\``;
            await admin.send(scriptMessage);

            if (formData.scriptCode.length > 1900) {
                await admin.send(`\`\`\`lua\n${formData.scriptCode.substring(1900)}\`\`\``);
            }

            console.log(`📨 Sent submission to admin: ${formData.scriptName}`);

            // Clean up
            submissions.delete(userId);
            userTasks.delete(userId);

            // Confirm to user
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎉 Submission Complete!')
                .setDescription('**Your script has been successfully submitted and verified!**')
                .addFields(
                    { name: '📝 Script', value: formData.scriptName, inline: true },
                    { name: '🔑 Key System', value: formData.hasKeySystem ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '✅ Status', value: 'Sent to Admin', inline: true }
                )
                .setFooter({ text: 'Thank you for your submission!' });

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('❌ Error sending to admin:', error);
            await message.reply("❌ **Verification successful but failed to notify admin.** Contact support!");
        }

    } else {
        // Wrong code - only one attempt
        console.log(`❌ Wrong verification code: ${message.author.tag}`);

        submissions.delete(userId);
        userTasks.delete(userId);

        const failEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Verification Failed')
            .setDescription('**Incorrect verification code!**\n\nYour submission has been cancelled (only 1 attempt allowed).')
            .addFields(
                { name: '🔄 Try Again', value: 'Use `!apply` to submit again', inline: false },
                { name: '💡 Tips', value: '• Complete the full verification task\n• Copy the exact code\n• Check for spaces or typos', inline: false }
            )
            .setFooter({ text: 'Be more careful next time!' });

        await message.reply({ embeds: [failEmbed] });
    }
});

// Helper Functions
async function showFinalConfirmation(message, formData) {
    const confirmEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Review Your Submission')
        .addFields(
            { name: '📝 Script Name', value: formData.scriptName, inline: true },
            { name: '🎮 Game Link', value: formData.gameLink, inline: true },
            { name: '🔑 Key System', value: formData.hasKeySystem ? `✅ Enabled\nKey: ||${formData.scriptKey}||` : '❌ Disabled', inline: true }
        )
        .setFooter({ text: 'Review and confirm to proceed with verification' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('upload_image')
            .setLabel('📷 Add Image')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('confirm_submission')
            .setLabel('✅ Confirm & Verify')
            .setStyle(ButtonStyle.Success)
    );

    await message.reply({ embeds: [confirmEmbed], components: [row] });
}

async function showFinalConfirmationInteraction(interaction, formData) {
    const confirmEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Review Your Submission')
        .addFields(
            { name: '📝 Script Name', value: formData.scriptName, inline: true },
            { name: '🎮 Game Link', value: formData.gameLink, inline: true },
            { name: '🔑 Key System', value: formData.hasKeySystem ? `✅ Enabled` : '❌ Disabled', inline: true }
        )
        .setFooter({ text: 'Review and confirm to proceed with verification' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('upload_image')
            .setLabel('📷 Add Image')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('confirm_submission')
            .setLabel('✅ Confirm & Verify')
            .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
}

// Error handling
client.on('error', console.error);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.TOKEN)
    .then(() => console.log('🔐 Successfully logged in!'))
    .catch(error => {
        console.error('❌ Login failed:', error);
        process.exit(1);
    });
