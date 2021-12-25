import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import cors from 'cors';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

let oracleAccounts = [];
let oracleIndexes = [];

const ORACLE_COUNT = 25;

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

const STATUS_CODES_LIST = [STATUS_CODE_UNKNOWN, STATUS_CODE_ON_TIME, STATUS_CODE_LATE_AIRLINE,
                           STATUS_CODE_LATE_WEATHER, STATUS_CODE_LATE_TECHNICAL, STATUS_CODE_LATE_OTHER]


const app = express();

app.use(cors());

app.listen(80, function () {
  console.log('CORS-enabled web server listening on port 80')
})

app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
});


flightSuretyApp.events.OracleRequest({fromBlock: 0}, function (error, event) {
  if (error) {
    console.log(error);
  }
  console.log(event);
  let index = event.returnValues.index;
  console.log(`Oracle Request event triggered index: ${index}`);
  let idx = 0;
  oracleIndexes.forEach((indexes) => {
    let oracle = oracleAccounts[idx];
    if(indexes[0] == index || indexes[1] == index || indexes[2] == index) {
      console.log(`Oracle: ${oracle} was triggered. Indexes: ${indexes}.`);
      let statusCodeIndex = getRandomIndexInRange(0, STATUS_CODES_LIST.length);
      // Can change this to statusCodeToUse  = STATUS_CODE_LATE_AIRLINE; to test be deterministic about testing how LATE airlines work.
      let statusCodeToUse = STATUS_CODES_LIST[statusCodeIndex]; 
      submitOracleResponse(oracle, index, event.returnValues.airline, event.returnValues.flight, event.returnValues.timestamp, statusCodeToUse);
    }
    idx++;
  });
});


function submitOracleResponse (oracle, index, airlineAddress, flightNumber, timestamp, statusCode) {
  console.log("Submitting oracle response.")
  console.log("Using status code");
  console.log(statusCode);

  let requestParameters = {
    index: index,
    airline: airlineAddress,
    flight: flightNumber,
    timestamp: timestamp,
    statusCode: statusCode
  }

  console.log("Making oracle request with parameters below")
  console.log(requestParameters);

  flightSuretyApp.methods
      .submitOracleResponse(index, airlineAddress, flightNumber, timestamp, statusCode)
      .send({ from: oracle, gas: 500000, gasPrice: 20000000}, (error, result) => {
        if(error){
          console.log("An error occurred.");
          console.log(error);
        }
  });
}

function getRandomIndexInRange(max, min){
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function getOracleAccounts() {

  return new Promise((resolve, reject) => {
    web3.eth.getAccounts().then(accountList => {
      // We start at account 12 so we have first ones useable for airline and passengers.
      oracleAccounts = accountList.slice(12, 12+ORACLE_COUNT);
    }).catch(err => {
      reject(err);
    }).then(() => {
      resolve(oracleAccounts);
    });
  });
}

function doSetupForOracles(accounts) {

  return new Promise((resolve, reject) => {
    flightSuretyApp.methods.REGISTRATION_FEE().call().then(fee => {
      for(let i=0; i<ORACLE_COUNT; i++) {
        flightSuretyApp.methods.registerOracle().send({
            from: accounts[i],
            value: fee,
            gas: 5000000,
            gasPrice: 20000000
        }).then(() => {
          // get indexes and save in a list
          flightSuretyApp.methods.getMyIndexes().call({
            "from": accounts[i]
          }).then(result => {
            console.log(`Oracle ${i} Registered at ${accounts[i]} with [${result}] indexes.`);
            oracleIndexes.push(result);
          }).catch(err => {
            reject(err);
          });
        }).catch(err => {
          reject(err);
        });
      };
      resolve(oracleIndexes);
    }).catch(err => {
      reject(err);
    });
  });
}

getOracleAccounts().then(accounts => {
  doSetupForOracles(accounts)
  .catch(error => {
    console.log(error.message);
  });
});

export default app;


