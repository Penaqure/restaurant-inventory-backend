module.exports = (sequelize, DataTypes) => {
  // Maps a globally-unique login email to the restaurant (and tenant user
  // row) it belongs to. With schema-per-tenant, each restaurant has its own
  // separate `users` table -- there's no single table login can search by
  // email alone, so this public-schema directory is the one thing that has
  // to stay in sync (on tenant user create/update/delete) to make "log in
  // with just email + password" possible. The trade-off: an email can only
  // ever belong to one restaurant at a time.
  const UserDirectory = sequelize.define(
    "UserDirectory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      restaurantId: { type: DataTypes.UUID, allowNull: false, field: "restaurant_id" },
      tenantUserId: { type: DataTypes.UUID, allowNull: false, field: "tenant_user_id" },
    },
    {
      tableName: "user_directory",
      schema: "public",
      underscored: true,
    }
  );

  return UserDirectory;
};
