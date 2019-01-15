const Discord = require('discord.js');
const client = new Discord.Client();
const secrets = require('./secrets')
const quotes = require('./quotes.json')
let xpLevels = require('./xp.json')
const fs = require('fs')
const levelIntervals = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,192000,225000,265000,305000,355000]
const sqlite3 = require("sqlite3").verbose()
const db = new sqlite3.Database('./db.db')

const bunnyId = 193729505284718592
const gifBotCommands = ['help', 'add', 'list', 'delete', 'categories', 'playid']

                    // Mig | Ask
const animeAdmins = [193729505284718592, 197726509966950400]
let advantage = 0

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('TPN Opening')
});

const sendQuote = (quote) => {
    let embed = {
        embed: {
            color: 3447003,
            author: {
                name: quote.character ? quote.character : quote.author
            },
            description: `*${quote.quote}*`,
            footer: {
                text: quote.context ? (quote.character ? `${quote.context} | By: ${quote.author}` : quote.context) : ''
            }
        }
    }
    return embed
}
    
const displayXp = (channel) => {
    let players = []
    for (key in xpLevels) {
        let player = {}
        player.name = key
        player.value = xpLevels[key]
        players.push(player)
    }
    channel.send({embed: {
        color: 16711680,
        fields: players
    }})
}

const pickRandom = (array) => {
    return array[Math.floor(Math.random()*array.length)]
}

function isInt(value) {
    return !isNaN(value) && 
           parseInt(Number(value)) == value && 
           !isNaN(parseInt(value, 10));
  }

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
  }

const getTimestampFromId = id => {
    return Math.round((id / 4194304) + 1420070400000);
} 

