const Sequelize = require("sequelize");

const user = "_";
const password = "_";
const host = "localhost";
const database = "walkoff";

const sequelize = new Sequelize(database, user, password, {
  host,
  dialect: "postgres",
  logging: false,
});

module.exports = sequelize;
