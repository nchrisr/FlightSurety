import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import cors from 'cors';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

let oracleAccounts = [];
let oracleIndexes = [];

const ORACLE_COUNT = 30;



flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log(event)
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

function getOracleAccounts() {
  return new Promise((resolve, reject) => {
    web3.eth.getAccounts().then(accountList => {
      // We start at account 20 so we have first ones useable for airline and passengers.
      oracleAccounts = accountList.slice(20, 20+TEST_ORACLES_COUNT);
    }).catch(err => {
      reject(err);
    }).then(() => {
      resolve(oracleAccounts);
    });
  });
}

function initOracles(accounts) {
  return new Promise((resolve, reject) => {
    flightSuretyApp.methods.REGISTRATION_FEE().call().then(fee => {
      for(let a=0; a<TEST_ORACLES_COUNT; a++) {
        flightSuretyApp.methods.registerOracle().send({
          "from": accounts[a],
          "value": fee,
          "gas": 5000000,
          "gasPrice": 20000000
        }).then(() => {
          // get indexes and save in a list
          flightSuretyApp.methods.getMyIndexes().call({
            "from": accounts[a]
          }).then(result => {
            console.log(`Oracle ${a} Registered at ${accounts[a]} with [${result}] indexes.`);
            oraclesIndexList.push(result);
          }).catch(err => {
            reject(err);
          });
        }).catch(err => {
          reject(err);
        });
      };
      resolve(oraclesIndexList);
    }).catch(err => {
      reject(err);
    });
  });
}

getOracleAccounts().then(accounts => {
  initOracles(accounts)
  .catch(err => {
    console.log(err.message);
  });
});

export default app;


