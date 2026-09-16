const { AsyncLocalStorage } = require("async_hooks");

// Minimal continuation-local-storage shim satisfying the interface Sequelize's
// Sequelize.useCLS() expects (run/set/get/bind, the cls-hooked Namespace
// shape) -- built on Node's built-in AsyncLocalStorage instead of pulling in
// cls-hooked. Sequelize only ever calls .get/.set; .bind just has to exist.
class RequestNamespace {
  constructor() {
    this.storage = new AsyncLocalStorage();
  }

  run(fn) {
    return this.storage.run(new Map(), fn);
  }

  set(key, value) {
    const store = this.storage.getStore();
    if (store) store.set(key, value);
    return value;
  }

  get(key) {
    const store = this.storage.getStore();
    return store ? store.get(key) : undefined;
  }

  bind(fn) {
    return fn;
  }
}

module.exports = new RequestNamespace();
