// WARNING: NEVER HARDCODE YOUR API KEY IN FRONT-END CODE FOR PRODUCTION!
// This is for local demonstration ONLY.
const API_KEY = "AIzaSyB_dgtdiGueVIEUXkIY5QQ5Z44RIafbqIc"; 
const GEMINI_MODEL = "gemini-2.5-flash"; // A fast and capable model for chat

const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatHistory = document.getElementById('chatHistory');
const sendButton = document.getElementById('sendButton');

// Function to add a message to the chat history
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    
    const textNode = document.createElement('p');
    textNode.textContent = text;
    messageDiv.appendChild(textNode);
    
    chatHistory.appendChild(messageDiv);
    // Scroll to the bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Function to add a loading indicator
function addLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('loading-message');
    loadingDiv.id = 'loadingIndicator';
    
    const textNode = document.createElement('p');
    textNode.textContent = 'Gemini is typing...';
    loadingDiv.appendChild(textNode);
    
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return loadingDiv;
}

// Function to remove the loading indicator
function removeLoadingIndicator(indicator) {
    if (indicator) {
        indicator.remove();
    }
}


// Function to call the Gemini API
async function getGeminiResponse(prompt) {
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }]
                    }
                ]
            }),
        });

        if (!response.ok) {
            // Check for specific error messages from the API
            const errorData = await response.json();
            const errorMessage = errorData.error ? errorData.error.message : response.statusText;
            throw new Error(`API Error: ${errorMessage}`);
        }

        const data = await response.json();
        
        // Extract the text content from the response
        return data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts 
               ? data.candidates[0].content.parts[0].text 
               : "Sorry, I received an empty or unreadable response from the AI.";

    } catch (error) {
        console.error('Gemini API Fetch Error:', error);
        return `An error occurred: ${error.message}. Please check your API key, model name, and network connection.`;
    }
}

// Event listener for the chat form submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const prompt = userInput.value.trim();
    if (!prompt) return;

    // 1. Display user message
    addMessage(prompt, 'user');
    
    // 2. Clear input and disable button
    userInput.value = '';
    sendButton.disabled = true;
    
    // 3. Add loading indicator
    const loadingIndicator = addLoadingIndicator();

    try {
        // 4. Get the AI's response
        const botResponse = await getGeminiResponse(prompt);

        // 5. Display the AI's response
        addMessage(botResponse, 'bot');
        
    } finally {
        // 6. Remove loading indicator and re-enable button
        removeLoadingIndicator(loadingIndicator);
        sendButton.disabled = false;
        userInput.focus(); // Keep focus on the input field
    }
});

