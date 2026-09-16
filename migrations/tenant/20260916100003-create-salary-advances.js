"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("salary_advances", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "employees", key: "id" },
        onDelete: "CASCADE",
      },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      outstanding_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      date_given: { type: Sequelize.DATEONLY, allowNull: false },
      note: { type: Sequelize.STRING, allowNull: true },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("salary_advances", ["employee_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("salary_advances");
  },
};
