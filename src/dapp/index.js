
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

let flightCount = 0;

(async() => {

    let result = null;


    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        /*contract.getOwner((error, result) => {
          console.log(error,result);
          display('DataContract Owner', 'Check who owns the data contract ', [ { label: 'Owner', error: error, value: result} ]);
        });

        contract.getSender((error, result) => {
          console.log(error,result);
          display('DataContract MEssage sender', 'Check who sent message to Contract', [ { label: 'Sender', error: error, value: result} ]);
        });*/

        /*contract.getAirlinesCount((error, result) =>{
          console.log(error, result);
        })*/

        /*contract.getAirlineName(contract.owner, (error, result) =>{
          console.log(error, result);
          if(!error){
            addAirlineOption(result, contract.owner);
          }
        }) */

        contract.getAllAirlines((error, result) =>{
          console.log(error, result);
          let airlines = result;
          for (let i = 0; i < airlines.length; i++) {
            addAirlineOption(airlines[i].airlineName, airlines[i].airlineAddress);
          }
        });
        
        let passengers = contract.passengers;
        let passengerSelect = DOM.elid("passenger-address-select");

        passengers.forEach((item, index) => {
          var newSelectOption = DOM.option();
          newSelectOption.value = index;
          newSelectOption.innerHTML = item;
          passengerSelect.appendChild(newSelectOption);
          console.log(`${index} : ${item}`);
        });

        //passenger-address-select

        /*DOM.elid('TestAirlineCount').addEventListener('click', () =>{
          contract.getAirlinesCount((error, result) =>{
            console.log(error, result);
          });
        });*/

        DOM.elid('buy-insurance').addEventListener('click', () =>{
          let flightNumber = DOM.elid('insurance-flight').value;
          let amountInEther = DOM.elid('insurance-price').value;
          let passengerSelect = DOM.elid("passenger-address-select");
          let passengerIndex = passengerSelect.selectedIndex;
          let passenger = passengerSelect.options[passengerIndex].innerHTML;

          console.log(passenger);
          contract.buyInsurance(passenger, flightNumber, amountInEther, (error, result) => {
            console.log(error, result);

          })
        });

        DOM.elid('FundAirlineSelect').addEventListener('change', () =>{
          let fundAirlineSelect = DOM.elid('FundAirlineSelect');
          let selectedOptionIndex = fundAirlineSelect.selectedIndex;
          let airlineAddress = fundAirlineSelect.options[selectedOptionIndex].value;
          DOM.elid('FundAirlineAddressLabel').innerHTML = airlineAddress;
        });

        DOM.elid('flights-display').addEventListener('click', async(e) => {
          let flightCode = e.srcElement.innerHTML;
          console.log(e);
          console.log(flightCode);
          flightCode = flightCode.replace("✈ ", "").replace("<b>", "").replace("</b>", "");
          navigator.clipboard.writeText(flightCode).then(function() {
              console.log(`Async: Copying to clipboard was successful! Copied: ${flightCode}`);
          }, function(err) {
              console.error('Async: Could not copy text: ', err);
          });
        })

        DOM.elid('registerAirlineButton').addEventListener('click', () => {
            let airlineAddress = DOM.elid('airlineAddressInput').value;
            let airlineName = DOM.elid('airlineNameInput').value;

            contract.registerAirline(airlineAddress, airlineName, (error, result) => {
                console.log(error, result);
                let textToUse = "";
                if (error){
                  textToUse = "Failed";
                }
                else if (result && result){
                  addAirlineOption(airlineName, airlineAddress);
                  textToUse = "Successful";
                }

                displayBottom('Airline Registration', 'Attempted to register airline with address: '+airlineAddress+' and name '+airlineName,
                 [ { label: 'Airline Registration Status',
                     error: error, value: textToUse} ]);
            })
        });

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


        // User-submitted transaction
        DOM.elid('registerFlightButton').addEventListener('click', async() => {
          let flightNumber = DOM.elid('FlightNumberInput').value;
          let destination = DOM.elid('flightDestinationInput').value;
          let registerFlightAirlineSelect = DOM.elid('RegisterFlightAirlineSelect');
          let selectedOptionIndex = registerFlightAirlineSelect.selectedIndex;
          console.log(selectedOptionIndex);
          let airlineAddress = registerFlightAirlineSelect.options[selectedOptionIndex].value;
          let airlineName = registerFlightAirlineSelect.options[selectedOptionIndex].innerHTML;
          
          // Write transaction
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

                flightDisplay(flightNumber, destination, airlineName, result);
              }
              
          });
        });

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
                [ { label: 'Passenger Credit check successful',
                    error: error, value: result} ]);

                DOM.elid('credit-amount').value = result+" wei";
              }
            })
        });

        DOM.elid('claim-credit').addEventListener('click', ()=> {
          let passengerSelect = DOM.elid("passenger-address-select");
          let passengerIndex = passengerSelect.selectedIndex;
          let passengerAddress = passengerSelect.options[passengerIndex].innerHTML;
          contract.getCreditForPassenger(passengerAddress, (error, result) => {
            console.log(error, result);
            if (error){
              displayBottom('Claim credit', 'Attempted to withdraw funds for: '+passengerAddress+'. ',
              [ { label: 'Passenger credit claim failed',
                  error: error, value: result} ]);
            }else{
              displayBottom('Claim credit', 'Attempted to withdraw funds for: '+passengerAddress+'. ',
              [ { label: 'Passenger Credit claim successful',
                  error: error, value: result} ]);

            }
          })
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                displayBottom('Oracles', 'Trigger oracles',
                 [ { label: 'Fetch Flight Status',
                     error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        }) 
    
    });
    

})();

function flightDisplay(flight, destination, airlineName, timeStamp) {
  var table = DOM.elid("flights-display");

  flightCount++;
  var row = table.insertRow(flightCount);
  row.id = flight;
  
  var cell1 = row.insertCell(0);
  var cell2 = row.insertCell(1);
  var cell3 = row.insertCell(2);
  var cell4 = row.insertCell(3);
  
  var date = new Date(+timeStamp);
  // Add some text to the new cells:
  cell1.innerHTML = "<b>✈ " + flight+"</b>";
  cell1.setAttribute("data-toggle",  "tooltip");
  cell1.setAttribute("data-placement",  "top");
  cell1.title="Click on flight code to copy";
  cell2.innerHTML = destination.toUpperCase();
  cell3.innerHTML = date.getHours()+":"+date.getMinutes();
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
  var newSelectOption = DOM.option();
  newSelectOption.value = hash;
  newSelectOption.innerHTML = airlineName;
  var selectDropdown = DOM.elid("FundAirlineSelect");
  selectDropdown.appendChild(newSelectOption);

  let fundAirlineSelect = DOM.elid('FundAirlineSelect');
  let selectedOptionIndex = fundAirlineSelect.selectedIndex;
  let airlineAddress = fundAirlineSelect.options[selectedOptionIndex].value;
  DOM.elid('FundAirlineAddressLabel').innerHTML = airlineAddress;

  var newSelectOption2 = DOM.option();
  newSelectOption2.value = hash;
  newSelectOption2.innerHTML = airlineName;
  var selectDropdown2 = DOM.elid("AirlineForOracleSelect");
  selectDropdown2.appendChild(newSelectOption2);

  var newSelectOption3 = DOM.option();
  newSelectOption3.value = hash;
  newSelectOption3.innerHTML = airlineName;
  var selectDropdown2 = DOM.elid("RegisterFlightAirlineSelect");
  selectDropdown2.appendChild(newSelectOption2);

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







