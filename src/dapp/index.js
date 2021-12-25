import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

let flightCount = 0;
let flightsTracker = {};

(async() => {

    let contract = new Contract('localhost', () => {

        let passengers = contract.passengers;
        let airlines = []
        let passengerSelect = DOM.elid("passenger-address-select");

        passengers.forEach((item, index) => {
          var newSelectOption = DOM.option();
          newSelectOption.value = index;
          newSelectOption.innerHTML = item;
          passengerSelect.appendChild(newSelectOption);
        });

        UpdateDestinationFromFlight();
        
        // when the selected option for buying flight insurance is changed.
        DOM.elid('flight-number-select-insurance').addEventListener('change', () =>{
          UpdateDestinationFromFlight();
        });

        // when the selected option for sending requests to oracles is changed.
        DOM.elid('flight-number-select-oracle').addEventListener('change', () =>{
          UpdateDestinationFromFlight();
        });

        // Is Contract Operational
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational',
             [ { label: 'Operational Status', error: error, value: result} ]);
        });

        // Get the list of all registered airlines to allow for user selection.
        contract.getAllAirlines((error, result) =>{
          console.log(error, result);
          airlines = result;

          for (let i = 0; i < airlines.length; i++) {
            addAirlineOption(airlines[i].airlineName, airlines[i].airlineAddress);
          }
        });

        // when the selected option for funding an airline is changed
        DOM.elid('FundAirlineSelect').addEventListener('change', () =>{
          let fundAirlineSelect = DOM.elid('FundAirlineSelect');
          let selectedOptionIndex = fundAirlineSelect.selectedIndex;
          let airlineAddress = fundAirlineSelect.options[selectedOptionIndex].value;
          DOM.elid('FundAirlineAddressLabel').innerHTML = airlineAddress;
        });

        // when the selected option for oracle requests is changed
        DOM.elid('AirlineForOracleSelect').addEventListener('change', () =>{
          let airlineForOracleSelect = DOM.elid('AirlineForOracleSelect');
          let selectedOptionIndex = airlineForOracleSelect.selectedIndex;
          let airlineAddress = airlineForOracleSelect.options[selectedOptionIndex].value;
          DOM.elid('selected-airline-address-oracle').innerHTML = airlineAddress;
          UpdateOracleFlightList()
        });

        // When the register airline button is clicked.
        DOM.elid('registerAirlineButton').addEventListener('click', () => {
          let airlineAddress = DOM.elid('airlineAddressInput').value;
          let airlineName = DOM.elid('airlineNameInput').value;

          let registerAirlineAirlineSelect = DOM.elid('RegisterAirlineAirlineSelect');
          let selectedOptionIndex = registerAirlineAirlineSelect.selectedIndex;
          let registererAirlineAddress = registerAirlineAirlineSelect.options[selectedOptionIndex].value;

          contract.registerAirline(airlineAddress, airlineName, registererAirlineAddress, (error, result) => {
              console.log(error, result);
              let textToUse = "";
              if (error){
                textToUse = "Failed";
                displayBottom('Airline Registration', 'Attempted to register airline with address: '+airlineAddress+' and name '+airlineName,
                [ { label: 'Airline Registration Status',
                    error: error, value: textToUse} ]);
              }
              else if (result){
                contract.getAirlineIsRegistered(airlineAddress, (error, result) => {
                  console.log(error, result);
                  if (!result || error){
                    textToUse = "Failed";
                    displayBottom('Airline Registration', 'Attempted to register airline with address: '+airlineAddress+' and name '+airlineName,
                    [ { label: 'Airline Registration Status',
                        error: error, value: textToUse} ]);
                  }
                  else if (result){
                    addAirlineOption(airlineName, airlineAddress);
                    textToUse = "Successful";
                    displayBottom('Airline Registration', 'Attempted to register airline with address: '+airlineAddress+' and name '+airlineName,
                    [ { label: 'Airline Registration Status',
                        error: error, value: textToUse} ]);
                  }
                });
              }
          })
        });

        // When the fund airline button is clicked.
        DOM.elid('fundAirlineButton').addEventListener('click', async() => {
          let fundAmount = DOM.elid('fundAirlineEntry').value;
          let fundAirlineSelect = DOM.elid('FundAirlineSelect');

          let selectedOptionIndex = fundAirlineSelect.selectedIndex;
          let airlineAddress = fundAirlineSelect.options[selectedOptionIndex].value;
          let airlineName = fundAirlineSelect.options[selectedOptionIndex].innerHTML;
          fundAmount = parseInt(fundAmount);
          contract.fundAirline(airlineAddress, fundAmount, (error, result) => {
            console.log(error, result);
            if(error){
              displayBottom('Airline Funding', 'Attempted to fund airline: '+airlineName+' with address: '+airlineAddress+' with an amount of: '+fundAmount,
              [ { label: 'Request failed',
                error: error, value: result} ]);
            }else{
              displayBottom('Airline Funding', 'Attempted to fund airline: '+airlineName+' with address: '+airlineAddress+' with an amount of: '+fundAmount,
              [ { label: 'Request Successful',
                  error: error, value: result} ]);
            }
          })
        });

        // When the buy insurance button is clicked. Register flight and then purchase insurance for it
        DOM.elid('buy-insurance').addEventListener('click', () =>{
          let buyInsuranceAirlineSelect = DOM.elid('BuyInsuranceAirlineSelect');
          let airlineIndex = buyInsuranceAirlineSelect.selectedIndex;
          let airlineAddress = buyInsuranceAirlineSelect.options[airlineIndex].value;
          let airlineName = buyInsuranceAirlineSelect.options[airlineIndex].innerHTML;

          let buyInsuranceFlightNumberSelect = DOM.elid('flight-number-select-insurance');
          let flightIndex = buyInsuranceFlightNumberSelect.selectedIndex;
          let flightNumber = buyInsuranceFlightNumberSelect.options[flightIndex].innerHTML;
          let flightDestinaitonIndex = buyInsuranceFlightNumberSelect.options[flightIndex].value;
          let destination = getFlightDestination(flightDestinaitonIndex);
   
          let amountInEther = DOM.elid('insurance-price').value;
          let passengerSelect = DOM.elid("passenger-address-select");
          let passengerIndex = passengerSelect.selectedIndex;
          let passenger = passengerSelect.options[passengerIndex].innerHTML;

          // Register the flight and log the result
          contract.registerFlight(airlineAddress, flightNumber, destination, (error, result) => {
            console.log(error, result);

            if (error){
              displayBottom('Flight Registration', 'Attempted to register flight: '+flightNumber+' going to: '+destination+' with the airline at address: '+airlineAddress,
              [ { label: 'Flight Registration failed',
                  error: error, value: result} ]);
            }else{
              displayBottom('Flight Registration', 'Attempted to register flight: '+flightNumber+' going to: '+destination+' with the airline at address: '+airlineAddress,
              [ { label: 'Flight Registration successful',
                  error: error, value: result} ]);

              addFlightToTable(flightNumber, destination, airlineName, result);

              console.log(passenger);
              contract.buyInsurance(passenger, flightNumber, amountInEther, (error, result) => {
                console.log(error, result);
                let textToUse = "";
                if (error){
                  textToUse = "Failed";
                  displayBottom('Insurance Purchase', 'Attempted to buy insurance for : '+flightNumber,
                  [ { label: 'insurance purchase failed',
                      error: error, value: textToUse} ]);
                }
                else if (result){
                  textToUse = "Successful";
                  buyInsuranceFlightNumberSelect.remove(flightIndex);
                  if (flightsTracker[airlineAddress]){
                    flightsTracker[airlineAddress].push({"flightNumber":flightNumber,
                                                         "destinationIndex": flightDestinaitonIndex});
                  }else{
                    flightsTracker[airlineAddress]=[];
                    flightsTracker[airlineAddress].push({"flightNumber":flightNumber,
                                                        "destinationIndex": flightDestinaitonIndex});
                  }
    
                  UpdateOracleFlightList();
    
                  displayBottom('Insurance Purchase', 'Attempted to buy insurance for : '+flightNumber,
                  [ { label: 'insurance purchase succeeded.',
                      error: error, value: textToUse} ]);
                }
    
              })
            }
            
          });
        });

        // When the check-credit button is clicked.
        DOM.elid('check-credit').addEventListener('click', ()=> {
          let passengerSelect = DOM.elid("passenger-address-select");
          let passengerIndex = passengerSelect.selectedIndex;
          let passengerAddress = passengerSelect.options[passengerIndex].innerHTML;

          contract.getCreditForPassenger(passengerAddress, (error, result) => {
            console.log(error, result);
            if (error){
              displayBottom('Check credit', 'Attempted to get credit for passenger: '+passengerAddress+'. ',
              [ { label: 'Passenger Credit check failed.',
                  error: error, value: result} ]);
            }else{
              displayBottom('Check credit', 'Attempted to get credit for passenger: '+passengerAddress+'. ',
              [ { label: 'Passenger Credit check successful (amount in wei)',
                  error: error, value: result} ]);
              let amountToEther = contract.convertToEther(result);
              DOM.elid('credit-amount').value = amountToEther+" ETH";
            }
          })
        });

        //When the claim credit button is clicked.
        DOM.elid('claim-credit').addEventListener('click', ()=> {
          let passengerSelect = DOM.elid("passenger-address-select");
          let passengerIndex = passengerSelect.selectedIndex;
          let passengerAddress = passengerSelect.options[passengerIndex].innerHTML;
          contract.withdrawCreditForPassenger(passengerAddress, (error, result) => {
            console.log(error, result);
            if (error){
              displayBottom('Claim credit', 'Attempted to withdraw funds for: '+passengerAddress+'. ',
              [ { label: 'Passenger credit claim failed',
                  error: error, value: result} ]);
            }else{
              displayBottom('Claim credit', 'Attempted to withdraw funds for: '+passengerAddress+'. ',
              [ { label: 'Passenger Credit claim successful (amount in wei)',
                  error: error, value: result} ]);

            }
          })
        });
        
        // When the submit-oracle button is clicked get the details for the flight and airline and send request for flight status,
        // then get the status again.
        DOM.elid('submit-oracle').addEventListener('click', async () => {
          let flightNumberSelectOracle = DOM.elid('flight-number-select-oracle');
          let flightNumberSelectedIndex = flightNumberSelectOracle.selectedIndex;
          let flightNumber = flightNumberSelectOracle.options[flightNumberSelectedIndex].innerHTML;
          let selectedAirlineAddress = DOM.elid('selected-airline-address-oracle').innerHTML;

          if (!flightNumber || !selectedAirlineAddress){
            display('Submit to Oracle', 'Missing fields',
            [ { label: 'Please check that the flightNumber is set.'} ]);

          }else{
            // 
            contract.fetchFlightStatus(selectedAirlineAddress, flightNumber, (error, result) => {

                if (error){
                  displayBottom('Submit to Oracle', 'Trigger oracles',
                  [ { label: 'Fetching flight status for flight '+flightNumber+" failed",
                      error: error, value: result.flight + ' ' + getTimeFromTimestamp(result.timestamp)} ]);
                }else{
                  displayBottom('Submit to Oracle', 'Trigger oracles',
                  [ { label: 'Fetching flight status for flight '+flightNumber+" succeeded.",
                      error: error, value: result.flight + ' ' + getTimeFromTimestamp(result.timestamp)} ]);
                }

                let newTime = result.timestamp;
                console.log(error, result);
                setTimeout(() => { 
                  //console.log("World!");
                  contract.getFlightStatus(selectedAirlineAddress, flightNumber, (error, result) => {
                    console.log(result);
                    if (!error) {
                      displayBottom('Get flight Status', 'Trigger oracles',
                        [ { label: 'Get Flight Status succeeded for flight '+flightNumber,
                            error: error, value: result} ]);
                      updateFlightStatus(flightNumber, result, newTime);
                    }else{
                      displayBottom('Get flight Status', 'Trigger oracles',
                        [ { label: 'Get Flight Status failed for flight '+flightNumber,
                            error: error, value: result} ]);
                    }
                  }); 
                }, 4000);
            });
          }
        })
    
    });
    
})();

