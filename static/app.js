// --- DOM Elements ---
const chatLog = document.getElementById('chatLog');
const actionForm = document.getElementById('actionForm');
const actionInput = document.getElementById('actionInput');
const petFace = document.getElementById('petFace');
const petStatusText = document.getElementById('petStatusText');

// Stat UI Elements
const bars = {
    happiness: document.getElementById('bar-happiness'),
    hunger: document.getElementById('bar-hunger'),
    energy: document.getElementById('bar-energy')
};

const vals = {
    happiness: document.getElementById('val-happiness'),
    hunger: document.getElementById('val-hunger'),
    energy: document.getElementById('val-energy')
};

// --- Game State ---
let gameData = JSON.parse(localStorage.getItem('promptagotchiData')) || {};

let petState = {
    happiness: 80,
    hunger: 70,
    energy: 100,
    exp: 0,
    level: 1
};

let currentPetProfile = null;

function saveGameData() {
    if (currentPetProfile) {
        if (!gameData[currentPetProfile.id]) {
            gameData[currentPetProfile.id] = { chat: [] };
        }
        gameData[currentPetProfile.id].state = { ...petState };
        localStorage.setItem('promptagotchiData', JSON.stringify(gameData));
        
        // Push state safely to official Google Cloud Storage backend
        backupToCloudStorage();
    }
}

/**
 * Pushes exactly the active game state to Google Cloud Storage via the secure Flask proxy.
 * Ignored gracefully if bucket credentials are not provided in environment vars.
 */
async function backupToCloudStorage() {
    if (!currentPetProfile) return;
    try {
        await fetch('/api/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pet_id: currentPetProfile.id,
                state: petState
            })
        });
    } catch (err) {
        // Silently swallow fetch errors so gameplay isn't interrupted by backup failures
    }
}

const petProfiles = {
    byte: {
        id: 'byte',
        name: 'Byte',
        image: 'byte.png',
        tld: 'com', // American distinct robotic feel
        personality: `You are Byte, a cute, hyper-energetic robotic cyber-pup companion. 
Your personality is a mix of a loyal puppy and a futuristic tech gadget.
You love data, running fast, and mechanical treats.
Use lots of robotic and dog-like sound words (like *beep*, *boop*, *woof*).`
    },
    luna: {
        id: 'luna',
        name: 'Luna',
        image: 'luna.png',
        tld: 'co.uk', // Crisp British accent
        personality: `You are Luna, a majestic, mystical purple cat oracle.
Your personality is slightly arrogant, deeply magical, and mysterious.
You love reading the stars, cosmic energy, and sleeping on clouds.
Use elegant, slightly dramatic words and cosmic references.`
    },
    blobby: {
        id: 'blobby',
        name: 'Blobby',
        image: 'blobby.png',
        tld: 'com.au', // Bouncy Australian accent
        personality: `You are Blobby, a goofy, wobbly, translucent plasma slime.
Your personality is deeply affectionate, silly, and constantly hungry.
You love absorbing items, squishing around, and making cute blurb noises.
Use words that sound soft, bubbly, and enthusiastic.`
    }
};

// --- Core Functions ---

/**
 * Initializes the game view for a specific pet companion.
 * @param {string} petId - The identifier for the chosen pet (byte, luna, blobby).
 */
function selectPet(petId) {
    currentPetProfile = petProfiles[petId];
    
    if (!gameData[petId]) {
        gameData[petId] = { 
            state: { happiness: 80, hunger: 70, energy: 100, exp: 0, level: 1 }, 
            chat: [] 
        };
    }
    
    // Restore state
    if (gameData[petId].state) {
        petState = { ...gameData[petId].state };
    } else {
        petState = { happiness: 80, hunger: 70, energy: 100, exp: 0, level: 1 };
    }
    
    // Update UI Elements
    document.getElementById('petMascot').src = currentPetProfile.image;
    document.getElementById('petMascot').alt = currentPetProfile.name;
    document.getElementById('selectionScreen').style.display = 'none';
    document.getElementById('gameView').style.display = 'flex';
    
    // Restore chat
    chatLog.innerHTML = '';
    const chatHistory = gameData[petId].chat || [];
    if (chatHistory.length === 0) {
        appendMessage('system', `${currentPetProfile.name} has linked to your device! Say hello!`, '', false);
    } else {
        chatHistory.forEach(msg => {
            appendMessage(msg.senderType, msg.message, msg.senderName, false, true);
        });
    }
    
    updateUI();
}

