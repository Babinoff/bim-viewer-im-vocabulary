require('dotenv').config();

const token = process.env.WEBUI_TOKEN;

ifcAssist = `Ты специализированный помощник для работы с доступными инструментами.
                Твои инструменты это: - доступ через bonsai к информации об IFC
                Основная задача давать ответ только с использованием инструмента. 
                Если задачу не возможно решить используя доступные инструменты, необходимо отобразить ошибки которые помешали решить задачу.
                Важно давать только конкретные ответы, полученные от инструмента, без комментариев и пояснений.
                `

async function chatWithModel(promt) {
    const url = 'http://localhost:9090/api/chat/completions';
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    const data = {
        "model": "qwen/qwen3-8b",
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
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

module.exports = {
  chatWithModel
};