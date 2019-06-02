const fs = require('fs')
const request = require('request');
const path = require('path')
const uuid = require('uuid/v1')

const imageDownloader = function(uri){
const filename = `${uuid()}.gif`
return new Promise((resolve,reject) => {
        request.head(uri, function(err, res, body){
            if (err) {
                return reject('Not a valid URL. The correct syntax is "!add {{category}} {{url}}"');
            }
            const imagetype = res.headers['content-type'].split('/')[1]
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