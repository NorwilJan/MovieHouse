// WARNING: NEVER HARDCODE YOUR API KEY IN FRONT-END CODE FOR PRODUCTION!
// This is for local demonstration ONLY.
// Replace with your actual valid API key for Gemini.
const API_KEY = "AIzaSyB_dgtdiGueVIEUXkIY5QQ5Z44RIafbqIc"; 
// Changed to a model capable of image generation
const GEMINI_MODEL = "gemini-2.5-flash-image"; 

const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatHistory = document.getElementById('chatHistory');
const sendButton = document.getElementById('sendButton');

// Function to add a message (text or image) to the chat history
function addMessage(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    
    // Content can be a string (text) or an object {type: 'image', data: 'base64string'}
    if (typeof content === 'string') {
        const textNode = document.createElement('p');
        textNode.textContent = content;
        messageDiv.appendChild(textNode);
    } else if (content.type === 'image') {
        const imgElement = document.createElement('img');
        imgElement.src = `data:image/jpeg;base64,${content.data}`; // Assuming JPEG for simplicity
        imgElement.alt = "Generated Image";
        messageDiv.appendChild(imgElement);
    } else if (Array.isArray(content)) { // Handle mixed content (text and image)
        content.forEach(part => {
            if (part.text) {
                const textNode = document.createElement('p');
                textNode.textContent = part.text;
                messageDiv.appendChild(textNode);
            } else if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                const imgElement = document.createElement('img');
                imgElement.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                imgElement.alt = "Generated Image";
                messageDiv.appendChild(imgElement);
            }
        });
    }

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
    textNode.textContent = 'Gemini is thinking...';
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
            const errorData = await response.json();
            const errorMessage = errorData.error ? errorData.error.message : response.statusText;
            throw new Error(`API Error: ${errorMessage}`);
        }

        const data = await response.json();
        
        // Handle potential safety ratings (Gemini might block a response)
        if (data.promptFeedback && data.promptFeedback.safetyRatings) {
            const blockedCategories = data.promptFeedback.safetyRatings
                                        .filter(rating => rating.probability === 'HIGH' || rating.probability === 'MEDIUM')
                                        .map(rating => rating.category.replace('HARM_CATEGORY_', '').toLowerCase());
            if (blockedCategories.length > 0) {
                return `My apologies, your request was blocked due to safety concerns related to: ${blockedCategories.join(', ')}. Please try a different prompt.`;
            }
        }

        // Check if there are candidates and content
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            const parts = data.candidates[0].content.parts;
            
            // If there's only one part and it's text, return it directly as a string
            if (parts.length === 1 && parts[0].text) {
                return parts[0].text;
            } 
            // If there's only one part and it's an image, return it as an image object
            else if (parts.length === 1 && parts[0].inlineData && parts[0].inlineData.mimeType.startsWith('image/')) {
                return { 
                    type: 'image', 
                    data: parts[0].inlineData.data, 
                    mimeType: parts[0].inlineData.mimeType 
                };
            }
            // If there are multiple parts (text and/or image), return the array
            else if (parts.length > 0) {
                return parts;
            }
        }
        
        return "Sorry, I received an empty or unreadable response from the AI.";

    } catch (error) {
        console.error('Gemini API Fetch Error:', error);
        return `An error occurred: ${error.message}. Please check your API key, model name, and network connection. Also, ensure your API key is authorized for image generation models.`;
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

        // 5. Display the AI's response (can be text, image, or mixed)
        addMessage(botResponse, 'bot');
        
    } finally {
        // 6. Remove loading indicator and re-enable button
        removeLoadingIndicator(loadingIndicator);
        sendButton.disabled = false;
        userInput.focus(); // Keep focus on the input field
    }
});
