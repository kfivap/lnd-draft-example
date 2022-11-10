const { exec } = require("child_process");

exports.Utils = class Utils {

    async generateBtcBlock(quantity = 1) {
        if (!this._produceBlocks) {
            return
        }
        await new Promise((resolve, reject) => {
            exec(`docker exec  btcd /start-btcctl.sh generate ${quantity}`, (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    reject(error)
                    return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    reject(stderr)
                    return;
                }
                // console.log(`stdout: ${stdout}`);
                console.log('generatedBlock', JSON.parse(stdout))
                resolve(stdout)
            });
        })
    }

    setProduceBlocks(bool) {
        this._produceBlocks = bool;
    }

    static async delay(ms) {
        return new Promise(r => setTimeout(r, ms))
    }

    static async timerWithCountDown(seconds, everyX) {
        console.log(`${new Date()} start timer for ${seconds}`)
        let secondsLeft = seconds
        let interval
        await new Promise((resolve) => {
            interval = setInterval(() => {
                if (secondsLeft % everyX === 0) {
                    console.log(`${new Date()} timer left ${secondsLeft}`)
                }
                if (secondsLeft-- === 0) {
                    resolve()
                }
            }, 1000)
        })
        clearInterval(interval)
    }
}
