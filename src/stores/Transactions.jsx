// Libraries
import {observable, computed} from "mobx";

// Utils
import * as blockchain from "../utils/blockchain";
import {etherscanTx, methodSig} from "../utils/helpers";

// Settings
import * as settings from "../settings";

export default class TransactionsStore {
  @observable latestBlock = 0;
  @observable amountCheck = 0;
  @observable registry = {};
  @observable loading = {};
  cdpCreationTx = false;
  @observable standardGasPrice = -1;
  @observable priceModal = { open: false, title: null, func: null, params: null, options: {}, callbacks: null };

  constructor(rootStore) {
    this.rootStore = rootStore;
  }

  @computed get showCreatingCdpModal() {
    const txs = Object.keys(this.registry).filter(tx => this.registry[tx].cdpCreationTx);
    return txs.length > 0;
  }

  reset = () => {
    this.latestBlock = 0;
    this.amountCheck = 0;
    this.registry = {};
    this.loading = {};
    this.cdpCreationTx = false;
    this.standardGasPrice = -1;
    this.priceModal = { open: false, title: null, func: null, params: null, options: {}, callbacks: null };
  }

  setLatestBlock = (block, flexible = false) => {
    if (block >= this.latestBlock) {
      this.amountCheck = 0;
      console.log(`Latest Block: ${block}`);
      this.latestBlock = block;
      return true;
    } else if (flexible && block + 5 >= this.latestBlock) {
      return true;
    }
    return false;
  }

  addAmountCheck = () => {
    this.amountCheck++;
  }

  setStandardGasPrice = async () => {
    //this.standardGasPrice = (await blockchain.getGasPrice()).div(10**9).ceil().toNumber();
    return 0 ;
  }

  checkPendingTransactions = () => {
    Object.keys(this.registry).map(tx => {
      if (this.registry[tx].pending) {
        blockchain.getTransactionReceipt(tx).then(r => {
          console.log("got ret", r["ret"], r.ret)
          if (r.ret != null) {
            if (r.ret[0].contractRet == "SUCCESS") {
              console.log("SUCCESS!!!", r);
              this.logTransactionConfirmed(r);
            } else {
              this.logTransactionFailed(tx);
            }
          }
        })
      }
      return false;
    });
  }

  cleanCdpCreationProperty = tx => {
    const registry = {...this.registry};
    registry[tx].cdpCreationTx = false;
    this.registry = registry;
  }

  logRequestTransaction = (id, title, cdpCreationTx) => {
    this.cdpCreationTx = cdpCreationTx;
    const msgTemp = "Waiting for transaction signature...";
    this.notificator.info(id, title, msgTemp, false);
  }

  closePriceModal = () => {
    this.lookForCleanCallBack(this.priceModal.callbacks);
    this.priceModal = { open: false, title: null, func: null, params: null, options: {}, callbacks: null };
  }

  sendTransaction = (title, func, params, options, callbacks) => {
    const cdpCreationTx = params[0] === blockchain.objects.proxyRegistry.address // This means it is calling to the createLockAndDraw
                        ||   (typeof params[1] === "string" &&  params[1].indexOf(methodSig("lockAndDraw(address,address,uint256)")) > -1);

    const id = Math.random();

    this.logRequestTransaction(id, title, cdpCreationTx);

    console.log("params ", params, "options", options, "cdpCreationTx", cdpCreationTx);

    options.from = window.tronWeb.defaultAddress.base58;
    const BigNumber = require('bignumber.js');
    let x = new BigNumber(options.callValue);
    //c.then(o => {
      //o.createOpenLockAndDraw(...params, options, (e, tx) => this.log(e, tx, id, title, callbacks));
/*
      func(...params).send({
        //options
        callValue: options.callValue 
      }).then(data => {
           data = ({ ...data, tx: data });        
           console.log("sent Transaction, response" , data);

      })
*/
     func(...params).send({
        //options
        callValue:x  
      }).then((tx) => {

        console.log("got tx", tx )

        this.log(null, tx, id, title, callbacks);

      }).catch((err) => {
        console.log("error", err)
      });

    //})
    //c.createOpenLockAndDraw(...params, options, (e, tx) => this.log(e, tx, id, title, callbacks));
  }

  askPriceAndSend = (title, c, params, options, callbacks) => {
    //if (this.rootStore.network.hw.active) { // If user is using HW, gas price modal will appear
    //  this.priceModal = { open: true, title, func, params, options, callbacks };
    //} else {
      this.sendTransaction(title, c, params, options, callbacks);
    //}
  }

  setPriceAndSend = gasPriceGwei => {
    const {func, params, options, title, callbacks} = {...this.priceModal};
    options.gasPrice = gasPriceGwei * 10 ** 9;
    this.priceModal = { open: false, title: null, func: null, params: null, options: {}, callbacks: null };
    this.sendTransaction(title, func, params, options, callbacks);
  }

