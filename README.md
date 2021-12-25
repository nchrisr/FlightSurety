# FlightSurety

FlightSurety application as part of Udacity's Blockchain course.

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

## How to run

- Run `npm install` to install modules
- Run `truffle migrate` to build smart contracts.
- Run `npm run dapp` to start front-end dapp.
- Run `npm run server` to start the Server (oracles).

## To run truffle tests
- `truffle test`

## Dapp Client
- `http://localhost:8000`

## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)

## Other Info
- `2_deploy_contracts.js` specifies 'http://localhost:7545' **(Ganache GUI)** as the VM for deploying the contracts. This can be changed to 'http://localhost:8545' if using Ganache CLI.
- In src/server/server.js line 58 allows random status codes to be sent back. This can be changed to STATUS_CODE_LATE_AIRLINE, to test what happens if an airline is late.