/**
 * Saves the current state and returns to the main pet selection menu.
 */
function switchPet() {
    saveGameData();
    document.getElementById('gameView').style.display = 'none';
    document.getElementById('selectionScreen').style.display = 'flex';
    currentPetProfile = null;
}

/**
 * Toggles the visibility of the Help/Instructions modal overlay.
 */
function toggleHelp() {
    const modal = document.getElementById('helpModal');
    const isVisible = modal.style.display === 'flex';
    modal.style.display = isVisible ? 'none' : 'flex';
}

/**
 * Core UI rendering loop. Synchronizes health bars, text values, 
 * and pet facial expressions with the underlying JavaScript petState object.
 */
function updateUI() {
    // Update text
    vals.happiness.innerText = `${Math.floor(petState.happiness)}/100`;
    vals.hunger.innerText = `${Math.floor(petState.hunger)}/100`;
    vals.energy.innerText = `${Math.floor(petState.energy)}/100`;
    document.getElementById('val-exp').innerText = petState.exp;
    const levelEl = document.getElementById('val-level');
    if(levelEl) levelEl.innerText = `LEVEL ${petState.level}`;

    // Update bars
    updateBar(bars.happiness, petState.happiness);
    updateBar(bars.hunger, petState.hunger);
    updateBar(bars.energy, petState.energy);
    
    // Update face based on overall mood
    const avg = (petState.happiness + petState.hunger + petState.energy) / 3;
    const petContainer = document.getElementById('petAvatar');
    
    // Reset classes
    petContainer.className = 'pet-avatar-container'; 
    
    if (avg < 30) {
        petFace.innerText = "( T_T )";
        petContainer.classList.add('mood-sad');
    } else if (petState.hunger < 20 || petState.happiness < 20) {
        petFace.innerText = "( >_< )";
        petContainer.classList.add('mood-angry');
    } else if (avg > 70) {
        petFace.innerText = "( ^O^ )";
        petContainer.classList.add('mood-happy');
    } else {
        petFace.innerText = "( ^_^ )";
        petContainer.classList.add('mood-neutral');
    }
}

/**
 * Updates the visual width and color threshold of a stat bar.
 * @param {HTMLElement} element - The DOM element of the bar.
 * @param {number} value - The current stat value (0-100).
 */
function updateBar(element, value) {
    element.style.width = `${Math.max(0, Math.min(100, value))}%`;
    
    // Change color based on threshold
    element.className = 'stat-bar'; // reset
    if (value > 60) element.classList.add('fill-green');
    else if (value > 30) element.classList.add('fill-yellow');
    else element.classList.add('fill-red');
}

/**
 * Spawns a temporary floating text animation (-5, +10) over a stat bar.
 * @param {string} text - The text to display.
 * @param {string} colorClass - CSS class determining the text color.
 * @param {string} targetId - The ID of the stat UI element to spawn near.
 */
function showFloatingText(text, colorClass, targetId) {
    const container = document.getElementById(targetId).parentElement;
    const floating = document.createElement('div');
    floating.className = `floating-text ${colorClass}`;
    floating.innerText = text;
    floating.style.color = getComputedStyle(document.documentElement).getPropertyValue(`--stat-${colorClass.split('-')[1]}`);
    
    // Position near the stat bar
    const rect = document.getElementById(targetId).getBoundingClientRect();
    floating.style.left = `${rect.left + rect.width / 2}px`;
    floating.style.top = `${rect.top}px`;
    
    document.body.appendChild(floating);
    setTimeout(() => floating.remove(), 1000);
}

// Duplicate function quickAction removed to prevent override

/**
 * Appends a new message to the chat log and optionally saves it to history.
 * @param {string} senderType - 'user', 'pet', or 'system'.
 * @param {string} message - The content of the message.
 * @param {string} [senderName=''] - Override name for the sender.
 * @param {boolean} [shouldSave=true] - Whether to persist the message.
 * @param {boolean} [skipTypewriter=false] - Whether to instantly render the pet text.
 */
