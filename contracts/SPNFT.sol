// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SPNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;

    /// @dev Placeholder metadata for unrevealed NFTs.
    string public constant UNREVEALED_METADATA =
        string(
            abi.encodePacked(
                '{"name": "Unrevealed SP NFT", "description": "Story Protocol NFT.", "attributes": []}'
            )
        );

    /// @dev The counter for token IDs.
    Counters.Counter private _tokenIdCounter;

    /// @dev The approach to revealing the NFTs.
    enum RevealingApproach { IN_COLLECTION, SEPARATE_COLLECTION }
    RevealingApproach public revealingApproach;

    /// @dev Whether a given token has been revealed.
    mapping (uint256 => bool) public revealed;

    /**
     * @dev Construct a new SPNFT contract.
     * @param _revealingApproach The approach to revealing the NFTs.
     */
    constructor(RevealingApproach _revealingApproach) ERC721("Example SP NFT", "ESPNFT") {
        revealingApproach = _revealingApproach;
    }

    /**
     * @dev Mint a token to the caller. See {ERC721-_safeMint}.
     */
    function mint() public payable {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
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
     * @dev Retrieve the data URI containing the metadata for a given token. See {IERC721Metadata-tokenURI}.
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
        if (revealed[tokenId]) {
            return super.tokenURI(tokenId);
        } else {
            return UNREVEALED_METADATA;
        }
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
}
