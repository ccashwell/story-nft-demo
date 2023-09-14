import 'dotenv/config'

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "hardhat-tracer";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  gasReporter: {
    currency: "USD",
    enabled: true,
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [`0x${process.env.SEPOLIA_PRIVATE_KEY}`],
    }
  }
};

export default config;
