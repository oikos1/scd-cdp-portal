// Libraries
import {computed, observable} from "mobx";

// Utils
import * as blockchain from "../utils/blockchain";
import * as daisystem from "../utils/dai-system";
import {truncateAddress} from "../utils/helpers";
import {getWebClientProviderName} from "../utils/blockchain";
import tronWeb, { initTronweb } from 'tronweb';
import {BIGGESTUINT256, fromRaytoWad, toSun, toBigNumber, toWei, wdiv, toBytes32, addressToBytes32, methodSig, isAddress, hexStr2byteArray} from "../utils/helpers";
import web3 from "../utils/web3";

// Settings
import * as settings from "../settings";

const CryptoUtils = require("@tronscan/client/src/utils/crypto");

export default class SystemStore {

  @observable tub = {};
  @observable top = {};
  @observable tap = {};
  @observable vox = {};
  @observable pit = {};
  @observable gem = {};
  @observable gov = {};
  @observable skr = {};
  @observable dai = {};
  @observable sin = {};
  @observable pip = {};
  @observable pep = {};
  filtersReceived = {};

  constructor(rootStore) {
    this.rootStore = rootStore;
    this.reset();
  }

  @computed get showLegacyAlert() {
    return !Object.keys(this.tub.legacyCups).every(elem => Object.keys(this.tub.cups).indexOf(elem) > -1);
  }

  reset = () => {
    this.tub = {
      address: null,
      authority: null,
      eek: "undefined",
      safe: "undefined",
      off: -1,
      out: -1,
      axe: toBigNumber(-1),
      mat: toBigNumber(-1),
      cap: toBigNumber(-1),
      fit: toBigNumber(-1),
      tax: toBigNumber(-1),
      fee: toBigNumber(-1),
      chi: toBigNumber(-1),
      rhi: toBigNumber(-1),
      rho: toBigNumber(-1),
      gap: toBigNumber(-1),
      tag: toBigNumber(-1),
      per: toBigNumber(-1),
      avail_boom_skr: toBigNumber(-1),
      avail_boom_dai: toBigNumber(-1),
      avail_bust_skr: toBigNumber(-1),
      avail_bust_dai: toBigNumber(-1),
      cups: {},
      cupId: null,
      cupsLoading: true,
      cupsCount: 0,
      cupsPage: 1,
      legacyCups: {}
    };
    this.top = {
      address: null,
    };
    this.tap = {
      address: null,
      fix: toBigNumber(-1),
      gap: toBigNumber(-1),
    };
    this.vox = {
      address: null,
      era: toBigNumber(-1),
      tau: toBigNumber(-1),
      par: toBigNumber(-1),
      way: toBigNumber(-1),
    };
    this.pit = {
      address: null,
    };
    this.eth = {
      myBalance: toBigNumber(-1),
    };
    this.wtrx = {
      myBalance: toBigNumber(-1),
      proxyBalance: toBigNumber(-1),      
    };      
    this.gem = {
      address: null,
      totalSupply: toBigNumber(-1),
      myBalance: toBigNumber(-1),
      tubBalance: toBigNumber(-1),
      tapBalance: toBigNumber(-1),
    };
    this.gov = {
      address: null,
      totalSupply: toBigNumber(-1),
      myBalance: toBigNumber(-1),
      pitBalance: toBigNumber(-1),
      allowance: toBigNumber(-1),
    };
    this.skr = {
      address: null,
      totalSupply: toBigNumber(-1),
      myBalance: toBigNumber(-1),
      tubBalance: toBigNumber(-1),
      tapBalance: toBigNumber(-1),
    };
    this.dai = {
      address: null,
      totalSupply: toBigNumber(-1),
      myBalance: toBigNumber(-1),
      tapBalance: toBigNumber(-1),
      allowance: toBigNumber(-1),
    };
    this.sin = {
      address: null,
      totalSupply: toBigNumber(-1),
      tubBalance: toBigNumber(-1),
      tapBalance: toBigNumber(-1),
    };
    this.pip = {
      address: null,
      val: toBigNumber(-1),
    };
    this.pep = {
      address: null,
      val: toBigNumber(-1),
    };
    this.saiProxyCreateAndExecute = {
      address:null
    }
    this.setAggregatedValuesMutexLocked = false;
  }

