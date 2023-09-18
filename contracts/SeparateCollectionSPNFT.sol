// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./AbstractSPNFT.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title SomeOtherCollection
 * @notice This is a simple example of an ERC721 contract that stores the metadata
 * received from the SPNFT contract. This is a simplified example, but it should be
 * sufficient to demonstrate the concept.
 */
contract SomeOtherCollection is ERC721, ERC721URIStorage, Ownable {
    event Minted(address indexed to, uint256 indexed tokenId, string metadata);

    constructor() ERC721("Separately Revealed NFT", "SPNFT") {}

    function mint(address to, uint256 tokenId, string memory metadata) public onlyOwner {
        _mint(to, tokenId);
        _setTokenURI(tokenId, metadata);
        emit Minted(to, tokenId, metadata);
    }

    function _burn(uint256 tokenId) internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}

/**
 * @title SeparateCollectionSPNFT
 * @dev This contract implements the SPNFT interface and addresses the "separate collection" use case.
 * In this use case, the token metadata is generated from a set of possible values, and the randomness
 * is used to select the values for a given token. Rather than storing the randomness in the contract,
 * it is used to generate the metadata string (JSON) for the token, and a new token is minted in a
 * separate collection contract. The original token is burned upon reveal, and the user will receive
 * the new token upon completion of the reveal workflow.
 */
contract SeparateCollectionSPNFT is AbstractSPNFT {
    /// @dev The collection that will store the revealed tokens.
    SomeOtherCollection public _collection;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _mintCost,
        address _vrfCoordinator,
        uint64 _vrfSubscriptionId,
        bytes32 _vrfKeyHash
    ) AbstractSPNFT(
        _name,
        _symbol,
        _mintCost,
        _vrfCoordinator,
        _vrfSubscriptionId,
        _vrfKeyHash
    ) {
        // Deploy the collection contract. Probably want to use a factory
        // contract or pass this to the constructor in a real application.
        _collection = new SomeOtherCollection();
    }

    /**
     * @dev Generate the metadata for a given token.
     * @notice This is not really an ideal way to store the possible metadata strings,
     * but it's a simple way to do it for this example. In a real application, you'd
     * probably want to store the strings in a separate contract and/or use a more
     * efficient encoding scheme. At the very least, you wouldn't want to publish all
     * of the possible values in the contract bytecode ahead of reveal like this.
     * @param tokenId The token ID for which to generate the metadata.
     * @param tokenRandomness The randomness for the token.
     */
    function generateMetadata(uint256 tokenId, uint256 tokenRandomness) internal view virtual override returns (string memory) {
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
            textureIndex = (tokenRandomness % (textures.length - 1)) + 1;
            flavorIndex = (tokenRandomness % (flavors.length - 1)) + 1;
            typeIndex = (tokenRandomness % (types.length - 1)) + 1;
        }

        return
            string(
                abi.encodePacked(
                    '{',
                    '"name":"', symbol(), ' #', Strings.toString(tokenId), '",',
                    '"description":"', name(), '",',
                    '"attributes":[',
                    '{"trait_type":"Texture","value":"', textures[textureIndex], '"},',
                    '{"trait_type":"Flavor","value":"', flavors[flavorIndex], '"},',
                    '{"trait_type":"Type","value":"', types[typeIndex], '"}',
                    "]}"
                )
            );
    }

    /**
     * @dev Handle the reveal of a token by storing the randomness internally.
     * @param tokenId The token ID to reveal.
     * @param tokenRandomness The randomness for the token.
     */
    function _handleReveal(uint256 tokenId, uint256 tokenRandomness) internal override {
        address owner = ownerOf(tokenId);
        _burn(tokenId);
        _collection.mint(owner, tokenId, generateMetadata(tokenId, tokenRandomness));
        emit Revealed(tokenId);
    }

    /**
     * @dev Transfer the ownership of the revealed collection to a new owner.
     * @param newOwner The address of the new owner.
     */
    function transferRevealedCollection(address newOwner) public onlyOwner {
        _collection.transferOwnership(newOwner);
    }
}