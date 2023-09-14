// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AbstractSPNFT
 * @dev This contract is a simple example of an NFT that uses Chainlink VRF to reveal metadata.
 */
abstract contract AbstractSPNFT is
    ERC721,
    ERC721Burnable,
    Ownable,
    VRFConsumerBaseV2
{
    using Counters for Counters.Counter;

    event Minted(address indexed to, uint256 indexed tokenId);
    event Revealed(uint256 indexed tokenId);

    /// @dev The counter for token IDs.
    Counters.Counter private _tokenIdCounter;

    /// @dev The cost to mint a token.
    uint256 public mintCost;

    /// @dev Chainlink VRF variables.
    VRFCoordinatorV2Interface immutable VRF_COORDINATOR;
    uint64 immutable VRF_SUBSCRIPTION_ID;
    bytes32 immutable VRF_KEY_HASH;

    /// @dev VRF request ID to token ID mapping.
    mapping(uint256 => uint256) requests;

    /// @dev Randomness for a given token.
    mapping(uint256 => uint256) public randomness;

    /**
     * @dev Construct a new SPNFT contract.
     * @param _mintCost The cost to mint a token.
     * @param _vrfCoordinator The address of the VRF coordinator.
     * @param _vrfSubscriptionId The subscription ID for the VRF.
     * @param _vrfKeyHash The key hash for the VRF.
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _mintCost,
        address _vrfCoordinator,
        uint64 _vrfSubscriptionId,
        bytes32 _vrfKeyHash
    ) ERC721(_name, _symbol) VRFConsumerBaseV2(_vrfCoordinator) {
        mintCost = _mintCost;

        VRF_COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        VRF_SUBSCRIPTION_ID = _vrfSubscriptionId;
        VRF_KEY_HASH = _vrfKeyHash;
    }

    /**
     * @dev Mint a token to the caller. See {ERC721-_safeMint}.
     */
    function mint() public payable {
        require(msg.value >= mintCost, "SPNFT: underpayment");
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
        if (msg.value > mintCost) {
            payable(msg.sender).transfer(msg.value - mintCost);
        }

        emit Minted(msg.sender, tokenId);
    }

    /**
     * @dev Burn a token. See {ERC721Burnable-burn}.
     * @param tokenId The token ID to burn.
     */
    function _burn(
        uint256 tokenId
    ) internal virtual override(ERC721) {
        super._burn(tokenId);
    }

    /**
     * @dev Retrieve the metadata for a given token. See {IERC721Metadata-tokenURI}.
     * @notice This function computes the metadata on-chain using stored randomness,
     * which saves a TON of gas over storing it when we receive the value from the
     * Chainlink VRF. This method is primarily used off-chain, so we can essentially
     * ignore the high gas overhead.
     * @param tokenId The token ID for which to retrieve the URI
     */
    function tokenURI(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC721)
        returns (string memory)
    {
        require(tokenId < _tokenIdCounter.current(), "SPNFT: nonexistent token");
        return generateMetadata(tokenId, randomness[tokenId]);
    }

    /**
     * @dev Generate the metadata for a given token.
     * @notice This is not really an ideal way to store the possible metadata strings,
     * but it's a simple way to do it for this example. In a real application, you'd
     * probably want to store the strings in a separate contract and/or use a more
     * efficient encoding scheme. At the very least, you wouldn't want to publish all
     * of the possible values in the contract bytecode ahead of time like this.
     * @param tokenId The token ID for which to generate the metadata.
     * @param tokenRandomness The randomness for the token.
     */
    function generateMetadata(uint256 tokenId, uint256 tokenRandomness) internal view virtual returns (string memory);

    /**
     * @dev Check whether a given interface is supported. See {IERC165-supportsInterface}.
     * @param interfaceId The interface ID to check for support.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Reveal a token.
     * @param tokenId The token ID to reveal.
     */
    function reveal(uint256 tokenId) public {
        require(tokenId < _tokenIdCounter.current(), "SPNFT: nonexistent token");
        require(ownerOf(tokenId) == msg.sender, "SPNFT: not owner");
        require(randomness[tokenId] == 0, "SPNFT: already revealed");

        // Request randomness from the Chainlink VRF. Note that all of these
        // variables *could* be immutables, but we neither gain nor lose any
        // value by keeping the confirmations, gasLimit and numWords inline.
        uint256 requestId = VRF_COORDINATOR.requestRandomWords(
            VRF_KEY_HASH,
            VRF_SUBSCRIPTION_ID,
            3,
            750_000,
            1
        );

        requests[requestId] = tokenId;
    }

    /**
     * @dev Callback for VRF randomness.
     * @param requestId The request ID.
     * @param randomWords The random words.
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 tokenId = requests[requestId];
        delete requests[requestId]; // tiny gas refund
        _handleReveal(tokenId, randomWords[0]);
    }

    /**
     * @dev Handle the reveal of a token.
     * @param tokenId The token ID to reveal.
     * @param tokenRandomness The randomness for the token.
     */
    function _handleReveal(uint256 tokenId, uint256 tokenRandomness) internal virtual;

    /**
     * @dev Check whether a token has been revealed.
     * @param tokenId The token ID to check.
     */
    function revealed(uint256 tokenId) public view returns (bool) {
        return randomness[tokenId] != 0;
    }

    /**
     * @dev Withdraw the contract balance to the owner.
     */
    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
