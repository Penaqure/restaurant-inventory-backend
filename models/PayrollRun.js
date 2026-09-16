module.exports = (sequelize, DataTypes) => {
  const PayrollRun = sequelize.define(
    "PayrollRun",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      month: { type: DataTypes.INTEGER, allowNull: false },
      year: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.ENUM("draft", "finalized"), allowNull: false, defaultValue: "draft" },
      generatedBy: { type: DataTypes.UUID, allowNull: false },
      finalizedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "payroll_runs",
      underscored: true,
    }
  );

  PayrollRun.associate = (models) => {
    PayrollRun.belongsTo(models.User, { foreignKey: "generatedBy", as: "generator" });
    PayrollRun.hasMany(models.Payslip, { foreignKey: "payrollRunId", as: "payslips" });
  };

  return PayrollRun;
};
