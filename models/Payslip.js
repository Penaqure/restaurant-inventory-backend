module.exports = (sequelize, DataTypes) => {
  const Payslip = sequelize.define(
    "Payslip",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      payrollRunId: { type: DataTypes.UUID, allowNull: false },
      employeeId: { type: DataTypes.UUID, allowNull: false },
      // Snapshot of Employee.monthlySalary at generation time -- a later
      // salary change must never rewrite a past payslip's history.
      baseSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      advanceDeduction: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      netPay: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      status: { type: DataTypes.ENUM("pending", "paid"), allowNull: false, defaultValue: "pending" },
      paidAt: { type: DataTypes.DATE, allowNull: true },
      paymentMethod: {
        type: DataTypes.ENUM("cash", "upi", "bank_transfer"),
        allowNull: true,
      },
    },
    {
      tableName: "payslips",
      underscored: true,
    }
  );

  Payslip.associate = (models) => {
    Payslip.belongsTo(models.PayrollRun, { foreignKey: "payrollRunId", as: "payrollRun" });
    Payslip.belongsTo(models.Employee, { foreignKey: "employeeId", as: "employee" });
  };

  return Payslip;
};
