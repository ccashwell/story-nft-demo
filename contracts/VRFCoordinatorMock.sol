// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol";

contract VRFCoordinatorMock is VRFCoordinatorV2Mock {
    constructor() VRFCoordinatorV2Mock(100000000000000000, 1000000000) {}
}