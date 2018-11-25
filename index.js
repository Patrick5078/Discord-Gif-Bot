const Discord = require('discord.js');
const client = new Discord.Client();
const secrets = require('./secrets')
const quotes = require('./quotes.json')

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('Recursive self-improvement')
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

const pickRandom = (array) => {
    return array[Math.floor(Math.random()*array.length)]
}

const getTimestampFromId = id => {
        return Math.round((id / 4194304) + 1420070400000);
} 

client.on('message', async msg => {
    let content = msg.content.toLowerCase()
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
    return
});


client.login(secrets.botKey);