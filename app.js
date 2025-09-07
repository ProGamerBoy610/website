const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events, InteractionType, EmbedBuilder } = require('discord.js');

// Express server setup
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Discord bot setup
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// Global state management
let botOnline = false;
let botStats = { guilds: 0, botId: null, startTime: null };
let logs = [];

// Bot storage (same as your original code)
const submissions = new Map();
const userTasks = new Map();
const keySystemSetup = new Map();

// Predefined links and outputs (same as your original)
const links = {
    "https://linkvertise.com/32828": "6234767",
    "https://linkvertise.com/32dgdf8": "62etdfgdf767",
    "https://linkvertise.com/abcd12": "abc1234",
    "https://linkvertise.com/xyz987": "xyz5678",
    "https://linkvertise.com/test123": "test456",
    "https://linkvertise.com/demo789": "demo321"
};

const ADMIN_USER_ID = '1308399783936921632';

// Logging function
function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    logs.push(logEntry);
    
    // Keep only last 50 logs
    if (logs.length > 50) {
        logs.shift();
    }
    
    console.log(`[${timestamp}] ${message}`);
}

// Helper functions (same as your original)
function isExpired(expiresAt) {
    return Date.now() > expiresAt;
}

function cleanupExpiredTasks() {
    for (const [userId, task] of userTasks.entries()) {
        if (isExpired(task.expiresAt)) {
            submissions.delete(userId);
            userTasks.delete(userId);
            keySystemSetup.delete(userId);
            addLog(`🧹 Cleaned up expired task for user ${userId}`, 'info');
        }
    }
}

setInterval(cleanupExpiredTasks, 10 * 60 * 1000);

// Discord Bot Event Handlers (your original code)
client.once('ready', () => {
    botOnline = true;
    botStats.guilds = client.guilds.cache.size;
    botStats.botId = client.user.tag;
    botStats.startTime = new Date();
    
    addLog(`✅ Bot is online as ${client.user.tag}!`, 'success');
    addLog(`📊 Guilds: ${client.guilds.cache.size}`, 'success');
    addLog(`👤 Admin ID set to: ${ADMIN_USER_ID}`, 'info');
});

client.on('error', (error) => {
    addLog(`❌ Discord client error: ${error.message}`, 'error');
    botOnline = false;
});

client.on('disconnect', () => {
    addLog('🔌 Bot disconnected', 'error');
    botOnline = false;
});

// Apply command handler (your original code)
client.on('messageCreate', async (message) => {
    if (message.content === "!apply" && !message.author.bot) {
        addLog(`📝 Apply command used by ${message.author.tag}`, 'info');

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

// Key system message handler (your original code)
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
            await message.reply("❌ **Key must be between 1-100 characters!** Please try again:");
            return;
        }

        formData.scriptKey = key;
        keySetup.waitingForKey = false;
        keySystemSetup.delete(userId);

        formData.hasKeySystem = true;
        submissions.set(userId, formData);

        await message.reply("✅ **Key saved!** This key is for admin use only to verify and ensure no additional activities.");
        await showFinalConfirmation(message, formData);
        return;
    }
});

// Interaction handlers (your original code - truncated for space, but includes all your handlers)
client.on(Events.InteractionCreate, async (interaction) => {
    addLog(`🔄 Interaction received: ${interaction.type} - ${interaction.customId || 'no customId'}`, 'info');

    try {
        // Open form modal
        if (interaction.isButton() && interaction.customId === 'open_form') {
            addLog(`👤 ${interaction.user.tag} clicked open form button`, 'info');

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

        // Handle form submission (your original code logic)
        else if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'script_form') {
            addLog(`📋 Form submitted by ${interaction.user.tag}`, 'info');

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
            addLog(`💾 Form data saved for user ${interaction.user.tag}`, 'info');

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

        // (Include all your other interaction handlers here - enable_key_system, disable_key_system, etc.)
        // ... (your original interaction logic continues)

    } catch (error) {
        addLog(`❌ Error in interaction handler: ${error.message}`, 'error');
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ **Something went wrong!** Please try again or contact support.',
                    ephemeral: true
                });
            } catch (e) {
                addLog(`Failed to send error response: ${e.message}`, 'error');
            }
        }
    }
});