client.on('message', async msg => {
    let content = msg.content
    // let content = msg.content.toLowerCase()
    if (content[0] === '$'){
        // Get rid of the dollar
        content = content.substr(1)
        if (content === 'random' || content === 'r') {
            msg.channel.send(sendQuote(pickRandom(quotes)));
            return
        }
        const quotesMatchingTag = []
        quotes.forEach((quote) => {
            const tags = quote.tags.split(',')
            tags.push(quote.author.toLowerCase())
            if (tags.includes(content)){
                quotesMatchingTag.push(quote)
            }
        })
        if (quotesMatchingTag.length) {
            msg.channel.send(sendQuote(pickRandom(quotesMatchingTag)))
            return
        }
    }
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
                    console.log('results ', results)
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
            if (animeAdmins.includes(parseInt(msg.author.id))) {
                db.run('DELETE FROM gifs WHERE gif_id = ?', [contentArray[1]], (err) => {
                    if (err){
                        return console.log(err)
                    }
                    return msg.channel.send("Gif deleted")
                })
            } else {
                return msg.channel.send("You do not have permission to delete gifs")
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
            console.log("Test")
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
        // if (content === 'banish'){
            //     msg.channel.send('Identifying normies...')
            //     const latestAcceptableMessage = +new Date()-1000*3600*24*30
            //     let activeUsers = []
            //     let activeUserNames = []
            //     try {
                //         // Get messages
                //         // Fetch guild members
                //         let allMessages = []
                //         let messageSize = 100
                //         let firstIteration = true
                //         let messagesArray, latestMessageId
                //         let latestMessageTime = null
                //         while(messageSize === 100 && (latestMessageTime > latestAcceptableMessage || latestMessageTime === null)){
                    //             let messages;
                    //             if (firstIteration) {
                        //                 messages = await msg.channel.fetchMessages({limit : 100})
                        //                 firstIteration = false
                        //             } else {
                            //                 messages = await msg.channel.fetchMessages({limit: 100, before: latestMessageId})
                            //             }
        //             messagesArray = Array.from(messages.values())
        //             latestMessageId = messagesArray[messagesArray.length-1].id
        //             messagesArray.forEach((message) => {
        //                 if (getTimestampFromId(message.id) < latestAcceptableMessage){
        //                     return false
        //                 }
        //                 if (!activeUsers.includes(message.author.id)){
        //                     activeUsers.push(message.author.id)
        //                     activeUserNames.push(message.author.username)
        //                 }
        //                 allMessages.push(message)
        //             })
        //             messageSize = messages.size
        //             console.log(messageSize)
        //             latestMessageTime = getTimestampFromId(latestMessageId)
        //         }
        //         console.log(activeUserNames)
        //         } catch (e) {
        //             console.log("Error "+e)
        //         }
        //         msg.channel.guild.fetchMembers()
        //         .then((members) => {
        //             const memberArray = Array.from(members.members.values())
        //             let inactiveUser = []
        //             let membersToBeKicked = []
        //             let deletedUsersString = ''
        //             memberArray.forEach((member) => {
        //                 if (!member.user.bot) {
        //                     if (!activeUsers.includes(member.user.id)){
        //                         membersToBeKicked.push(member)
        //                         deletedUsersString += ` ${member.user.username} |`
        //                     }
        //                 }
        //             })
        //             deletedUsersString = deletedUsersString ? deletedUsersString : 'No inactive users found'
        //             msg.channel.send({embed: {
        //                 color: 16711680,
        //                 description: 'Type "!yes" to confirm or "!no" to deny. This option will expire in 30 seconds',
        //                 author: { 
        //                     name: `YOU ARE ABOUT TO REMOVE USERS FROM THE CHANNEL`
        //                 },
        //                 fields: [
        //                     {
        //                         name: 'These users have not posted in the last month and will be removed',
        //                         value: deletedUsersString
        //                     }
        //                 ],
        //             }})
        //             const responseCollector = msg.channel.createMessageCollector(m => m.author.id === msg.author.id, {time: 30000})
        //             responseCollector.on('collect', message => {
        //                 if (message.content === '!yes'){
        //                     // Kick users
        //                     membersToBeKicked.forEach((member) => {
        //                         member.kick('You were kicked for inactivity, sorry!')
        //                     })
        //                     msg.channel.send({embed: {
        //                         color: 16711680,
        //                         image: {
        //                             url: "https://media.giphy.com/media/bYl15kiZMNZUA/200.gif"
        //                         },
        //                         author: {
        //                             name: `It is done...`
        //                         },
        //                     }})
        //                 }
        //                 if (message.content === '!no'){
        //                     responseCollector.stop();
        //                 }
        //             })
        //         })
        //         .catch(console.error)
        // }
    }
    // DnD functionality
    if (content[0] === '/'){
        // Get rid of the slash
        content = content.substr(1)
        if (content.startsWith('roll')){

            const contentArray = content.split(' ')
            // Get rid of the roll
            contentArray.shift()
            console.log('initial split ', contentArray)
            let totalRoll = 0
            const newArray = contentArray.map((item) => {
                if (item.includes('d')) {
                    const splitRoll = item.split('d')
                    // Here we avoid the D
                    console.log(splitRoll)
                    const amountOfDice = splitRoll[0];
                    const diceInterval = parseInt(splitRoll[1]);
                    const result = getRandomInt(1,diceInterval);
                    totalRoll += result
                    return result 
                } else if (isInt(item)) {
                    totalRoll += parseInt(item)
                    return item
                } else {
                    return item
                }
            })
            let returnString = newArray.join(' ')
            if (contentArray.length > 1)
            returnString += ` = ${totalRoll}`
            console.log(returnString)
            msg.channel.send({embed: {
                color: 16711680,
                author: {
                    name: returnString
                },
            }})
        }
        if (content.startsWith('addxp')) {
            if (msg.author.id != bunnyId) {
                const addXpCommand = content
                msg.channel.send({embed: {
                    color: 16711680,
                    author: {
                        name: `"Begone mortal, you are not my master"`
                    },
                    description: "The minion believes you are an enemy! Psst... type '/deceive' to roll 1d100 for an attempt at deception. This might have consequences"
                }})
                const responseCollector = msg.channel.createMessageCollector(m => m.author.id === msg.author.id, {time: 30000})
                return responseCollector.on('collect', message => {
                    if (message.content === "/deceive"){
                        let roll, firstRoll, secondRoll
                        if (advantage){
                            firstRoll = getRandomInt(1,100)
                            secondRoll = getRandomInt(1,100)
                            roll = firstRoll > secondRoll ? firstRoll : secondRoll
                        } else {
                            roll = getRandomInt(1,100)
                        }
                        msg.channel.send({embed: {
                            color: 16711680,
                            author: {
                                name: secondRoll ? `${firstRoll} || ${secondRoll}` : roll
                            },
                        }})
                        if (roll === 1) {
                            msg.channel.send('A pathetic display, you shall die for your arrogance!')
                            msg.member.kick("You rolled a natural one and was killed by the minion as a result")
                        } else if (roll < 50) {
                            msg.channel.send({embed: {
                                color: 16711680,
                                author: {
                                    name: `'A pathetic attempt at deception, be silent mortal, i wish to hear no more from you'`
                                },
                                description: `The minion has silenced ${msg.author.username} for 10 min for his attempt at deception`
                            }})
                            msg.member.setMute(true, 'The minion silenced you for 10 minutes for your attempt at deception')
                            setTimeout(() => {
                                msg.member.setMute(false, 'the spell has lifted')
                            }, 60*10)
                        } else if (roll <= 90) {
                            msg.channel.send("You will not fool me so easily...")
                        } else if (roll < 100) {
                            advantage = 1
                            msg.channel.send({embed: {
                                color: 16711680,
                                author: {
                                    name: `"Hmm... you are not my master but i like you! We should speak a little longer"`
                                },
                                description: `You managed to lift the mood of the minion! Rolls against it now have advantage`
                            }})
                        } else if (roll === 100) {
                            for (key in xpLevels) {
                                xpLevels[key] += 10
                            }
                            let players = []
                            for (key in xpLevels) {
                                let player = {}
                                player.name = key
                                player.value = `${xpLevels[key] - 10} => ${xpLevels[key]}`
                                players.push(player)
                            }
                            msg.channel.send({embed: {
                                title: "Your magic is not quite as strong as i remember... but i'll do what i can!",
                                description: "Congratz, you managed to deceive the dragon!",
                                color: 16711680,
                                fields: players
                            }})
                            fs.writeFile('xp.json', JSON.stringify(xpLevels), 'utf8', (err) => {
                            })
                        }
                        return responseCollector.stop()
                    }
                })
            }
            const contentArray = content.split(' ')
            // Get rid of the roll
            contentArray.shift()
            const command = contentArray.shift()
            const amountOfXp = contentArray[0]
            if (command === 'all') {
                for (key in xpLevels) {
                    xpLevels[key] += parseInt(amountOfXp)
                }
                console.log(xpLevels)
                fs.writeFile('xp.json', JSON.stringify(xpLevels), 'utf8', (err) => {
                    console.log(xpLevels)
                    let players = []
                    for (key in xpLevels) {
                        let player = {}
                        player.name = key
                        player.value = `${xpLevels[key] - parseInt(amountOfXp)} => ${xpLevels[key]}`
                        players.push(player)
                    }
                    msg.channel.send({embed: {
                        color: 16711680,
                        fields: players
                    }})
                })
            } else {
                // Command is a player name in this case
                if (!xpLevels[command]) {
                    return msg.channel.send("Player or command not found!")
                }
                xpLevels[command] += parseInt(amountOfXp)
                let players = []
                let player = {}
                player.name = command
                player.value = `${xpLevels[command] - parseInt(amountOfXp)} => ${xpLevels[command]}`
                players.push(player)
                msg.channel.send({embed: {
                    color: 16711680,
                    fields: players
                }})
                fs.writeFile('xp.json', JSON.stringify(xpLevels), 'utf8', (err) => {
                    console.log(xpLevels)
                })
            }
        }
        if (content.startsWith('displayxp')) {
            displayXp(msg.channel)
        }
    }
    return
});


client.login(secrets.botKey);