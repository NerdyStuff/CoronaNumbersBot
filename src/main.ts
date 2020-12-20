const schedule = require('node-schedule');
const fs = require('fs');
const got = require('got');
const jsdom = require("jsdom");
const TelegramBot = require('node-telegram-bot-api');
const config = require('../config.json');

const filePath = config.filePath;
const token = config.botToken;
const url = config.url;

const bot = new TelegramBot(token, { polling: true });
const { JSDOM } = jsdom;

async function start() {

  schedule.scheduleJob('0 9 * * *', async () => {
    let msg = ""
    const response = await got(url);
    const dom = new JSDOM(response.body);
    const table = [...dom.window.document.querySelectorAll('tBody')][0];

    for (let i = 0; i < table.rows.length; i++) {
      let row = table.rows.item(i).cells;
      let state = row[0].textContent;
      state = state.replace(' ', '');
      if (i == table.rows.length - 1) {
        msg += '\n'
      }
      msg += state + ": " + row[1].textContent + " | " + row[5].textContent + " | " + row[4].textContent + "\n";
    }

    sendMessage(msg);
  });

  bot.on('message', (msg) => {
    let chatId = msg.chat.id;
    let message = msg.text;
    let userName = msg.chat.first_name;

    switch (message) {
      case '/start':
        addChatID(chatId);
        bot.sendMessage(chatId, `Hallo ${userName},\ndies ist der Coronafallzahlen Bot.\nDer Bot schickt dir täglich ein Update zu den aktuellen Fallzahlen in Deutschland.`)
        break;
      case '/stop':
        removeChatID(chatId);
        bot.sendMessage(chatId, `Schade das du uns verlässt ${userName}.`);
        break;
    }
  });

  function addChatID(id) {
    let append = true;

    try {
      const data = fs.readFileSync(filePath, 'UTF-8');
      const lines = data.split(/\r?\n/);
      lines.forEach((line) => {
        if (line == id) {
          append = false;
        }
      });
    } catch (err) {
      console.error(err);
    }

    if (append) {
      fs.appendFileSync(filePath, `${id}\n`);
    }
  }

  const removeLines = (data, lines = []) => {
    return data
      .split('\n')
      .filter((val, idx) => lines.indexOf(idx) === -1)
      .join('\n');
  }

  function removeChatID(id) {
    let lineNo = 0;

    try {
      const data = fs.readFileSync(filePath, 'UTF-8');
      const lines = data.split(/\r?\n/);
      lines.forEach((line) => {
        if (!line == id) {
          lineNo++;
        }
      });
      fs.writeFileSync(filePath, removeLines(data, [lineNo]), 'UTF-8')

    } catch (err) {
      console.error(err);
    }
  }

  function sendMessage(msg) {
    try {
      const data = fs.readFileSync(filePath, 'UTF-8');
      const lines = data.split(/\r?\n/);
      lines.forEach((chatID) => {
        if (chatID != "") {
          chatID.replace(/\r?\n|\r/, '');
          let now = new Date();
          let day = now.getDate();
          let month = now.getMonth()+1;
          let year = now.getFullYear();
          bot.sendMessage(chatID, `Die Zahlen für heute den ${day}.${month}.${year}:\n\nBundesland | Infizierte | Todefälle\n${msg} | 7 Tage Inzidenz`);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
}
start();