// Verification code handler (your original code)
client.on('messageCreate', async (message) => {
    if (message.author.bot || message.content.startsWith('!')) return;

    const userId = message.author.id;
    const task = userTasks.get(userId);

    if (!task) return;
    if (keySystemSetup.has(userId)) return;

    if (isExpired(task.expiresAt)) {
        submissions.delete(userId);
        userTasks.delete(userId);
        await message.reply("❌ **Your verification task has expired!** Please start over with !apply.");
        return;
    }

    const userCode = message.content.trim();
    addLog(`🔍 Verification attempt by ${message.author.tag}: "${userCode}"`, 'info');

    if (userCode === task.expectedOutput) {
        addLog(`✅ Verification successful for ${message.author.tag}`, 'success');

        const formData = submissions.get(userId);
        if (!formData) {
            await message.reply("❌ **Form data not found!** Please start over with !apply.");
            userTasks.delete(userId);
            return;
        }

        try {
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
            await admin.send(`**💻 Script Code from ${formData.username}:**\n\`\`\`lua\n${formData.scriptCode}\`\`\``);

            addLog(`📨 Submission sent to admin for ${message.author.tag}`, 'success');

            submissions.delete(userId);
            userTasks.delete(userId);

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
            addLog(`❌ Error sending to admin: ${error.message}`, 'error');
            await message.reply("❌ **Verification successful but failed to send to admin.** Contact support!");
        }

    } else {
        addLog(`❌ Wrong code from ${message.author.tag}`, 'error');

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

        await message.reply({ embeds: [failEmbed] });
    }
});

// Helper functions (your original code)
async function showFinalConfirmation(message, formData) {
    const confirmEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Submission Ready!')
        .setDescription('**Review your submission:**')
        .addFields(
            { name: '📝 Script Name', value: formData.scriptName, inline: true },
            { name: '🎮 Game Link', value: formData.gameLink, inline: true },
            { name: '🔑 Key System', value: formData.hasKeySystem ? `✅ Enabled\nKey: ||${formData.scriptKey}||` : '❌ Disabled', inline: true }
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('confirm_submission')
            .setLabel('✅ Confirm & Start Verification')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔗')
    );

    await message.reply({ embeds: [confirmEmbed], components: [row] });
}

