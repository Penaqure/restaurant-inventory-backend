module.exports = (sequelize, DataTypes) => {
  const StockMovement = sequelize.define(
    "StockMovement",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      stockLocationId: { type: DataTypes.UUID, allowNull: false },
      ingredientId: { type: DataTypes.UUID, allowNull: false },
      supplierId: { type: DataTypes.UUID, allowNull: true },
      // No "sale_deduction" type here -- this system doesn't sit in the POS
      // order-placement path (see billingIntegrationService.js). "issue" is
      // this system's equivalent for stock leaving the store room for
      // kitchen use, recorded manually rather than derived from an order.
      type: {
        type: DataTypes.ENUM("purchase", "adjustment", "wastage", "issue"),
        allowNull: false,
      },
      quantityChange: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
      unitCost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      // Only meaningful when type === "purchase". "credit" means the
      // supplier wasn't paid at the time of purchase -- see SupplierPayment
      // for how that balance gets settled.
      paymentStatus: { type: DataTypes.ENUM("paid", "credit"), allowNull: false, defaultValue: "paid" },
      note: { type: DataTypes.STRING, allowNull: true },
      createdBy: { type: DataTypes.UUID, allowNull: false },
    },
    {
      tableName: "stock_movements",
      underscored: true,
    }
  );

  StockMovement.associate = (models) => {
    StockMovement.belongsTo(models.StockLocation, { foreignKey: "stockLocationId", as: "stockLocation" });
    StockMovement.belongsTo(models.Ingredient, { foreignKey: "ingredientId", as: "ingredient" });
    StockMovement.belongsTo(models.Supplier, { foreignKey: "supplierId", as: "supplier" });
    StockMovement.belongsTo(models.User, { foreignKey: "createdBy", as: "recordedBy" });
  };

  return StockMovement;
};
