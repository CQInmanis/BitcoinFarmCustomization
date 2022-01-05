/*
    BFC MOD
    Please leave this file AS IS!
*/
function main(sessionID, random_restock_time) { //added random_restock_time to be accessed from trader.js
    if (!account_f.handler.isWiped(sessionID)) {
        updateTraders(sessionID, random_restock_time); //added random_restock_time to be accessed from trader.js
        updatePlayerHideout(sessionID);
    }
}

function updateTraders(sessionID, restock) { 
    let update_per = global._database.gameplayConfig.trading.RefreshInterval.customTraderRefresh;
    let timeNow = Math.floor(Date.now() / 1000);
    let tradersToUpdateList = trader_f.handler.getAllTraders(sessionID);

    dialogue_f.handler.removeExpiredItems(sessionID);

    for (let i = 0; i < tradersToUpdateList.length; i++) {
        if ((tradersToUpdateList[i].supply_next_time + update_per) > timeNow) {
            continue; 
        }

        // update restock timer
        let substracted_time = timeNow - tradersToUpdateList[i].supply_next_time;
        let days_passed = Math.floor((substracted_time) / 86400);
        let time_co_compensate = days_passed * 86400;
        let newTraderTime = tradersToUpdateList[i].supply_next_time + time_co_compensate;
        let compensateUpdate_per = Math.floor((timeNow - newTraderTime) / update_per);

        compensateUpdate_per = compensateUpdate_per * update_per;
        newTraderTime = newTraderTime + compensateUpdate_per + update_per;
        tradersToUpdateList[i].supply_next_time = newTraderTime;
    }
}

//

function updatePlayerHideout(sessionID) {
    let pmcData = profile_f.handler.getPmcProfile(sessionID);
    let recipes = fileIO.readParsed(db.user.cache.hideout_production);
    let solarPowerLevel = 0;
    let btcFarmCGs = 0;
    let isGeneratorOn;

    for (let area of pmcData.Hideout.Areas) {
        if (area.type == 18) {
            solarPowerLevel = area.level
        }
    }
    for (let area in pmcData.Hideout.Areas) {
        switch (pmcData.Hideout.Areas[area].type) {
            case 4:
                isGeneratorOn = pmcData.Hideout.Areas[area].active;
                if (isGeneratorOn == true) {
                    pmcData.Hideout.Areas[area] = updateFuel(pmcData.Hideout.Areas[area], solarPowerLevel); //i know solapower is always false but let me find a workaround later
                }
                break;
            case 6:
                if (isGeneratorOn) {
                    pmcData.Hideout.Areas[area] = updateWaterFilters(pmcData.Hideout.Areas[area])
                }
                break;
            case 17:
                if (isGeneratorOn) {
                    pmcData.Hideout.Areas[area] = updateAirFilters(pmcData.Hideout.Areas[area])
                }
                break;

            case 20:
                for (let slot of pmcData.Hideout.Areas[area].slots) {
                    if (slot.item != null) {
                        btcFarmCGs++;
                    }
                }
                break;
        }
    }

    // update production time
    for (let prod in pmcData.Hideout.Production) {
        if (pmcData.Hideout.Production[prod].inProgress == false) {
            continue;
        }

        let needGenerator = false;

        if (prod == "5d78d563c3024e58357e0f84" || prod == "5d8381ecade7391cc1066d5e" || prod == "5d83822aade7391cc1066d61" || prod == "5dd129295a9ae32efe41a367" || prod == "5e074e5e2108b14e1c62f2a7") {

            let time_elapsed = (Math.floor(Date.now() / 1000) - pmcData.Hideout.Production[prod].StartTime) - pmcData.Hideout.Production[prod].Progress;
            pmcData.Hideout.Production[prod].Progress += time_elapsed;
        }
        for (let recipe of recipes.data) {
            if (recipe._id == pmcData.Hideout.Production[prod].RecipeId) {
                if (recipe.continuous == true) {
                    needGenerator = true;
                }

                if (pmcData.Hideout.Production[prod].RecipeId == "5d5c205bd582a50d042a3c0e") //if its btcFarm
                {
                    pmcData.Hideout.Production[prod] = updateBitcoinFarm(pmcData.Hideout.Production[prod], recipe, btcFarmCGs, isGeneratorOn, pmcData);
                } else {
                    let time_elapsed = (Math.floor(Date.now() / 1000) - pmcData.Hideout.Production[prod].StartTime) - pmcData.Hideout.Production[prod].Progress;
                    if (needGenerator == true && isGeneratorOn == false) {
                        time_elapsed = time_elapsed * 0.2;
                    }
                    pmcData.Hideout.Production[prod].Progress += time_elapsed;
                    /*
                    if(pmcData.Hideout.Production[prod].Progress > recipe.productionTime)
                    {
                        pmcData.Hideout.Production[prod].inProgress = false;
                    }*/
                }
                break;
            }
        }
    }

}
function updateWaterFilters(waterFilterArea) {
    // thanks to Alexter161
    let decreaseValue = 0.2;

    for (let i = 0; i < waterFilterArea.slots.length; i++) {
        if (waterFilterArea.slots[i].item == null || waterFilterArea.slots[i].item === undefined) {
            continue;
        } else {
            let resourceValue = (waterFilterArea.slots[i].item[0].upd && waterFilterArea.slots[i].item[0].upd.Resource)
                ? waterFilterArea.slots[i].item[0].upd.Resource.Value
                : null;
            if (resourceValue == null) {
                resourceValue = 100 - decreaseValue;
            } else {
                resourceValue -= decreaseValue
            }
            resourceValue = Math.round(resourceValue * 10000) / 10000;

            if (resourceValue > 0) {
                waterFilterArea.slots[i].item[0].upd = {
                    "StackObjectsCount": 1,
                    "Resource": {
                        "Value": resourceValue
                    }
                };
                logger.logInfo("Water filter: " + resourceValue + " filter time left on tank slot " + (i + 1));
            } else {
                waterFilterArea.slots[i].item[0] = null;
            }
            break;
        }
    }
    return waterFilterArea;
}
function updateFuel(generatorArea, solarPower) {
    let noFuelAtAll = true;
    let decreaseFuel = 0.0665;

    if (solarPower == 1) {
        decreaseFuel = 0.0332;
    }

    for (let i = 0; i < generatorArea.slots.length; i++) {
        if (generatorArea.slots[i].item == null || generatorArea.slots[i].item === undefined) {
            continue;
        } else {
            let resourceValue = ((generatorArea.slots[i].item[0].upd != null && (typeof generatorArea.slots[i].item[0].upd.Resource !== "undefined")) ? generatorArea.slots[i].item[0].upd.Resource.Value : null);
            if (resourceValue == null) {
                resourceValue = 100 - decreaseFuel;
            } else {
                resourceValue -= decreaseFuel
            }
            resourceValue = Math.round(resourceValue * 10000) / 10000;

            if (resourceValue > 0) {
                generatorArea.slots[i].item[0].upd = {
                    "StackObjectsCount": 1,
                    "Resource": {
                        "Value": resourceValue
                    }
                };
                logger.logInfo("Generator: " + resourceValue + " fuel left on tank slot " + (i + 1))
                noFuelAtAll = false
                break; //break here to avoid update all the fuel tanks and only update if fuel Ressource > 0
            } else //if fuel is empty, remove it
            {
                generatorArea.slots[i].item[0].upd = {
                    "StackObjectsCount": 1,
                    "Resource": {
                        "Value": 0
                    }
                };
            }

        }
    }
    if (noFuelAtAll == true) {
        generatorArea.active = false;
    }

    return generatorArea;
}

