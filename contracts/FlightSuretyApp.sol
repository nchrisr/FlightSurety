pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)
    using SafeMath for uint;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner; // Account used to deploy contract
    //address private testDataContract;

    /*struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }
    mapping(bytes32 => Flight) private flights;*/

    FlightSuretyData private flightSuretyData;

    address private flightDataContractAddress;

    // events

    /*event BuyInsurance(address airline, address policyHolder, uint256 premiumAmount);*/

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
        // Modify to call data contract's status
        require(flightSuretyData.isOperational(), "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the data contract Owner account to be the function caller
    */
    modifier requireDataContractOwner() {
        require(flightSuretyData.isContractOwner(msg.sender), "Caller is not the data contract owner");
        _;
    }


    /**
    * @dev Modifier that requires the "airlineAddress" has provided funding.
    */
    modifier requireAirlineFunded(address airlineAddress){
        require(flightSuretyData.airlineProvidedFunding(airlineAddress), "The airline has not provided their fair share of funds.");
        _;
    }

    /**
    * @dev Modifier that requires the "airlineAddress" has NOT provided funding.
    */
    modifier requireAirlineNotFunded(address airlineAddress){
        require(!flightSuretyData.airlineProvidedFunding(airlineAddress), "The airline is already funded.");
        _;
    }


    /**
    * @dev Modifier that requires the address of the airline to be stored.
    */
    modifier requireAirlineStored(address airlineAddress){
        require(flightSuretyData.airlineStored(airlineAddress), "airlineAddress must be stored.");
        _;
    }    

    /**
    * @dev Modifier that requires the address of the airline to NOT be stored.
    */
    modifier requireAirlineNotStored(address airlineAddress){
        require(!flightSuretyData.airlineStored(airlineAddress), "airlineAddress already stored.");
        _;
    }  

    /**
    * @dev Modifier that requires the 'Airline' represented by the address is registered.
    */
    modifier requireAirlineRegistered(address airlineAddress) {
        require(flightSuretyData.isAirlineRegistered(airlineAddress), "Airline has not been registered.");
        _;
    }

    /**
    * @dev Modifier that requires the airline to not be registered.
    */
    modifier requireAirlineNotRegistered(address airlineAddress) {
        require(!flightSuretyData.isAirlineRegistered(airlineAddress), "Airline is already registered.");
        _;
    }

    /**
    * @dev Modifier that requires the address is non-zero.
    */
    modifier requireValidAddress(address theAddress) {
        require(theAddress != address(0), "airlineAddress must be a valid address (Non-zero).");
        _;
    }

    /** 
    * @dev Modifier that requires the voter to not have already voted for the new airline 
    */
    modifier requireVoterNotVotedForAirline(address voterAddress, address airlineAddress) {
        require(!flightSuretyData.alreadyVotedForAirline(voterAddress, airlineAddress), "Airline has voted already");
        _;
    }

    /** 
    * @dev Modifier that requires the sender of the message/Transaction to be an EOA (Externally Owned Account).
    */
    modifier requireSenderIsNotAContract(address theAddress) {
        require(theAddress == tx.origin, "Cannot process requests from Contracts.");
        _;
    }

    /** 
    * @dev Modifier that makes sure the value of the message is more than or same as amountInWei.
    */
    modifier requireValueIsSufficient(uint256 amountInWei) {
        require(msg.value >= amountInWei, "Value in message is not enough.");
        _;
    }

    /**
    * @dev Modifier that makes sure the flight is not already registered.
    * 
    */
    modifier requireFlightNotRegistered(bytes32 flightCode) {
        bytes32 flightCode = getFlightKey(msg.sender, flightNumber, departureTimestamp);
        require(!flightSuretyData.flightExists(flightCode), "Flight is already registered.");
        _;
    }

    /**
    * @dev Modifier that makes sure the flight is already registered.
    *
    */
    modifier requireFlightRegistered(bytes32 flightCode){
        require(flightSuretyData.flightExists(flightCode), "Flight is not registered.");
        _;
    }

    /**
    * @dev Modifier that makes sure the passengerAddress has paid Insurance for the flight.
    *
    */
    modifier requireInsuarnacePaid(address passengerAddress, string flightNumber, uint256 departureTimestamp){
        bytes32 flightCode = getFlightKey(msg.sender, flightNumber, departureTimestamp);
        require(flightSuretyData.insurancePaid(passengerAddress, flightCode), "Address has not paid insurance for the flight.");
        _;
    }

    /**
    * @dev Modifier that makes sure the passengerAddress has not paid Insurance for the flight.
    *
    */
    modifier requireInsuranaceNotPaid(address passengerAddress, string flightNumber, uint256 departureTimestamp){
        bytes32 flightCode = getFlightKey(msg.sender, flightNumber, departureTimestamp);
        require(!flightSuretyData.insurancePaid(passengerAddress, flightCode), "Address has paid insurance for the flight.");
        _;
    }

    /**
    * @dev Modifier that makes sure there is value in the message.
    *
    */
    modifier requireMessageHasValue(){
        require(msg.value > 0, "No value provided in message.");
        _;
    }

    /**
    * @dev Modifier that makes sure passenger has credit.
    *
    */
    modifier requirePassengerHasCredit(address passengerAddress){
        require(flightSuretyData.passengerHasCredit(passengerAddress), "Passenger has no credit.");
        _;
    }

    /**
    * @dev Modifier that makes sure passenger has bought insurance.
    *
    */
    modifier requirePassengerExists(address passengerAddress){
        require(flightSuretyData.passengerExists(passengerAddress), "Passenger does not exist.");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address dataContractAddress) public {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContractAddress);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/
    function isOperational()
        public
        view 
        returns(bool)
    {
        return flightSuretyData.isOperational();
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline(address airlineAddress, string airlineName)
        public
        requireIsOperational
        requireSenderIsNotAContract(msg.sender)
        requireAirlineFunded(msg.sender)
        requireAirlineNotStored(airlineAddress)
        requireAirlineRegistered(msg.sender)
        requireAirlineNotRegistered(airlineAddress) 
    {
        //TODO: Emit event if this is successful.
        flightSuretyData.registerAirline(airlineAddress, airlineName, msg.sender);
    }

    function vote(address airlineAddress) 
        public
        requireIsOperational
        requireAirlineRegistered(msg.sender)
        requireAirlineFunded(msg.sender)
        requireVoterNotVotedForAirline(msg.sender, airlineAddress)
        requireAirlineStored(airlineAddress)       
    {
        flightSuretyData.vote(airlineAddress, msg.sender);
    }

    function fundAirline(uint256 amountInWei)
        external
        payable
        requireIsOperational
        requireAirlineRegistered(msg.sender)
        requireSenderIsNotAContract(msg.sender)
        requireValueIsSufficient(amountInWei)
        requireAirlineNotFunded(msg.sender)
        requireSenderIsNotAContract(msg.sender)
    {
        //TODO: Emit event to say that airline got funded.
        flightSuretyData.fundAirline.value(msg.value)(msg.sender, amountInWei);
    }

    //TODO: Remove
    function getAirlineFunding() public view
        requireIsOperational
        requireAirlineStored(msg.sender)
        returns (uint256){
        return flightSuretyData.getAirlineFunding(msg.sender);
    }

    function getAirlineName(address airlineAddress) external view returns(string){
        return flightSuretyData.getAirlineName(airlineAddress);
    }

    function registerFlight(uint256 departureTimestamp, string flightNumber, string destination)
        public
        requireIsOperational
        requireSenderIsNotAContract(msg.sender)
        requireAirlineRegistered(msg.sender)
        requireAirlineFunded(msg.sender)
        requireFlightNotRegistered(flightCode)
        returns (bool)
    {
        bytes32 flightCode = getFlightKey(msg.sender, flightNumber, departureTimestamp);
        return flightSuretyData.registerFlight(flightCode, msg.sender, departureTimestamp, flightNumber, destination);
    }

    function buyInsurance(bytes32 flightCode) 
        external
        payable
        requireIsOperational
        requireSenderIsNotAContract(msg.sender)
        requireInsuranaceNotPaid(msg.sender, flightCode)
        requireMessageHasValue
        requireFlightRegistered(flightCode)
    {
        bytes32 flightCode = getFlightKey(msg.sender, flightNumber, departureTimestamp);
        flightSuretyData.buyInsurance.value(msg.value)(msg.sender, flightCode);
    }

    function creditInsurees(string flightCode)
        external
        requireIsOperational
        requireSenderIsNotAContract(msg.sender)
        requireContractOwner
        returns (bool)

    {
        return flightSuretyData.creditInsurees(flightCode);
    }

    function getCreditForPassenger()
        external view
        requireIsOperational
        requireSenderIsNotAContract(msg.sender)
        requirePassengerExists(msg.sender)
        returns (uint256)
    {
        return flightSuretyData.getCreditForPassenger(msg.sender);
    }

    function withdraw()
        external payable
        requireIsOperational
        requirePassengerExists(msg.sender)
        requireSenderIsNotAContract(msg.sender)
        requirePassengerHasCredit(msg.sender)
    {
        flightSuretyData.withdraw(msg.sender);
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal pure {

        //TODO: Remove Pure and Implement.
        bytes32 key = keccak256(abi.encodePacked(flight, airline));
        require(flights[key].isRegistered, "Flight is not registered.");

        flights[key].updatedTimestamp = timestamp;
        flights[key].statusCode = statusCode;

        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            flightSuretyData.creditInsurees(flight);
        }
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3]) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns (uint8[3]) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}
