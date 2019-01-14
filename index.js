const Discord = require('discord.js');
const client = new Discord.Client();
const secrets = require('./secrets')
const quotes = require('./quotes.json')
let xpLevels = require('./xp.json')
const fs = require('fs')
const levelIntervals = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,192000,225000,265000,305000,355000]

const bunnyId = 193729505284718592
let advantage = 0

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('D&D 5th Edition')
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
        // Get rid of the dollar
        content = content.substr(1)
        if (content === 'banish'){
            msg.channel.send('Identifying normies...')
            const latestAcceptableMessage = +new Date()-1000*3600*24*30
            let activeUsers = []
            let activeUserNames = []
            try {
                // Get messages
                // Fetch guild members
                let allMessages = []
                let messageSize = 100
                let firstIteration = true
                let messagesArray, latestMessageId
                let latestMessageTime = null
                while(messageSize === 100 && (latestMessageTime > latestAcceptableMessage || latestMessageTime === null)){
                    let messages;
                    if (firstIteration) {
                        messages = await msg.channel.fetchMessages({limit : 100})
                        firstIteration = false
                    } else {
                        messages = await msg.channel.fetchMessages({limit: 100, before: latestMessageId})
                    }
                    messagesArray = Array.from(messages.values())
                    latestMessageId = messagesArray[messagesArray.length-1].id
                    messagesArray.forEach((message) => {
                        if (getTimestampFromId(message.id) < latestAcceptableMessage){
                            return false
                        }
                        if (!activeUsers.includes(message.author.id)){
                            activeUsers.push(message.author.id)
                            activeUserNames.push(message.author.username)
                        }
                        allMessages.push(message)
                    })
                    messageSize = messages.size
                    console.log(messageSize)
                    latestMessageTime = getTimestampFromId(latestMessageId)
                }
                console.log(activeUserNames)
                } catch (e) {
                    console.log("Error "+e)
                }
                msg.channel.guild.fetchMembers()
                .then((members) => {
                    const memberArray = Array.from(members.members.values())
                    let inactiveUser = []
                    let membersToBeKicked = []
                    let deletedUsersString = ''
                    memberArray.forEach((member) => {
                        if (!member.user.bot) {
                            if (!activeUsers.includes(member.user.id)){
                                membersToBeKicked.push(member)
                                deletedUsersString += ` ${member.user.username} |`
                            }
                        }
                    })
                    deletedUsersString = deletedUsersString ? deletedUsersString : 'No inactive users found'
                    msg.channel.send({embed: {
                        color: 16711680,
                        description: 'Type "!yes" to confirm or "!no" to deny. This option will expire in 30 seconds',
                        author: { 
                            name: `YOU ARE ABOUT TO REMOVE USERS FROM THE CHANNEL`
                        },
                        fields: [
                            {
                                name: 'These users have not posted in the last month and will be removed',
                                value: deletedUsersString
                            }
                        ],
                    }})
                    const responseCollector = msg.channel.createMessageCollector(m => m.author.id === msg.author.id, {time: 30000})
                    responseCollector.on('collect', message => {
                        if (message.content === '!yes'){
                            // Kick users
                            membersToBeKicked.forEach((member) => {
                                member.kick('You were kicked for inactivity, sorry!')
                            })
                            msg.channel.send({embed: {
                                color: 16711680,
                                image: {
                                    url: "https://media.giphy.com/media/bYl15kiZMNZUA/200.gif"
                                },
                                author: {
                                    name: `It is done...`
                                },
                            }})
                        }
                        if (message.content === '!no'){
                            responseCollector.stop();
                        }
                    })
                })
                .catch(console.error)
        }
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