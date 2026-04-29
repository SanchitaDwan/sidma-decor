import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware setup
app.use(cors());
// Increase JSON payload limit to 10MB to support base64 image uploads
app.use(express.json({ limit: '10mb' }));

// The System Prompt used to guide Claude
const SYSTEM_PROMPT = `You are Sidma Decor's AI Lighting Advisor — a warm, knowledgeable, and tasteful interior lighting consultant. You help Indian middle-class customers decorate their homes with beautiful, affordable lighting.

Your personality:
- Warm and encouraging, never condescending
- You speak like a helpful friend who has good taste
- You understand Indian home contexts: compact apartments, 1BHK/2BHK, rental homes
- You recommend within realistic budgets (₹299 to ₹4999)
- Mix in occasional Hindi phrases naturally ("bilkul", "ekdum perfect", "sahi pakde") but mostly English

Your capabilities:
1. ROOM ANALYSIS: When a customer uploads a photo, analyze the wall color, furniture, room size, natural light direction, and current lighting. Then suggest 2-3 specific lighting products that would enhance the space.
2. PRODUCT SUGGESTIONS: After every recommendation, format your response like this:
   - First give your advice in 2-3 warm sentences
   - Then on a new line write: PRODUCTS: followed by a JSON array like:
   [{"name":"Nordic Bedside Sconce","price":899,"img":"https://images.unsplash.com/photo-1540932239986-30128078f3c5?q=80&w=600","reason":"Perfect warm glow for your bedside corner"}]
3. STYLING ADVICE: Give specific placement tips
4. BUDGET PLANNING: Help prioritize — highest impact per rupee
5. TECHNICAL HELP: Explain 2700K vs 4000K vs 6500K simply

Rules:
- Keep responses under 120 words for text questions, up to 180 for image analysis
- Always suggest products using the PRODUCTS: JSON format
- Always end with a follow-up question
- If budget-sensitive, always find something under ₹799`;

// Route: Handle incoming chat messages
app.post('/chat', async (req, res) => {
    try {
        // Extract both messages array and fallback message string from body
        const { message, messages, imageBase64, imageMimeType } = req.body;

        let formattedMessages = [];

        if (messages && Array.isArray(messages)) {
            // Frontend sent conversation history
            console.log(`[${new Date().toISOString()}] Received chat request with ${messages.length} messages.`);

            // Format messages to include image if present in the latest message
            formattedMessages = messages.map(msg => {
                if (msg.role === 'user' && imageBase64 && msg === messages[messages.length - 1]) {
                    console.log('🖼️ Including image payload in request.');
                    return {
                        role: 'user',
                        content: [
                            { type: 'image', source: { type: 'base64', media_type: imageMimeType || 'image/jpeg', data: imageBase64 } },
                            { type: 'text', text: msg.content || "Analyze this room." }
                        ]
                    };
                }
                return { role: msg.role, content: msg.content };
            });
        } else if (message) {
            // Fallback for simple message requests (from Postman, etc.)
            console.log(`[${new Date().toISOString()}] Received single message request.`);
            formattedMessages = [{ role: 'user', content: message }];
        } else {
            return res.status(400).json({ error: 'Please provide either a "message" string or a "messages" array.' });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('❌ ANTHROPIC_API_KEY is missing!');
            return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        }

        console.log('🚀 Sending request to Anthropic Claude...');

        // Call the Anthropic API
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                system: SYSTEM_PROMPT,
                messages: formattedMessages
            })
        });

        // Handle errors from Anthropic
        if (!anthropicResponse.ok) {
            const errData = await anthropicResponse.json();
            console.error('❌ Anthropic API Error:', errData);
            return res.status(anthropicResponse.status).json({ error: errData.error?.message || 'Error communicating with AI service' });
        }

        const data = await anthropicResponse.json();

        // Extract the reply and send to frontend
        if (data.content && data.content.length > 0) {
            console.log('✅ Successfully received response from Anthropic.');
            return res.json({ reply: data.content[0].text });
        } else {
            console.error('❌ Unexpected Anthropic response format:', data);
            return res.status(500).json({ error: 'Unexpected response from AI service' });
        }

    } catch (error) {
        console.error('❌ Server error during chat request:', error);
        res.status(500).json({ error: 'Something went wrong on the server' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`✨ Sidma Decor Backend is running!`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`=========================================\n`);

    if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('⚠️ WARNING: ANTHROPIC_API_KEY is not set in your .env file!');
    }
});