function updateAirFilters(airFilterArea) {
    let decreaseValue = 0.00417;

    for (let i = 0; i < airFilterArea.slots.length; i++) {
        if (airFilterArea.slots[i].item == null || airFilterArea.slots[i].item === undefined) {
            continue;
        } else {
            let resourceValue = ((airFilterArea.slots[i].item[0].upd != null && (typeof airFilterArea.slots[i].item[0].upd.Resource !== "undefined")) ? airFilterArea.slots[i].item[0].upd.Resource.Value : null);
            if (resourceValue == null) {
                resourceValue = 300 - decreaseValue;
            } else {
                resourceValue -= decreaseValue
            }
            resourceValue = Math.round(resourceValue * 10000) / 10000;

            if (resourceValue > 0) {
                airFilterArea.slots[i].item[0].upd = {
                    "StackObjectsCount": 1,
                    "Resource": {
                        "Value": resourceValue
                    }
                };
                logger.logInfo("Air filter: " + resourceValue + " filter time left on tank slot " + (i + 1));
            } else {
                airFilterArea.slots[i].item[0] = null;
            }
            break;
        }
    }
    return airFilterArea;
}

function updateBitcoinFarm(btcProd, farmrecipe, btcFarmCGs, isGeneratorOn, pmcData) {
    //Modified function for keepalive.js by CQInmanis
    //original code by Altered Escape Team.
    let MAX_BTC = fileIO.readParsed(db.user.cache.hideout_production).data.find(prodArea => prodArea.areaType == 20);
	MAX_BTC = MAX_BTC.productionLimitCount;
	
    for (let k in pmcData.Skills.Common) {
        if (pmcData.Skills.Common[k].Id === "HideoutManagement") {
            if (pmcData.Skills.Common[k].Progress == 5100) {
				MAX_BTC = MAX_BTC + 2; //elite hideout management
            }
        }
    }

    let production = fileIO.readParsed(db.user.cache.hideout_production).data.find(prodArea => prodArea.areaType == 20);
    let time_elapsed = (Math.floor(Date.now() / 1000)) - btcProd.StartTime;

    if (isGeneratorOn == true) {
        btcProd.Progress += time_elapsed;
    }

    let t2 = Math.pow((0.05 + (btcFarmCGs - 1) / 49 * 0.15), -1); 
    let final_prodtime = Math.floor(t2 * (production.productionTime / 20));

    while (btcProd.Progress > final_prodtime) {
        if (btcProd.Products.length < MAX_BTC) {
            btcProd.Products.push({
                "_id": utility.generateNewItemId(),
                "_tpl": "59faff1d86f7746c51718c9c",
                "upd": {
                    "StackObjectsCount": 1
                }
            });
            btcProd.Progress -= final_prodtime;
            logger.logSuccess("[BFC MOD] Bitcoin produced on server.");
        } else {
            btcProd.Progress = 0;
        }
    }

    btcProd.StartTime = (Math.floor(Date.now() / 1000));
    return btcProd;
}

module.exports.updateBitcoinFarm = updateBitcoinFarm;
module.exports.main = main;