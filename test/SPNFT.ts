import { expect } from "chai";
import { ethers } from "hardhat";
import { InCollectionSPNFT, SeparateCollectionSPNFT, StakingRewardToken, VRFCoordinatorMock } from "../typechain-types"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"
import { time } from "@nomicfoundation/hardhat-network-helpers"

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

    describe("Payout", function () {
      it("Should send the payout to the owner", async function () {
        const { inCollectionSPNFT, owner } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);
        await expect(inCollectionSPNFT.withdraw()).to.changeEtherBalance(owner, MINT_PRICE);
      });

      it("Should not allow non-owners to withdraw", async function () {
        const { inCollectionSPNFT, otherAccount } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await expect(inCollectionSPNFT.connect(otherAccount).withdraw()).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });

    describe("Staking", function () {
      it("Should allow staking of revealed tokens", async function () {
        const { inCollectionSPNFT, vrfCoordinator, owner } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);
        await vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress());
        const stakeTx = await inCollectionSPNFT.stake(0);
        const stakeBlock = await stakeTx.getBlock();
        stakeBlock?.timestamp;
        expect((await inCollectionSPNFT.stakingInfo(0)).stakedAt).to.equal(stakeBlock?.timestamp);
      });

      it("Should emit a Staked event", async function () {
        const { inCollectionSPNFT, vrfCoordinator, owner } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);
        vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress())
        await expect(inCollectionSPNFT.stake(0)).to.emit(inCollectionSPNFT, "Staked").withArgs(0);
      });

      it("Should not transfer the token away from the owner", async function () {
        const { inCollectionSPNFT, vrfCoordinator, owner } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);
        await vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress());
        await inCollectionSPNFT.stake(0);
        expect(await inCollectionSPNFT.ownerOf(0)).to.equal(owner.address);
      });

      it("Should not allow staking of unrevealed tokens", async function () {
        const { inCollectionSPNFT } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await expect(inCollectionSPNFT.stake(0)).to.be.revertedWith("SPNFT: not revealed");
      });

      it("Should not allow staking of already staked tokens", async function () {
        const { inCollectionSPNFT, vrfCoordinator } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);
        await vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress());
        await inCollectionSPNFT.stake(0);
        await expect(inCollectionSPNFT.stake(0)).to.be.revertedWith("SPNFT: already staked");
      });

      it("Should not allow staking by non-owners", async function () {
        const { inCollectionSPNFT, vrfCoordinator, otherAccount } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);
        await vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress());
        await expect(inCollectionSPNFT.connect(otherAccount).stake(0)).to.be.revertedWith("SPNFT: not owner");
      });

      it("Should not allow staking of non-existent tokens", async function () {
        const { inCollectionSPNFT } = await deployFixtures();
        await expect(inCollectionSPNFT.stake(0)).to.be.revertedWith("SPNFT: nonexistent token");
      });

      it("Should allow unstaking of staked tokens", async function () {
        const { inCollectionSPNFT, vrfCoordinator } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);
        await vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress());
        await inCollectionSPNFT.stake(0);
        await expect(inCollectionSPNFT.unstake(0)).not.to.be.reverted;
        expect((await inCollectionSPNFT.stakingInfo(0)).stakedAt).to.equal(0);
      });

      it("Should emit an Unstaked event", async function () {
        const { inCollectionSPNFT, vrfCoordinator } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);
        await vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress());
        await inCollectionSPNFT.stake(0);
        await expect(inCollectionSPNFT.unstake(0)).to.emit(inCollectionSPNFT, "Unstaked").withArgs(0);
      });

      it("Should not allow unstaking of unstaked tokens", async function () {
        const { inCollectionSPNFT } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await expect(inCollectionSPNFT.unstake(0)).to.be.revertedWith("SPNFT: not staked");
      });

      it("Should automatically claim rewards when unstaking", async function () {
        const { inCollectionSPNFT, vrfCoordinator } = await deployFixtures();

        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);
        await vrfCoordinator.fulfillRandomWordsWithOverride(1, await inCollectionSPNFT.getAddress(), [19]);
        await inCollectionSPNFT.stake(0);

        await time.setNextBlockTimestamp(await time.latest() + 60 * 60 * 24 * 365);
        await expect(inCollectionSPNFT.unstake(0)).to.emit(inCollectionSPNFT, "Claimed").withArgs(0, ethers.parseEther("5"));
      });

      it("Should allow the staker to claim pending rewards", async function () {
        const { inCollectionSPNFT, vrfCoordinator, owner } = await deployFixtures();
        const rewardToken: StakingRewardToken = await ethers.getContractAt("StakingRewardToken", await inCollectionSPNFT.rewardToken());

        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);
        await vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress());
        await inCollectionSPNFT.stake(0);
        await expect(inCollectionSPNFT.claimRewards(0)).not.to.be.reverted;
      });

      it("Should allow the owner to update the reward configs", async function () {
        const { inCollectionSPNFT } = await deployFixtures();
        await expect(inCollectionSPNFT.setRewardRate(ethers.parseEther("0.1"))).not.to.be.reverted;
        expect(await inCollectionSPNFT.rewardRate()).to.equal(ethers.parseEther("0.1"));

        await expect(inCollectionSPNFT.setRewardConversionRatio(1)).not.to.be.reverted;
        expect(await inCollectionSPNFT.rewardConversionRatio()).to.equal(1);
      });

      it("Should not allow others to update the reward configs", async function () {
        const { inCollectionSPNFT, otherAccount } = await deployFixtures();
        await expect(inCollectionSPNFT.connect(otherAccount).setRewardRate(ethers.parseEther("0.1"))).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Should not allow staked tokens to be transferred", async function () {
        const { inCollectionSPNFT, vrfCoordinator, owner, otherAccount } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);

        await vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress());
        await inCollectionSPNFT.stake(0);

        await expect(inCollectionSPNFT.transferFrom(owner.address, otherAccount.address, 0)).to.be.revertedWith("SPNFT: staked tokens cannot be transferred");
      });

      it("Should allow unstaked tokens to be freely transferred", async function () {
        const { inCollectionSPNFT, vrfCoordinator, owner, otherAccount } = await deployFixtures();
        await inCollectionSPNFT.mint({ value: MINT_PRICE });
        await inCollectionSPNFT.reveal(0);

        await vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress());
        await inCollectionSPNFT.stake(0);
        await inCollectionSPNFT.unstake(0);

        await expect(inCollectionSPNFT.transferFrom(owner.address, otherAccount.address, 0)).not.to.be.reverted;
      });

      describe("Rewards", function () {
        let inCollectionSPNFT: InCollectionSPNFT;

        beforeEach(async function () {
          const fixtures = await deployFixtures();
          inCollectionSPNFT = fixtures.inCollectionSPNFT;
          const vrfCoordinator = fixtures.vrfCoordinator;

          await inCollectionSPNFT.mint({ value: MINT_PRICE });
          await inCollectionSPNFT.reveal(0);
          await vrfCoordinator.fulfillRandomWords(1, await inCollectionSPNFT.getAddress());
          await inCollectionSPNFT.stake(0);
        });

        it("Should be properly calculated after 36.5 days", async function () {
          // 5% APY * 36.5 days = 0.5 tokens
          await time.setNextBlockTimestamp(await time.latest() + 60 * 60 * 24 * 36.5);
          await expect(inCollectionSPNFT.claimRewards(0)).to.changeTokenBalance(await ethers.getContractAt("StakingRewardToken", await inCollectionSPNFT.rewardToken()), await inCollectionSPNFT.owner(), ethers.parseEther("0.5"));
        });

        it("Should be properly calculated after 6 months", async function () {
          // 5% APY * 6 months = 2.5 tokens
          await time.setNextBlockTimestamp(await time.latest() + 60 * 60 * 24 * 365 / 2);
          await expect(inCollectionSPNFT.claimRewards(0)).to.changeTokenBalance(await ethers.getContractAt("StakingRewardToken", await inCollectionSPNFT.rewardToken()), await inCollectionSPNFT.owner(), ethers.parseEther("2.5"));
        });

        it("Should be properly calculated after 1 year", async function () {
          // 5% APY * 1 year = 5 tokens
          await time.setNextBlockTimestamp(await time.latest() + 60 * 60 * 24 * 365);
          await expect(inCollectionSPNFT.claimRewards(0)).to.changeTokenBalance(await ethers.getContractAt("StakingRewardToken", await inCollectionSPNFT.rewardToken()), await inCollectionSPNFT.owner(), ethers.parseEther("5"));
        });

        it("Should be properly calculated after 5 years", async function () {
          // 5% APY * 5 years = 25 tokens
          await time.setNextBlockTimestamp(await time.latest() + 60 * 60 * 24 * 365 * 5);
          await expect(inCollectionSPNFT.claimRewards(0)).to.changeTokenBalance(await ethers.getContractAt("StakingRewardToken", await inCollectionSPNFT.rewardToken()), await inCollectionSPNFT.owner(), ethers.parseEther("25"));
        });
      });
    });
  });
});