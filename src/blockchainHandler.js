import web3 from "./web3";
import Promise from "bluebird";

// const settings = require("./settings");
const promisify = Promise.promisify;
const schema = {};

schema.tub = require("./abi/saitub");
schema.top = require("./abi/saitop");
schema.tap = require("./abi/saitap");
schema.vox = require("./abi/saivox");
schema.proxyregistry = require("./abi/proxyregistry");
schema.dsproxy = require("./abi/dsproxy");
schema.dsethtoken = require("./abi/dsethtoken");
schema.dstoken = require("./abi/dstoken");
schema.dsvalue = require("./abi/dsvalue");
schema.proxycreationandexecute = require("./abi/proxycreationandexecute");

export const objects = {
}

export const getAccounts = () => {
  return promisify(web3.eth.getAccounts)();
}

export const loadObject = (type, address, label = null) => {
  const object = web3.eth.contract(schema[type].abi).at(address);
  if (label) {
    objects[label] = object;
  }
  return object;
}

export const setDefaultAccount = account => {
  web3.eth.defaultAccount = account;
  console.log(`Address ${account} loaded`);
}

export const getDefaultAccount = () => {
  return typeof web3.eth.defaultAccount !== "undefined" ? web3.eth.defaultAccount : null;
}

export const getDefaultAccountByIndex = index => {
  return new Promise(async (resolve, reject) => {
    try {
      const accounts = await getAccounts();
      resolve(accounts[index]);
    } catch (e) {
      reject(new Error(e));
    }
  });
}

export const getNetwork = () => {
  return promisify(web3.version.getNetwork)();
}

export const getGasPrice = () => {
  return promisify(web3.eth.getGasPrice)();
}

export const estimateGas = (to, data, value, from) => {
  return promisify(web3.eth.estimateGas)({to, data, value, from});
}

export const getTransaction = tx => {
  return promisify(web3.eth.getTransaction)(tx);
}

export const getTransactionReceipt = tx => {
  return promisify(web3.eth.getTransactionReceipt)(tx);
}

export const getTransactionCount = address => {
  return promisify(web3.eth.getTransactionCount)(address, "pending");
}

export const getNode = () => {
  return promisify(web3.version.getNode)();
}

export const getBlock = block => {
  return promisify(web3.eth.getBlock)(block);
}

export const setFilter = (fromBlock, address) => {
  return promisify(web3.eth.filter)({fromBlock, address});
}

export const resetFilters = bool => {
  web3.reset(bool);
}

export const getProviderUseLogs = () => {
  return web3.useLogs;
}

export const getCurrentProviderName = () => {
  return web3.currentProvider.name;
}

export const getEthBalanceOf = addr => {
  return promisify(web3.eth.getBalance)(addr);
}

export const getTokenBalanceOf = (token, addr) => {
  return promisify(objects[token].balanceOf)(addr);
}

export const getTokenAllowance = (token, from, to) => {
  return promisify(objects[token].allowance.call)(from, to);
}

export const getTokenTrusted = (token, from, to) => {
  return promisify(objects[token].allowance.call)(from, to)
        .then((result) => result.eq(web3.toBigNumber(2).pow(256).minus(1)));
}

export const tokenApprove = (token, dst, gasPrice) => {
  return promisify(objects[token].approve)(dst, -1, {gasPrice});
}

export const getProxy = account => {
  return promisify(objects.proxyRegistry.proxies)(account).then(r => r === "0x0000000000000000000000000000000000000000" ? null : getProxyOwner(r).then(r2 => r2 === account ? r : null));
}

export const getProxyOwner = proxy => {
  return promisify(loadObject("dsproxy", proxy).owner)();
}

export const proxyExecute = (proxyAddr, targetAddr, calldata, gasPrice, value = 0) => {
  const proxyExecuteCall = loadObject("dsproxy", proxyAddr).execute["address,bytes"];
  return promisify(proxyExecuteCall)(targetAddr,calldata, {value, gasPrice});
}

export const getContractAddr = (contractFrom, contractName) => {
  return new Promise((resolve, reject) => {
    objects[contractFrom][contractName].call((e, r) => {
      if (!e) {
        if (schema[contractName]) {
          loadObject(contractName, r, contractName);
        }
        resolve(r);
      } else {
        reject(e);
      }
    });
  });
}

export const getAllowance = (token, srcAddr, dstAddr) => {
  return new Promise((resolve, reject) => {
    objects[token].allowance.call(srcAddr, dstAddr, (e, r) => {
      if (!e) {
        resolve(r);
      } else {
        reject(e);
      }
    });
  });
}

export const sendTransaction = web3.eth.sendTransaction;

export const stopProvider = () => {
  web3.stop();
}

export const setHWProvider = (device, network, path, accountsOffset = 0, accountsLength = 1) => {
  return web3.setHWProvider(device, network, path, accountsOffset = 0, accountsLength);
}

export const setWebClientProvider = () => {
  return web3.setWebClientProvider();
}

export const {getWebClientProviderName} = require("./web3");