  init = async (top, tub, tap, vox, pit, pip, pep, gem, gov, skr, dai, sin, balance) => {
     
    //if (this.rootStore.network.network && !this.rootStore.network.stopIntervals) {
      let _balance = (balance / (10**6)) * (10**18) ;

      console.log("wallet balance", _balance )

      this.eth = {
        myBalance: _balance,
      }
      this.top.address = top;
      blockchain.loadObject("top", top, "top");

      this.tub.address = tub;
      await blockchain.loadObject("tub", tub, "tub");

      this.tap.address = tap;
      blockchain.loadObject("tap", tap, "tap");
      this.setFiltersTap();

      this.vox.address = vox;
      blockchain.loadObject("vox", vox, "vox");
      this.setFiltersVox();

      this.pit.address = pit;

      this.pip.address = pip;
      blockchain.loadObject("dsvalue", pip, "pip");
      this.setFiltersFeedValue("pip");

      this.pep.address = pep;
      blockchain.loadObject("dsvalue", pep, "pep");
      this.setFiltersFeedValue("pep");

      this.gem.address = gem;
      blockchain.loadObject("dsethtoken", gem, "gem");
      this.setFiltersToken("gem");

      this.gov.address = gov;
      blockchain.loadObject("dstoken", gov, "gov");
      this.setFiltersToken("gov");

      this.skr.address = skr;
      blockchain.loadObject("dstoken", skr, "skr");
      this.setFiltersToken("skr");

      this.dai.address = dai;
      blockchain.loadObject("dstoken", dai, "sai");
      this.setFiltersToken("dai");

      this.sin.address = sin;
      blockchain.loadObject("dstoken", sin, "sin");
      this.setFiltersToken("sin");

      this.saiProxyCreateAndExecute.address = settings.chain["main"].saiProxyCreateAndExecute;
      blockchain.loadObject("saiproxy", this.saiProxyCreateAndExecute.address, "saiProxyCreateAndExecute");

      this.setAggregatedValues([], true);

      this.setMyCupsFromChain(false, [], true);
      this.setMyLegacyCupsFromChain([], true);

      if (typeof blockchain.objects["tub"] !== "undefined")
        this.setFiltersTub();

    //}
  }

  setAggregatedValues = (callbacks = [], firstLoad = false, ignoreMutex = false) => {
    if (callbacks.length === 0 && ignoreMutex === false) {
      if (this.setAggregatedValuesMutexLocked) {
        console.log('Skipping aggregated values lookup (mutex locked)');
        return;
      }
      this.setAggregatedValuesMutexLocked = true;
    }

    console.log("Getting aggregated values...");
    const sValues = [
      ["tub", "axe", true],
      ["tub", "mat", true],
      ["tub", "cap"],
      ["tub", "fit"],
      ["tub", "tax", true],
      ["tub", "fee", true],
      ["tub", "chi", true],
      ["tub", "rhi", true],
      ["tub", "rho"],
      ["tub", "gap"],
      ["tub", "tag", true],
      ["tub", "per", true],
      ["vox", "par", true],
      ["vox", "way", true],
      ["vox", "era"],
      ["tap", "fix", true],
      ["tap", "gap"]
    ];

    const tValues = [
      ["wtrx", "myBalance"],
      ["gem", "totalSupply"],
      ["gem", "myBalance"],
      ["gem", "tubBalance"],
      ["gem", "tapBalance"],
      ["gov", "totalSupply"],
      ["gov", "myBalance"],
      ["gov", "pitBalance"],
      ["gov", "allowance"],
      ["skr", "totalSupply"],
      ["skr", "myBalance"],
      ["skr", "tubBalance"],
      ["skr", "tapBalance"],
      ["dai", "totalSupply"],
      ["dai", "myBalance"],
      ["dai", "tapBalance"],
      ["dai", "allowance"],
      ["sin", "totalSupply"],
      ["sin", "tubBalance"],
      ["sin", "tapBalance"],
    ];

  //careful this.rootStore.profile.proxy
      /*daisystem.getAggregatedValues(tronWeb.address.toHex(this.rootStore.network.defaultAccount), settings.chain["main"].saiValuesAggregator  ).then(r => {
      // console.log("Got aggregateValues() result:", r);
      const block = r[0].toNumber();
      if (this.rootStore.transactions.setLatestBlock(block, firstLoad)) {
        // Set pip and pep
        this.pip.val = toBigNumber(r[2] ? parseInt(r[1], 16) : -1);
        this.pep.val = toBigNumber(r[4] ? parseInt(r[3], 16) : -1);
        // Set off, out, eek and safe
        this.tub.off = r[5][0];
        this.tub.out = r[5][1];
        this.tub.eek = r[5][2];
        this.tub.safe = r[5][3];
        // Set system values
        for (const [index, val] of sValues.entries()) {
          this[val[0]][val[1]] = (val[2] || false) ? fromRaytoWad(r[6][index]) : r[6][index];
        }
        // Set token values
        for (const [index, val] of tValues.entries()) {
          // Immediately detect updated allowance change
          if (val[1] === 'allowance' && this.rootStore.transactions.loading.hasOwnProperty("changeAllowance") && !this[val[0]][val[1]].eq(r[7][index])) {
            console.log('Detected allowance change for:', val[0]);
            setTimeout(() => this.rootStore.transactions.cleanLoading("changeAllowance", val[0]), 100);
          }
          this[val[0]][val[1]] = r[7][index];
        }

        // Unlock mutex
        if (callbacks.length === 0) this.setAggregatedValuesMutexLocked = false;
        // Execute possible callbacks
        else this.rootStore.transactions.executeCallbacks(callbacks);

      } else {
        console.log(`Ignoring returned values (latest block #${this.rootStore.transactions.latestBlock}, response block #${block}). Trying again...`);
        setTimeout(() => this.setAggregatedValues(callbacks, firstLoad, true), 1000);
      }
    });*/
    try {

       //blockchain.objects["gem"].balanceOf(settings.chain["main"].proxy).call().then((res) =>{
       //    this.wtrx.proxyBalance = res.toString();
       //})

      daisystem.getAggregatedValues(  this.rootStore.network.defaultAccount   , settings.chain["main"].saiValuesAggregator  ).then(r => {
        const block = r.blockNumber.toNumber();


         console.log("got block ", block);

        this.pip.val = toBigNumber(r.pipVal); //toBigNumber(r[2] ? parseInt(r[1], 16) : -1);
        this.pep.val = toBigNumber(r.pepVal); //toBigNumber(r[4] ? parseInt(r[3], 16) : -1);

        this.tub.off = r.sStatus[0];
        this.tub.out = r.sStatus[1];
        this.tub.eek = r.sStatus[2];
        this.tub.safe = r.sStatus[3];
        // Set system values
        console.log(r.sValues.entries())
        for (const [index, val] of sValues.entries()) {
          this[val[0]][val[1]] = (val[2] || false) ? fromRaytoWad(r.sValues[index]) : r.sValues[index];
        }

        // Set token values
        for (const [index, val] of tValues.entries()) {
          // Immediately detect updated allowance change
          if (val[1] === 'allowance' && this.rootStore.transactions.loading.hasOwnProperty("changeAllowance") && !this[val[0]][val[1]].eq(r.tValues[index])) {
            console.log('Detected allowance change for:', val[0]);
            setTimeout(() => this.rootStore.transactions.cleanLoading("changeAllowance", val[0]), 100);
          }
          console.log("setting", "this[", val[0], "][", val[1], "=", r.tValues[index])
          this[val[0]][val[1]] = r.tValues[index];
        }

        console.log("callbacks ", callbacks);
        // Unlock mutex
        if (callbacks.length === 0) this.setAggregatedValuesMutexLocked = false;
        // Execute possible callbacks
        else this.rootStore.transactions.executeCallbacks(callbacks);

      });      
    } catch (err) {
      console.log("got err", err);
    }

  }

