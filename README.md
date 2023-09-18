# Story Protocol Take-Home Assignment

## Exercise

The goal of this exercise is to design and implement a SP NFT (ERC-721) with different metadata revealing approaches. The solution should leverage Chainlink for random number generation and allow for two distinct revealing approaches, with the potential to support future approaches.

### Requirements

- [x] 1. Revealing approaches: Implement two revealing approaches below, and the operator of SP NFT contract should be able to choose different revealing approaches before revealing started.
  
  - [x] 1.1 In-Collection Revealing: The SP NFT and the revealed SP NFT reside in the same ERC-721 smart contract. The revealing approach switches the SP NFT's metadata to another set, effectively transforming it into the revealed NFT.

  - [x] 1.2 Separate Collection Revealing: The SP NFT and the revealed SP NFT are stored in separate ERC-721 smart contracts. When revealing, the system burns the SP NFT, mints a new NFT in the revealed SP NFT smart contract, and transfers it to the end user.

- [x] 2. On-Chain Metadata: All metadata are stored on-chain. The metadata should be returned and generated on the fly within the  `tokenURI()`  function. [OpenSea metadata standard](https://docs.opensea.io/docs/metadata-standards)

- [x] 3. Chainlink Integration: You should integrate Chainlink to generate random numbers. This involves setting up a Chainlink VRF Coordinator, a Key Hash, and a fee. Upon receiving the random number, the system should select the corresponding metadata.

- [x] 4. Purchase and Return: Buy the SP NFT with Ether and return excessive fund if the final mint price is lower than the purchase price.

- [x] 5. (bonus) Staking and Claim: Stake the revealed SP NFT to earn 5% APY in ERC20. Owner can claim the rewards at any time.

### Notes

- [x] Remember to write well-documented code, including function/contract level comments.
- [x] Try to optimize for gas where possible.
- [x] Consider edge cases and add necessary checks in your contracts.
- [x] Contracts should be developed using Solidity and you should use Foundry or Hardhat for testing.
- [x] Consider contract security and avoid known vulnerabilities.

## Design Plan

### Overview

The smart contract aims to implement an SP NFT (Story Protocol NFT) using the ERC-721 standard. It will feature two distinct metadata revealing approaches and integrate Chainlink for random number generation. The contract will also handle purchase and return logic, as well as staking and claim features.

### Libraries and Dependencies

- OpenZeppelin: ERC-721 implementation with some basic extensions
- Chainlink: VRFConsumerBaseV2 for random number generation

### Contract Design

#### High-Level Overview

The contract is designed to be relatively simple, with the majority of the logic being handled by OpenZeppelin's ERC-721 implementation and Chainlink's VRFConsumerBaseV2. The contract is designed to be flexible and extensible, with the ability to add new revealing approaches in the future. The contract is also designed to be gas efficient, with metadata being generated on the fly within the `tokenURI()` function. It also implements a simple staking and claim feature, which allows users to stake their (revealed) NFTs and earn rewards at a constant rate of 5% APY.

#### Events

- `Minted`: emitted when an NFT is minted
- `Revealed`: emitted when an NFT is revealed
- `Staked`: emitted when an NFT is staked
- `Unstaked`: emitted when an NFT is unstaked
- `Claimed`: emitted when reward tokens are claimed

#### Security Considerations

- The contract uses OpenZeppelin's ERC-721 implementation, which is audited and widely used.
- The contract uses OpenZeppelin's `Ownable` contract to restrict access to certain functions.
- The contract uses Chainlink's `VRFConsumerBaseV2`, which is audited and widely used.
- The contract ensures that only a token's owner can reveal, stake or transfer it.
- The contract enforces owner-only access to config functions.
- The contract disallows transfer of staked NFTs.

#### Gas Optimizations

- The metadata is generated on the fly within the `tokenURI()` function. This approach is very gas efficient as it avoids actually storing the metadata on-chain and instead generates it as needed. The typical consumer of the metadata will be a web application, which means gas efficiency is not a major concern within the `tokenURI()` function.
- The contract uses OpenZeppelin's ERC-721 implementation, which is not the most gas efficient implementation. It would be prudent to either develop a custom ERC-721 implementation or use a more gas efficient implementation from the community, like ERC721A.
- Where possible, unused storage variables are deleted to earn a small gas refund.

#### Test Cases

- The contract has a relatively comprehensive test suite that covers all major functionality. The tests are written with Hardhat's Chai matchers and can be run with `npx hardhat test`.
- The tests written are E2E type tests, which means they test the contract as a whole. This is a good approach for a contract like this, as it is relatively simple demo project and does not have many moving parts. For more complex contracts, especially when not built on top of widely used implementations, it would be prudent to write more granular unit tests.
