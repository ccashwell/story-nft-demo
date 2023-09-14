import { expect } from "chai";
import { ethers } from "hardhat";
import { InCollectionSPNFT, SeparateCollectionSPNFT, VRFCoordinatorMock } from "../typechain-types"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"

const MINT_PRICE = ethers.parseEther("0.1");

describe("SPNFT Tests", function () {
  async function deployFixtures() {
    const [owner, otherAccount] = await ethers.getSigners();

    const VRFC = await ethers.getContractFactory("VRFCoordinatorMock");
    const InCollectionSPNFT = await ethers.getContractFactory("InCollectionSPNFT");
    const SeparateCollectionSPNFT = await ethers.getContractFactory("SeparateCollectionSPNFT");

    const vrfCoordinator = await VRFC.deploy();
    await vrfCoordinator.createSubscription();
    const subId = 1;
    const keyHash = "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";

    await vrfCoordinator.fundSubscription(subId, ethers.parseEther("1"));

    const inCollectionSPNFT = await InCollectionSPNFT.deploy(
      "Story Noodle NFT",
      "SNOODLE",
      MINT_PRICE,
      await vrfCoordinator.getAddress(),
      subId,
      keyHash,
    );

    const separateCollectionSPNFT = await SeparateCollectionSPNFT.deploy(
      "Story Noodle NFT",
      "SNOODLE",
      MINT_PRICE,
      await vrfCoordinator.getAddress(),
      subId,
      keyHash,
    );

    await vrfCoordinator.addConsumer(1, await inCollectionSPNFT.getAddress());
    await vrfCoordinator.addConsumer(1, await separateCollectionSPNFT.getAddress());

    return { inCollectionSPNFT, separateCollectionSPNFT, vrfCoordinator, subId, owner, otherAccount };
  }

  describe("E2E", function () {
    describe("Deployment", function () {
      it("Should set the right owner", async function () {
        const { inCollectionSPNFT, owner } = await deployFixtures();
        expect(await inCollectionSPNFT.owner()).to.equal(owner.address);
      });

      it("Should set the right token name", async function () {
        const { inCollectionSPNFT } = await deployFixtures();
        expect(await inCollectionSPNFT.name()).to.equal("Story Noodle NFT");
      });

      it("Should set the right token symbol", async function () {
        const { inCollectionSPNFT } = await deployFixtures();
        expect(await inCollectionSPNFT.symbol()).to.equal("SNOODLE");
      });
    });

    describe("Minting", function () {
      it("Should allow minting", async function () {
        const { inCollectionSPNFT, owner } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        expect(await inCollectionSPNFT.balanceOf(owner.address)).to.equal(1);
      });

      it("Should disallow underpriced minting", async function () {
        const { inCollectionSPNFT, owner } = await deployFixtures();
        await expect(inCollectionSPNFT.mint({ value: ethers.parseEther("0.09") })).to.be.revertedWith("SPNFT: underpayment");
        expect(await inCollectionSPNFT.balanceOf(owner.address)).to.equal(0);
      });

      it("Should send overpayment back to the minter", async function () {
        const { inCollectionSPNFT, owner } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: ethers.parseEther("0.2") });
        const contractBalance = await ethers.provider.getBalance(await inCollectionSPNFT.getAddress());
        expect(contractBalance).to.equal(MINT_PRICE);
      });

      it("Should have default metadata", async function () {
        const { inCollectionSPNFT } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        const tokenURI = await inCollectionSPNFT.tokenURI(0);
        expect(tokenURI).to.equal(JSON.stringify({
          name: "SNOODLE #0",
          description: "Story Noodle NFT",
          attributes: [
            { trait_type: "Texture", value: "unrevealed" },
            { trait_type: "Flavor", value: "unrevealed" },
            { trait_type: "Type", value: "unrevealed" },
          ]
        }));
      });

      it("Should emit a Minted event", async function () {
        const { inCollectionSPNFT, owner } = await deployFixtures();
        await expect(inCollectionSPNFT.mint({ value: MINT_PRICE })).to.emit(inCollectionSPNFT, "Minted").withArgs(owner.address, 0);
      });
    });

    describe("Revealing (IN_COLLECTION)", function () {
      let inCollectionSPNFT: InCollectionSPNFT;
      let vrfCoordinator: VRFCoordinatorMock;

      beforeEach(async function () {
        const fixtures = await deployFixtures();
        inCollectionSPNFT = fixtures.inCollectionSPNFT;
        vrfCoordinator = fixtures.vrfCoordinator;
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
      });

      it("Should initiate a VRF request", async function () {
        await expect(inCollectionSPNFT.reveal(0)).to.emit(vrfCoordinator, "RandomWordsRequested");
      });

      it("Should capture the VRF response", async function () {
        await inCollectionSPNFT.reveal(0);
        await vrfCoordinator.fulfillRandomWordsWithOverride(1, await inCollectionSPNFT.getAddress(), [123456789]);
        expect(await inCollectionSPNFT.randomness(0)).to.equal(123456789);
      });

      it("Should emit a Revealed event", async function () {
        await inCollectionSPNFT.reveal(0);
        await expect(vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress())).to.emit(inCollectionSPNFT, "Revealed").withArgs(0);
      });

      it("Should unlock the token metadata", async function () {
        await inCollectionSPNFT.reveal(0);

        // we take this VRF value % 20 and add 1 to get a value between 1 and 20,
        // so 19 results in the last value of each trait => [mushy, salty, angel hair]
        await vrfCoordinator.fulfillRandomWordsWithOverride(1, await inCollectionSPNFT.getAddress(), [19]);
        const tokenURI = await inCollectionSPNFT.tokenURI(0);
        expect(tokenURI).to.equal(JSON.stringify({
          name: "SNOODLE #0",
          description: "Story Noodle NFT",
          attributes: [
            { trait_type: "Texture", value: "mushy" },
            { trait_type: "Flavor", value: "salty" },
            { trait_type: "Type", value: "angel hair" },
          ]
        }));
      });
    });

    describe("Revealing (SEPARATE_COLLECTION)", function () {
      let separateCollectionSPNFT: SeparateCollectionSPNFT;
      let vrfCoordinator: VRFCoordinatorMock;
      let owner: HardhatEthersSigner;

      beforeEach(async function () {
        const fixtures = await deployFixtures();
        separateCollectionSPNFT = fixtures.separateCollectionSPNFT;
        vrfCoordinator = fixtures.vrfCoordinator;
        owner = fixtures.owner;

        await separateCollectionSPNFT.mint({ value: MINT_PRICE });
      });

      it("Should initiate a VRF request", async function () {
        await expect(separateCollectionSPNFT.reveal(0)).to.emit(vrfCoordinator, "RandomWordsRequested");
      });

      it("Should burn the token being revealed", async function () {
        await separateCollectionSPNFT.reveal(0);
        await vrfCoordinator.fulfillRandomWords(1, await separateCollectionSPNFT.getAddress())
        expect(await separateCollectionSPNFT.balanceOf(owner.address)).to.equal(0);
      });

      it("Should mint a new token with the revealed metadata", async function () {
        await separateCollectionSPNFT.reveal(0);
        await expect(
          vrfCoordinator.fulfillRandomWordsWithOverride(1, await separateCollectionSPNFT.getAddress(), [19])
        ).to.emit(await ethers.getContractAt("SomeOtherCollection", await separateCollectionSPNFT._collection()), "Minted").withArgs(
          owner.address,
          0,
          JSON.stringify({
            name: "SNOODLE #0",
            description: "Story Noodle NFT",
            attributes: [
              { trait_type: "Texture", value: "mushy" },
              { trait_type: "Flavor", value: "salty" },
              { trait_type: "Type", value: "angel hair" },
            ]
          })
        );
        expect(await separateCollectionSPNFT.balanceOf(owner.address)).to.equal(0);
      });

      it("Should emit a Revealed event", async function () {
        await separateCollectionSPNFT.reveal(0);
        await expect(vrfCoordinator.fulfillRandomWords(1, await separateCollectionSPNFT.getAddress())).to.emit(separateCollectionSPNFT, "Revealed").withArgs(0);
      });
    });
  });
});