  getCup = (id, firstLoad = false) => {
    console.log('getCup')
    return new Promise((resolve, reject) => {
      daisystem.getCup(id).then(cup => {
        //console.log("Got cup:", cup);
        if (this.rootStore.transactions.setLatestBlock(cup.block, firstLoad)) {
          resolve(cup);
        } else {
          console.log(`Error loading cup (latest block ${this.rootStore.transactions.latestBlock}, request one: ${cup.block}}, trying again...`);
          setTimeout(() => {
            resolve(this.getCup(id, firstLoad));
          }, 1000);
        }
      }, e => reject(e));
    });
  }

  getCupsFromChain = (lad, fromBlock, promisesCups = [], firstLoad = false) => {
      console.log('getCupsFromChain', blockchain.getProviderUseLogs() )

    if (!blockchain.getProviderUseLogs()) return promisesCups;
    return new Promise((resolve, reject) => {
      const promisesLogs = [];
      promisesLogs.push(
        new Promise((resolve, reject) => {
          blockchain.objects.tub.LogNewCup({lad}, {fromBlock}).get((e, r) => {
            if (!e) {
              for (let i = 0; i < r.length; i++) {
                promisesCups.push(this.getCup(parseInt(r[i].args.cup, 16), firstLoad));
              }
              resolve(true);
            } else {
              reject(e);
            }
          });
        })
      );
      promisesLogs.push(
        new Promise((resolve, reject) => {
          blockchain.objects.tub.LogNote({sig: methodSig("give(bytes32,address)"), bar: toBytes32(lad)}, {fromBlock}).get((e, r) => {
            if (!e) {
              for (let i = 0; i < r.length; i++) {
                promisesCups.push(this.getCup(parseInt(r[i].args.foo, 16), firstLoad));
              }
              resolve(true);
            } else {
              reject(e);
            }
          });
        })
      );
      Promise.all(promisesLogs).then(() => resolve(promisesCups), e => reject(e));
    });
  }

