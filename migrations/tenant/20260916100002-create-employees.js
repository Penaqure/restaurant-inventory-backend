"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("employees", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      designation: { type: Sequelize.STRING, allowNull: true },
      monthly_salary: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      phone: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true },
      join_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" },
      stock_location_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "stock_locations", key: "id" },
        onDelete: "SET NULL",
      },
      notes: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("employees", ["stock_location_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("employees");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_employees_status";');
  },
};
