const { Employee, StockLocation, Payslip } = require("../../models");
const logger = require("../../utils/logger");

async function listEmployees(req, res, next) {
  try {
    const employees = await Employee.findAll({
      include: [{ model: StockLocation, as: "stockLocation", attributes: ["id", "name"] }],
      order: [["name", "ASC"]],
    });
    res.json(employees);
  } catch (err) {
    next(err);
  }
}

async function createEmployee(req, res, next) {
  try {
    const { name, designation, monthlySalary, phone, email, joinDate, stockLocationId, notes } = req.body;
    if (!name || !(Number(monthlySalary) > 0)) {
      return res.status(400).json({ message: "name and a positive monthlySalary are required" });
    }

    const employee = await Employee.create({
      name,
      designation: designation || null,
      monthlySalary,
      phone: phone || null,
      email: email || null,
      joinDate: joinDate || null,
      stockLocationId: stockLocationId || null,
      notes: notes || null,
    });
    logger.info("employee.created", { userId: req.user.id, employeeId: employee.id, name });
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const { name, designation, monthlySalary, phone, email, joinDate, status, stockLocationId, notes } = req.body;
    await employee.update({
      ...(name !== undefined && { name }),
      ...(designation !== undefined && { designation: designation || null }),
      ...(monthlySalary !== undefined && { monthlySalary }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(email !== undefined && { email: email || null }),
      ...(joinDate !== undefined && { joinDate: joinDate || null }),
      ...(status !== undefined && { status }),
      ...(stockLocationId !== undefined && { stockLocationId: stockLocationId || null }),
      ...(notes !== undefined && { notes: notes || null }),
    });
    logger.info("employee.updated", { userId: req.user.id, employeeId: employee.id });
    res.json(employee);
  } catch (err) {
    next(err);
  }
}

async function deleteEmployee(req, res, next) {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const payslipCount = await Payslip.count({ where: { employeeId: employee.id } });
    if (payslipCount > 0) {
      return res.status(409).json({ message: "This employee has payroll history and can't be deleted. Mark them inactive instead." });
    }

    await employee.destroy();
    logger.info("employee.deleted", { userId: req.user.id, employeeId: employee.id, name: employee.name });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listEmployees, createEmployee, updateEmployee, deleteEmployee };
