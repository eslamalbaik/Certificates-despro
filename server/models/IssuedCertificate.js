import db from "../utils/localDB.js";

const collection = db.collection("issuedCertificates");

const IssuedCertificate = {
  find: (query) => collection.find(query),
  findOne: (query) => collection.findOne(query),
  create: (data) => collection.create(data),
};

export default IssuedCertificate;
