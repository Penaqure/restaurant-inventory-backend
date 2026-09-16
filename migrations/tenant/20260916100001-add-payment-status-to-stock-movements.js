"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("stock_movements", "payment_status", {
      type: Sequelize.ENUM("paid", "credit"),
      allowNull: false,
      defaultValue: "paid",
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("stock_movements", "payment_status");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stock_movements_payment_status";');
  },
};
