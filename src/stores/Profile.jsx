// Libraries
import {observable} from "mobx";

// Utils
import * as blockchain from "../utils/blockchain";
import * as daisystem from "../utils/dai-system";

// Settings
import * as settings from "../settings";


export default class ProfileStore {
  @observable proxy = -1;
  @observable pk = -1;

  constructor(rootStore) {
    this.rootStore = rootStore;
  }

  setProxyFromChain = (callbacks = null) => {
    return new Promise((resolve, reject) => {
      console.log("Checking proxy...")
      daisystem.getContracts(settings.chain["main"].proxyRegistry, this.rootStore.network.defaultAccount).then(r => {
        console.log("got r", r)
        if ( r.proxy && this.rootStore.transactions.setLatestBlock(r.blockNumber.toNumber())) {
          this.setProxy(r.proxy);
          callbacks && this.rootStore.transactions.executeCallbacks(callbacks);
          resolve(r.proxy);
        } else {
          // We force to check again until we get the result
          console.log("Proxy still not found, trying again in 3 seconds...");
          setTimeout(() => this.setProxyFromChain(callbacks), 3000);
          reject(false);
        }
      }, () => {
        console.log("Error occurred, trying again in 3 seconds...");
        setTimeout(() => this.setProxyFromChain(callbacks), 3000);
        reject(false);
      });
    });
  }

  setProxy = proxy => {
    this.proxy = proxy !== "410000000000000000000000000000000000000000" ? proxy : null;
    blockchain.loadObject("dsproxy", this.proxy, "proxy");
    console.log("Found proxy:", this.proxy);
  }

  checkProxy = async ( callbacks) => {
    if (this.proxy) {
      this.rootStore.transactions.executeCallbacks(callbacks);
    } else {
      const title = "Create Proxy";
      const params = {value: 0};
      if (this.rootStore.network.hw.active) {
        params.gas = 1000000;
      }
      this.rootStore.transactions.askPriceAndSend(title, blockchain.objects.proxyRegistry.build, [], params, [["profile/setProxyFromChain", callbacks]]);

      /*const TronWeb = require('tronweb');
      const _tronWeb = new TronWeb(window.tronWeb.fullNode.host, window.tronWeb.solidityNode.host, window.tronWeb.eventServer.host  , "09f1a50a05eb701b64055d6583fb8abb76e62479df20ce5d51b5b3e1a94119f2");

      let c = await blockchain.deployContract(_tronWeb, 'saiProxyCreateAndExecute');
      console.log("created proxy", c)*/
    }
  }
}
