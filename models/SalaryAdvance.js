module.exports = (sequelize, DataTypes) => {
  const SalaryAdvance = sequelize.define(
    "SalaryAdvance",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      employeeId: { type: DataTypes.UUID, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      // Starts equal to amount; decreases as it's repaid, either via payroll
      // deduction (payrollController) or a manual cash repayment
      // (advanceController.repay). Never edited outside those two paths.
      outstandingAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      dateGiven: { type: DataTypes.DATEONLY, allowNull: false },
      paymentMethod: {
        type: DataTypes.ENUM("cash", "upi", "bank_transfer"),
        allowNull: false,
        defaultValue: "cash",
      },
      note: { type: DataTypes.STRING, allowNull: true },
      createdBy: { type: DataTypes.UUID, allowNull: false },
    },
    {
      tableName: "salary_advances",
      underscored: true,
    }
  );

  SalaryAdvance.associate = (models) => {
    SalaryAdvance.belongsTo(models.Employee, { foreignKey: "employeeId", as: "employee" });
    SalaryAdvance.belongsTo(models.User, { foreignKey: "createdBy", as: "recordedBy" });
  };

  return SalaryAdvance;
};
