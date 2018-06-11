const db = require('./db/queries');
const json = require("jsonreq");
const util = require('util');

const fixBrokenImage = async () => {
        const count = await db.countBrokenCovers();
        if (count > 0) {
            const track = await db.getTrackWithBrokenCover();
            const result = await util.promisify(json.get.bind(json))("https://itunes.apple.com/lookup?id=" + track.id + "&entity=song");
            if (result.results.length > 0) {
                const artwork = result.results[0].artworkUrl100;
                track.image = artwork;
            }
            track.new_cover = true;
            await db.saveTrack(track.id, track);
        }
        console.log(`${count} to go.`);
};

const loop = () => {
    fixBrokenImage()
    .then(() => {
        loop();
    })
    .catch(err => {
        console.log(err);
        loop()
    })

}

loop()
