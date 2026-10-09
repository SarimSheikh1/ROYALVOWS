import { Package, Service } from "./models.js";
export async function configurePackageOffer() {
  await Service.updateOne({ name: "Live sound coordination" }, { $set: { includedWithPackage: true, archived: false, description: "Complimentary sound system with every wedding collection." }, $setOnInsert: { name: "Live sound coordination", rate: 0, unit: "event" } }, { upsert: true });
  await Service.updateOne({ name: "Complimentary dance (10 minutes)" }, { $set: { includedWithPackage: true, archived: false, rate: 0, unit: "event", description: "A complimentary 10-minute dance with every wedding collection." } }, { upsert: true });
  await Package.updateMany({ archived: false }, { $addToSet: { inclusions: { $each: ["Complimentary sound system", "Complimentary dance (10 minutes)"] } } });
}