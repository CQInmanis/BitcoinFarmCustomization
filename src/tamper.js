exports.mod = () => {
    const config = require("../config.js");
    let shortName = config.shortName;
    //CQ BTC farm fix
    if(config.BTCModsEnabled === true){
        let fs = require('fs');
        //keepalive.js patching
        fs.readFile('src/classes/keepalive.js', function(err, data) {
            if(err){
                logger.logError(""+shortName+" Could not read file: "+err);
                return;
            }
            if(data.includes('module.exports.updateBitcoinFarm = updateBitcoinFarm;')){
                logger.logSuccess(""+shortName+" Exports found, skipping keepalive.js patch.");
                //actual relevant changes
                keepalive_f.updateBitcoinFarm = require("./btcChanges").updateBitcoinFarm;
                keepalive_f.main = require("./btcChanges").main;

                logger.logSuccess(""+shortName+" Bitcoin Farm Customization Mod applied correctly."); //had to be redundant or Node.js would just do shit asynchronously
            }else{
                fs.appendFile('src/classes/keepalive.js', '\nmodule.exports.updateBitcoinFarm = updateBitcoinFarm;', function (err2){
                    if (err2){
                        logger.logError(""+shortName+" Error patching keepalive.js: "+err2);
                        return;
                    }else{
                        logger.logSuccess(""+shortName+" Exports not found, KeepAlive.js patched.");
                        //actual relevant changes
                        keepalive_f.updateBitcoinFarm = require("./btcChanges").updateBitcoinFarm;
                        keepalive_f.main = require("./btcChanges").main;
                        
                        logger.logSuccess(""+shortName+" Bitcoin Farm Customization Mod applied correctly."); //had to be redundant or Node.js would just do shit asynchronously
                    }
                });
            }
            return;
        });
    }
}