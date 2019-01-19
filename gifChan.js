const Discord = require('discord.js');
global.client = new Discord.Client();
const secrets = require('./secrets')
const sqlite3 = require("sqlite3").verbose()
const db = new sqlite3.Database('./gifdb.db')

const gifBotCommands = ['help', 'add', 'list', 'delete', 'categories', 'playid']

// Functions

const pickRandom = (array) => {
    return array[Math.floor(Math.random()*array.length)]
}

// Login to the bot
client.login(secrets.botKey);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    // Cronjobs
    client.user.setActivity('TPN Opening')
}); 

client.on('message', async msg => {
    const msgChannelId = msg.channel.id
    console.log(msgChannelId)
    let content = msg.content

    if (content[0] === '!'){
        // Get rid of the Exclamation mark
        content = content.substr(1)
        const contentArray = content.split(" ")
        
        if (content === "categories") {
            return db.all("SELECT type type, url url FROM gifs", [], (err,results) => {
                if (err) {
                    console.log(err)
                }
                if (results[0]){
                    let categories = {}
                    results.forEach((row) => {
                        const type = row.type
                        if (!Number.isInteger(categories[type])){
                            categories[type] = 1
                        } else {
                            categories[type] = categories[type] + 1
                        }
                    })
                    const description = Object.keys(categories).map(item => `${item}: ${categories[item]} gif${categories[item] === 1 ? '' : 's'}`).join('\n')
                    msg.channel.send({
                        "embed": {
                            "author": {
                            "name": `List of gif categories`
                            },
                            description                               
                        }
                        })
                } else {
                    return msg.channel.send("Database is empty")
                }        
            })
        }
        
        if (contentArray[0] === "add") {
            const type = contentArray[1];
            const gif = contentArray[2];
            if (gif.split('.').slice(-1).pop() !== "gif" && gif.split('.').slice(-1).pop() !== "webm") {
                return msg.channel.send(`ERROR: gif url must end in ".gif" or "webm"`)
            }
            return db.all("SELECT url url FROM gifs WHERE url = ? AND type = ?", [gif, type], (err,results) => {
                if (err) {
                    console.log(err)
                }
                if (results[0]) {
                    return msg.channel.send("Gif already exists in database under type "+type)
                }
                var stmt = db.prepare("INSERT INTO gifs (url, type) VALUES (?, ?)");
                stmt.run(gif, type)
                stmt.finalize()
                return msg.channel.send("Gif added")
            })
        }
        
        if (contentArray[0] === "list") {
            const type = contentArray[1];
            if (!type) {
                return msg.channel.send(`ERROR: The "!list" command must have a type. Example "!list cheer"`)
            }
            return db.all("SELECT gif_id gif_id, url url FROM gifs WHERE type = ?", [type], (err,results) => {
                if (err) {
                    return console.log(err)
                }
                if (results[0]) {
                    let fields = []
                    for (let i =0; i < results.length; i++) {
                        let embedObject = {
                            name: `${results[i].gif_id}: ${results[i].url}`,
                        }
                        embedObject.value = results[i+1] ? `${results[i+1].gif_id}: ${results[i+1].url}` : "Empty Slot"
                        fields.push(embedObject)
                        i++
                    }
                    return msg.channel.send({
                        "embed": {
                            "author": {
                                "name": `List of gifs in type "${type}"`
                            },
                            "fields": fields
                        }
                    })
                } else {
                    return msg.channel.send(`No gifs found for type "${type}"`)
                }
            })
        }
        
        if (contentArray[0] === "delete") {
            if (msg.member.hasPermission("ADMINISTRATOR")) {
                db.run('DELETE FROM gifs WHERE gif_id = ?', [contentArray[1]], (err) => {
                    if (err){
                        return console.log(err)
                    }
                    return msg.channel.send("Gif deleted")
                })
            } else {
                return msg.channel.send("Only a channel admin can delete gifs")
            }
        }

        if (contentArray[0] === "playid") {
            const id = contentArray[1]
            if (!id) {
                return msg.channel.send("The !playid command requires an id parameter, like so | !playid 20")
            }
            return db.all("SELECT url url FROM gifs WHERE gif_id = ?", [id], (err,results) => {
                if (err) {
                    return console.log(err)
                }
                if (results[0]){
                    return msg.channel.send(results[0].url)
                } else {
                    return msg.channel.send(`No gif found with id ${id}. Run the !list {{category}} command to view gif ID numbers`)
                }
            })
        }
        
        if (contentArray[0] === "help") {
                const commmands = 
                ["!help: Displays all commands",
                "!{{category}}: Displays a random gif from the chosen category",
                "!add {{category}} {{url}}: Adds a gif to the chosen category or creates a new one if category is empty. URL must end in .webm or .gif",
                "!list {{category}}: Lists all gifs in chosen category with their respective ID-numbers",
                "!delete {{ID-number}}: Deletes gif with chosen ID, this command is admin only",
                "!categories: Displays the amount of gifs in all categories",
                "!playid {{ID-number}}: Displays the gif with the chosen ID-number"
                ].join('\n \n')
                return msg.channel.send({
                    "embed": {
                        "author": {
                        "name": `List of bot gif commands`
                        },
                        description: commmands                               
                    }
                })
            }
        
        if (!gifBotCommands.includes(contentArray[0])) {
            const type = contentArray[0] 
            return db.all("SELECT url url FROM gifs WHERE type = ?", [type], (err,results) => {
                if (err) {
                    console.log(err)
                }
                if (results[0]){
                    return msg.channel.send(pickRandom(results).url)
                } else {
                    return msg.channel.send(`No gifs found of type "${type}" | Try adding a gif with "add ${type} {{gif url}}"`)
                }
            })
        }
    }
    return
});