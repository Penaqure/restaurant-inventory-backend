"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // supplier_payments/salary_advances rows only ever exist once the
    // transfer already happened, so a method is always known immediately.
    // payslips, on the other hand, are created as "pending" at payroll-run
    // time -- there's no method yet until markPayslipPaid sets one, same
    // as paidAt -- so that column stays nullable with no default. Each
    // addColumn gets its own fresh Sequelize.ENUM(...) instance rather than
    // sharing one object across tables/columns.
    await queryInterface.addColumn("supplier_payments", "payment_method", {
      type: Sequelize.ENUM("cash", "upi", "bank_transfer"),
      allowNull: false,
      defaultValue: "cash",
    });
    await queryInterface.addColumn("salary_advances", "payment_method", {
      type: Sequelize.ENUM("cash", "upi", "bank_transfer"),
      allowNull: false,
      defaultValue: "cash",
    });
    await queryInterface.addColumn("payslips", "payment_method", {
      type: Sequelize.ENUM("cash", "upi", "bank_transfer"),
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("supplier_payments", "payment_method");
    await queryInterface.removeColumn("salary_advances", "payment_method");
    await queryInterface.removeColumn("payslips", "payment_method");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_supplier_payments_payment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_salary_advances_payment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payslips_payment_method";');
  },
};
