const fs = require('fs')
const request = require('request');
const path = require('path')
const uuid = require('uuid/v1')

const sqlite3 = require("sqlite3").verbose()
const db = new sqlite3.Database('../gifdb.db')

db.all("SELECT gif_id, url FROM gifs", [] , (err, results) => {
    if (err) {
        return console.log(err)
    }
    results.forEach((row) => {
        const filename = `${uuid()}.gif`
        request.head(row.url, function(err, res, body){
            try {

                request(row.url).pipe(fs.createWriteStream(filename)).on('close', () => {
                    fs.rename(filename, path.join(__dirname, '/../gifs', filename), (err) => {
                        if (err){
                            console.log('error downloading image' , err)  
                        }
                        console.log("downloaded image")
                        db.run('UPDATE gifs SET filename = ? WHERE gif_id = ?', [filename, row.gif_id], (err, results) => {
                            if (err) {
                                console.log("error updating gif table" , err)
                            }
                            console.log('Gif table updated')
                        })
                    })
                })
            } catch (e) {
                console.log("ERROR OCCURED ", e)
            }
        })
    })
})

