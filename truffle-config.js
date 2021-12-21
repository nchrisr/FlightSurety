module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      network_id: '*',
      port: 7545
    }
  },
  // Configure compilers.
  compilers: {
    solc: {
      version: "^0.4.25"
    }
  }
};