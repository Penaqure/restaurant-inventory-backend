"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("payslips", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      payroll_run_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "payroll_runs", key: "id" },
        onDelete: "CASCADE",
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      base_salary: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      advance_deduction: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      net_pay: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      status: { type: Sequelize.ENUM("pending", "paid"), allowNull: false, defaultValue: "pending" },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("payslips", ["payroll_run_id", "employee_id"], { unique: true });
    await queryInterface.addIndex("payslips", ["employee_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("payslips");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payslips_status";');
  },
};
