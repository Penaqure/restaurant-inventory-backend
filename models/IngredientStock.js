module.exports = (sequelize, DataTypes) => {
  const IngredientStock = sequelize.define(
    "IngredientStock",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      stockLocationId: { type: DataTypes.UUID, allowNull: false },
      ingredientId: { type: DataTypes.UUID, allowNull: false },
      quantityOnHand: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
      lowStockThreshold: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
    },
    {
      tableName: "ingredient_stocks",
      underscored: true,
    }
  );

  IngredientStock.associate = (models) => {
    IngredientStock.belongsTo(models.StockLocation, { foreignKey: "stockLocationId", as: "stockLocation" });
    IngredientStock.belongsTo(models.Ingredient, { foreignKey: "ingredientId", as: "ingredient" });
  };

  return IngredientStock;
};
