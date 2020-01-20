// Stores
import DialogStore from "./Dialog";
import NetworkStore from "./Network";
import ProfileStore from "./Profile";
import SystemStore from "./System";
import TransactionsStore from "./Transactions";
import ContentStore from "./Content";
import tronWeb, { initTronweb } from 'tronweb';

// Utils
import * as blockchain from "../utils/blockchain";
import * as daisystem from "../utils/dai-system";
import {isAddress, hexStr2byteArray} from "../utils/helpers";

// Settings
import * as settings from "../settings";

const CryptoUtils = require("@tronscan/client/src/utils/crypto");
const SaiValueAggregator_Address = '' ;
const Proxy_Registry_Address     = '';

class RootStore {
  constructor() {
    this.dialog = new DialogStore(this);
    this.network = new NetworkStore(this);
    this.profile = new ProfileStore(this);
    this.system = new SystemStore(this);
    this.transactions = new TransactionsStore(this);
    this.content = new ContentStore(this);
    this.balance = -1;
    this.interval = null;
    this.intervalAggregatedValues = null;
  }

  setVariablesInterval = () => {
    if (!this.interval) {
      this.interval = setInterval(() => {
        console.log("Running variables interval");
        //this.transactions.setStandardGasPrice();
        this.transactions.checkPendingTransactions();
      }, 10000);
    }

    if (!this.intervalAggregatedValues) {
      this.intervalAggregatedValues = setInterval(() => {
        console.log("Running setAggregatedValues interval--> timeout");
        this.system.setAggregatedValues();
      }, 10000);
    }
  }

  normalizeAddress = address => {
    return CryptoUtils.getBase58CheckAddress(hexStr2byteArray( "41" + address.substring(2)));
  }

  getBalance = async (address) => {

    //if(typeof address === 'function') {
    //  callback = address;
    //  address = window.tronWeb.defaultAddress.hex;
    //}

    if(!window.tronWeb.isAddress(address)) {
      console.log('Invalid address provided');
    }

    const rawResponse = await fetch('http://192.168.0.102:9090/wallet/getaccount', {
      method: 'POST',
      url: 'http:///192.168.0.102:9090/wallet/getaccount',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address : address
      })
    });

    const feeHex = await rawResponse.json() ;
    return feeHex;
    //console.log("fe " ,JSON.stringify(feeHex.balance))
    //callback(JSON.stringify(feeHex.balance));

  }

  _loadContracts = () => {
     //console.log('_loadContracts for ' +  settings.chain["main"].proxyRegistry + " - " + this.network.defaultAccount)
     daisystem.getContracts( settings.chain["main"].proxyRegistry, this.network.defaultAccount  ).then(r => {
      //console.log(r.blockNumber);
      if (r && r.blockNumber != undefined && r.saiContracts.length == 12 ) { // && isAddress(r[1][0]) && isAddress(r[1][1])

          const block = r.blockNumber.toNumber();
          console.log("block is : " + block)
          const top = this.normalizeAddress(r.saiContracts[0]);
          const tub = this.normalizeAddress(r.saiContracts[1]);
          const tap = this.normalizeAddress(r.saiContracts[2]);
          const vox = this.normalizeAddress(r.saiContracts[3]);
          const pit = this.normalizeAddress(r.saiContracts[4]);
          const pip = this.normalizeAddress(r.saiContracts[5]); 
          const pep = this.normalizeAddress(r.saiContracts[6]);
          const gem = this.normalizeAddress(r.saiContracts[7]); 
          const gov = this.normalizeAddress(r.saiContracts[8]); 
          const skr = this.normalizeAddress(r.saiContracts[9]); 
          const dai = this.normalizeAddress(r.saiContracts[10]);
          const sin = this.normalizeAddress(r.saiContracts[11]);

          this.getBalance(window.tronWeb.defaultAddress.hex).then(o => {

              // Make the contracts addresses load a bit more flexible, just checking the node request is bringing data no older than 5 blocks
              if (block > this.transactions.latestBlock - 5 ) {
                this.transactions.setLatestBlock(block);
                // Set profile proxy and system contracts
                this.profile.setProxy(r.proxy);

                console.log("init with balance", o.balance)

                this.system.init(top, tub, tap, vox, pit, pip, pep, gem, gov, skr, dai, sin, o.balance);
                this.network.stopLoadingAddress();
                //this.transactions.setStandardGasPrice();

                this.setVariablesInterval();
              } else {
                console.log(`Error loading contracts (latest block ${this.transactions.latestBlock}, request one: ${block}, trying again...`);
                //this.transactions.addAmountCheck();
                setTimeout(this._loadContracts, 2000);
              }  

          })







      } else {
        console.log("Error loading contracts, trying again...");
        this.transactions.addAmountCheck();
        setTimeout(this._loadContracts, 2000);
      }
    }, () => {
      console.log("Error loading contracts, trying again...");
      setTimeout(this._loadContracts, 2000);
    });
  }

  loadContracts = async () => {

    blockchain.resetFilters(true);
    if (typeof this.interval !== "undefined") clearInterval(this.interval);

    this.dialog.reset();
    this.system.reset();
    this.transactions.reset(); 

    blockchain.loadObject("saivaluesaggregator", settings.chain["main"].saiValuesAggregator , "saiValuesAggregator");
    blockchain.loadObject("proxyregistry",  settings.chain["main"].proxyRegistry, "proxyRegistry");

    this._loadContracts();


    /*if (this.network.network && !this.network.stopIntervals) {
      blockchain.resetFilters(true);
      if (typeof this.interval !== "undefined") clearInterval(this.interval);
      this.dialog.reset();
      this.system.reset();
      this.transactions.reset();

      // Check actual block number from 3 different requests (workaround to try to avoid outdated nodes behind load balancer)
      const blockPromises = [];
      for (let i = 0; i < 3; i++) {
        blockPromises.push(blockchain.getBlockNumber());
      }

      Promise.all(blockPromises).then(r => {
        r.forEach(block => this.transactions.setLatestBlock(block)); // Will set the maximum value

        blockchain.loadObject("proxyregistry", settings.chain[this.network.network].proxyRegistry, "proxyRegistry");
        blockchain.loadObject("saivaluesaggregator", settings.chain[this.network.network].saiValuesAggregator, "saiValuesAggregator");

        this._loadContracts();
      })
    }*/
  }
}

const store = new RootStore();
export default store;
