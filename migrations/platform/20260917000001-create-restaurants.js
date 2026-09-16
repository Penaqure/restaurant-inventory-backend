"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("restaurants", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, allowNull: false, unique: true },
      schema_name: { type: Sequelize.STRING, allowNull: false, unique: true },
      status: { type: Sequelize.ENUM("active", "suspended"), allowNull: false, defaultValue: "active" },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("restaurants");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_restaurants_status";');
  },
};