  setCups = async (type, keepTrying = false, callbacks = [], firstLoad = false) => {
    console.log('setCups type', type, "firstLoad", firstLoad)
    const lad = type === "new" ? this.rootStore.profile.proxy : this.rootStore.network.defaultAccount;
    let promisesCups = [];
    //careful let fromBlock = settings.chain[this.rootStore.network.network].fromBlock;
    let fromBlock = settings.chain['main'].fromBlock;

    try {
      //careful replaced 'this.rootStore.network.network' with 'main'    
      const serviceData = settings.chain['main'].service ? await daisystem.getCupsFromService('main', lad) : [];
      console.log("serviceData" , serviceData)
      serviceData.forEach(v => {
        promisesCups.push( this.getCup(v.id, firstLoad) );
        fromBlock = v.block > fromBlock ? v.block + 1 : fromBlock;
      });
    }
    catch(e) {
      console.error("Error in setCups():", e);
    }
    finally {
      console.log("callng getCupsFromChain", promisesCups);

      promisesCups = await this.getCupsFromChain(lad, fromBlock, promisesCups, firstLoad);

      console.log("got promises cups", promisesCups)

      if (type === "legacy" || this.tub.cupsLoading) {

        Promise.all(promisesCups).then(cups => {

          console.log("got CUPS", cups);

          const cupsFiltered = {};

          for (let i = 0; i < cups.length; i++) {
             
             console.log("lad", lad, " cupLad" , cups[i].cupData.lad )

            if (window.tronWeb.defaultAddress.hex === cups[i].cupData.lad || this.rootStore.profile.proxy === cups[i].cupData.lad ) {
                cupsFiltered[cups[i].cupData.id] = cups[i].cupData;
            }

          }
          const keys = Object.keys(cupsFiltered).sort((a, b) => a - b);

          console.log("cupsFiltered", cupsFiltered);

          if (type === "new") {
          
            if (this.tub.cupsLoading) {
                this.tub.cupId = null;
                this.tub.cups = cupsFiltered;

                this.tub.cupsLoading = keepTrying && keys.length === 0;

                if (this.tub.cupsLoading) {
                  // If we know there is a new CDP and it still not available, keep trying & loading
                  setTimeout(() => this.setMyCupsFromChain(true, callbacks), 3000)

                } else if (!this.rootStore.network.stopIntervals && keys.length > 0 && settings.chain["main"].service) {

                  console.log("loadCupHistory")
                  keys.forEach(key => {
                    this.loadCupHistory(key);
                  });
                  this.rootStore.transactions.executeCallbacks(callbacks);
                }
            }
          } else if (type === "legacy") {

            //console.log("setting legacy cups", cupsFiltered[1].ratio)
            this.tub.legacyCups = cupsFiltered;

            //Object.keys(this.tub.legacyCups).map(key =>{
            //  console.log("got id", key, " obj", this.tub.legacyCups[key])
            //})



            this.rootStore.transactions.executeCallbacks(callbacks);
          }
        });
      }
    }
  }

  setMyCupsFromChain = (keepTrying = false, callbacks = [], firstLoad = false) => {
    console.log('setMyCupsFromChain')
    if (this.rootStore.profile.proxy) {
      this.tub.cupsLoading = true;
      this.setCups("new", keepTrying, callbacks, firstLoad);
    } else {
      this.tub.cupsLoading = false;
    }
  }

  setMyLegacyCupsFromChain = (callbacks = [], firstLoad = false) => {
    this.setCups("legacy", false, callbacks, firstLoad);
  }

  moveLegacyCDP = (cupId, callbacks = []) => {
    const cups = {...this.tub.cups};
    cups[cupId] = {...this.tub.legacyCups[cupId]};
    this.tub.cups = cups;
    this.loadCupHistory(cupId);
    this.rootStore.transactions.executeCallbacks(callbacks);
  }

  loadCupHistory = id => {
    let cup = {...this.tub.cups[id]};
    cup.history = "loading";
    this.tub.cups[id] = cup;
    if (settings.chain['main'].service) {
      Promise.resolve(daisystem.getCupHistoryFromService('main', id)).then(history => {
        if (history) {
          let cup = {...this.tub.cups[id]};
          cup.history = history;
          this.tub.cups[id] = cup;
          const notification = daisystem.getBiteNotification(id, history, localStorage.getItem(`CDPLiquidated${history[0].time}Closed`));
          if (notification) {
            this.rootStore.transactions.notificator.notice(Math.random(), "CDP Liquidated", notification, 0, () => localStorage.setItem(`CDPLiquidated${history[0].time}Closed`, true));
          }
        }
      }, () => {
        let cup = {...this.tub.cups[id]};
        cup.history = false;
        this.tub.cups[id] = cup;
      });
    } else {
      cup.history = false;
      this.tub.cups[id] = cup;
    }
  }

  reloadCupData = id => {
    daisystem.getCup(id).then(cup => {
      console.log("Got cup", cup);
      if (this.rootStore.transactions.setLatestBlock(cup.block)) {
        this.tub.cups[id] = {...cup.cupData};
        this.loadCupHistory(id);
      } else {
        console.log(`Error loading cup (latest block ${this.rootStore.transactions.latestBlock}, request one: ${cup.block}, trying again...`);
        setTimeout(() => this.reloadCupData(id), 2000);
      }
    });
  }

  calculateLiquidationPrice = (skr, dai) => {
    console.log("Calc " + daisystem.calculateLiquidationPrice(this.vox.par, this.tub.per, this.tub.mat, skr, dai))
    return daisystem.calculateLiquidationPrice(this.vox.par, this.tub.per, this.tub.mat, skr, dai);
  }

  calculateRatio = (skr, dai) => {
    return daisystem.calculateRatio(this.tub.tag, this.vox.par, skr, dai);
  }

  tab = cup => {
    return daisystem.tab(cup, this.tub.chi);
  }

  rap = cup => {
    return daisystem.rap(cup, this.tub.rhi, this.tub.chi);
  }