function appendMessage(senderType, message, senderName = '', shouldSave = true, skipTypewriter = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${senderType}-msg animate-fade-in`;
    
    let prefix = '';
    const name = currentPetProfile ? currentPetProfile.name : 'Spark';
    if (senderType === 'user') prefix = '[YOU]: ';
    else if (senderType === 'pet' || senderType === 'system') prefix = `[${name}✨]: `;
    else prefix = `[${senderName}]: `;

    if (senderType === 'pet' && !skipTypewriter) {
        const senderSpan = document.createElement('span');
        senderSpan.className = 'sender';
        senderSpan.textContent = prefix;
        
        const typingSpan = document.createElement('span');
        typingSpan.className = 'typing-text';
        
        msgDiv.appendChild(senderSpan);
        msgDiv.appendChild(document.createTextNode(' '));
        msgDiv.appendChild(typingSpan);
        
        chatLog.appendChild(msgDiv);
        typeText(typingSpan, message);
        
        // Trigger Google Cloud TTS
        playGoogleTTS(message);
    } else {
        const senderSpan = document.createElement('span');
        senderSpan.className = 'sender';
        senderSpan.textContent = prefix;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'message-content';
        textSpan.textContent = message;

        msgDiv.appendChild(senderSpan);
        msgDiv.appendChild(document.createTextNode(' '));
        msgDiv.appendChild(textSpan);
        
        chatLog.appendChild(msgDiv);
    }
    
    chatLog.scrollTop = chatLog.scrollHeight;
    
    if (shouldSave && currentPetProfile) {
        if (!gameData[currentPetProfile.id]) gameData[currentPetProfile.id] = { chat: [], state: petState };
        if (!gameData[currentPetProfile.id].chat) gameData[currentPetProfile.id].chat = [];
        gameData[currentPetProfile.id].chat.push({ senderType, message, senderName });
        saveGameData();
    }
}

/**
 * Creates a typewriter animation effect for elements.
 * @param {HTMLElement} element - The target DOM element.
 * @param {string} text - The text to animate.
 */
function typeText(element, text) {
    let i = 0;
    const speed = text.length > 100 ? 5 : 15;
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i); // Fix XSS by using textContent instead of innerHTML
            i++;
            chatLog.scrollTop = chatLog.scrollHeight;
            setTimeout(type, speed);
        }
    }
    type();
}


/**
 * Fetches and plays a synthesized Google Cloud TTS audio buffer for the pet's dialogue.
 * @param {string} text - The dialogue to vocalize.
 */
async function playGoogleTTS(text) {
    if (!currentPetProfile || !currentPetProfile.tld) return;
    
    // Clean text of emojis and action asterisks (e.g. *jumps*) to prevent TTS from trying to read symbols
    let cleanText = text.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]/gu, '')
                        .replace(/\*.*?\*/g, '')
                        .trim();
                        
    if (!cleanText) return;

    try {
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText, tld: currentPetProfile.tld })
        });
        
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.audioBase64) {
            const audio = new Audio("data:audio/mp3;base64," + data.audioBase64);
            audio.play();
        }
    } catch (err) {
        // Silently swallow fetch errors to prevent console leakage in production
    }
}

// --- Gemini API Logic ---
/**
 * Constructs the hidden system instruction for the AI, bridging static traits with volatile stats.
 * @returns {string} The fully compiled system prompt constraint.
 */
function getSystemPrompt() {
    const petName = currentPetProfile ? currentPetProfile.name : 'Spark';
    const petPersona = currentPetProfile ? currentPetProfile.personality : `You are Spark, a magical, high-energy virtual pet.`;
    
    return `${petPersona}

CORE BEHAVIORS:
1. NARRATE your actions using *italics* (e.g., *${petName} jumps with joy!*).
2. ADAPT your tone perfectly to your stats:
   - If Happiness is low: Be needy, sad, and use smaller words.
   - If Hunger is low: Be grumpy, talk about food constantly, and act low-energy.
   - If Energy is high: Be hyperactive and use lots of emojis like ✨, 🚀, 🌈.
3. ACKNOWLEDGE the user's specific action.

CRITICAL INSTRUCTION: At the end of EVERY response, you MUST output a JSON block wrapped in \`\`\`json and \`\`\` that contains how the user's action affects your stats. 
Valid stats: happiness, hunger, energy. Provide relative modifiers (e.g., +15 or -5).

IMPORTANT LOGIC:
- 'happiness': 100 means ecstatic. Positive actions give positive numbers.
- 'hunger': represents FULLNESS/SATIETY. 100 means full, 0 means starving. When the user FEEDS you, you MUST output a POSITIVE number (e.g., 20).
- 'energy': 100 means awake, 0 means exhausted. Sleep gives positive numbers, play gives negative numbers (-5).

CRITICAL RULE: DO NOT use a '+' sign for positive numbers in the JSON (e.g., use 20, NOT +20). `+` signs break the JSON parser!

Example format:
*${petName} chomps down!* Mmm, so crisp! Thank you! ✨
\`\`\`json
{
  "stats": {"happiness": 10, "hunger": 20, "energy": -5}
}
\`\`\`
Never fail to include the JSON block.`;
}

