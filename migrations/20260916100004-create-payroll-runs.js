"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("payroll_runs", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      month: { type: Sequelize.INTEGER, allowNull: false },
      year: { type: Sequelize.INTEGER, allowNull: false },
      status: { type: Sequelize.ENUM("draft", "finalized"), allowNull: false, defaultValue: "draft" },
      generated_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
      },
      finalized_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("payroll_runs", ["month", "year"], { unique: true });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("payroll_runs");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payroll_runs_status";');
  },
};
