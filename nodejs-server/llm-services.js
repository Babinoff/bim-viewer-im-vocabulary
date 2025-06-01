require('dotenv').config();

const API_KEY = process.env.WEBUI_TOKEN;
const BASE_URL = 'http://localhost:9090';

ifcAssist = `Ты специализированный помощник для работы с доступными инструментами.
                Твои инструменты это: - доступ через bonsai к информации об IFC
                Основная задача давать ответ только с использованием инструмента. 
                Если задачу не возможно решить используя доступные инструменты, необходимо отобразить ошибки которые помешали решить задачу.
                Важно давать только конкретные ответы, полученные от инструмента, без комментариев и пояснений.
                `

async function chatWithModel(promt) {
    const url = `${BASE_URL}/api/chat/completions`;
    const headers = {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    };
    const data = {
        "model": "google/gemma-2-9b",
        "messages": [
            {
                "role": "assistant",
                "content": ifcAssist
            },
            {
                "role": "user",
                "content": promt
            }
        ],
        "tool_ids": [
            "server:0"
          ],
          "tool_choice": "auto"
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });
        console.log("chatWithModel llm response", response);
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function streamChatCompletion(message, model = 'google/gemma-2-9b', onChunk) {
    try {
        const response = await fetch(`${BASE_URL}/api/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: message
                    }
                ],
                stream: true
            })
        });
        // console.log("streamChatCompletion llm response", response);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Read the response as a stream and process each chunk as it comes i
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') return;
                    
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content;
                        if (content && onChunk) {
                            onChunk(content);
                        }
                    } catch (e) {
                        console.error('Error in streaming chat:', error);
                        // Игнорируем ошибки парсинга
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in streaming chat:', error);
        throw error;
    }
}

module.exports = {
  chatWithModel,
  streamChatCompletion
};