const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  const PlatformAdmin = sequelize.define(
    "PlatformAdmin",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
    },
    {
      tableName: "platform_admins",
      schema: "public",
      underscored: true,
      defaultScope: {
        attributes: { exclude: ["passwordHash"] },
      },
      scopes: {
        withPassword: { attributes: {} },
      },
    }
  );

  PlatformAdmin.prototype.comparePassword = function comparePassword(candidate) {
    return bcrypt.compare(candidate, this.passwordHash);
  };

  return PlatformAdmin;
};