  futureRap = (cup, age) => {
    return daisystem.futureRap(cup, age, this.tub.chi, this.tub.rhi, this.tub.tax, this.tub.fee);
  }

  changeCup = cupId => {
    this.tub.cupId = cupId;
  }

  // Blockchain filters
  setFiltersTub = () => {
    //if (!blockchain.getProviderUseLogs()) return;
    const cupSignatures = [
      "lock(bytes32,uint256)",
      "free(bytes32,uint256)",
      "draw(bytes32,uint256)",
      "wipe(bytes32,uint256)",
      "bite(bytes32)",
      "shut(bytes32)",
      "give(bytes32,address)",
    ].map(v => methodSig(v));


    blockchain.objects.tub.LogNote().watch({}, (err, data) => {
      if (!err) {
        if (this.filtersReceived.hasOwnProperty(data["transaction"]) !== true) {

          this.filtersReceived[data["transaction"]] = true;

          let o  = {txID:data["transaction"], blockNumber:data["block"]};

          this.rootStore.transactions.logTransactionConfirmed(o);
          for (var i=0;i<cupSignatures.length;i++) {
            console.log(cupSignatures[i])
          } 
          console.log("cup found ------------------------------------------------------->", data["result"].sig, "bite", cupSignatures[4], "lock", cupSignatures[0],)

          if (cupSignatures.indexOf( "0x"+data["result"].sig ) !== -1 && typeof data["result"].foo !== "undefined" ) {
            //&&typeof this.tub.cups[parseInt(data["result"].foo, 16)] !== "undefined"
            console.log("cup involved -------------------------> ", this.tub.cups[parseInt(data["result"].foo, 16)], "id", data["result"].foo);
            this.reloadCupData(parseInt(data["result"].foo, 16));
            this.setAggregatedValues();
          
          } else {
            
            this.setAggregatedValues();
          }

        }
        console.log("data from event", data);
      }
    });
  }

  setFiltersTap = () => {
    if (!blockchain.getProviderUseLogs()) return;
    blockchain.objects.tap.LogNote({}, {fromBlock: "latest"}, (e, r) => {
      if (!e) {
        if (this.filtersReceived.hasOwnProperty(r.transactionHash) !== true) {
          this.filtersReceived[r.transactionHash] = true;
          this.rootStore.transactions.logTransactionConfirmed(r);
          if (r.args.sig === methodSig("mold(bytes32,uint256)")) {
            this.setAggregatedValues();
          }
        }
      }
    });
  }

  setFiltersVox = () => {
    if (!blockchain.getProviderUseLogs()) return;
    blockchain.objects.vox.LogNote({}, {fromBlock: "latest"}, (e, r) => {
      if (!e) {
        if (this.filtersReceived.hasOwnProperty(r.transactionHash) !== true) {
          this.filtersReceived[r.transactionHash] = true;
          this.rootStore.transactions.logTransactionConfirmed(r);
          if (r.args.sig === methodSig("mold(bytes32,uint256)")) {
            this.setAggregatedValues();
          }
        }
      }
    });
  }

  setFiltersFeedValue = obj => {
    if (!blockchain.getProviderUseLogs()) return;
    blockchain.objects[obj].LogNote({}, {fromBlock: "latest"}, (e, r) => {
      if (!e) {
        if (this.filtersReceived.hasOwnProperty(r.transactionHash) !== true) {
          this.filtersReceived[r.transactionHash] = true;
          if (
            r.args.sig === methodSig("poke(bytes32)") ||
            r.args.sig === methodSig("poke()")
          ) {
            this.setAggregatedValues();
          }
        }
      }
    });
  }

  setFiltersToken = token => {
    if (!blockchain.getProviderUseLogs()) return;
    const filters = ["Transfer", "Approval"];

    if (token === "gem") {
      filters.push("Deposit");
      filters.push("Withdrawal");
    } else {
      filters.push("Mint");
      filters.push("Burn");
    }

    for (let i = 0; i < filters.length; i++) {
      const conditions = {};
      if (blockchain.objects[token][filters[i]]) {
        blockchain.objects[token][filters[i]](conditions, {fromBlock: "latest"}, (e, r) => {
          if (!e) {
            if (this.filtersReceived.hasOwnProperty(r.transactionHash) !== true) {
              this.filtersReceived[r.transactionHash] = true;
              this.rootStore.transactions.logTransactionConfirmed(r);
              this.setAggregatedValues();
            }
          }
        });
      }
    }
  }

  // Blockchain actions
  changeAllowance = (token, value, callbacks = []) => {
    const title = `${value ? "Unlock" : "Lock"}: ${token.replace("gem", "weth").replace("gov", "mkr").replace("skr", "peth").toUpperCase()}`;
    console.log("changing allowance to ", value)
    //value ? -1 : 0
    //if (value > 0)
    //  value = "1000000000000000000000000000000";

    this.rootStore.transactions.askPriceAndSend(title, blockchain.objects[token].approve, [this.rootStore.profile.proxy, toWei(value).toFixed()], {}, callbacks);
  }