  logPendingTransaction = (id, tx, title, callbacks = []) => {
    const msgTemp = "Transaction TX was created. Waiting for confirmation...";
    const registry = {...this.registry};
    registry[tx] = {pending: true, title, callbacks, cdpCreationTx: this.cdpCreationTx};
    this.registry = registry;
    this.cdpCreationTx = false;
    console.log(msgTemp.replace("TX", tx));
    this.notificator.hideNotification(id);
    if (!this.registry[tx].cdpCreationTx) {
      //etherscanTx(this.rootStore.network.network, msgTemp.replace("TX", `${tx.substring(0,10)}...`), tx);
      this.notificator.info(tx, title, tx, false);
    }
  }

  logTransactionConfirmed = async (object) => {
    let cB = await window.tronWeb.trx.getCurrentBlock();   
    console.log("got confirmation object", object, "latestBlock", cB);
    this.setLatestBlock(cB.block_header.raw_data.number);
    const tx = object.txID;
    const msgTemp = "Transaction TX was confirmed.";
    if (this.registry[tx] && this.registry[tx].pending) {
      const registry = {...this.registry};
      registry[tx].pending = false;
      this.registry = registry;
      console.log(msgTemp.replace("TX", tx), object.blockNumber);
      this.notificator.hideNotification(tx);
      if (!this.registry[tx].cdpCreationTx) {
        this.notificator.success(tx, this.registry[tx].title, etherscanTx(this.rootStore.network.network, msgTemp.replace("TX", `${tx.substring(0,10)}...`), tx), 6000);
      }
      if (typeof this.registry[tx].callbacks !== "undefined" && this.registry[tx].callbacks.length > 0) {
        this.registry[tx].callbacks.forEach(callback => this.executeCallback(callback));
      }
    }
  }

  logTransactionFailed = tx => {
    const msgTemp = "Transaction TX failed.";
    if (this.registry[tx]) {
      const registry = {...this.registry};
      registry[tx].pending = false;
      registry[tx].cdpCreationTx = false;
      this.registry = registry;
      console.log(msgTemp.replace("TX", tx));
      this.notificator.error(tx, this.registry[tx].title, msgTemp.replace("TX", `${tx.substring(0,10)}...`), 5000);
      this.lookForCleanCallBack(this.registry[tx].callbacks);
    }
  }

  logTransactionRejected = (id, title, error, callbacks = []) => {
    this.notificator.error(id, title, error.message, 5000);
    this.lookForCleanCallBack(callbacks);
  }

  log = (e, tx, id, title, callbacks = []) => {
    if (!e) {
      this.logPendingTransaction(id, tx, title, callbacks);
    } else {
      this.logTransactionRejected(id, title, e, callbacks);
    }
  }

  addLoading = (method, param) => {
    const loading = {...this.loading};
    if (typeof loading[method] === "undefined") loading[method] = {};
    loading[method][param] = true;
    this.loading = loading;
  }

  cleanLoading = (method, param) => {
    if (!this.loading.hasOwnProperty(method)) return;
    const loading = {...this.loading};
    loading[method][param] = false;
    this.loading = loading;
  }

  cleanLoadingOnError = (method, param) => this.cleanLoading(method, param);

  lookForCleanCallBack = (callbacks = []) => {
    callbacks &&
    callbacks.forEach(callback => {
      if (callback[0] === "transactions/cleanLoadingOnError") callback[0] = "transactions/cleanLoading";
      if (callback[0] === "transactions/cleanLoading") this.executeCallback(callback);
      if (typeof callback[callback.length - 1] === "object") this.lookForCleanCallBack(callback[callback.length - 1]);
    });
  }

  executeCallbacks = callbacks => {
    callbacks && callbacks.forEach(callback => this.executeCallback(callback));
  }

  executeCallback = args => {
    let method = args.shift();
    // Edge case: Skip executing this here so it's only called after an error (via lookForCleanCallBack)
    if (method === "transactions/cleanLoadingOnError") return;
    // If the callback is to execute a getter function is better to wait as sometimes the new value is not uopdated instantly when the tx is confirmed
    const timeout = ["transactions/cleanLoading", "system/changeAllowance", "system/checkAllowance", "system/lockAndDraw", "system/wipeAndFree", "system/lock", "system/draw", "system/wipe", "system/free", "system/shut", "system/give", "system/migrateCDP", "system/moveLegacyCDP"].indexOf(method) !== -1 ? 0 : 5000;
    setTimeout(() => {
      method = method.split("/");

      console.log("executeCallback", `${method[0]}.${method[1]}`, args);

      if (method[0] === "transactions") {
        this[method[1]](...args);
      } else {
        let object = null;
        switch(method[0]){
          case "system":
            object = this.rootStore.system;
            break;
          case "profile":
            object = this.rootStore.profile;
            break;
          default:
            break;
        }
        object && object[method[1]](...args);

        //console.log("object",object, "method",  method[1], "called", object[method[1]](...args) )
      }
    }, timeout);
  }
}
