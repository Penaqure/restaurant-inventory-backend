"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("equipment", {
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
      name: { type: Sequelize.STRING, allowNull: false },
      category: {
        type: Sequelize.ENUM("crockery", "cutlery", "kitchen_equipment", "other"),
        allowNull: false,
        defaultValue: "other",
      },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      condition: {
        type: Sequelize.ENUM("good", "damaged", "under_repair", "retired"),
        allowNull: false,
        defaultValue: "good",
      },
      notes: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("equipment", ["stock_location_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("equipment");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_equipment_category";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_equipment_condition";');
  },
};
