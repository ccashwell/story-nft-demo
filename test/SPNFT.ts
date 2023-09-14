import { expect } from "chai";
import { ethers } from "hardhat";
import { SPNFT, VRFCoordinatorMock } from "../typechain-types"

enum RevealingApproach {
  INTERNAL = 0,
  EXTERNAL = 1,
};

const MINT_PRICE = ethers.parseEther("0.1");

describe("SPNFT Tests", function () {
  async function deployFixtures(revealingApproach: RevealingApproach = RevealingApproach.INTERNAL) {
    const [owner, otherAccount] = await ethers.getSigners();

    const VRFC = await ethers.getContractFactory("VRFCoordinatorMock");
    const SPNFT = await ethers.getContractFactory("SPNFT");

    const vrfCoordinator = await VRFC.deploy();
    await vrfCoordinator.createSubscription();
    await vrfCoordinator.fundSubscription(1, ethers.parseEther("1"));

    const spnft = await SPNFT.deploy(revealingApproach, MINT_PRICE, await vrfCoordinator.getAddress(), 1, "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc");
    await vrfCoordinator.addConsumer(1, await spnft.getAddress());

    return { spnft, vrfCoordinator, subId: 1, revealingApproach, owner, otherAccount };
  }

  describe("E2E", function () {
    describe("Deployment", function () {
      it("Should set the right revealing approach", async function () {
        const { spnft: internallyRevealedSPNFT } = await deployFixtures(RevealingApproach.INTERNAL);
        expect(await internallyRevealedSPNFT.revealingApproach()).to.equal(RevealingApproach.INTERNAL);

        const { spnft: externallyRevealedSPNFT } = await deployFixtures(RevealingApproach.EXTERNAL);
        expect(await externallyRevealedSPNFT.revealingApproach()).to.equal(RevealingApproach.EXTERNAL);
      });

      it("Should set the right owner", async function () {
        const { spnft, owner } = await deployFixtures();
        expect(await spnft.owner()).to.equal(owner.address);
      });

      it("Should set the right token name", async function () {
        const { spnft } = await deployFixtures();
        expect(await spnft.name()).to.equal("Story Noodle NFT");
      });

      it("Should set the right token symbol", async function () {
        const { spnft } = await deployFixtures();
        expect(await spnft.symbol()).to.equal("SNOODLE");
      });
    });

    describe("Minting", function () {
      it("Should allow minting", async function () {
        const { spnft, owner } = await deployFixtures();
        await spnft.mint({ value: MINT_PRICE });
        expect(await spnft.balanceOf(owner.address)).to.equal(1);
      });

      it("Should disallow underpriced minting", async function () {
        const { spnft, owner } = await deployFixtures();
        await expect(spnft.mint({ value: ethers.parseEther("0.09") })).to.be.revertedWith("SPNFT: underpayment");
        expect(await spnft.balanceOf(owner.address)).to.equal(0);
      });

      it("Should send overpayment back to the minter", async function () {
        const { spnft, owner } = await deployFixtures();
        await spnft.mint({ value: ethers.parseEther("0.2") });
        const contractBalance = await ethers.provider.getBalance(await spnft.getAddress());
        expect(contractBalance).to.equal(MINT_PRICE);
      });

      it("Should have default metadata", async function () {
        const { spnft } = await deployFixtures();
        await spnft.mint({ value: MINT_PRICE });
        const tokenURI = await spnft.tokenURI(0);
        expect(tokenURI).to.equal(JSON.stringify({
          name: "Snoodle #0",
          description: "Story Noodle NFT.",
          attributes: [
            { trait_type: "Texture", value: "unrevealed" },
            { trait_type: "Flavor", value: "unrevealed" },
            { trait_type: "Type", value: "unrevealed" },
          ]
        }));
      });

      it("Should emit a Minted event", async function () {
        const { spnft, owner } = await deployFixtures();
        await expect(spnft.mint({ value: MINT_PRICE })).to.emit(spnft, "Minted").withArgs(owner.address, 0);
      });
    });

    describe("Revealing", function () {
      let spnft: SPNFT;
      let vrfCoordinator: VRFCoordinatorMock;

      beforeEach(async function () {
        const fixtures = await deployFixtures();
        spnft = fixtures.spnft;
        vrfCoordinator = fixtures.vrfCoordinator;
        await spnft.mint({ value: MINT_PRICE });
      });

      it("Should initiate a VRF request", async function () {
        await expect(spnft.reveal(0)).to.emit(vrfCoordinator, "RandomWordsRequested");
      });

      it("Should capture the VRF response", async function () {
        await spnft.reveal(0);
        await vrfCoordinator.fulfillRandomWordsWithOverride(1, await spnft.getAddress(), [123456789]);
        expect(await spnft.randomness(0)).to.equal(123456789);
      });

      it("Should emit a Revealed event", async function () {
        await spnft.reveal(0);
        await expect(vrfCoordinator.fulfillRandomWords(1, await spnft.getAddress())).to.emit(spnft, "Revealed").withArgs(0);
      });

      it("Should unlock the token metadata", async function () {
        await spnft.reveal(0);

        // we take this VRF value % 20 and add 1 to get a value between 1 and 20,
        // so 19 results in the last value of each trait => [mushy, salty, angel hair]
        await vrfCoordinator.fulfillRandomWordsWithOverride(1, await spnft.getAddress(), [19]);
        const tokenURI = await spnft.tokenURI(0);
        expect(tokenURI).to.equal(JSON.stringify({
          name: "Snoodle #0",
          description: "Story Noodle NFT.",
          attributes: [
            { trait_type: "Texture", value: "mushy" },
            { trait_type: "Flavor", value: "salty" },
            { trait_type: "Type", value: "angel hair" },
          ]
        }));
      });
    });
  });
});
