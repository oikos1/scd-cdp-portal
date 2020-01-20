// Libraries
import {observable} from "mobx";
import checkIsMobile from 'ismobilejs'
import mixpanel from 'mixpanel-browser';
import WalletLink from "walletlink";
import tronWeb, { initTronweb } from 'tronweb';

// Utils
import * as blockchain from "../utils/blockchain";
import { mixpanelIdentify } from "../utils/analytics";

// Settings
import * as settings from "../settings";

export default class NetworkStore {
  @observable stopIntervals = false;
  @observable loadingAddress = false;
  @observable waitingForAccessApproval = false;
  @observable accounts = [];
  @observable defaultAccount = null;
  @observable isConnected = false;
  @observable latestBlock = null;
  @observable network = "";
  @observable hw = {active: false, showSelector: false, option: null, derivationPath: null, addresses: [], loading: false, error: null, network: ""};
  @observable downloadClient = false;
  isMobile = checkIsMobile.any;
  isMobileWeb3Wallet = blockchain.isMobileWeb3Wallet();
  walletLinkProvider = null;

  constructor(rootStore) {
    this.rootStore = rootStore;
  }

  setNetwork = async () => {
    try {

      const result = await blockchain.checkNetwork(this.isConnected, this.network);
      console.log("setNetwork", result);

      Object.keys(result.data).forEach(key => { this[key] = result.data[key]; });
      /*if (!this.stopIntervals && result.status) {
        this.setAccount();
        if (!this.hw.active) {
          this.setAccountInterval = setInterval(this.setAccount, 1000);
        }
      }*/

      //this.setDefaultAccount("TJb4Gy2BotytAvW1ENBZkkMVqmwWnBtb2o");
      this.setAccount();
    } catch(e) {
      console.log(e);
    }
  }

  stopNetwork = () => {
    window.activeProvider = null;
    this.stopIntervals = true;
    blockchain.stopProvider();
    clearInterval(this.rootStore.interval);
    this.rootStore.interval = null;
    clearInterval(this.rootStore.intervalAggregatedValues);
    this.rootStore.intervalAggregatedValues = null;
    clearInterval(this.setAccountInterval);
    this.setAccountInterval = null;
    clearInterval(this.setNetworkInterval);
    this.setNetworkInterval = null;
    this.network = "";
    this.hw = {active: false, showSelector: false, option: null, derivationPath: null, addresses: [], loading: false, error: null, network: ""};
    this.accounts = [];
    this.defaultAccount = null;
    this.isConnected = false;
    this.latestBlock = null;
  }

  setAccount = () => {

      //tron钱包相关对象
      let tronWeb = false;
      let tronWeb2 = false;
      let scatter = false;
      let network = {};
      let walletAddress = false;

      let nowWallet = "tronLink";

      let tmpTimer1 = null;
      let tmpTimer2 = null;  

      if (window.tronWeb){
            console.log(" tWda" , window.tronWeb.defaultAddress);
            if (window.tronWeb.defaultAddress.base58 != false) {
              //clearInterval(tmpTimer2);
              walletAddress = window.tronWeb.defaultAddress.base58;
              window.myAddress = walletAddress;
              window.tronWeb.setAddress(walletAddress);
              //window.socket.emit("login", {addr: walletAddress});
              ////cb();
            } else {
              console.log('err address ' , walletAddress);
            }
      }      

      //tmpTimer1 = setInterval(()=>{
        //if (tronWeb) {
          //clearInterval(tmpTimer1);
          //tronWeb = tronWeb;
          //if(tmpTimer2) clearInterval(tmpTimer2);
          //1s检测钱包是否登录
          //tmpTimer2 = setInterval(()=>{
            //console.log("identity: ", tronWeb.defaultAddress);
            //if (window.tronWeb.defaultAddress.base58 != false) {
              //clearInterval(tmpTimer2);
              //walletAddress = tronWeb.defaultAddress.base58;
              //window.myAddress = walletAddress;
              //window.socket.emit("login", {addr: walletAddress});
              ////cb();
            //} else {
            //  console.log('err address false');
            //}
          //}, 1000);

        //}
      //}, 1000);
      //console.log("set address to " + walletAddress);

    //blockchain.getAccounts().then(async accounts => {
      /*if (this.network && !this.hw.active) {
        //const account = await blockchain.getDefaultAccountByIndex(0);
        if (!this.stopIntervals) { // To avoid race condition
          this.setDefaultAccount(account);
        }
      }
      if (!this.stopIntervals) { // To avoid race condition
        const oldDefaultAccount = this.defaultAccount;
        this.defaultAccount = blockchain.getDefaultAccount();
        if (this.defaultAccount && oldDefaultAccount !== this.defaultAccount) {
          this.rootStore.loadContracts();
        }
        if (!this.defaultAccount) {
          this.loadingAddress = false;
        }
      }
    //}, () => {});*/
    this.setDefaultAccount(walletAddress);
  }

