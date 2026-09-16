module.exports = (sequelize, DataTypes) => {
  const StockLocation = sequelize.define(
    "StockLocation",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      address: { type: DataTypes.STRING, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "stock_locations",
      underscored: true,
    }
  );

  StockLocation.associate = (models) => {
    StockLocation.hasMany(models.IngredientStock, { foreignKey: "stockLocationId", as: "ingredientStocks" });
    StockLocation.hasMany(models.StockMovement, { foreignKey: "stockLocationId", as: "movements" });
    StockLocation.hasMany(models.Equipment, { foreignKey: "stockLocationId", as: "equipment" });
  };

  return StockLocation;
};
