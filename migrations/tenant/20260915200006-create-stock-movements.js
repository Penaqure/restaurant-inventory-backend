"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("stock_movements", {
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
      supplier_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "suppliers", key: "id" },
        onDelete: "SET NULL",
      },
      type: {
        type: Sequelize.ENUM("purchase", "adjustment", "wastage", "issue"),
        allowNull: false,
      },
      quantity_change: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      unit_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
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
    await queryInterface.addIndex("stock_movements", ["ingredient_id"]);
    await queryInterface.addIndex("stock_movements", ["stock_location_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("stock_movements");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stock_movements_type";');
  },
};
