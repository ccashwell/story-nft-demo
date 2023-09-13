import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@chainlink/hardhat-chainlink";
import "hardhat-gas-reporter";
import "hardhat-tracer";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  gasReporter: {
    currency: "USD",
    enabled: true,
  }
};

export default config;