  checkAllowance = (token, value, callbacks) => {
        console.log("check allowance of", token)
  
    blockchain.allowance(token, this.rootStore.network.defaultAccount, this.rootStore.profile.proxy).then(r => {

      console.log("got allowance result", r.toString(), "BIGGESTUINT256", BIGGESTUINT256)

      if (r.toString() > 0) {
        this.rootStore.transactions.executeCallbacks(callbacks);
      } else {
        this.changeAllowance(token, value, callbacks);
      }
    }, () => {});
  }

  checkProxyAndSetAllowance = (token, value) => {
    this.rootStore.transactions.addLoading("changeAllowance", token);
    this.rootStore.profile.checkProxy([["system/changeAllowance", token, value, [["system/setAggregatedValues", [["transactions/cleanLoadingOnError", "changeAllowance", token]]]]]]);
  }

  transferToken = (token, to, amount) => {
    const title = `Transfer ${amount} ${token.replace("gov", "mkr").toUpperCase().replace("DAI", "SAI")} to ${truncateAddress(to)}`;
    if (token === "eth") {
      const params = {to, value: toWei(amount)};
      //if (this.shouldSetGasLimit()) {
      //  params.gas = 21000;
      //}
      this.rootStore.transactions.askPriceAndSend(title, blockchain.sendTransaction, [], params, [["system/setAggregatedValues"]]);
    } else if (token === "wtrx" || token === "gem") {
      const params = {value: 0};
      //if (this.shouldSetGasLimit()) {
      //  params.gas = 100000;
      //}
      this.rootStore.transactions.askPriceAndSend(title, blockchain.objects["gem"].transfer, [to, toWei(amount)], params, [["system/setAggregatedValues"]]);
    } else if (token === "sai" || token === "dai") {
      const params = {value: 0};
      //if (this.shouldSetGasLimit()) {
      //  params.gas = 100000;
      //}
      this.rootStore.transactions.askPriceAndSend(title, blockchain.objects["sai"].transfer, [to, toWei(amount)], params, [["system/setAggregatedValues"]]);
    }
  }

  transferWtrx = async (amount) => {
    let token = "gem";
    const title = `Transfer ${amount} ${token.replace("gov", "mkr").toUpperCase().replace("DAI", "SAI")}`;

    const action = `${methodSig(`transfer(address,uint)`)}${addressToBytes32(tronWeb.address.toHex(this.tub.address), false)}${toBytes32(toWei(amount), false)}`;
    let params = {callValue:0}

    this.rootStore.transactions.askPriceAndSend(title, blockchain.objects.proxy.execute, [settings.chain["main"].saiProxyCreateAndExecute, action], params, [[""]]);

  }
  migrateCDP = async (cup, callbacks) => {
    // We double check user has a proxy and owns it (transferring a CDP is a very risky action)
    const proxy =  this.rootStore.profile.proxy;
    //if (proxy && isAddress(proxy) && await blockchain.getProxyOwner(proxy) === this.rootStore.network.defaultAccount) {
      const title = `Migrate CDP ${cup}`;
      //const params = {value: 0};
      //if (this.shouldSetGasLimit()) {
      //  params.gas = 100000;
      //}
      this.rootStore.transactions.askPriceAndSend(title, blockchain.objects.tub.give, [toBytes32(cup), proxy], {}, callbacks);
    //}
  }

  executeProxyTx = (action, value, gasLimit, notificator) => {
    const params = {callValue: value };
    //if (gasLimit) {
    //  params.gas = gasLimit;
    //}
    this.rootStore.transactions.askPriceAndSend(notificator.title, blockchain.objects.proxy.execute, [settings.chain["main"].saiProxyCreateAndExecute, action], params, notificator.callbacks);
  }


  open = () => {
    const title = "Open CDP";
    const action = `${methodSig(`open(address)`)}${addressToBytes32(tronWeb.address.toHex(this.tub.address), false)}`;
    this.executeProxyTx(action, 0, null, {title, callbacks: [["system/setMyCupsFromChain"]]});
  }

  shut = (cupId, useOTC = false) => {
    const title = `Close CDP ${cupId}`;
    const action = `${methodSig(`shut(address,bytes32${useOTC ? ",address" : ""})`)}${addressToBytes32(tronWeb.address.toHex(this.tub.address), false)}${toBytes32(cupId, false)}${useOTC ? addressToBytes32(settings.chain["main"].otc) : ""}`;
    this.executeProxyTx(action, 0, null, {title, callbacks: [["system/setMyCupsFromChain"], ["system/setMyLegacyCupsFromChain"], ["system/setAggregatedValues"]]});
  }

  give = async (cupId, newOwner) => {
    console.log("got new owner", newOwner)
    const title = `Move CDP ${cupId} to ${truncateAddress(newOwner)}`;
    const action = `${methodSig(`give(address,bytes32,address)`)}${addressToBytes32(tronWeb.address.toHex(this.tub.address), false)}${toBytes32(cupId, false)}${addressToBytes32(tronWeb.address.toHex(newOwner), false)}`;
    //const action = [ toBytes32(19, true), tronWeb.address.toHex(newOwner) ];
    //const c = await blockchain.loadObject( "tub", this.tub.address , "SaiTub");
    //this.executeProxyTx( action, 0, this.shouldSetGasLimit() ? 100000 : null, {title, callbacks: [["system/setMyCupsFromChain"]]});
    this.executeProxyTx( action, 0, null, {title, callbacks: [["system/setMyCupsFromChain"]]});

  }

