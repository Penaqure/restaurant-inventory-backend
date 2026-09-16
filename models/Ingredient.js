module.exports = (sequelize, DataTypes) => {
  const Ingredient = sequelize.define(
    "Ingredient",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      // Free-text unit of measure (kg, g, l, ml, pcs, ...).
      unit: { type: DataTypes.STRING, allowNull: false },
      // Loosely maps to a menu item name from restaurant-billing-backend's
      // /api/integrations/menu-items, so sales-summary reporting can line up
      // usage against what was actually sold -- not a hard foreign key,
      // since the two systems have separate databases.
      linkedMenuItemName: { type: DataTypes.STRING, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "ingredients",
      underscored: true,
    }
  );

  Ingredient.associate = (models) => {
    Ingredient.hasMany(models.IngredientStock, { foreignKey: "ingredientId", as: "stocks" });
    Ingredient.hasMany(models.StockMovement, { foreignKey: "ingredientId", as: "movements" });
  };

  return Ingredient;
};
