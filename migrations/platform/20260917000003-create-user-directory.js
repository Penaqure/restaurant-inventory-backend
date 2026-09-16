"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("user_directory", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      restaurant_id: { type: Sequelize.UUID, allowNull: false },
      tenant_user_id: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("user_directory", ["restaurant_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("user_directory");
  },
};
