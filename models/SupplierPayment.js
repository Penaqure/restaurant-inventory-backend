module.exports = (sequelize, DataTypes) => {
  const SupplierPayment = sequelize.define(
    "SupplierPayment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      supplierId: { type: DataTypes.UUID, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      paidAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      paymentMethod: {
        type: DataTypes.ENUM("cash", "upi", "bank_transfer"),
        allowNull: false,
        defaultValue: "cash",
      },
      note: { type: DataTypes.STRING, allowNull: true },
      createdBy: { type: DataTypes.UUID, allowNull: false },
    },
    {
      tableName: "supplier_payments",
      underscored: true,
    }
  );

  SupplierPayment.associate = (models) => {
    SupplierPayment.belongsTo(models.Supplier, { foreignKey: "supplierId", as: "supplier" });
    SupplierPayment.belongsTo(models.User, { foreignKey: "createdBy", as: "recordedBy" });
  };

  return SupplierPayment;
};
