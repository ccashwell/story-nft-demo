// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SPNFT
 * @dev This contract is a simple example of an NFT that uses Chainlink VRF to reveal metadata.
 */
contract SPNFT is
    ERC721,
    ERC721URIStorage,
    ERC721Burnable,
    Ownable,
    VRFConsumerBaseV2
{
    using Counters for Counters.Counter;

    event Minted(address indexed to, uint256 indexed tokenId);
    event Revealed(uint256 indexed tokenId);

    /// @dev The counter for token IDs.
    Counters.Counter private _tokenIdCounter;

    /// @dev The approach to revealing the NFTs.
    enum RevealingApproach {
        IN_COLLECTION,
        SEPARATE_COLLECTION
    }
    RevealingApproach public revealingApproach;

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
     * @param _revealingApproach The approach to revealing the NFTs.
     * @param _mintCost The cost to mint a token.
     * @param _vrfCoordinator The address of the VRF coordinator.
     * @param _vrfSubscriptionId The subscription ID for the VRF.
     * @param _vrfKeyHash The key hash for the VRF.
     */
    constructor(
        RevealingApproach _revealingApproach,
        uint256 _mintCost,
        address _vrfCoordinator,
        uint64 _vrfSubscriptionId,
        bytes32 _vrfKeyHash
    ) ERC721("Story Noodle NFT", "SNOODLE") VRFConsumerBaseV2(_vrfCoordinator) {
        revealingApproach = _revealingApproach;
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
    ) internal virtual override(ERC721, ERC721URIStorage) {
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
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        require(tokenId < _tokenIdCounter.current(), "SPNFT: nonexistent token");
        return generateMetadata(tokenId, randomness[tokenId]);
    }
    
    function generateMetadata(uint256 tokenId, uint256 tokenRandomness) internal pure returns (string memory) {
      string[21] memory textures = [
            "unrevealed", "chewy", "crunchy", "slimy", "slippery", "soggy", "spongy",
            "squishy", "tender", "tough", "viscous", "gooey", "crispy", "leathery",
            "crumbly", "dry", "flaky", "grainy", "greasy", "gritty", "mushy"
        ];

        string[21] memory flavors = [
            "unrevealed", "sweet", "sour", "bitter", "savory", "spicy", "tart",
            "tangy", "rich", "bland", "buttery", "cheesy", "creamy", "eggy", "fatty",
            "fresh", "fruity", "garlicky", "herbal", "nutty", "salty"
        ];

        string[21] memory types = [
            "unrevealed", "fettuccine", "linguine", "penne", "rigatoni", "macaroni",
            "farfalle", "fusilli", "rotini", "cavatappi", "lasagna", "ravioli",
            "tortellini", "gnocchi", "orzo", "ramen", "soba", "udon", "rice noodles",
            "vermicelli", "angel hair"
        ];

        uint256 textureIndex;
        uint256 flavorIndex;
        uint256 typeIndex;

        if (tokenRandomness != 0) {
            textureIndex = (tokenRandomness % 20) + 1;
            flavorIndex = (tokenRandomness % 20) + 1;
            typeIndex = (tokenRandomness % 20) + 1;
        }

        return
            string(
                abi.encodePacked(
                    '{"name":"Snoodle #',
                    Strings.toString(tokenId),
                    '",',
                    '"description":"Story Noodle NFT.",',
                    '"attributes":[',
                    '{"trait_type":"Texture","value":"', textures[textureIndex], '"},',
                    '{"trait_type":"Flavor","value":"', flavors[flavorIndex], '"},',
                    '{"trait_type":"Type","value":"', types[typeIndex], '"}',
                    "]}"
                )
            );
    }

    /**
     * @dev Check whether a given interface is supported. See {IERC165-supportsInterface}.
     * @param interfaceId The interface ID to check for support.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Reveal a token.
     * @param tokenId The token ID to reveal.
     */
    function reveal(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "SPNFT: not owner");
        require(randomness[tokenId] == 0, "SPNFT: already revealed");

        // Request randomness from the Chainlink VRF. Note that all of these
        // variables *could* be immutables, but we neither gain nor lose any
        // value by keeping the confirmations, gasLimit and numWords inline.
        uint256 requestId = VRF_COORDINATOR.requestRandomWords(
            VRF_KEY_HASH,
            VRF_SUBSCRIPTION_ID,
            3,
            70_000,
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
        delete requests[requestId]; // tiny gas savings
        randomness[tokenId] = randomWords[0];

        emit Revealed(tokenId);
    }

    /**
     * @dev Check whether a token has been revealed.
     * @param tokenId The token ID to check.
     */
    function revealed(uint256 tokenId) public view returns (bool) {
        return randomness[tokenId] != 0;
    }
}
