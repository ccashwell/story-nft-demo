// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./AbstractSPNFT.sol";

contract InCollectionSPNFT is AbstractSPNFT {
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
        RevealingApproach.IN_COLLECTION,
        _mintCost,
        _vrfCoordinator,
        _vrfSubscriptionId,
        _vrfKeyHash
    ) {}

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
        randomness[tokenId] = tokenRandomness;
        emit Revealed(tokenId);
    }
}
