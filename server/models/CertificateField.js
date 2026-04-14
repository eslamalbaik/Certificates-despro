import db from "../utils/localDB.js";

const collection = db.collection("certificateFields");

const CertificateField = {
  find: (query) => collection.find(query),
  findOne: (query) => collection.findOne(query),
  create: (data) => collection.create(data),
};

export default CertificateField;
