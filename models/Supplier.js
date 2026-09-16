module.exports = (sequelize, DataTypes) => {
  const Supplier = sequelize.define(
    "Supplier",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      contactPhone: { type: DataTypes.STRING, allowNull: true },
      contactEmail: { type: DataTypes.STRING, allowNull: true },
      notes: { type: DataTypes.STRING, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "suppliers",
      underscored: true,
    }
  );

  Supplier.associate = (models) => {
    Supplier.hasMany(models.StockMovement, { foreignKey: "supplierId", as: "movements" });
    Supplier.hasMany(models.SupplierPayment, { foreignKey: "supplierId", as: "payments" });
  };

  return Supplier;
};
