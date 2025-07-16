const express = require("express");
const twilio = require("twilio");
const fs = require("fs");
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: false }));

const products = JSON.parse(fs.readFileSync("products.json", "utf-8"));
const CHATGPT = true;

function findProduct(query) {
  return products.find(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );
}

async function getGPTReply(userMsg) {
  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a WhatsApp assistant for RKM Loom Spares." },
          { role: "user", content: userMsg }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    return res.data.choices[0].message.content;
  } catch (err) {
    return "Sorry, I'm having trouble replying right now.";
  }
}

app.post("/whatsapp", async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const message = req.body.Body.trim().toLowerCase();

  let reply = "";

  if (message === "hi" || message === "hello") {
    reply = `👋 Welcome to *RKM Loom Spares*\n\nType a product name like "Leno Guide" or type "catalog" to view all items.`;
  } else if (message === "catalog") {
    reply = products.map(p => `📌 *${p.name}* – ₹${p.price} (${p.stock} in stock)`).join("\n");
  } else {
    const product = findProduct(message);
    if (product) {
      reply = `✅ *${product.name}*\nPrice: ₹${product.price}\nAvailable stock: ${product.stock}`;
    } else {
      reply = CHATGPT ? await getGPTReply(req.body.Body) : "Sorry, product not found. Type 'catalog' to view available items.";
    }
  }

  twiml.message(reply);
  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot running on port ${PORT}`);
});
