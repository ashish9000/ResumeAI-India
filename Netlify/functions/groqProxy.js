const fetch = require('node-fetch'); // Netlify background mein ise use karta hai

exports.handler = async function (event, context) {
  // Sirf POST request allow karne ke liye
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { system, user, maxTokens } = JSON.parse(event.body);

    // Netlify Environment Variable se API key uthana
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Groq API Key is missing on Netlify server!" })
      };
    }

    // Groq API ko backend se hit karna
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        max_tokens: maxTokens || 600,
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.error?.message || "Groq call failed" })
      };
    }

    // Success response wapas bhejna
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // CORS handle karne ke liye
      },
      body: JSON.stringify({ content: data.choices?.[0]?.message?.content?.trim() || "" })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