// Web Interface Routes
app.get('/', (req, res) => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discord Bot Runner</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo { font-size: 4rem; margin-bottom: 20px; animation: bounce 2s infinite; }
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        h1 {
            font-size: 2.5rem;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .dashboard {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        @media (max-width: 768px) {
            .dashboard { grid-template-columns: 1fr; }
        }
        .status-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
        }
        .status {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 25px;
            margin-bottom: 20px;
            font-weight: bold;
            font-size: 1.1rem;
        }
        .status.offline {
            background: rgba(255, 107, 107, 0.2);
            border: 2px solid #ff6b6b;
            color: #ff6b6b;
        }
        .status.online {
            background: rgba(78, 205, 196, 0.2);
            border: 2px solid #4ecdc4;
            color: #4ecdc4;
        }
        .btn {
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            border: none;
            padding: 15px 30px;
            font-size: 1.1rem;
            color: white;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: bold;
        }
        .btn:hover { transform: translateY(-2px); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .logs {
            grid-column: 1 / -1;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 15px;
            padding: 20px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            max-height: 400px;
            overflow-y: auto;
        }
        .log-entry {
            margin-bottom: 8px;
            padding: 5px 10px;
            border-radius: 5px;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .log-success { background: rgba(78, 205, 196, 0.1); }
        .log-error { background: rgba(255, 107, 107, 0.1); }
        .log-info { background: rgba(255, 193, 7, 0.1); }
        .stats { text-align: left; }
        .stat-item { margin-bottom: 10px; }
        .stat-label { color: #4ecdc4; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🤖</div>
            <h1>Discord Bot Control Panel</h1>
            <p>Roblox Script Submission Bot</p>
        </div>
        
        <div class="dashboard">
            <div class="status-card">
                <div id="status" class="status offline">🔴 Offline</div>
                <button id="toggleBtn" class="btn" onclick="toggleBot()">🚀 Start Bot</button>
            </div>
            
            <div class="status-card stats">
                <h3>📊 Bot Statistics</h3>
                <div class="stat-item">
                    <span class="stat-label">Status:</span> 
                    <span id="botStatus">Offline</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Guilds:</span> 
                    <span id="guildCount">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Bot ID:</span> 
                    <span id="botId">None</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Uptime:</span> 
                    <span id="uptime">0s</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Active Submissions:</span> 
                    <span id="submissions">0</span>
                </div>
            </div>
            
            <div class="logs">
                <h3>📋 Live Logs</h3>
                <div id="logContainer">
                    <div class="log-entry log-info">System ready - waiting for bot start...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let botRunning = false;
        
        function addLogEntry(log) {
            const container = document.getElementById('logContainer');
            const entry = document.createElement('div');
            entry.className = \`log-entry log-\${log.type}\`;
            entry.innerHTML = \`[\${log.timestamp}] \${log.message}\`;
            
            container.appendChild(entry);
            container.scrollTop = container.scrollHeight;
            
            // Keep only last 30 entries
            if (container.children.length > 30) {
                container.removeChild(container.firstChild);
            }
        }
        
        function updateUI(data) {
            const status = document.getElementById('status');
            const toggleBtn = document.getElementById('toggleBtn');
            
            if (data.online) {
                status.className = 'status online';
                status.textContent = '🟢 Online';
                toggleBtn.textContent = '🛑 Stop Bot';
                botRunning = true;
            } else {
                status.className = 'status offline';
                status.textContent = '🔴 Offline';
                toggleBtn.textContent = '🚀 Start Bot';
                botRunning = false;
            }
            
            document.getElementById('botStatus').textContent = data.online ? 'Online' : 'Offline';
            document.getElementById('guildCount').textContent = data.guilds || 0;
            document.getElementById('botId').textContent = data.botId || 'None';
            document.getElementById('submissions').textContent = data.submissions || 0;
            
            if (data.startTime) {
                const uptime = Math.floor((Date.now() - new Date(data.startTime)) / 1000);
                document.getElementById('uptime').textContent = \`\${uptime}s\`;
            } else {
                document.getElementById('uptime').textContent = '0s';
            }
        }
        
        async function toggleBot() {
            const btn = document.getElementById('toggleBtn');
            btn.disabled = true;
            
            try {
                if (botRunning) {
                    const response = await fetch('/stop-bot', { method: 'POST' });
                    const data = await response.json();
                    if (data.success) {
                        addLogEntry({
                            timestamp: new Date().toLocaleTimeString(),
                            message: '🛑 Bot stopped successfully',
                            type: 'info'
                        });
                    }
                } else {
                    const response = await fetch('/start-bot', { method: 'POST' });
                    const data = await response.json();
                    if (data.success) {
                        addLogEntry({
                            timestamp: new Date().toLocaleTimeString(),
                            message: '🚀 Bot started successfully',
                            type: 'success'
                        });
                    }
                }
            } catch (error) {
                addLogEntry({
                    timestamp: new Date().toLocaleTimeString(),
                    message: \`❌ Error: \${error.message}\`,
                    type: 'error'
                });
            }
            
            btn.disabled = false;
            setTimeout(fetchStatus, 1000);
        }
        
        async function fetchStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                updateUI(data);
            } catch (error) {
                console.error('Error fetching status:', error);
            }
        }
        
        async function fetchLogs() {
            try {
                const response = await fetch('/api/logs');
                const logs = await response.json();
                
                const container = document.getElementById('logContainer');
                container.innerHTML = '';
                
                logs.forEach(log => {
                    addLogEntry(log);
                });
            } catch (error) {
                console.error('Error fetching logs:', error);
            }
        }
        
        // Auto-refresh every 5 seconds
        setInterval(fetchStatus, 5000);
        setInterval(fetchLogs, 3000);
        
        // Initial load
        fetchStatus();
        fetchLogs();
    </script>
</body>
</html>`;
    
    res.send(htmlContent);
});

// API Routes
app.post('/start-bot', async (req, res) => {
    if (botOnline) {
        return res.json({ success: false, message: 'Bot is already running' });
    }
    
    try {
        addLog('🚀 Starting Discord bot...', 'info');
        await client.login(process.env.TOKEN);
        res.json({ success: true, message: 'Bot started successfully' });
    } catch (error) {
        addLog(`❌ Failed to start bot: ${error.message}`, 'error');
        res.json({ success: false, message: error.message });
    }
});

app.post('/stop-bot', async (req, res) => {
    if (!botOnline) {
        return res.json({ success: false, message: 'Bot is not running' });
    }
    
    try {
        addLog('🛑 Stopping Discord bot...', 'info');
        client.destroy();
        botOnline = false;
        botStats = { guilds: 0, botId: null, startTime: null };
        res.json({ success: true, message: 'Bot stopped successfully' });
    } catch (error) {
        addLog(`❌ Failed to stop bot: ${error.message}`, 'error');
        res.json({ success: false, message: error.message });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        online: botOnline,
        guilds: botStats.guilds,
        botId: botStats.botId,
        startTime: botStats.startTime,
        submissions: submissions.size
    });
});

app.get('/api/logs', (req, res) => {
    res.json(logs);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        botOnline: botOnline,
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

// Complete the missing interaction handlers from your original code
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // Handle key system enabled
        if (interaction.isButton() && interaction.customId === 'enable_key_system') {
            addLog(`🔑 ${interaction.user.tag} enabled key system`, 'info');

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

        // Handle key system disabled
        else if (interaction.isButton() && interaction.customId === 'disable_key_system') {
            addLog(`❌ ${interaction.user.tag} disabled key system`, 'info');

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

        // Handle image upload request
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
                        addLog(`📷 Image uploaded by ${interaction.user.tag}`, 'info');
                    }
                }
            });
        }

        // Handle final confirmation
        else if (interaction.isButton() && interaction.customId === 'confirm_submission') {
            addLog(`✅ Final confirmation clicked by ${interaction.user.tag}`, 'info');

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

            // Store verification task
            userTasks.set(interaction.user.id, {
                link: randomLink,
                expectedOutput: expectedCode,
                expiresAt: formData.expiresAt
            });

            addLog(`🔗 Verification task assigned to ${interaction.user.tag}: ${randomLink} -> ${expectedCode}`, 'info');

            // Create verification embed
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
                content: `🔗 **Direct Link:** ${randomLink}\n\n⚠️ **Remember: Only 1 attempt! and type the code**`,
                ephemeral: true
            });
        }

    } catch (error) {
        addLog(`❌ Error in interaction handler: ${error.message}`, 'error');
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ **Something went wrong!** Please try again or contact support.',
                    ephemeral: true
                });
            } catch (e) {
                addLog(`Failed to send error response: ${e.message}`, 'error');
            }
        }
    }
});

