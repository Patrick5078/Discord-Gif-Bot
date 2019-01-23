const fs = require('fs')
const request = require('request');
const path = require('path')
const uuid = require('uuid/v1')

const imageDownloader = function(uri){
const filename = `${uuid()}.gif`
return new Promise((resolve,reject) => {
        request.head(uri, function(err, res, body){
            const imagetype = res.headers['content-type'].split('/')[1]
            console.log(imagetype)
            if (imagetype !== 'gif' && imagetype !== "webp") {
                return reject("ERROR: Not a valid gif")
            }
            request(uri).pipe(fs.createWriteStream(filename)).on('close', () => {
                fs.rename(filename, path.join(__dirname, '/../gifs', filename), (err) => {
                    if (err){
                        console.log(err)
                        return reject("Error saving gif")
                    }
                    return resolve(filename)
                })
            });
        });
    })
};

module.exports = imageDownloader