const bcrypt = require("bcrypt");
const Sequelize = require("sequelize");

const sequelize = require("./database.js");

class User extends Sequelize.Model {}

User.init(
  {
    email: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    password: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
    },
    verified: {
      type: Sequelize.DataTypes.BOOLEAN,
      defaultValue: false,
    },
    signedEvents: {
      type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.STRING),
      defaultValue: [],
    },
    admin: {
      type: Sequelize.DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    sequelize,
    modelName: "user",
    timestamps: false,
    hooks: {
      beforeCreate: async (user) => {
        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        user.password = await bcrypt.hash(user.password, salt);
      },
    },
  }
);

User.prototype.isPasswordValid = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;
