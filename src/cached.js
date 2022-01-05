exports.mod = () => {
	//I'm taking some code from JUGADOR123's AIO for the cached part until I figure out a better way to do it.
    const config = require("../config.js");
    let shortName = config.shortName;
    let hprod = fileIO.readParsed(`user/cache/hideout_production.json`);

    //Bitcoin prod timer
    if (config.BitcoinProductionTimeInMinutes != false) {	
        for (let area in hprod.data) {
            if (hprod.data[area]._id === "5d5c205bd582a50d042a3c0e") {
				if(config.BitcoinProductionTimeInMinutes >= 1){
					hprod.data[area].productionTime = config.BitcoinProductionTimeInMinutes * 60;
				} else{
					hprod.data[area].productionTime = 2;
				}
            }
        }
        logger.logSuccess(""+shortName+" Bitcoin production time modified");
    }
	
	//BITCOIN AMOUNT
	if(config.BitcoinAmount != false){
		for (let area in hprod.data) {
            if (hprod.data[area]._id === "5d5c205bd582a50d042a3c0e") {
				if(config.BitcoinAmount >= 2){
					hprod.data[area].productionLimitCount = config.BitcoinAmount;
				}
            }
        }
        logger.logSuccess(""+shortName+" Maximum bitcoins produced modified.");
	}

    fileIO.write(`user/cache/hideout_production.json`, hprod);
}