require("@nomicfoundation/hardhat-toolbox");
try { require("dotenv").config(); } catch (_) {}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    opnTestnet: {
      url: "https://testnet-rpc.iopn.tech",
      chainId: 984,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      opnTestnet: process.env.ETHERSCAN_API_KEY || "",
    },
  },
};