// Helper function for interaction-based final confirmation
async function showFinalConfirmationInteraction(interaction, formData) {
    const confirmEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Submission Ready!')
        .setDescription('**Review your submission:**')
        .addFields(
            { name: '📝 Script Name', value: formData.scriptName, inline: true },
            { name: '🎮 Game Link', value: formData.gameLink, inline: true },
            { name: '🔑 Key System', value: formData.hasKeySystem ? `✅ Enabled\nKey: ||${formData.scriptKey}|| (This key is for admin use only to verify and ensure no additional activities)` : '❌ Disabled', inline: true },
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

// Error handling
process.on('unhandledRejection', (error) => {
    addLog(`❌ Unhandled promise rejection: ${error.message}`, 'error');
});

process.on('uncaughtException', (error) => {
    addLog(`❌ Uncaught exception: ${error.message}`, 'error');
});

// Graceful shutdown
process.on('SIGINT', () => {
    addLog('🔄 Received SIGINT, shutting down gracefully...', 'info');
    if (botOnline) {
        client.destroy();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    addLog('🔄 Received SIGTERM, shutting down gracefully...', 'info');
    if (botOnline) {
        client.destroy();
    }
    process.exit(0);
});

// Start the web server
app.listen(PORT, () => {
    addLog(`🌍 Web server is running on port ${PORT}`, 'success');
    addLog('🚀 Ready to start Discord bot from web interface!', 'info');
    console.log(`🌍 Open http://localhost:${PORT} to control your bot!`);
});

// Keep the web server alive (for hosting platforms)
setInterval(() => {
    // This keeps the process alive for platforms like Railway, Render, etc.
}, 30000);
