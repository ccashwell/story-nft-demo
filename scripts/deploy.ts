import { ethers } from "hardhat";

async function main() {
  const SEPOLIA_VRF_COORDINATOR = "0x8103b0a8a00be2ddc778e6e7eaa21791cd364625";
  const SEPOLIA_VRF_KEYHASH = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
  const SEPOLIA_VRF_SUBSCRIPTION_ID = 5225;

  const inCollectionSPNFT = await ethers.deployContract("InCollectionSPNFT", [
    "Story Noodle NFT",
    "SNOODLE",
    ethers.parseEther("0.1"),
    SEPOLIA_VRF_COORDINATOR,
    SEPOLIA_VRF_SUBSCRIPTION_ID,
    SEPOLIA_VRF_KEYHASH,
  ]);

  await inCollectionSPNFT.waitForDeployment();

  console.log(
    `InCollectionSPNFT deployed to ${inCollectionSPNFT.target} @ ${await inCollectionSPNFT.getAddress()}`
  );

  const separateCollectionSPNFT = await ethers.deployContract("SeparateCollectionSPNFT", [
    "Story Noodle NFT",
    "SNOODLE",
    ethers.parseEther("0.1"),
    SEPOLIA_VRF_COORDINATOR,
    SEPOLIA_VRF_SUBSCRIPTION_ID,
    SEPOLIA_VRF_KEYHASH,
  ]);

  await separateCollectionSPNFT.waitForDeployment();

  console.log(
    `SeparateCollectionSPNFT deployed to ${separateCollectionSPNFT.target} @ ${await separateCollectionSPNFT.getAddress()}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
