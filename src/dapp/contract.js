import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {
        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.appContractAddress = config.appAddress;
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            this.flightSuretyData.methods.authorizeCaller(this.appContractAddress).send({from: this.owner}, (error, result) => {
                console.log(result);
                if(error) {
                    console.log("Authorizing the App contract failed with the error below:");
                    console.log(error);
                }
            });

            callback();
        });

    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    registerAirline(airlineAddress, airlineName, callback) {
        let self = this;
        let success = true;
        self.flightSuretyApp.methods
            .registerAirline(airlineAddress, airlineName)
            .send({ from: self.owner, gas: 4000000, gasPrice: 20000000},
                 (error, result) => { callback(error, success) }
                );
    }

    fundAirline(airlineAddress, amountInEther, callback) {
        let self = this;
        console.log(amountInEther);
        let amountInWei = this.web3.utils.toWei(amountInEther.toString(), "ether");
        console.log(amountInWei)
        self.flightSuretyApp.methods.fundAirline(amountInWei).send( {from: airlineAddress, value: amountInWei}, callback);
    }

    getAirlineName(airlineAddress, callback) {
        let self = this;
        self.flightSuretyApp.methods.getAirlineName(airlineAddress).call( {from: self.owner }, callback );
    }

    getAllAirlines(callback) {
        let self = this;
        let airlines = [];
        self.flightSuretyData.methods.getAirlinesCount().call( {from: self.owner}, async (error, result) => {
            if(!error){
                let airlinesCount = result;
                for (let i = 0; i < airlinesCount; i++) {
                    let airlineInfo = await self.flightSuretyData.methods.getAirlineInfo(i).call( {from: self.owner});
                    let airline = {"airlineAddress": airlineInfo.airlineAddress, "airlineName": airlineInfo.airlineName};
                    airlines.push(airline);
                }
            }
            callback(error, airlines);
        });
    }

    getAirlinesCount(callback) {
        let self = this;
        self.flightSuretyData.methods.getAirlinesCount().call( {from: self.owner}, callback );
    }

    registerFlight(airlineAddress, flightNumber, destination, callback) {
        let self = this;
        let timestamp = Math.floor(Date.now() / 1000);
        console.log(airlineAddress, flightNumber, destination);
        self.flightSuretyApp.methods
            .registerFlight(timestamp, flightNumber, destination)
            .send({ from: airlineAddress, gas: 4000000, gasPrice: 20000000}, (error, result)=>{ callback(error, timestamp)});
    }

    buyInsurance(passengerAddress, flightNumber, amountInEther, callback){
        let self = this;
        let samplePassengerAddress = passengerAddress;
        let amountInWei = this.web3.utils.toWei(amountInEther.toString(), "ether");
        console.log(amountInWei);
        console.log(passengerAddress, flightNumber);
        self.flightSuretyApp.methods.buyInsurance(flightNumber).send( {from: samplePassengerAddress, value: amountInWei,
             gas: 4000000, gasPrice: 20000000}, callback);
    }

    getCreditForPassenger(passengerAddress, callback){
        let self = this;
        console.log(passengerAddress);
        self.flightSuretyApp.methods.getCreditForPassenger(passengerAddress).call( {from: passengerAddress}, callback);
    }

    withdrawCreditForPassenger(passengerAddress, callback){
        let self =this;
        console.log(passengerAddress);
        self.flightSuretyApp.methods.withdrawCreditForPassenger(passengerAddress).call( {from: passengerAddress}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }
}