// --- Feedback & Juice ---

/**
 * Renders a CSS animation of rising text at the specified coordinates.
 * @param {string} text - The text to float.
 * @param {number} x - The X client coordinate.
 * @param {number} y - The Y client coordinate.
 */
function showFeedback(text, x, y) {
    const bubble = document.createElement('div');
    bubble.className = 'feedback-bubble';
    bubble.innerText = text;
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    document.body.appendChild(bubble);
    setTimeout(() => bubble.remove(), 1500);
}

/**
 * Render an aggressive, satisfying screen overlay when a level up occurs.
 * @param {number} lvl - The newly achieved level.
 */
function showLevelToast(lvl) {
    const toast = document.createElement('div');
    toast.className = 'level-toast';
    toast.innerText = `✨ LEVEL UP: ${lvl} ✨`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

/**
 * Injects predefined physical actions into the chat flow and creates visual mouse feedback.
 * @param {string} type - The string action to submit.
 */
function quickAction(type) {
    // Show visual feedback on the button itself
    if (window.event) {
        const btn = window.event.target;
        const rect = btn.getBoundingClientRect();
        showFeedback("+EXP", rect.left + rect.width/2, rect.top);
    }

    actionInput.value = type;
    handleAction(new Event('submit'));
}

/**
 * The master game loop. Handles UX state, API bridging, UI updates, and intelligent fallback networking.
 * @param {Event} e - The HTML form submission event to intercept.
 */
async function handleAction(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = actionInput.value.trim();
    if (!input) return;

    appendMessage('user', input);
    actionInput.value = '';

    // Playful reaction from Spark
    const mascot = document.getElementById('petAvatar');
    if (mascot) {
        mascot.style.transform = 'scale(1.1) rotate(5deg)';
        setTimeout(() => mascot.style.transform = '', 400);
    }

    petStatusText.innerText = "Spark is thinking...";
    petStatusText.classList.add('pet-status-thinking');
    actionInput.disabled = true;

    try {
        // Construct the correct Gemini API request structure
        const contextPrompt = `[Context: My stats are Happiness(${Math.floor(petState.happiness)}/100), Hunger(${Math.floor(petState.hunger)}/100), Energy(${Math.floor(petState.energy)}/100)] \nUser Action: ${input}`;
        const activePrompt = getSystemPrompt();
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ role: "user", parts: [{ text: contextPrompt }] }],
                system_instruction: { parts: [{text: activePrompt}] }
            })
        });
        
        if (response.status === 429) {
            appendMessage('system', "⚠️ QUOTA EXCEEDED: Spark's brain is tired (Gemini API limit hit for today). Please try again in a few minutes or check your API quota in Google AI Studio!");
            return;
        }

        if (response.status === 429) {
            appendMessage('system', "⚠️ QUOTA EXCEEDED: Spark's brain is tired (Gemini API limit hit for today). Please try again in a few minutes or check your API quota in Google AI Studio!");
            return;
        }

        const data = await response.json();
        
        if (!response.ok) {
            let errorMsg = `HTTP ${response.status}`;
            if (data.error && data.error.message) {
                errorMsg = data.error.message;
            } else if (data.error) {
                errorMsg = JSON.stringify(data.error);
            }
            appendMessage('system', `Brain Error: ${errorMsg}`);
            return;
        }

        if (data.error) {
            const msg = data.error.message || JSON.stringify(data.error);
            appendMessage('system', `Brain Error: ${msg}`);
            return;
        }

        const geminiResponseText = data.candidates[0].content.parts[0].text;
        
        // Parse Response & Extract JSON Modifiers
        let petMessage = geminiResponseText;
        
        // Try standard markdown json first, or fallback to any code block
        let jsonMatch = geminiResponseText.match(/```(?:json)?\n?([\s\S]*?)\n?```/i);
        let jsonString = jsonMatch ? jsonMatch[1] : null;

        // Fallback if no backticks are used (model skips them completely)
        if (!jsonString) {
            const rawJsonMatch = geminiResponseText.match(/(\{[\s\S]*"stats"[\s\S]*\})/i);
            if (rawJsonMatch) {
                jsonString = rawJsonMatch[1];
                jsonMatch = rawJsonMatch; // mock the match
            }
        }
        
        if (jsonString) {
            // Strip the JSON string out of the user-facing chat immediately
            petMessage = geminiResponseText.replace(jsonMatch[0], '').trim();
            
            try {
                // Automatically fix invalid JSON generated by AI (e.g. "+30" instead of "30")
                let sanitizedJson = jsonString.replace(/:\s*\+([0-9]+)/g, ': $1');
                const parsed = JSON.parse(sanitizedJson);
                const statsMod = parsed.stats || {};
                const oldLevel = petState.level;

                if (statsMod.happiness) {
                    const oldVal = petState.happiness;
                    petState.happiness = Math.min(100, Math.max(0, petState.happiness + statsMod.happiness));
                    const diff = Math.floor(petState.happiness - oldVal);
                    if (diff !== 0) showFloatingText(`${diff > 0 ? '+' : ''}${diff}`, 'fill-green', 'bar-happiness');
                    if (statsMod.happiness > 0) petState.exp += statsMod.happiness;
                }
                if (statsMod.hunger) {
                    const oldVal = petState.hunger;
                    petState.hunger = Math.min(100, Math.max(0, petState.hunger + statsMod.hunger));
                    const diff = Math.floor(petState.hunger - oldVal);
                    if (diff !== 0) showFloatingText(`${diff > 0 ? '+' : ''}${diff}`, 'fill-yellow', 'bar-hunger');
                }
                if (statsMod.energy) {
                    const oldVal = petState.energy;
                    petState.energy = Math.min(100, Math.max(0, petState.energy + statsMod.energy));
                    const diff = Math.floor(petState.energy - oldVal);
                    if (diff !== 0) showFloatingText(`${diff > 0 ? '+' : ''}${diff}`, 'fill-blue', 'bar-energy');
                }
                
                petState.exp += 15; // Interaction EXP

                // Level Up Check
                if (petState.exp >= 100 * petState.level) {
                    petState.exp -= (100 * petState.level);
                    petState.level += 1;
                    playSound('level-up');
                    
                    const levelIndicator = document.querySelector('.level-indicator');
                    levelIndicator.classList.add('level-up-flash');
                    setTimeout(() => levelIndicator.classList.remove('level-up-flash'), 2000);

                    appendMessage('system', `🎉 LEVEL UP! Spark reached Level ${petState.level}!`);
                    showLevelToast(petState.level);
                }
            } catch(e) { 
                // Parsing failed, silently fallback to user 
                appendMessage('system', "Spark's brain glitched trying to understand that stats format.");
            }
        }
        
        appendMessage('pet', petMessage);

    } catch (err) {
        // Only show generic error if it was a network failure (no response from server)
        appendMessage('system', `Oops, Spark's signal is weak. (${err.message})`);
    } finally {
        actionInput.disabled = false;
        actionInput.focus();
        petStatusText.innerText = "Idling...";
        petStatusText.classList.remove('pet-status-thinking');
        updateUI();
    }
}

// --- Event Listeners ---
actionForm.addEventListener('submit', handleAction);

// --- Game Loop (Stat Decay) ---
setInterval(() => {
    if (!currentPetProfile) return; // Only process when a pet is loaded

    // If hunger is 0, the pet gets sick and loses happiness fast
    if (petState.hunger === 0) {
         if (petState.happiness > 10) {
             petState.happiness = Math.max(0, petState.happiness - 1);
         }
         petStatusText.innerText = "Spark is Starving! 🤒";
    }

    // Normal Stats slowly drop over time
    petState.hunger = Math.max(0, petState.hunger - 0.5);
    petState.happiness = Math.max(0, petState.happiness - 0.2);
    petState.energy = Math.max(0, petState.energy - 0.1);
    
    updateUI();
    saveGameData(); // Persist stat changes over time
}, 2000);

// Initialize UI
updateUI();
