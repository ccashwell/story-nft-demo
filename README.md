# Story Protocol Take-Home Assignment

## Exercise

The goal of this exercise is to design and implement a SP NFT (ERC-721) with different metadata revealing approaches. The solution should leverage Chainlink for random number generation and allow for two distinct revealing approaches, with the potential to support future approaches.

### Requirements

1. Revealing approaches: Implement two revealing approaches below, and the operator of SP NFT contract should be able to choose different revealing approaches before revealing started.
  
    1.1 In-Collection Revealing: The SP NFT and the revealed SP NFT reside in the same ERC-721 smart contract. The revealing approach switches the SP NFT's metadata to another set, effectively transforming it into the revealed NFT.

    1.2 Separate Collection Revealing: The SP NFT and the revealed SP NFT are stored in separate ERC-721 smart contracts. When revealing, the system burns the SP NFT, mints a new NFT in the revealed SP NFT smart contract, and transfers it to the end user.

2. On-Chain Metadata: All metadata are stored on-chain. The metadata should be returned and generated on the fly within the  `tokenURI()`  function. [OpenSea metadata standard](https://docs.opensea.io/docs/metadata-standards)

3. Chainlink Integration: You should integrate Chainlink to generate random numbers. This involves setting up a Chainlink VRF Coordinator, a Key Hash, and a fee. Upon receiving the random number, the system should select the corresponding metadata.

4. Purchase and Return: Buy the SP NFT with Ether and return excessive fund if the final mint price is lower than the purchase price.

5. (bonus) Staking and Claim: Stake the revealed SP NFT to earn 5% APY in ERC20. Owner can claim the rewards at any time.

### Notes

- Remember to write well-documented code, including function/contract level comments.
- Try to optimize for gas where possible.
- Consider edge cases and add necessary checks in your contracts.
- Contracts should be developed using Solidity and you should use Foundry or Hardhat for testing.
- Consider contract security and avoid known vulnerabilities.

## Design Plan

### Overview

The smart contract aims to implement an SP NFT (Story Protocol NFT) using the ERC-721 standard. It will feature two distinct metadata revealing approaches and integrate Chainlink for random number generation. The contract will also handle purchase and return logic, as well as staking and claim features.

### Libraries and Dependencies

- TBD

### Contract Design

#### Features and Functions

- TBD

#### Data Structures

- TBD

#### Modifiers

- TBD

#### Events

- TBD

#### Security Considerations

- TBD

#### Gas Optimizations

- TBD

#### Test Cases

- TBD