function addFlightToTable(flightNumber, destination, airlineName, timeStamp) {
  var table = DOM.elid("flights-display");

  flightCount++;
  var row = table.insertRow(flightCount);
  row.id = flightNumber;
  
  var cell1 = row.insertCell(0);
  var cell2 = row.insertCell(1);
  var cell3 = row.insertCell(2);
  var cell4 = row.insertCell(3);
  
  var dateToUse = new Date(+timeStamp);

  cell1.innerHTML = flightNumber+"</b>";
  cell2.innerHTML = destination.toUpperCase();
  cell3.innerHTML = dateToUse.getHours()+":"+dateToUse.getMinutes();
  cell4.innerHTML = "ON TIME";
  cell4.style="color:green";
}

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}

function displayBottom(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper-bottom");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
      let row = section.appendChild(DOM.div({className:'row'}));
      row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
      row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
      section.appendChild(row);
  })
  displayDiv.append(section);

}

function addAirlineOption(airlineName, hash) {

  let newSelectOption = DOM.option();
  newSelectOption.value = hash;
  newSelectOption.innerHTML = airlineName;
  let registerAirlineAirlineSelect = DOM.elid("RegisterAirlineAirlineSelect");
  registerAirlineAirlineSelect.appendChild(newSelectOption);

  let newSelectOption1 = DOM.option();
  newSelectOption1.value = hash;
  newSelectOption1.innerHTML = airlineName;
  let fundAirlineSelect = DOM.elid("FundAirlineSelect");
  fundAirlineSelect.appendChild(newSelectOption1);

  let selectedOptionIndex = fundAirlineSelect.selectedIndex;
  let airlineAddress = fundAirlineSelect.options[selectedOptionIndex].value;
  DOM.elid('FundAirlineAddressLabel').innerHTML = airlineAddress;

  let newSelectOption2 = DOM.option();
  newSelectOption2.value = hash;
  newSelectOption2.innerHTML = airlineName;
  let airlineForInsuranceSelect = DOM.elid("BuyInsuranceAirlineSelect");
  airlineForInsuranceSelect.appendChild(newSelectOption2);

  selectedOptionIndex = airlineForInsuranceSelect.selectedIndex;
  airlineAddress = airlineForInsuranceSelect.options[selectedOptionIndex].value;
  DOM.elid('selected-airline-address-passenger').innerHTML = airlineAddress;

  var newSelectOption4 = DOM.option();
  newSelectOption4.value = hash;
  newSelectOption4.innerHTML = airlineName;
  var airlineForOracleSelect = DOM.elid("AirlineForOracleSelect");
  airlineForOracleSelect.appendChild(newSelectOption4);

  selectedOptionIndex = airlineForOracleSelect.selectedIndex;
  airlineAddress = airlineForOracleSelect.options[selectedOptionIndex].value;
  DOM.elid('selected-airline-address-oracle').innerHTML = airlineAddress;

}

