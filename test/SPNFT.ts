import { expect } from "chai";
import { ethers } from "hardhat";

enum RevealingApproach {
  INTERNAL = 0,
  EXTERNAL = 1,
};

const MINT_PRICE = ethers.parseEther("0.1");

describe("SPNFT", function () {
  async function deployFixture(revealingApproach: RevealingApproach = RevealingApproach.INTERNAL) {
    const [owner, otherAccount] = await ethers.getSigners();

    const SPNFT = await ethers.getContractFactory("SPNFT");
    const spnft = await SPNFT.deploy(revealingApproach, MINT_PRICE);

    return { spnft, revealingApproach, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right revealing approach", async function () {
      const { spnft: internallyRevealedSPNFT } = await deployFixture(RevealingApproach.INTERNAL);
      expect(await internallyRevealedSPNFT.revealingApproach()).to.equal(RevealingApproach.INTERNAL);

      const { spnft: externallyRevealedSPNFT } = await deployFixture(RevealingApproach.EXTERNAL);
      expect(await externallyRevealedSPNFT.revealingApproach()).to.equal(RevealingApproach.EXTERNAL);
    });

    it("Should set the right owner", async function () {
      const { spnft, owner } = await deployFixture();
      expect(await spnft.owner()).to.equal(owner.address);
    });

    it("Should set the right token name", async function () {
      const { spnft } = await deployFixture();
      expect(await spnft.name()).to.equal("Example SP NFT");
    });

    it("Should set the right token symbol", async function () {
      const { spnft } = await deployFixture();
      expect(await spnft.symbol()).to.equal("ESPNFT");
    });
  });

  describe("Minting", function () {
    it("Should allow minting a token", async function () {
      const { spnft, owner } = await deployFixture();
      await spnft.mint({ value: MINT_PRICE });
      expect(await spnft.balanceOf(owner.address)).to.equal(1);
    });

    it("Should disallow underpriced minting", async function () {
      const { spnft, owner } = await deployFixture();
      await expect(spnft.mint({ value: ethers.parseEther("0.09") })).to.be.revertedWith("SPNFT: underpayment");
      expect(await spnft.balanceOf(owner.address)).to.equal(0);
    });

    it("Should send overpayment back to the minter", async function () {
      const { spnft, owner } = await deployFixture();
      await spnft.mint({ value: ethers.parseEther("0.2") });
      const contractBalance = await ethers.provider.getBalance(await spnft.getAddress());
      expect(contractBalance).to.equal(MINT_PRICE);
    });

    it("Should have default metadata", async function () {
      const { spnft } = await deployFixture();
      await spnft.mint({ value: MINT_PRICE });
      const tokenURI = await spnft.tokenURI(0);
      expect(tokenURI).to.equal(await spnft.UNREVEALED_METADATA());
    });
  });
});
