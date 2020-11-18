const bcrypt = require("bcrypt");
const Sequelize = require("sequelize");

const sequelize = require("./database.js");

class Event extends Sequelize.Model {}

Event.init(
  {
    primekey: {
      primaryKey: true,
      type: Sequelize.DataTypes.STRING,
    },
    title: {
      type: Sequelize.DataTypes.STRING,
    },
    orgname: {
      type: Sequelize.DataTypes.STRING,
    },
    description: {
      type: Sequelize.DataTypes.STRING,
    },
    place: {
      type: Sequelize.DataTypes.STRING,
    },
    time: {
      type: Sequelize.DataTypes.STRING,
    },
    signtures: {
      type: Sequelize.DataTypes.BIGINT,
      defaultValue: 0,
    }
  },
  {
    sequelize,
    modelName: "event",
    timestamps: false,
  }
);

module.exports = Event;
