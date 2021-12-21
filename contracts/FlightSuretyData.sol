pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Constants
    uint8 private constant MULTIPARTY_SIGN_THRESHOLD = 4;
    uint256 private constant MAX_INSURANCE = 1 ether;
    uint256 private constant EXPECTED_FUNDING_AMOUNT = 10 ether;

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    struct Airline{
        string name;
        address walletAddress;
        bool isRegistered;
        uint256 funds;
        bool isFunded;
        uint256 votes;
    }

    uint256 private airlinesCount; // How many airlines Have been registered or stored.
    uint256 public registeredAirlinesCount; // How many airlines have ben registered.
    
    mapping(address => Airline) public airlines; //All airlines
    address[] private registeredAirlines; // Array of registered airlines.
    // airlineAddress => voterAirlineAddress => true means the voterAirlineAddress has voted for airlineAddress.
    // Used to track which airlines have voted for which.
    mapping(address => mapping(address => bool)) private votesTracker; 

    struct Flight {
        address airlineAddress;
        string airlineName;
        uint256 departureTimestamp;
        string flightNumber;
        string departureLocation;
    }
    mapping(bytes32 => Flight) private flights; //flights
    //TODO: Maybe add functionality for storing flights in an array as well?


    struct Passenger {
        address passengerAddress;
        uint256 credit;
    }

    // Maps a passengerAddress to a mapping (=>) that contains flightCode => amount of Insurance paid
    // This keeps track of which passenger has booked which flights. If true then address has booked the flight, if false then it has not.
    mapping(address => mapping(bytes32 => uint256)) private flightBookings; 
    mapping(address => Passenger) private passengers;
    address[] public passengerAddresses;

    // contracts which are allowed to access this contract.
    mapping(address => bool) private authorizedContracts;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     *      Register the first airline.
     */
    constructor() public {
        contractOwner = msg.sender;
        airlinesCount = 0;
        authorizedContracts[msg.sender] = true;
        airlines[msg.sender] = Airline ({
            name: "BlockchainDev Air",
            walletAddress: msg.sender,
            isRegistered: true,
            funds: 10 ether,
            isFunded: true,
            votes: 0
        });
        registeredAirlines.push(msg.sender);
        airlinesCount++;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational.");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner.");
        _;
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to the same as the 'specifiedAddress' parameter.
     */
    modifier requireAddressIsContractOwner(address specifiedAddress) {
        require(specifiedAddress == contractOwner, "Address is not contract owner.");
        _;
    }

    /**
    * @dev Modifier that requires 'theAddress' to be authorized
    */
    modifier requireAddressAuthorized(address theAddress){
        require(isAuthorized(theAddress), "Address is not authorized to use this contract.");
        _;
    }

    /**
    * @dev Modifier that requires 'airlineAddress' to be stored.
    */
    modifier requireAirlineStored(address airlineAddress){
        require(airlineStored(airlineAddress), "Airline address has not been stored and is not known.");
        _;
    }    

    /**
    * @dev Modifier that requires 'airlineAddress' NOT be stored.
    */
    modifier requireAirlineNotStored(address airlineAddress){
        require(!airlineStored(airlineAddress), "Airline address has already been stored.");
        _;
    }  

    /**
    * @dev Modifier that requires 'airlineAddress' to be registered.
    */
    modifier requireAirlineRegistered(address airlineAddress) {
        require(isAirlineRegistered(airlineAddress), "Airline is not registered.");
        _;
    }

    /**
    * @dev Modifier that requires the address is non-zero.
    */
    modifier requireValidAddress(address theAddress) {
        require(theAddress != address(0), "Airline address must be a non-zero.");
        _;
    }

    /**
    * @dev Modifier that requires 'airlineAddress' to NOT be registered.
    */
    modifier requireAirlineNotRegistered(address airlineAddress) {
        require(!isAirlineRegistered(airlineAddress), "Airline is already registered.");
        _;
    }

    /** 
    * @dev Modifier that requires that 'voterAddress' has not voted for 'airlineAddress'
    */
    modifier requireVoterNotVotedForAirline(address voterAddress, address airlineAddress) {
        require(!alreadyVotedForAirline(voterAddress, airlineAddress), "Voter has voted for this airline already.");
        _;
    }

    /** 
    * @dev Modifier that requires 'airlineAddress' to have provided funding of at least 10 ether.
    */
    modifier requireAirlineHasProvidedFunding(address airlineAddress) {
        require(airlineProvidedFunding(airlineAddress), "Airline has not provided their fair share of funds.");
        _;
    }


    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Has Airline provided their funding?
    *
    * @return A boolean value that represents if the voterAddress has already voted for the airlineAddress.
    */
    function isContractOwner(address airlineAddress) 
        public view
        requireIsOperational
        requireAddressAuthorized(msg.sender)
        returns(bool)
    {
        return airlineAddress == contractOwner;
    }

    /**
    * @dev Has Airline provided their funding?
    *
    * @return A boolean value that represents if the voterAddress has already voted for the airlineAddress.
    */
    function airlineProvidedFunding(address airlineAddress) public view
        requireIsOperational
        requireAddressAuthorized(msg.sender)
        returns(bool)
    {
        return airlines[airlineAddress].funds >= EXPECTED_FUNDING_AMOUNT;
    }


    /**
    * @dev Has voterAddress aready voted for airlineAddress
    *
    * @return A boolean value that represents if the voterAddress has already voted for the airlineAddress.
    */
    function alreadyVotedForAirline(address voterAddress, address airlineAddress) public view
        requireIsOperational
        requireAddressAuthorized(msg.sender)
        returns(bool)
    {
        return votesTracker[airlineAddress][voterAddress] == true;
    }


    /**
    * @dev IS the airline registered
    *
    * @return A bool that represents if the airline is registered or not.
    */
    function isAirlineRegistered(address airlineAddress) public view
        requireIsOperational
        requireAddressAuthorized(msg.sender)
        returns(bool)
    {
        return airlines[airlineAddress].isRegistered;
    }

    /**
    * @dev Is the airline stored
    *
    * @return A bool that represents if the airline is stored or not.
    */
    function airlineStored(address airlineAddress) public view
        requireIsOperational
        requireAddressAuthorized(msg.sender)
        returns(bool)
    {
        return airlines[airlineAddress].walletAddress != address(0);
    }

    /**
    * @dev Is the address specified authorized to use this contract?.
    *
    * @return A bool that represents if the address is authorized or not.
    */
    function isAuthorized(address contractAddress) public view
        requireIsOperational
        returns(bool)
    {
        return authorizedContracts[contractAddress] == true;
    }

    /**
    * @dev Is the flightCode already registered with an airline?.
    *
    * @return A bool that represents if the flightCode is already registered with an airline.
    */
    function flightExists(bytes32 flightCode) public view
        requireIsOperational
        requireAddressAuthorized(msg.sender)
        returns(bool)
    {
        return flights[flightCode].airlineAddress != address(0); 
    }

    /**
    * @dev Has passengerAddress already paid insurance on this flight.
    *
    * @return A bool that represents if the flightCode is already registered with an airline.
    */
    function insurancePaid(address passengerAddress, bytes32 flightCode) public view
        requireIsOperational
        requireAddressAuthorized(msg.sender)
        returns(bool)
    {
        return flightBookings[passengerAddress][flightCode] != 0; 
    }


    /**
    * @dev Does the passenger have ancy credit?.
    *
    * @return A bool that represents if the flightCode is already registered with an airline.
    */
    function passengerHasCredit(address passengerAddress) public view
        requireIsOperational
        requireAddressAuthorized(msg.sender)
        returns(bool)
    {
        return passengers[passengerAddress].credit > 0; 
    }

    /**
    * @dev Passenger Exists.
    *
    * @return A bool that represents whether a passenger has bought insurance.
    */
    function passengerExists(address passengerAddress) public view
        requireIsOperational
        requireAddressAuthorized(msg.sender)
        returns(bool)
    {
        return passengers[passengerAddress].passengerAddress != address(0); 
    }

    /**
    * @dev Passenger Paid Insurance for flight?.
    *
    * @return A bool that represents whether a passenger has bought insurance for specific flight.
    */
    function passengerPaidInsuranceForFlight(address passengerAddress, bytes32 flightCode) public view
        requireIsOperational
        requireAddressAuthorized(msg.sender)
        returns(bool)
    {
        return flightBookings[passengerAddress][flightCode] > 0 ; 
    }



    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() 
        public view
        requireAddressAuthorized(msg.sender)
        returns (bool)
    {
        return operational;
    }

    /**
    * @dev Authorize the specified address
    *
    */
    function authorizeCaller(address contractAddress)
        public
        requireIsOperational
        requireContractOwner
    {
            authorizedContracts[contractAddress] = true;
    }

    /**
    * @dev Deauthorize the contract
    */
    function deauthorizeCaller(address contractAddress)external requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external 
        requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(address airlineAddress, string airlineName, address registererAddress) 
                            external
                            requireAddressAuthorized(msg.sender)
                            returns (bool success)
    {
        success = false;

        if (airlinesCount < MULTIPARTY_SIGN_THRESHOLD){
            airlines[airlineAddress] = Airline({ 
                name: airlineName,
                walletAddress: airlineAddress,
                isRegistered: true,
                funds: 0,
                isFunded: false,
                votes: 1});
                
            registeredAirlines.push(airlineAddress);    
            airlinesCount++;
            registeredAirlinesCount++;
            success = true;
        }else{
            airlines[airlineAddress] = Airline({ 
                name: airlineName,
                walletAddress: airlineAddress,
                isRegistered: false,
                funds: 0,
                isFunded: false,
                votes: 0});

            airlinesCount++;
            vote(airlineAddress, registererAddress);
        }
        return (success);
    }

    /**
    * @dev Get the information for the airline at the specified index.
    *
    */
    function getAirlineInfo(uint256 index) public view
        requireIsOperational
        requireAddressAuthorized(msg.sender)

        returns(address airlineAddress, string airlineName)
    {
        airlineAddress = registeredAirlines[index];
        airlineName = airlines[airlineAddress].name;
    }

    function getAirlineFunding(address airlineAddress) public view
        requireAddressAuthorized(msg.sender)
        returns(uint256)
    {
        return airlines[airlineAddress].funds;
    }

    function getAirlinesCount() public view
        requireAddressAuthorized(msg.sender)
        returns(uint256)
    {
        return airlinesCount;
    }

    function getAirlineName(address airlineAddress) public view
        requireAddressAuthorized(msg.sender)
        requireAirlineRegistered(airlineAddress)
        returns(string)
    {
        return airlines[airlineAddress].name;
    }

    /**
    * @dev Vote to register the new airline
    *
    */
    function vote(address airlineAddress, address voterAddress) 
            public
            requireIsOperational
            requireAddressAuthorized(msg.sender)
    {
        airlines[airlineAddress].votes++;

        votesTracker[airlineAddress][voterAddress] = true;

        if (airlines[airlineAddress].votes >= registeredAirlinesCount.div(2)){
            airlines[airlineAddress].isRegistered = true;
            registeredAirlines.push(airlineAddress);
            registeredAirlinesCount++;
        }
    }

    /**
    * @dev Get number of votes for an airline
    *
    */
    function getVoteCount(address airlineAddress) 
            public 
            view
            requireIsOperational
            requireAddressAuthorized(msg.sender)
            requireAirlineStored(airlineAddress)
            returns(uint256)
    {
        return airlines[airlineAddress].votes;
    }

    /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    */
    function fundAirline(address airlineAddress, uint256 amountInWei)
        public
        payable
        requireIsOperational
        requireAddressAuthorized(msg.sender)
    {
    
        airlines[airlineAddress].funds = airlines[airlineAddress].funds.add(amountInWei);
        if (airlines[airlineAddress].funds >= EXPECTED_FUNDING_AMOUNT){
            airlines[airlineAddress].isFunded = true;
        }

        if (msg.value > amountInWei){
            uint256 amountToReturn = msg.value.sub(amountInWei);
            airlineAddress.transfer(amountToReturn);
        }
        
    }

    //TODO: Remove
    /**
     * @dev Buy insurance for a flight
     *
     */
    /*function buy() external payable {}*/

    /**
     * @dev Register a flight to an airline.
     *
     */
    function registerFlight(bytes32 flightCode, address airlineAddress, uint256 departureTimestamp, string flightNumber, string destination)
            external
            requireAddressAuthorized(msg.sender)
            returns(bool success)
    {
        success = false;
        flights[flightCode] = Flight({
            airlineAddress: airlineAddress,
            airlineName: airlines[airlineAddress].name,
            departureTimestamp: departureTimestamp,
            flightNumber: flightNumber,
            departureLocation: destination
        });
        success =true;

        return success;
    }

    /**
     * @dev passengerAddress buys insurance for flightCode
     *
     */
    function buyInsurance(address passengerAddress, bytes32 flightCode) 
        external
        payable 
        requireAddressAuthorized(msg.sender)
    {
        if (passengers[passengerAddress].passengerAddress == address(0)){
            passengerAddresses.push(passengerAddress);
            passengers[passengerAddress] = Passenger({
                passengerAddress: passengerAddress,
                credit: 0
            });
        }
        
        if (msg.value > MAX_INSURANCE){
            flightBookings[passengerAddress][flightCode] = MAX_INSURANCE;
            uint256 excess = msg.value.sub(MAX_INSURANCE);
            passengerAddress.transfer(excess);
        }else{
            flightBookings[passengerAddress][flightCode] = msg.value;   
        }
    }

    /**
     *  @dev Credit payouts to insurees
     */
    function creditInsurees(bytes32 flightCode) 
        external
        requireIsOperational 
        requireAddressAuthorized(msg.sender)
        returns(bool)
    {
        for (uint i = 0; i < passengerAddresses.length; i++) {
            if(flightBookings[passengerAddresses[i]][flightCode] != 0) {
                uint256 currentCredit = passengers[passengerAddresses[i]].credit;
                uint256 insurenceAmountPaid = flightBookings[passengerAddresses[i]][flightCode];
                flightBookings[passengerAddresses[i]][flightCode] = 0;
                uint256 firstHalf = insurenceAmountPaid.div(2);
                uint256 amountToPay = insurenceAmountPaid.add(firstHalf);
                passengers[passengerAddresses[i]].credit = currentCredit.add(amountToPay);// + amountToPay ;
            }
        }
        return true;
    }

    /*
    *   @dev Get the amount of credit the passenger has.
    * 
    */
    function getCreditForPassenger(address passengerAddress) 
        external view
        requireIsOperational
        requireAddressAuthorized(msg.sender)
        returns (uint256) {
        return passengers[passengerAddress].credit;
    }

    /**
    *  @dev Transfers eligible payout funds to insuree
    *
    */
    //TODO: When this is confirmed to be working, add support for the passenger to specify an amount to be withdrawn.

    function withdraw(address passengerAddress) 
            external
            payable
            requireIsOperational
            requireAddressAuthorized(msg.sender)
    {
        uint256 contractBalance = address(this).balance;
        uint256 credit = passengers[passengerAddress].credit;
        //TODO: Move this into a modifier?
        require(contractBalance > credit, "The contract does not have enough funds to pay the credit");
        passengers[passengerAddress].credit = 0;
        passengerAddress.transfer(credit);
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external pure {}

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund() public payable {}

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {
        fund();
    }
}