function updateFlightStatus(flightNumber, status, updatedTime) {
  console.log(status);
  var flightRow = DOM.elid(flightNumber);
  flightRow.deleteCell(3);
  flightRow.deleteCell(2);

  var cell3 = flightRow.insertCell(2);
  var cell4 = flightRow.insertCell(3);
  let statusText = "";
  switch(status) {
      case '10':
          statusText = "ON TIME";
          cell3.style="color:white";
          cell4.style="color:green";
          break;
      case '20':
          statusText = "LATE AIRLINE";
          cell3.style="color:red";
          cell4.style="color:red";
          break;
      case '30':
          statusText = "LATE WEATHER";
          cell3.style="color:red";
          cell4.style="color:yellow";
          break;
      case '40':
          statusText = "LATE TECHNICAL";
          cell3.style="color:red";
          cell4.style="color:yellow";
          break;
      case '50':
          statusText = "LATE OTHER";
          cell3.style="color:red";
          cell4.style="color:yellow";
          break;
      default:
          statusText = "UNKNOWN";
          cell3.style="color:white";
          cell4.style="color:white";
          break;
    }
  cell3.innerHTML = getTimeFromTimestamp(updatedTime);
  cell4.innerHTML = statusText;
}

function UpdateOracleFlightList(){
  let oracleAirlineSelect = DOM.elid("AirlineForOracleSelect");
  let selectedAirlineIndex = oracleAirlineSelect.selectedIndex;
  let airlineAddress = oracleAirlineSelect.options[selectedAirlineIndex].value;
  let flightNumberSelectOracle = DOM.elid("flight-number-select-oracle");

  // Clear out the current list of flight Numbers.
  var i, end = flightNumberSelectOracle.options.length - 1;
  for(i = end; i >= 0; i--) {
      flightNumberSelectOracle.remove(i);
  }

  if (flightsTracker.hasOwnProperty(airlineAddress)){

    let flightsListForAirline = flightsTracker[airlineAddress];
    console.log(flightsListForAirline);
  
    if (flightsListForAirline){
      for (i = 0; i < flightsListForAirline.length; i++) {
        let newFlightSelectOption = DOM.option();
        newFlightSelectOption.value = flightsListForAirline[i].destinationIndex;
        newFlightSelectOption.innerHTML = flightsListForAirline[i].flightNumber;
        flightNumberSelectOracle.appendChild(newFlightSelectOption);
      }
    }
  
    let selectedOptionIndex = flightNumberSelectOracle.selectedIndex;
    if (flightNumberSelectOracle.options[selectedOptionIndex]){
      let flightDestinationIndex = flightNumberSelectOracle.options[selectedOptionIndex].value;
      let destination = getFlightDestination(flightDestinationIndex);
      console.log(destination);
      DOM.elid("selected-flight-destination-oracle").innerHTML = destination;
    }else{
      DOM.elid("selected-flight-destination-oracle").innerHTML = "";
    }

  }else{
    DOM.elid("selected-flight-destination-oracle").innerHTML = "";
  }

}

