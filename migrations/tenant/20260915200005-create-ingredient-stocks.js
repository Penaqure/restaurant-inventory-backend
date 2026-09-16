"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ingredient_stocks", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      stock_location_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "stock_locations", key: "id" },
        onDelete: "CASCADE",
      },
      ingredient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "ingredients", key: "id" },
        onDelete: "CASCADE",
      },
      quantity_on_hand: { type: Sequelize.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
      low_stock_threshold: { type: Sequelize.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("ingredient_stocks", ["stock_location_id", "ingredient_id"], { unique: true });
    await queryInterface.addIndex("ingredient_stocks", ["ingredient_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("ingredient_stocks");
  },
};
