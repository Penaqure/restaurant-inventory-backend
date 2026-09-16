module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define(
    "Employee",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      designation: { type: DataTypes.STRING, allowNull: true },
      monthlySalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: true },
      joinDate: { type: DataTypes.DATEONLY, allowNull: true },
      status: { type: DataTypes.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" },
      stockLocationId: { type: DataTypes.UUID, allowNull: true },
      notes: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: "employees",
      underscored: true,
    }
  );

  Employee.associate = (models) => {
    Employee.belongsTo(models.StockLocation, { foreignKey: "stockLocationId", as: "stockLocation" });
    Employee.hasMany(models.SalaryAdvance, { foreignKey: "employeeId", as: "advances" });
    Employee.hasMany(models.Payslip, { foreignKey: "employeeId", as: "payslips" });
  };

  return Employee;
};
