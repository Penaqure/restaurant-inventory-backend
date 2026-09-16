module.exports = (sequelize, DataTypes) => {
  const Equipment = sequelize.define(
    "Equipment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      stockLocationId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      category: {
        type: DataTypes.ENUM("crockery", "cutlery", "kitchen_equipment", "other"),
        allowNull: false,
        defaultValue: "other",
      },
      quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      condition: {
        type: DataTypes.ENUM("good", "damaged", "under_repair", "retired"),
        allowNull: false,
        defaultValue: "good",
      },
      notes: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: "equipment",
      underscored: true,
    }
  );

  Equipment.associate = (models) => {
    Equipment.belongsTo(models.StockLocation, { foreignKey: "stockLocationId", as: "stockLocation" });
  };

  return Equipment;
};