function UpdateDestinationFromFlight(){
  let flightNumberSelect = DOM.elid('flight-number-select-insurance');
  let selectedOptionIndex = flightNumberSelect.selectedIndex;
  let flightDestinationIndex = flightNumberSelect.options[selectedOptionIndex].value;
  let destination = getFlightDestination(flightDestinationIndex);
  console.log(destination);
  DOM.elid("selected-flight-destination-insurance").innerHTML = destination;

  flightNumberSelect = DOM.elid("flight-number-select-oracle");
  selectedOptionIndex = flightNumberSelect.selectedIndex;
  if (flightNumberSelect.options[selectedOptionIndex]){
    flightDestinationIndex = flightNumberSelect.options[selectedOptionIndex].value;
    destination = getFlightDestination(flightDestinationIndex);
    DOM.elid("selected-flight-destination-oracle").innerHTML = destination;
  }
}

function getFlightDestination(indexAsString){
  let destinationIndex = parseInt(indexAsString);
  let destinations = ["TORONTO", "LONDON", "PARIS", "NEW YORK", "AMSTERDAM",
  "WASHINGTON", "PORTLAND", "VENICE", "MARS", "PLUTO"];
  return destinations[destinationIndex];
}

function getTimeFromTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString("es-ES").slice(0, -3);
}

var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
  acc[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var panel = this.nextElementSibling;
    if (panel.style.maxHeight) {
      panel.style.maxHeight = null;
    } else {
      panel.style.maxHeight = panel.scrollHeight + "px";
    } 
  });
}