  setDefaultAccount = account => {
    console.log('sda ' + account)
    //account = account.toLowerCase();
    blockchain.setDefaultAccount(account);

    this.defaultAccount = account;
    console.log("da : " + this.defaultAccount);

    /*const wallet = this.hw.active && this.hw.option ? this.hw.option.replace(/-(live|legacy)$/i, '') : blockchain.getWebClientProviderName();
    const mixpanelProps = { wallet };
    if (wallet === 'ledger') mixpanelProps['ledgerAccountType'] = this.hw.option;
    mixpanelIdentify(account, mixpanelProps);

    let network = this.network || this.hw.network;
    if (network === 'main') network = 'mainnet';

    const trackProps = {
      product: 'scd-cdp-portal',
      account,
      network,
      wallet
    };
    if (wallet === 'ledger') trackProps['ledgerAccountType'] = this.hw.option;
    mixpanel.track('account-change', trackProps);*/

    let network = 'mainnet';
    const wallet = blockchain.getWebClientProviderName();
    console.log(`Detected wallet: ${wallet}`);
    this.rootStore.loadContracts();

  }

  // Web3 web client
  setWeb3WebClient = async () => {
    try {
      this.stopIntervals = false;
      this.loadingAddress = true;
      //this.waitingForAccessApproval =  false; //typeof window.ethereum !== "undefined";
      const provider = await blockchain.setWebClientWeb3();
      this.waitingForAccessApproval = false;
      //console.log("provider is : " + JSON.stringify(provider));
      console.log('Provider is : ', provider);

      await blockchain.setWebClientProvider(provider);

      this.setNetwork();
      //this.setNetworkInterval = setInterval(this.setNetwork, 3000);

    } catch (e) {
      this.loadingAddress = false;
      this.waitingForAccessApproval = false;
      if (e.message === "No client") {
        this.downloadClient = true;
      }
       console.log(e);
    }
  }

  startWalletLink = async () => {
    const chainId = 1;
    const network = (chainId === 1 ? "main" : "kovan");
    const rpcUrl = settings.chain[network].nodeURL;

    if (!this.walletLinkProvider) {
      console.log('[WalletLink] Creating new provider instance');
      console.log(`[WalletLink] Using RPC URL: ${rpcUrl}`);
      console.log(`[WalletLink] Using chain id: ${chainId}`);
      const walletLink = new WalletLink({
        appName: "CDP Portal",
        appLogoUrl: `${window.location.protocol}//${window.location.hostname}/static/dai-400px.png`
      });
      this.walletLinkProvider = walletLink.makeWeb3Provider(rpcUrl, chainId);

      this.walletLinkProvider.on('accountsChanged', accounts => {
        console.log('[WalletLink] accountsChanged:', accounts);
      });
    }

    try {
      this.stopIntervals = false;
      this.loadingAddress = true;
      this.waitingForAccessApproval = true;
      const provider = await blockchain.setWebClientWeb3(this.walletLinkProvider);
      this.waitingForAccessApproval = false;
      await blockchain.setWebClientProvider(provider);
      this.setNetwork();
      this.setNetworkInterval = setInterval(this.setNetwork, 3000);
    } catch (e) {
      this.loadingAddress = false;
      this.waitingForAccessApproval = false;
      console.log('[WalletLink] Error:', e);
    }
  }

  // Hardwallets
  showHW = option => {
    if (option === "ledger") {
      option = `ledger-${localStorage.getItem("loadLedgerLegacy") === "true" ? "legacy" : "live"}`;

    }
    this.hw.option = option;
    this.hw.showSelector = true;
    this.loadHWAddresses();
  }

  hideHw = () => {
    this.hw.active = false;
    this.hw.loading = false;
    this.hw.showSelector = false;
    this.hw.option = "";
    this.hw.derivationPath = false;
    this.hw.network = "";
  }

  loadHWAddresses = async () => {
    this.hw.loading = true;
    this.hw.active = true;
    this.hw.error = false;
    this.hw.network = (window.location.hostname === "cdp.makerdao.com" || window.location.hostname === "cdp-portal-mainnet.surge.sh" || window.location.hostname === "d2maajt6wv6xbc.cloudfront.net")
      ? "main"
      : "kovan";
    this.hw.derivationPath = this.hw.option === "ledger-live"
      ? "44'/60'/0'"
      : this.hw.option === "ledger-legacy"
        ? "44'/60'/0'/0"
        : "44'/60'/0'/0/0";
    try {
      await blockchain.setHWProvider(
                                      this.hw.option.replace("-live", "").replace("-legacy", ""),
                                      this.hw.network,
                                      this.hw.derivationPath,
                                      0,
                                      this.hw.option === "ledger-live" ? 5 : 50
                                    );
      const accounts = await blockchain.getAccounts();
      this.hw.addresses = accounts;
    } catch(e) {
      blockchain.stopProvider();
      this.hw.error = `Error connecting ${this.hw.option}: ${e.message}`;
    } finally {
      this.hw.loading = false;
    }
  }

  importAddress = account => {
    try {
      this.stopIntervals = false;
      this.loadingAddress = true;
      this.hw.showSelector = false;
      this.setDefaultAccount(account);
      this.setNetwork();
      this.setNetworkInterval = setInterval(this.setNetwork, 10000);
    } catch(e) {
      this.loadingAddress = false;
      this.hw.showSelector = true;
      this.hw.addressIndex = null;
      this.hw.addresses = [];
      blockchain.stopProvider();
      this.hw.error = `Error connecting ${this.hw.option}: ${e.message}`;
    }
  }
  //

  stopLoadingAddress = () => {
    this.loadingAddress = false;
  }
}
