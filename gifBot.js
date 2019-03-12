const Discord = require('discord.js');
global.client = new Discord.Client();
const secrets = require('./secrets')
const sqlite3 = require("sqlite3").verbose()
const db = new sqlite3.Database('./gifdb.db')
const imageDownloader = require('./utilities/imageDownloader')
const gifBotCommands = ['help', 'add', 'list', 'delete', 'categories', 'playid']
const fs = require('fs')

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
    let content = msg.content

    if (content[0] === '!'){
        // Get rid of the Exclamation mark
        content = content.substr(1)
        const contentArray = content.split(" ")
        
        if (content === "categories") {
            return db.all("SELECT type, url FROM gifs", [], (err,results) => {
                if (err) {
                    console.log(err)
                    return msg.channel.send("Database error while getting categories")
                }
                if (results[0]){
                    msg.delete()
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
                    msg.author.send({
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
            return db.all("SELECT url url FROM gifs WHERE url = ? AND type = ?", [gif, type], async (err,results) => {
                if (err) {
                    console.log(err)
                    return msg.channel.send("There was a database error while saving the gif")
                }
                if (results[0]) {
                    return msg.channel.send("Gif already exists in database under type "+type)
                }
                let filename
                try {
                    filename = await imageDownloader(gif)
                } catch (e) {
                    return msg.channel.send(`${e}`)                
                }
                var stmt = db.prepare("INSERT INTO gifs (url, type, filename) VALUES (?, ?, ?)");
                stmt.run(gif, type, filename)
                stmt.finalize()
                db.each('SELECT COUNT(gif_id) amount_of_gifs FROM gifs', [], (err,results) => {
                    if (results.amount_of_gifs % 25 === 0) {
                        msg.channel.send(`${results.amount_of_gifs} gifs collected so far`)
                    }
                    return msg.channel.send("Gif added")
                })
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
                    msg.delete()
                    let fields = []
                    for (let i =0; i < results.length; i++) {
                        let embedObject = {
                            name: `${results[i].gif_id}: ${results[i].url}`,
                        }
                        embedObject.value = results[i+1] ? `${results[i+1].gif_id}: ${results[i+1].url}` : "Empty Slot"
                        fields.push(embedObject)
                        i++
                    }
                    return msg.author.send({
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
                const gif_id = contentArray[1]
                return db.all('SELECT filename FROM gifs WHERE gif_id = ?', [gif_id], (err, results) => {
                    if (err) {
                        console.log(err)
                        return msg.channel.send("Database error while deleting gif")
                    }
                    if (!(results && results[0])) {
                        return msg.channel.send(`No gif found with id ${gif_id}`)
                    }
                    const filename = results[0].filename
                    db.run('DELETE FROM gifs WHERE gif_id = ?', [gif_id], (err) => {
                        if (err){
                            console.log(err)
                            return msg.channel.send("Database error while deleting gif")
                        }
                        fs.unlinkSync(`./gifs/${filename}`)
                        return msg.channel.send("Gif deleted")
                    })
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
            return db.all("SELECT filename FROM gifs WHERE gif_id = ?", [id], (err,results) => {
                if (err) {
                    return console.log(err)
                }
                if (results[0]){
                    return msg.channel.send({files: [`./gifs/${results[0].filename}`]})
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
            return db.all("SELECT gif_id, filename FROM gifs WHERE type = ?", [type], (err,results) => {
                if (err) {
                    console.log(err)
                    return msg.channel.send("Database error while trying to get gif")
                }
                if (results[0]){
                        const chosenRow = pickRandom(results)
                        return msg.channel.send({
                            files: [`./gifs/${chosenRow.filename}`]
                        }).catch((e) => {
                            if (e.errno === -4058) {
                                return msg.channel.send(`Gif exists in database, but gif file not found on server. Try deleting gif with id ${chosenRow.gif_id} and adding it again`)
                            }
                        })
                } else {
                    return msg.channel.send(`No gifs found of type "${type}" | Try adding a gif with "add ${type} {{gif url}}"`)
                }
            })
        }
    }
    return
});