  lockAndDraw = async (cupId, eth, dai) => {
    let action = false;
    let title = "";
    let callbacks = [];
    let gasLimit = null;
    const c = await blockchain.loadObject("saiProxyCreateAndExecute", settings.chain["main"].saiProxyCreateAndExecute);
    const params = {callValue: toSun(eth).toFixed() };

    if (eth.gt(0) || dai.gt(0)) {
       //const options = {callValue: (eth * (10**6)) };

      if (!cupId) {
        callbacks = [
          ["system/setMyCupsFromChain", true], ["system/setAggregatedValues"]
        ];

        if (this.rootStore.profile.proxy) {

          console.log("showing tub address", this.tub.address, "proxy address", this.rootStore.profile.proxy);

          title = `Create CDP + Deposit ${eth.valueOf()} ETH + Generate ${dai.valueOf()} SAI`;
          action = `${methodSig(`lockAndDraw(address,address,uint256)`)}${addressToBytes32(tronWeb.address.toHex(this.tub.address), false)}${addressToBytes32(this.rootStore.profile.proxy, false)}${toBytes32(toWei(dai), false)}`;
        //  gasLimit = 800000;
        } else {
          title = `Create Proxy + Create CDP + Deposit ${eth.valueOf()} TRX + Generate ${dai.valueOf()} SAI`;
          //if (this.shouldSetGasLimit()) {
          //  params.gas = 1500000;
          //}
          this.rootStore.transactions.askPriceAndSend(
                                            title,
                                            blockchain.objects.saiProxyCreateAndExecute.openLockAndDraw,
                                            [this.tub.address,this.rootStore.profile.proxy, toWei(dai).toFixed()],
                                            params,
                                            [["profile/setProxyFromChain", callbacks]]
                                            );
          return;
        }
      } else {
        callbacks = [
          ["system/reloadCupData", cupId], ["system/setAggregatedValues"]
        ];
        if (dai.equals(0)) {
          title = `Deposit ${eth.valueOf()} TRX`;
          action = `${methodSig(`lock(address,bytes32)`)}${ addressToBytes32(tronWeb.address.toHex(this.tub.address), false)  }${toBytes32(cupId, false)}`;
          //gasLimit = 300000;
        } else if (eth.equals(0)) {
          title = `Generate ${dai.valueOf()} SAI`;
          action = `${methodSig(`draw(address,bytes32,uint256)`)}${addressToBytes32(tronWeb.address.toHex(this.tub.address), false)}${toBytes32(cupId, false)}${toBytes32(toWei(dai), false)}`;
          //gasLimit = 300000;
        } else {
          title = `Deposit ${eth.valueOf()} TRX + Generate ${dai.valueOf()} SAI`;
          action = `${methodSig(`lockAndDraw(address,bytes32,uint256)`)}${tronWeb.address.toHex(this.tub.address)}${toBytes32(cupId, false)}${toBytes32(toWei(dai), false)}`;
          //gasLimit = 600000; // This was not checked, not being used in the UI for now
        }
      }

      this.executeProxyTx(action,
                          toSun(eth).toFixed(),
                          //this.shouldSetGasLimit() ? gasLimit : null,
                          null,
                          {
                            title,
                            callbacks
                          });
    }
  }

  wipeAndFree = (cupId, eth, dai, useOTC = false) => {
    console.log("called wipeAndFree with useOTC", useOTC)
    let action = false;
    let title = "";
    let gasLimit = null;
    let val = 0;

    if (eth.gt(0) || dai.gt(0)) {
      if (dai.equals(0)) {
        title = `Withdraw ${eth.valueOf()} TRX`;
        action = `${methodSig(`free(address,bytes32,uint256)`)}${addressToBytes32(tronWeb.address.toHex(this.tub.address), false)}${toBytes32(cupId, false)}${toBytes32(toWei( eth ), false)}`;
        //val = eth;//gasLimit = 400000;
      } else if (eth.equals(0)) {
        title = `Payback ${dai.valueOf()} SAI`;
        action = `${methodSig(`wipe(address,bytes32,uint256${useOTC ? ",address" : ""})`)}${addressToBytes32(tronWeb.address.toHex(this.tub.address), false)}${toBytes32(cupId, false)}${toBytes32(toWei(dai), false)}${useOTC ? addressToBytes32(settings.chain["main"].otc, false) : ""}`;
        //gasLimit = 500000;
      } else {
        title = `Payback ${dai.valueOf()} SAI + Withdraw ${eth.valueOf()} TRX`;
        action = `${methodSig(`wipeAndFree(address,bytes32,uint256,uint256${useOTC ? ",address" : ""})`)}${addressToBytes32(tronWeb.address.toHex(this.tub.address), false)}${toBytes32(cupId, false)}${toBytes32((eth), false)}${toBytes32(toWei(dai), false)}${useOTC ? addressToBytes32(settings.chain[this.rootStore.network.network].otc, false) : ""}`;
        //gasLimit = 700000; // This was not checked, not being used in the UI for now
        val = eth;
      }
      console.log("title", title)
      this.executeProxyTx(action,
                          toWei( val ),
                          null,
                          {
                            title,
                            callbacks:  [
                                          ["system/reloadCupData", cupId], ["system/setAggregatedValues"]
                                        ]
                          });
    }
  }

