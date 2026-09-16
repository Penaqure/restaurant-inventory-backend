module.exports = (sequelize, DataTypes) => {
  const Restaurant = sequelize.define(
    "Restaurant",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      schemaName: { type: DataTypes.STRING, allowNull: false, unique: true, field: "schema_name" },
      status: {
        type: DataTypes.ENUM("active", "suspended"),
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      tableName: "restaurants",
      schema: "public",
      underscored: true,
    }
  );

  return Restaurant;
};
