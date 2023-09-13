import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  gasReporter: {
    currency: "USD",
    enabled: true,
  }
};

export default config;