  executeAction = async params => {
    let value = params.value;
    let callbacks = [];
    let error = false;
    switch (this.rootStore.dialog.method) {
      case "open":
        callbacks = [
                      ["system/open"]
                    ];
        break;
      case "lock":
        callbacks = [
                      ["system/lockAndDraw", this.rootStore.dialog.cupId, value, toBigNumber(0)]
                    ];
        break;
      case "draw":
        callbacks = [
                      ["system/lockAndDraw", this.rootStore.dialog.cupId, toBigNumber(0), value]
                    ];
        break;
      case "wipe":
        callbacks = [
                      ["system/checkAllowance", "sai", value,
                        [
                          ["system/wipeAndFree", this.rootStore.dialog.cupId, toBigNumber(0), value, params.govFeeType === "sai"]
                        ]
                      ]
                    ];
        if (params.govFeeType === "mkr") {
          // If fee will be paid with MKR it is necessary to check its allowance
          callbacks = [
                        ["system/checkAllowance", "gov", value, 
                          callbacks
                        ]
                      ];
        }
        break;
      case "free":
        callbacks = [
                      ["system/wipeAndFree", this.rootStore.dialog.cupId, value, toBigNumber(0), params.govFeeType === "sai" ,
                        [
                            ["system/transferFromProxy", value]
                        ]
                      ]
                    ];
        break;

      case "shut":
        callbacks = [
          ["system/shut", this.rootStore.dialog.cupId, this.tub.cups[this.rootStore.dialog.cupId].art.gt(0) && params.govFeeType === "sai"]
        ];
        console.log("shut called cup id", this.rootStore.dialog.cupId, "cup", this.tub.cups[this.rootStore.dialog.cupId], "hasDebt", this.tub.cups[this.rootStore.dialog.cupId].art.gt(0));

        if (this.tub.cups[this.rootStore.dialog.cupId].art.gt(0)) {
          
          const futureGovDebtSai = this.futureRap(this.tub.cups[this.rootStore.dialog.cupId], 1200);
          const futureGovDebtMKR = wdiv(
                                      futureGovDebtSai,
                                      this.pep.val
                                    ).round(0);
          const valuePlusGovFee = params.govFeeType === "sai" ? this.tab(this.tub.cups[this.rootStore.dialog.cupId])+(futureGovDebtSai*(1.25)) : this.tab(this.tub.cups[this.rootStore.dialog.cupId]); // If fee is paid in DAI we add an extra 25% (spread)
          if (valuePlusGovFee.gt(this.dai.myBalance)) {
            error = "Not enough SAI to close this CDP";
          } else if (params.govFeeType === "mkr" && futureGovDebtMKR.gt(this.gov.myBalance)) {
            error = "Not enough MKR to close this CDP";
          }
          callbacks = [
                        ["system/checkAllowance", "sai", valuePlusGovFee, callbacks]
                      ];
          if (params.govFeeType === "mkr") {
            // If fee will be paid with MKR it is necessary to check its allowance
            callbacks = [
                          ["system/checkAllowance", "gov", futureGovDebtMKR, callbacks]
                        ];
          }
        }
        break;

      case "give":
        if (params.giveHasProxy && params.giveToProxy) {
          const proxy = await blockchain.getProxy(value);
          if (proxy && await blockchain.getProxyOwner(proxy) === value.toLowerCase()) {
            value = proxy;
          } else {
            error = "Invalid proxy address";
          }
        }
        callbacks = [["system/give", this.rootStore.dialog.cupId, value]];
        params.value = tronWeb.address.toHex(params.value).replace("41", "0x");
        //if (!isAddress(params.value) || params.value.slice(0, 2) !== "0x") {
        //  error = "Invalid address";
        //}
        break;
      case "migrate":
        this.rootStore.transactions.addLoading("migrate", this.rootStore.dialog.cupId);
        callbacks = [
                      ["system/migrateCDP", this.rootStore.dialog.cupId, [["system/moveLegacyCDP", this.rootStore.dialog.cupId, [["transactions/cleanLoading", "migrate", this.rootStore.dialog.cupId]]]]]
                    ];
        break;
      default:
        break;
    }

    if (error) {
      this.rootStore.dialog.setError(error);
    } else {
      this.rootStore.dialog.reset();
      this.rootStore.profile.checkProxy(callbacks);
    }
  }
  shouldSetGasLimit() {
    return  this.rootStore.network.hw.active || getWebClientProviderName() === 'imtoken'
  }
}
