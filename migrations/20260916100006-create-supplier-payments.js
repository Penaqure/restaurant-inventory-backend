"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("supplier_payments", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      supplier_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "suppliers", key: "id" },
        onDelete: "CASCADE",
      },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      paid_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
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
    await queryInterface.addIndex("supplier_payments", ["supplier_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("supplier_payments");
  },
};
